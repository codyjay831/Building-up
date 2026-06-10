import { describe, expect, it } from 'vitest';

import { createGameConfig, createStarterGameState } from '@/game/config/scenario';
import { getBuildingDefinition } from '@/game/config/buildings';
import { validatePlacement } from '@/game/domain/placement';
import {
  findStrandedBuilding,
  validateAccessPathConnection,
  validateAntiStranding,
  validateBuildingRemoval,
  simulateBuildingsAfterPlacement,
} from '@/game/domain/roadAccessValidation';

describe('road access validation', () => {
  const config = createGameConfig();
  const starterState = createStarterGameState();

  it('finds no stranded buildings on a new starter game', () => {
    expect(findStrandedBuilding(starterState, config)).toBeNull();
  });

  it('rejects access path disconnected from the network', () => {
    const validation = validatePlacement({
      state: starterState,
      config,
      definition: getBuildingDefinition(config.buildings, 'access_path'),
      footprint: { origin: { x: 0, y: 0 }, width: 1, height: 3, rotation: 0 },
    });

    expect(validation.ok).toBe(false);
    if (validation.ok) {
      return;
    }

    expect(validation.reason).toBe('access_path_disconnected');
  });

  it('allows access path extending from the existing network', () => {
    const buildingsForCheck = starterState.buildings;
    const connected = validateAccessPathConnection(
      starterState,
      config,
      { origin: { x: 5, y: 4 }, width: 1, height: 3, rotation: 0 },
      buildingsForCheck,
    );

    expect(connected).toBe(true);
  });

  it('rejects road-required building without network access', () => {
    const smallHouse = getBuildingDefinition(config.buildings, 'small_house');
    const validation = validatePlacement({
      state: starterState,
      config,
      definition: smallHouse,
      footprint: { origin: { x: 0, y: 0 }, width: 2, height: 3, rotation: 0 },
    });

    expect(validation.ok).toBe(false);
    if (validation.ok) {
      return;
    }

    expect(validation.reason).toBe('no_road_access');
  });

  it('blocks placement that would cut road access to the starter house', () => {
    const houseOnly = starterState.buildings.filter(
      (building) => building.definitionId === 'existing_house',
    );
    const antiStranding = validateAntiStranding(starterState, config, houseOnly);

    expect(antiStranding.ok).toBe(false);
    if (antiStranding.ok) {
      return;
    }

    expect(antiStranding.reason).toBe('blocks_road_access');
  });

  it('blocks demolishing the starter access path while the house needs it', () => {
    const accessPathBuilding = starterState.buildings.find(
      (building) => building.definitionId === 'access_path',
    );
    expect(accessPathBuilding).toBeDefined();
    if (!accessPathBuilding) {
      return;
    }

    const removal = validateBuildingRemoval(starterState, config, accessPathBuilding.id);
    expect(removal.ok).toBe(false);
    if (removal.ok) {
      return;
    }

    expect(removal.reason).toBe('blocks_road_access');
  });

  it('simulates access path as operating when validating connection', () => {
    const buildingsAfter = simulateBuildingsAfterPlacement(
      starterState,
      { origin: { x: 5, y: 4 }, width: 1, height: 3, rotation: 0 },
      'access_path',
    );
    const smallHouse = getBuildingDefinition(config.buildings, 'small_house');
    const validation = validatePlacement({
      state: starterState,
      config,
      definition: smallHouse,
      footprint: { origin: { x: 3, y: 2 }, width: 2, height: 3, rotation: 0 },
    });

    expect(validation.ok).toBe(false);

    const reachableAfterPath = validateAccessPathConnection(
      starterState,
      config,
      { origin: { x: 5, y: 4 }, width: 1, height: 3, rotation: 0 },
      buildingsAfter.filter((building) => building.id !== '__simulated__'),
    );
    expect(reachableAfterPath).toBe(true);
  });
});
