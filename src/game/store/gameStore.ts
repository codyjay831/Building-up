import { create } from 'zustand';

import { createGameConfig, createStarterGameState } from '@/game/config/scenario';
import { loadOnboardingProgress } from '@/game/onboarding/onboardingStorage';
import { createInitialUiState } from '@/game/store/storeTypes';
import type { GameStore, GameStoreState } from '@/game/store/storeTypes';
import { createCommandSlice } from '@/game/store/slices/commandSlice';
import { createDebugSlice } from '@/game/store/slices/debugSlice';
import {
  createPersistenceSlice,
  createInitialPersistenceMeta,
} from '@/game/store/slices/persistenceSlice';
import { createPlacementSlice } from '@/game/store/slices/placementSlice';
import { createSelectionSlice } from '@/game/store/slices/selectionSlice';

export type { GameStore, GameStoreActions, GameStoreState } from '@/game/store/storeTypes';

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

export const useGameStore = create<GameStore>((set, get) => ({
  ...createInitialGameStoreState(),
  ...createSelectionSlice(set),
  ...createPlacementSlice(set),
  ...createCommandSlice(set),
  ...createPersistenceSlice(set, get),
  ...createDebugSlice(set, get),
}));
