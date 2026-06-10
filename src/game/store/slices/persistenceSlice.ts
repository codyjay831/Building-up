import { createStarterGameState, RIVERSIDE_STARTER_SCENARIO_ID } from '@/game/config/scenario';
import {
  resetOnboardingProgress,
  saveOnboardingProgress,
} from '@/game/onboarding/onboardingStorage';
import { downloadSaveFile, readImportFile } from '@/game/persistence/exportImport';
import {
  clearSaveSlot,
  getAutosaveEnvelope,
  loadSaveSlot,
  saveGameState,
} from '@/game/persistence/storage';
import { syncOnboardingProgress, persistAutosave } from '@/game/store/onboardingSync';
import { runStoreSoundEffect } from '@/game/store/storeEffects';
import type { GameStore, PersistenceMeta } from '@/game/store/storeTypes';
import { createInitialUiState } from '@/game/store/storeTypes';
import type { StoreApi } from 'zustand';

type GameSet = StoreApi<GameStore>['setState'];
type GameGet = StoreApi<GameStore>['getState'];

function createInitialPersistenceMeta(): PersistenceMeta {
  return {
    saveStatus: 'idle',
    lastSavedAt: null,
    lastSaveError: null,
    bootstrapped: false,
    saveRevision: 0,
  };
}

export { createInitialPersistenceMeta };

export function createPersistenceSlice(
  set: GameSet,
  get: GameGet,
): Pick<
  GameStore,
  | 'bootstrapFromStorage'
  | 'newGame'
  | 'saveToSlot'
  | 'loadFromSlot'
  | 'clearSlot'
  | 'exportCurrentSave'
  | 'importSaveFile'
  | 'dismissScenarioCard'
  | 'dismissOnboardingGuide'
  | 'setGuideEnabled'
  | 'setGuideCollapsed'
  | 'resetOnboarding'
> {
  return {
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

        runStoreSoundEffect('load_completed');

        return {
          gameState: autosave.gameState,
          ui: createInitialUiState(),
          onboarding: syncOnboardingProgress(
            autosave.gameState,
            createInitialUiState(),
            store.onboarding,
            store.config,
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

    newGame: (scenarioId = RIVERSIDE_STARTER_SCENARIO_ID, seed) => {
      const config = get().config;
      const gameState = createStarterGameState(scenarioId, seed, config);
      const ui = createInitialUiState();

      set((store) => ({
        gameState,
        ui,
        onboarding: syncOnboardingProgress(gameState, ui, resetOnboardingProgress(), store.config),
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

        runStoreSoundEffect('save_completed');

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

      runStoreSoundEffect('load_completed');

      set((store) => ({
        gameState: loaded.envelope.gameState,
        ui: createInitialUiState(),
        onboarding: syncOnboardingProgress(
          loaded.envelope.gameState,
          createInitialUiState(),
          store.onboarding,
          store.config,
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

      runStoreSoundEffect('load_completed');

      set((store) => ({
        gameState: result.envelope.gameState,
        ui: createInitialUiState(),
        onboarding: syncOnboardingProgress(
          result.envelope.gameState,
          createInitialUiState(),
          store.onboarding,
          store.config,
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
        const nextOnboarding = {
          ...store.onboarding,
          scenarioCardDismissed: true,
        };
        saveOnboardingProgress(nextOnboarding);

        return {
          onboarding: nextOnboarding,
        };
      });
    },

    dismissOnboardingGuide: () => {
      set((store) => {
        const nextOnboarding = {
          ...store.onboarding,
          guideDisabled: true,
        };
        saveOnboardingProgress(nextOnboarding);

        return {
          onboarding: nextOnboarding,
        };
      });
    },

    setGuideEnabled: (enabled) => {
      set((store) => {
        const nextOnboarding = {
          ...store.onboarding,
          guideDisabled: !enabled,
        };
        saveOnboardingProgress(nextOnboarding);

        return {
          onboarding: nextOnboarding,
        };
      });
    },

    setGuideCollapsed: (collapsed) => {
      set((store) => {
        const nextOnboarding = {
          ...store.onboarding,
          guideCollapsed: collapsed,
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
  };
}
