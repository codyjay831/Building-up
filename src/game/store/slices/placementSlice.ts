import { cancelProject } from '@/game/commands/cancelProject';
import { placeProject } from '@/game/commands/placeProject';
import { relocateBuilding } from '@/game/commands/relocateBuilding';
import { relocateDriveway } from '@/game/commands/relocateDriveway';
import { canRelocateDriveway } from '@/game/domain/accessTiles';
import { canRelocateBuilding } from '@/game/domain/progression';
import { buildPreviewFootprint } from '@/game/selectors/placementSelectors';
import { applyGameStateUpdate } from '@/game/store/onboardingSync';
import { runStoreSoundEffect } from '@/game/store/storeEffects';
import type { GameStore } from '@/game/store/storeTypes';
import { clearPlacementUi, resetSelectionUi } from '@/game/store/uiStateHelpers';
import type { StoreApi } from 'zustand';

type GameSet = StoreApi<GameStore>['setState'];

export function createPlacementSlice(
  set: GameSet,
): Pick<
  GameStore,
  | 'selectCatalogItem'
  | 'setPlacementOrigin'
  | 'rotatePlacementPreview'
  | 'startRelocateBuilding'
  | 'cancelPlacement'
  | 'commitProject'
  | 'commitProjectWithFinancing'
  | 'commitRelocate'
  | 'startRelocateDriveway'
  | 'setDrivewayPreviewOrigin'
  | 'rotateDrivewayPreview'
  | 'commitDrivewayRelocate'
  | 'cancelCommittedProject'
> {
  return {
    selectCatalogItem: (definitionId) => {
      set((store) => ({
        ui: {
          ...resetSelectionUi(store.ui),
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

        if (!building || !canRelocateBuilding(store.gameState, store.config, building)) {
          return {
            ...store,
            lastCommandError: 'This building cannot be moved right now',
          };
        }

        return {
          ui: {
            ...resetSelectionUi(store.ui),
            placementPreview: {
              definitionId: building.definitionId,
              origin: building.footprint.origin,
              rotation: building.footprint.rotation,
              relocateBuildingId: building.id,
            },
            relocateBuildingId: building.id,
            placementLocked: false,
            focusedTile: building.footprint.origin,
          },
          lastCommandError: null,
        };
      });
    },

    cancelPlacement: () => {
      set((store) => ({
        ui: clearPlacementUi(store.ui),
      }));
    },

    startRelocateDriveway: () => {
      set((store) => {
        if (!canRelocateDriveway(store.gameState.lot)) {
          return {
            ...store,
            lastCommandError: 'This scenario driveway cannot be relocated',
          };
        }

        const tiles = store.gameState.lot.drivewayTiles;
        const firstTile = tiles[0];

        if (!firstTile) {
          return store;
        }

        const rotation: 0 | 90 = tiles.every((tile) => tile.y === firstTile.y) ? 0 : 90;

        return {
          ui: {
            ...store.ui,
            selectedAccessTile: null,
            drivewayPreview: {
              origin: firstTile,
              rotation,
            },
            drivewayPreviewLocked: false,
            focusedTile: firstTile,
          },
          lastCommandError: null,
        };
      });
    },

    setDrivewayPreviewOrigin: (origin, options) => {
      set((store) => {
        if (!store.ui.drivewayPreview) {
          return store;
        }

        if (store.ui.drivewayPreviewLocked && options?.lock !== true) {
          return store;
        }

        return {
          ui: {
            ...store.ui,
            drivewayPreviewLocked:
              options?.lock === true
                ? true
                : options?.lock === false
                  ? false
                  : store.ui.drivewayPreviewLocked,
            drivewayPreview: {
              ...store.ui.drivewayPreview,
              origin,
            },
            focusedTile: origin,
          },
        };
      });
    },

    rotateDrivewayPreview: () => {
      set((store) => {
        if (!store.ui.drivewayPreview) {
          return store;
        }

        return {
          ui: {
            ...store.ui,
            drivewayPreview: {
              ...store.ui.drivewayPreview,
              rotation: store.ui.drivewayPreview.rotation === 0 ? 90 : 0,
            },
          },
        };
      });
    },

    commitDrivewayRelocate: () => {
      set((store) => {
        const preview = store.ui.drivewayPreview;

        if (!preview) {
          return store;
        }

        const result = relocateDriveway(store.gameState, store.config, { preview });

        if (!result.ok) {
          return {
            ...store,
            lastCommandError: result.error.message,
          };
        }

        runStoreSoundEffect('building_selected');

        const accessTile = preview.origin;

        return {
          ...store,
          ...applyGameStateUpdate(
            store,
            result.state,
            {
              ...clearPlacementUi(store.ui),
              selectedAccessTile: accessTile,
              focusedTile: accessTile,
            },
          ),
        };
      });
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

        runStoreSoundEffect('project_committed');

        return {
          ...store,
          ...applyGameStateUpdate(store, result.state, resetSelectionUi(store.ui)),
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

        runStoreSoundEffect('project_committed');

        return {
          ...store,
          ...applyGameStateUpdate(store, result.state, resetSelectionUi(store.ui)),
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

        runStoreSoundEffect('building_selected');

        return {
          ...store,
          ...applyGameStateUpdate(
            store,
            result.state,
            resetSelectionUi(store.ui, { selectedBuildingId: buildingId }),
          ),
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

        runStoreSoundEffect('project_cancelled');

        return {
          ...store,
          ...applyGameStateUpdate(store, result.state, resetSelectionUi(store.ui)),
        };
      });
    },
  };
}
