import { create } from 'zustand';

import { acceptEmergencyOffer } from '@/game/commands/acceptEmergencyOffer';
import { advanceMonth } from '@/game/commands/advanceMonth';
import { cancelProject } from '@/game/commands/cancelProject';
import { placeProject } from '@/game/commands/placeProject';
import { relocateBuilding } from '@/game/commands/relocateBuilding';
import { refinanceProperty } from '@/game/commands/refinanceProperty';
import { demolishBuilding, sellBuilding } from '@/game/commands/redevelopBuilding';
import { renovateBuilding } from '@/game/commands/renovateBuilding';
import { setRentPosture } from '@/game/commands/setRentPosture';
import { createGameConfig, createStarterGameState } from '@/game/config/scenario';
import { canRelocateBuilding } from '@/game/domain/progression';
import type { GameConfig, GameState, RentPosture, TileCoord } from '@/game/domain/types';
import {
  loadOnboardingProgress,
  resetOnboardingProgress,
  saveOnboardingProgress,
} from '@/game/onboarding/onboardingStorage';
import { getOnboardingView } from '@/game/onboarding/onboardingSelectors';
import { shouldMarkReportRead } from '@/game/onboarding/objectives';
import type { OnboardingProgress } from '@/game/onboarding/objectives';
import {
  autosaveGameState,
  clearSaveSlot,
  getAutosaveEnvelope,
  loadSaveSlot,
  saveGameState,
} from '@/game/persistence/storage';
import type { ManualSaveSlot } from '@/game/persistence/saveSchema';
import { downloadSaveFile, readImportFile } from '@/game/persistence/exportImport';
import { buildPreviewFootprint } from '@/game/selectors/placementSelectors';
import { getLatestMonthlyLedgerEntry } from '@/game/selectors/propertySelectors';
import { playSound } from '@/features/sound/soundHooks';
import {
  createGameStateFromFixedSeed,
  createTelemetryExportBundle,
  downloadTelemetryExport,
  runBalanceValidationSuite,
} from '@/game/telemetry';
import { createInitialUiState, type PersistenceMeta, type UiState } from '@/game/store/storeTypes';

export interface GameStoreState {
  readonly config: GameConfig;
  readonly gameState: GameState;
  readonly ui: UiState;
  readonly onboarding: OnboardingProgress;
  readonly persistence: PersistenceMeta;
  readonly lastCommandError: string | null;
}

export interface GameStoreActions {
  selectBuilding: (buildingId: string | null) => void;
  selectCatalogItem: (definitionId: string | null) => void;
  setPlacementOrigin: (origin: TileCoord, options?: { lock?: boolean }) => void;
  rotatePlacementPreview: () => void;
  startRelocateBuilding: (buildingId: string) => void;
  cancelPlacement: () => void;
  clearSelection: () => void;
  commitProject: () => void;
  commitProjectWithFinancing: () => void;
  commitRelocate: () => void;
  cancelCommittedProject: (projectId: string) => void;
  refinanceProperty: () => void;
  acceptEmergencyOffer: () => void;
  advanceMonth: () => void;
  setRentPosture: (buildingId: string, posture: RentPosture) => void;
  renovateBuilding: (buildingId: string) => void;
  keepBuildingAsIs: (buildingId: string) => void;
  sellBuilding: (buildingId: string) => void;
  demolishBuilding: (buildingId: string) => void;
  toggleReportDrawer: () => void;
  setFocusedTile: (tile: TileCoord | null) => void;
  toggleSettings: () => void;
  closeSettings: () => void;
  bootstrapFromStorage: () => void;
  newGame: (seed?: string) => void;
  saveToSlot: (slot: ManualSaveSlot) => void;
  loadFromSlot: (slot: ManualSaveSlot) => void;
  clearSlot: (slot: ManualSaveSlot) => void;
  exportCurrentSave: () => void;
  importSaveFile: (file: File) => Promise<void>;
  dismissScenarioCard: () => void;
  resetOnboarding: () => void;
  debugAddCash: (amount: number) => void;
  debugAdvanceMonths: (count: number) => void;
  debugLoadFixedSeed: (presetId: string) => void;
  debugExportTelemetry: () => void;
  debugRunBalanceValidation: () => string;
}

export type GameStore = GameStoreState & GameStoreActions;

function createInitialPersistenceMeta(): PersistenceMeta {
  return {
    saveStatus: 'idle',
    lastSavedAt: null,
    lastSaveError: null,
    bootstrapped: false,
    saveRevision: 0,
  };
}

export function createInitialGameStoreState(): GameStoreState {
  const config = createGameConfig();

  return {
    config,
    gameState: createStarterGameState(undefined, undefined, config),
    ui: createInitialUiState(),
    onboarding: loadOnboardingProgress(),
    persistence: createInitialPersistenceMeta(),
    lastCommandError: null,
  };
}

function syncOnboardingProgress(
  gameState: GameState,
  ui: UiState,
  onboarding: OnboardingProgress,
): OnboardingProgress {
  const view = getOnboardingView(gameState, ui, onboarding);
  const nextProgress: OnboardingProgress = {
    ...onboarding,
    completedObjectiveIds: view.completedObjectiveIds,
    tutorialComplete: view.tutorialComplete,
  };

  if (nextProgress.tutorialComplete !== onboarding.tutorialComplete) {
    saveOnboardingProgress(nextProgress);
  }

  return nextProgress;
}

function maybeMarkReportRead(
  gameState: GameState,
  ui: UiState,
  onboarding: OnboardingProgress,
): OnboardingProgress {
  const context = {
    selectedBuildingId: ui.selectedBuildingId,
    selectedBuildingDefinitionId:
      gameState.buildings.find((building) => building.id === ui.selectedBuildingId)?.definitionId ??
      null,
    month: gameState.month,
    hasMonthlyReport: getLatestMonthlyLedgerEntry(gameState) !== undefined,
    reportDrawerOpen: ui.reportDrawerOpen,
    keepDecisionMade: onboarding.keepDecisionMade,
    reportReadAfterFirstMonth: onboarding.reportReadAfterFirstMonth,
    starterHouseRenovated:
      gameState.buildings.find((building) => building.definitionId === 'existing_house')
        ?.renovated === true,
  };

  if (!shouldMarkReportRead(context)) {
    return onboarding;
  }

  const nextProgress: OnboardingProgress = {
    ...onboarding,
    reportReadAfterFirstMonth: true,
  };
  saveOnboardingProgress(nextProgress);
  return nextProgress;
}

function persistAutosave(gameState: GameState, previous: PersistenceMeta): PersistenceMeta {
  const result = autosaveGameState(gameState);

  if (!result.ok) {
    return {
      ...previous,
      saveStatus: 'error',
      lastSaveError: result.error,
    };
  }

  playSound('save_completed');

  return {
    ...previous,
    saveStatus: 'saved',
    lastSavedAt: result.savedAt,
    lastSaveError: null,
  };
}

function applyGameStateUpdate(
  store: GameStoreState,
  gameState: GameState,
  uiPatch?: Partial<UiState>,
): Partial<GameStoreState> {
  const ui = uiPatch ? { ...store.ui, ...uiPatch } : store.ui;
  const onboarding = syncOnboardingProgress(
    gameState,
    ui,
    maybeMarkReportRead(gameState, ui, store.onboarding),
  );

  return {
    gameState,
    ui,
    onboarding,
    persistence: persistAutosave(gameState, store.persistence),
    lastCommandError: null,
  };
}

export const useGameStore = create<GameStore>((set, get) => ({
  ...createInitialGameStoreState(),

  selectBuilding: (buildingId) => {
    set((store) => {
      const ui = {
        ...createInitialUiState(),
        selectedBuildingId: buildingId,
        selectedProjectId:
          store.gameState.projects.find((project) => project.buildingId === buildingId)?.id ?? null,
        settingsOpen: store.ui.settingsOpen,
      };

      if (buildingId) {
        playSound('building_selected');
      }

      return {
        ui,
        onboarding: syncOnboardingProgress(store.gameState, ui, store.onboarding),
        lastCommandError: null,
      };
    });
  },

  selectCatalogItem: (definitionId) => {
    set(() => ({
      ui: {
        ...createInitialUiState(),
        selectedCatalogItemId: definitionId,
        placementPreview: definitionId
          ? {
              definitionId,
              origin: { x: 0, y: 0 },
              rotation: 0,
            }
          : null,
        placementLocked: false,
        relocateBuildingId: null,
      },
      lastCommandError: null,
    }));
  },

  setPlacementOrigin: (origin, options) => {
    set((store) => {
      const preview = store.ui.placementPreview;

      if (!preview) {
        return store;
      }

      if (store.ui.placementLocked && options?.lock !== true) {
        return store;
      }

      return {
        ui: {
          ...store.ui,
          placementLocked:
            options?.lock === true
              ? true
              : options?.lock === false
                ? false
                : store.ui.placementLocked,
          placementPreview: {
            ...preview,
            origin,
          },
          focusedTile: origin,
        },
      };
    });
  },

  rotatePlacementPreview: () => {
    set((store) => {
      const preview = store.ui.placementPreview;

      if (!preview) {
        return store;
      }

      return {
        ui: {
          ...store.ui,
          placementPreview: {
            ...preview,
            rotation: preview.rotation === 0 ? 90 : 0,
          },
        },
      };
    });
  },

  startRelocateBuilding: (buildingId) => {
    set((store) => {
      const building = store.gameState.buildings.find((candidate) => candidate.id === buildingId);

      if (!building || !canRelocateBuilding(store.gameState, building)) {
        return {
          ...store,
          lastCommandError: 'This building cannot be moved right now',
        };
      }

      return {
        ui: {
          ...createInitialUiState(),
          placementPreview: {
            definitionId: building.definitionId,
            origin: building.footprint.origin,
            rotation: building.footprint.rotation,
            relocateBuildingId: building.id,
          },
          relocateBuildingId: building.id,
          placementLocked: false,
          focusedTile: building.footprint.origin,
          settingsOpen: store.ui.settingsOpen,
        },
        lastCommandError: null,
      };
    });
  },

  cancelPlacement: () => {
    set((store) => ({
      ui: {
        ...store.ui,
        selectedCatalogItemId: null,
        placementPreview: null,
        placementLocked: false,
        relocateBuildingId: null,
      },
    }));
  },

  clearSelection: () => {
    set((store) => ({
      ui: {
        ...createInitialUiState(),
        settingsOpen: store.ui.settingsOpen,
      },
      lastCommandError: null,
    }));
  },

  commitProject: () => {
    set((store) => {
      const preview = store.ui.placementPreview;

      if (!preview) {
        return store;
      }

      const result = placeProject(store.gameState, store.config, {
        definitionId: preview.definitionId,
        footprint: buildPreviewFootprint(preview, store.config),
      });

      if (!result.ok) {
        return {
          ...store,
          lastCommandError: result.error.message,
        };
      }

      playSound('project_committed');

      return {
        ...store,
        ...applyGameStateUpdate(store, result.state, createInitialUiState()),
      };
    });
  },

  commitProjectWithFinancing: () => {
    set((store) => {
      const preview = store.ui.placementPreview;

      if (!preview) {
        return store;
      }

      const result = placeProject(store.gameState, store.config, {
        definitionId: preview.definitionId,
        footprint: buildPreviewFootprint(preview, store.config),
        useConstructionLoan: true,
      });

      if (!result.ok) {
        return {
          ...store,
          lastCommandError: result.error.message,
        };
      }

      playSound('project_committed');

      return {
        ...store,
        ...applyGameStateUpdate(store, result.state, createInitialUiState()),
      };
    });
  },

  commitRelocate: () => {
    set((store) => {
      const preview = store.ui.placementPreview;
      const buildingId = store.ui.relocateBuildingId;

      if (!preview || !buildingId) {
        return store;
      }

      const result = relocateBuilding(store.gameState, store.config, {
        buildingId,
        footprint: buildPreviewFootprint(preview, store.config),
      });

      if (!result.ok) {
        return {
          ...store,
          lastCommandError: result.error.message,
        };
      }

      playSound('building_selected');

      return {
        ...store,
        ...applyGameStateUpdate(store, result.state, {
          ...createInitialUiState(),
          selectedBuildingId: buildingId,
          settingsOpen: store.ui.settingsOpen,
        }),
      };
    });
  },

  cancelCommittedProject: (projectId) => {
    set((store) => {
      const result = cancelProject(store.gameState, store.config, { projectId });

      if (!result.ok) {
        return {
          ...store,
          lastCommandError: result.error.message,
        };
      }

      playSound('project_cancelled');

      return {
        ...store,
        ...applyGameStateUpdate(store, result.state, createInitialUiState()),
      };
    });
  },

  advanceMonth: () => {
    set((store) => {
      const result = advanceMonth(store.gameState, store.config);

      if (!result.ok) {
        return {
          ...store,
          lastCommandError: result.error.message,
        };
      }

      playSound('month_advanced');

      return {
        ...store,
        ...applyGameStateUpdate(store, result.state, {
          ...store.ui,
          reportDrawerOpen: true,
        }),
      };
    });
  },

  setRentPosture: (buildingId, posture) => {
    set((store) => {
      const result = setRentPosture(store.gameState, store.config, { buildingId, posture });

      if (!result.ok) {
        return {
          ...store,
          lastCommandError: result.error.message,
        };
      }

      return {
        ...store,
        ...applyGameStateUpdate(store, result.state),
      };
    });
  },

  renovateBuilding: (buildingId) => {
    set((store) => {
      const result = renovateBuilding(store.gameState, store.config, { buildingId });

      if (!result.ok) {
        return {
          ...store,
          lastCommandError: result.error.message,
        };
      }

      const nextOnboarding: OnboardingProgress = {
        ...store.onboarding,
        keepDecisionMade: true,
      };
      saveOnboardingProgress(nextOnboarding);

      return {
        ...store,
        onboarding: nextOnboarding,
        ...applyGameStateUpdate(store, result.state),
      };
    });
  },

  keepBuildingAsIs: (buildingId) => {
    set((store) => {
      const building = store.gameState.buildings.find((candidate) => candidate.id === buildingId);

      if (!building) {
        return {
          ...store,
          lastCommandError: 'Building not found.',
        };
      }

      const nextOnboarding: OnboardingProgress = {
        ...store.onboarding,
        keepDecisionMade: true,
      };
      saveOnboardingProgress(nextOnboarding);

      return {
        ...store,
        onboarding: syncOnboardingProgress(store.gameState, store.ui, nextOnboarding),
        lastCommandError: null,
      };
    });
  },

  sellBuilding: (buildingId) => {
    set((store) => {
      const result = sellBuilding(store.gameState, store.config, { buildingId });

      if (!result.ok) {
        return {
          ...store,
          lastCommandError: result.error.message,
        };
      }

      return {
        ...store,
        ...applyGameStateUpdate(store, result.state, createInitialUiState()),
      };
    });
  },

  demolishBuilding: (buildingId) => {
    set((store) => {
      const result = demolishBuilding(store.gameState, store.config, { buildingId });

      if (!result.ok) {
        return {
          ...store,
          lastCommandError: result.error.message,
        };
      }

      return {
        ...store,
        ...applyGameStateUpdate(store, result.state, createInitialUiState()),
      };
    });
  },

  refinanceProperty: () => {
    set((store) => {
      const result = refinanceProperty(store.gameState, store.config);

      if (!result.ok) {
        return {
          ...store,
          lastCommandError: result.error.message,
        };
      }

      return {
        ...store,
        ...applyGameStateUpdate(store, result.state),
      };
    });
  },

  acceptEmergencyOffer: () => {
    set((store) => {
      const result = acceptEmergencyOffer(store.gameState, store.config);

      if (!result.ok) {
        return {
          ...store,
          lastCommandError: result.error.message,
        };
      }

      return {
        ...store,
        ...applyGameStateUpdate(store, result.state),
      };
    });
  },

  toggleReportDrawer: () => {
    set((store) => {
      const reportDrawerOpen = !store.ui.reportDrawerOpen;
      const ui = {
        ...store.ui,
        reportDrawerOpen,
      };

      return {
        ui,
        onboarding: syncOnboardingProgress(
          store.gameState,
          ui,
          maybeMarkReportRead(store.gameState, ui, store.onboarding),
        ),
      };
    });
  },

  setFocusedTile: (tile) => {
    set((store) => ({
      ui: {
        ...store.ui,
        focusedTile: tile,
      },
    }));
  },

  toggleSettings: () => {
    set((store) => ({
      ui: {
        ...store.ui,
        settingsOpen: !store.ui.settingsOpen,
      },
    }));
  },

  closeSettings: () => {
    set((store) => ({
      ui: {
        ...store.ui,
        settingsOpen: false,
      },
    }));
  },

  bootstrapFromStorage: () => {
    const autosave = getAutosaveEnvelope();

    set((store) => {
      if (!autosave) {
        return {
          persistence: {
            ...store.persistence,
            bootstrapped: true,
          },
        };
      }

      playSound('load_completed');

      return {
        gameState: autosave.gameState,
        ui: createInitialUiState(),
        onboarding: syncOnboardingProgress(
          autosave.gameState,
          createInitialUiState(),
          store.onboarding,
        ),
        persistence: {
          ...store.persistence,
          saveStatus: 'saved',
          lastSavedAt: autosave.savedAt,
          lastSaveError: null,
          bootstrapped: true,
        },
        lastCommandError: null,
      };
    });
  },

  newGame: (seed) => {
    const config = get().config;
    const gameState = createStarterGameState(undefined, seed, config);

    set((store) => ({
      gameState,
      ui: createInitialUiState(),
      onboarding: syncOnboardingProgress(gameState, createInitialUiState(), store.onboarding),
      persistence: persistAutosave(gameState, store.persistence),
      lastCommandError: null,
    }));
  },

  saveToSlot: (slot) => {
    set((store) => {
      const result = saveGameState(slot, store.gameState);

      if (!result.ok) {
        return {
          persistence: {
            ...store.persistence,
            saveStatus: 'error',
            lastSaveError: result.error,
          },
        };
      }

      playSound('save_completed');

      return {
        persistence: {
          ...store.persistence,
          saveStatus: 'saved',
          lastSavedAt: result.savedAt,
          lastSaveError: null,
          saveRevision: store.persistence.saveRevision + 1,
        },
      };
    });
  },

  loadFromSlot: (slot) => {
    const loaded = loadSaveSlot(slot);

    if (!loaded.ok) {
      set((store) => ({
        persistence: {
          ...store.persistence,
          saveStatus: 'error',
          lastSaveError: loaded.error,
        },
      }));
      return;
    }

    playSound('load_completed');

    set((store) => ({
      gameState: loaded.envelope.gameState,
      ui: createInitialUiState(),
      onboarding: syncOnboardingProgress(
        loaded.envelope.gameState,
        createInitialUiState(),
        store.onboarding,
      ),
      persistence: {
        ...store.persistence,
        saveStatus: 'saved',
        lastSavedAt: loaded.envelope.savedAt,
        lastSaveError: null,
        bootstrapped: true,
      },
      lastCommandError: null,
    }));
  },

  clearSlot: (slot) => {
    clearSaveSlot(slot);
    set((store) => ({
      persistence: {
        ...store.persistence,
        saveRevision: store.persistence.saveRevision + 1,
      },
    }));
  },

  exportCurrentSave: () => {
    downloadSaveFile(get().gameState);
  },

  importSaveFile: async (file) => {
    const result = await readImportFile(file);

    if (!result.ok) {
      set((store) => ({
        persistence: {
          ...store.persistence,
          saveStatus: 'error',
          lastSaveError: result.error,
        },
      }));
      return;
    }

    playSound('load_completed');

    set((store) => ({
      gameState: result.envelope.gameState,
      ui: createInitialUiState(),
      onboarding: syncOnboardingProgress(
        result.envelope.gameState,
        createInitialUiState(),
        store.onboarding,
      ),
      persistence: {
        ...store.persistence,
        saveStatus: 'saved',
        lastSavedAt: result.envelope.savedAt,
        lastSaveError: null,
        bootstrapped: true,
      },
      lastCommandError: null,
    }));
  },

  dismissScenarioCard: () => {
    set((store) => {
      const nextOnboarding: OnboardingProgress = {
        ...store.onboarding,
        scenarioCardDismissed: true,
      };
      saveOnboardingProgress(nextOnboarding);

      return {
        onboarding: nextOnboarding,
      };
    });
  },

  resetOnboarding: () => {
    set({ onboarding: resetOnboardingProgress() });
  },

  debugAddCash: (amount) => {
    if (amount <= 0) {
      return;
    }

    set((store) => ({
      gameState: {
        ...store.gameState,
        cash: store.gameState.cash + amount,
      },
      lastCommandError: null,
    }));
  },

  debugAdvanceMonths: (count) => {
    if (count <= 0) {
      return;
    }

    set((store) => {
      let nextState = store.gameState;

      for (let index = 0; index < count && nextState.status === 'active'; index += 1) {
        const result = advanceMonth(nextState, store.config);

        if (!result.ok) {
          return {
            lastCommandError: result.error.message,
          };
        }

        nextState = result.state;
      }

      return {
        gameState: nextState,
        onboarding: syncOnboardingProgress(nextState, store.ui, store.onboarding),
        persistence: persistAutosave(nextState, store.persistence),
        lastCommandError: null,
      };
    });
  },

  debugLoadFixedSeed: (presetId) => {
    const config = get().config;
    const gameState = createGameStateFromFixedSeed(presetId, config);

    set((store) => ({
      gameState,
      ui: createInitialUiState(),
      onboarding: syncOnboardingProgress(gameState, createInitialUiState(), store.onboarding),
      persistence: persistAutosave(gameState, store.persistence),
      lastCommandError: null,
    }));
  },

  debugExportTelemetry: () => {
    const { gameState, config } = get();
    const bundle = createTelemetryExportBundle(gameState, config);
    downloadTelemetryExport(bundle);
  },

  debugRunBalanceValidation: () => {
    const report = runBalanceValidationSuite({ maxMonths: 30 });
    return JSON.stringify(report, null, 2);
  },
}));
