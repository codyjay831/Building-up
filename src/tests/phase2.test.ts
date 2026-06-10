import { describe, expect, it } from 'vitest';

import {
  createGameConfig,
  createStarterGameState,
  RIVERSIDE_STARTER_SCENARIO_ID,
} from '@/game/config/scenario';
import { evaluatePlacementPreview, tileInFootprint } from '@/game/selectors/placementSelectors';
import { createInitialGameStoreState, useGameStore } from '@/game/store/gameStore';

describe('placementSelectors', () => {
  const config = createGameConfig();
  const state = createStarterGameState(RIVERSIDE_STARTER_SCENARIO_ID, undefined, config);

  it('marks overlapping starter house placement as invalid', () => {
    const result = evaluatePlacementPreview(state, config, {
      definitionId: 'small_house',
      origin: { x: 3, y: 6 },
      rotation: 0,
    });

    expect(result.isValid).toBe(false);
    expect(result.primaryMessage).toMatch(/overlap/i);
  });

  it('marks open valid placement as valid', () => {
    const result = evaluatePlacementPreview(state, config, {
      definitionId: 'small_park',
      origin: { x: 0, y: 0 },
      rotation: 0,
    });

    expect(result.isValid).toBe(true);
    expect(result.failures).toHaveLength(0);
  });

  it('changes validity when a footprint is rotated near the lot edge', () => {
    const upright = evaluatePlacementPreview(state, config, {
      definitionId: 'access_path',
      origin: { x: 11, y: 9 },
      rotation: 0,
    });
    const rotated = evaluatePlacementPreview(state, config, {
      definitionId: 'access_path',
      origin: { x: 11, y: 9 },
      rotation: 90,
    });

    expect(upright.isValid).toBe(true);
    expect(rotated.isValid).toBe(false);
    expect(rotated.primaryMessage).toMatch(/bounds|lot/i);
  });

  it('detects tile membership inside a footprint', () => {
    const footprint = {
      origin: { x: 3, y: 6 },
      width: 2,
      height: 3,
      rotation: 0 as const,
    };

    expect(tileInFootprint({ x: 3, y: 6 }, footprint)).toBe(true);
    expect(tileInFootprint({ x: 5, y: 6 }, footprint)).toBe(false);
  });
});

describe('gameStore', () => {
  it('selects and clears buildings without mutating domain state directly', () => {
    const initial = createInitialGameStoreState();
    useGameStore.setState(initial);

    useGameStore.getState().selectBuilding('building-1');

    expect(useGameStore.getState().ui.selectedBuildingId).toBe('building-1');
    expect(useGameStore.getState().ui.selectedCatalogItemId).toBeNull();
    expect(useGameStore.getState().gameState).toEqual(initial.gameState);
  });

  it('enters and cancels placement preview mode', () => {
    const initial = createInitialGameStoreState();
    useGameStore.setState(initial);

    useGameStore.getState().selectCatalogItem('small_park');
    useGameStore.getState().setPlacementOrigin({ x: 1, y: 1 });

    expect(useGameStore.getState().ui.selectedCatalogItemId).toBe('small_park');
    expect(useGameStore.getState().ui.placementPreview?.origin).toEqual({ x: 1, y: 1 });

    useGameStore.getState().cancelPlacement();

    expect(useGameStore.getState().ui.selectedCatalogItemId).toBeNull();
    expect(useGameStore.getState().ui.placementPreview).toBeNull();
  });

  it('rotates placement preview between 0 and 90 degrees', () => {
    const initial = createInitialGameStoreState();
    useGameStore.setState(initial);

    useGameStore.getState().selectCatalogItem('small_park');
    expect(useGameStore.getState().ui.placementPreview?.rotation).toBe(0);

    useGameStore.getState().rotatePlacementPreview();
    expect(useGameStore.getState().ui.placementPreview?.rotation).toBe(90);

    useGameStore.getState().rotatePlacementPreview();
    expect(useGameStore.getState().ui.placementPreview?.rotation).toBe(0);
  });
});
