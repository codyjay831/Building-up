import { acceptEmergencyOffer } from '@/game/commands/acceptEmergencyOffer';
import { advanceMonth } from '@/game/commands/advanceMonth';
import { refinanceProperty } from '@/game/commands/refinanceProperty';
import { demolishBuilding, sellBuilding } from '@/game/commands/redevelopBuilding';
import { renovateBuilding } from '@/game/commands/renovateBuilding';
import { setRentPosture } from '@/game/commands/setRentPosture';
import { saveOnboardingProgress } from '@/game/onboarding/onboardingStorage';
import type { OnboardingProgress } from '@/game/onboarding/objectives';
import {
  applyGameStateUpdate,
  maybeMarkReportRead,
  syncOnboardingProgress,
} from '@/game/store/onboardingSync';
import { deriveMilestoneToasts } from '@/game/selectors/milestoneSelectors';
import { runStoreSoundEffect } from '@/game/store/storeEffects';
import type { GameStore } from '@/game/store/storeTypes';
import { resetSelectionUi } from '@/game/store/uiStateHelpers';
import type { StoreApi } from 'zustand';

type GameSet = StoreApi<GameStore>['setState'];

export function createCommandSlice(
  set: GameSet,
): Pick<
  GameStore,
  | 'advanceMonth'
  | 'setRentPosture'
  | 'renovateBuilding'
  | 'keepBuildingAsIs'
  | 'sellBuilding'
  | 'demolishBuilding'
  | 'refinanceProperty'
  | 'acceptEmergencyOffer'
  | 'toggleReportDrawer'
  | 'dismissMilestoneToasts'
  | 'dismissWinResults'
> {
  return {
    advanceMonth: () => {
      set((store) => {
        const result = advanceMonth(store.gameState, store.config);

        if (!result.ok) {
          return {
            ...store,
            lastCommandError: result.error.message,
          };
        }

        runStoreSoundEffect('month_advanced');

        const milestoneToasts = deriveMilestoneToasts(store.gameState, result.state, result.events);

        return {
          ...store,
          ...applyGameStateUpdate(store, result.state, {
            ...store.ui,
            reportDrawerOpen: true,
            milestoneToasts,
            monthTickPulse: true,
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
          onboarding: syncOnboardingProgress(
            store.gameState,
            store.ui,
            nextOnboarding,
            store.config,
          ),
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
          ...applyGameStateUpdate(store, result.state, resetSelectionUi(store.ui)),
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
          ...applyGameStateUpdate(store, result.state, resetSelectionUi(store.ui)),
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
            maybeMarkReportRead(store.gameState, ui, store.onboarding, store.config),
            store.config,
          ),
        };
      });
    },

    dismissMilestoneToasts: () => {
      set((store) => ({
        ui: {
          ...store.ui,
          milestoneToasts: [],
        },
      }));
    },

    dismissWinResults: () => {
      set((store) => ({
        ui: {
          ...store.ui,
          winResultsDismissed: true,
        },
      }));
    },
  };
}
