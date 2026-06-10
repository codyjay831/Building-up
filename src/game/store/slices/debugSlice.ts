import { advanceMonth } from '@/game/commands/advanceMonth';
import { debugAddCash } from '@/game/commands/debugAddCash';
import {
  createGameStateFromFixedSeed,
  createTelemetryExportBundle,
  downloadTelemetryExport,
  runBalanceValidationSuite,
} from '@/game/telemetry';
import {
  applyGameStateUpdate,
  persistAutosave,
  syncOnboardingProgress,
} from '@/game/store/onboardingSync';
import type { GameStore } from '@/game/store/storeTypes';
import { createInitialUiState } from '@/game/store/storeTypes';
import type { StoreApi } from 'zustand';

type GameSet = StoreApi<GameStore>['setState'];
type GameGet = StoreApi<GameStore>['getState'];

export function createDebugSlice(
  set: GameSet,
  get: GameGet,
): Pick<
  GameStore,
  | 'debugAddCash'
  | 'debugAdvanceMonths'
  | 'debugLoadFixedSeed'
  | 'debugExportTelemetry'
  | 'debugRunBalanceValidation'
> {
  return {
    debugAddCash: (amount) => {
      set((store) => {
        const result = debugAddCash(store.gameState, { amount });

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
          onboarding: syncOnboardingProgress(nextState, store.ui, store.onboarding, store.config),
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
        onboarding: syncOnboardingProgress(
          gameState,
          createInitialUiState(),
          store.onboarding,
          store.config,
        ),
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
  };
}
