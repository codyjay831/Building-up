import { getScenarioDefinition, getTutorialBuildingId } from '@/game/config/scenario';
import { saveOnboardingProgress } from '@/game/onboarding/onboardingStorage';
import { syncOnboardingProgress } from '@/game/store/onboardingSync';
import { runStoreSoundEffect } from '@/game/store/storeEffects';
import type { GameStore } from '@/game/store/storeTypes';
import { resetSelectionUi } from '@/game/store/uiStateHelpers';
import type { StoreApi } from 'zustand';

type GameSet = StoreApi<GameStore>['setState'];

export function createSelectionSlice(
  set: GameSet,
): Pick<
  GameStore,
  'selectBuilding' | 'selectAccessTile' | 'clearSelection' | 'setFocusedTile' | 'toggleSettings' | 'closeSettings'
> {
  return {
    selectBuilding: (buildingId) => {
      set((store) => {
        const ui = resetSelectionUi(store.ui, {
          selectedBuildingId: buildingId,
          selectedProjectId:
            store.gameState.projects.find((project) => project.buildingId === buildingId)?.id ??
            null,
        });

        if (buildingId) {
          runStoreSoundEffect('building_selected');
        }

        const scenario = getScenarioDefinition(store.config.scenarios, store.gameState.scenarioId);
        const tutorialBuildingId = getTutorialBuildingId(scenario, store.gameState.buildings);
        const shouldMarkTutorialInspector =
          buildingId !== null &&
          buildingId === tutorialBuildingId &&
          !store.onboarding.tutorialInspectorOpened;

        const onboardingBase = shouldMarkTutorialInspector
          ? {
              ...store.onboarding,
              tutorialInspectorOpened: true,
            }
          : store.onboarding;

        if (shouldMarkTutorialInspector) {
          saveOnboardingProgress(onboardingBase);
        }

        return {
          ui,
          onboarding: syncOnboardingProgress(store.gameState, ui, onboardingBase, store.config),
          lastCommandError: null,
        };
      });
    },

    selectAccessTile: (tile) => {
      set((store) => ({
        ui: {
          ...resetSelectionUi(store.ui),
          selectedAccessTile: tile,
          focusedTile: tile,
        },
        lastCommandError: null,
      }));
    },

    clearSelection: () => {
      set((store) => ({
        ui: resetSelectionUi(store.ui),
        lastCommandError: null,
      }));
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
  };
}
