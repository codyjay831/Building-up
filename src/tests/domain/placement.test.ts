import { describe, expect, it } from 'vitest';

import { loadBuildingDefinitions } from '@/game/config/buildings';
import { loadBalanceAssumptions } from '@/game/config/balance';
import {
  createGameConfig,
  createStarterGameState,
  RIVERSIDE_STARTER_SCENARIO_ID,
} from '@/game/config/scenario';
import { placeStructure, validatePlacement } from '@/game/domain/placement';
import { getBuildingDefinition } from '@/game/config/buildings';

describe('starter scenario', () => {
  const config = createGameConfig();

  it('creates the riverside starter run', () => {
    const state = createStarterGameState('riverside_starter', 'starter-balanced');

    expect(state.scenarioId).toBe(RIVERSIDE_STARTER_SCENARIO_ID);
    expect(state.month).toBe(1);
    expect(state.cash).toBe(config.balance.startingCash);
    expect(state.approval.level).toBe(1);
    expect(state.buildings).toHaveLength(2);
    expect(state.buildings[0]?.definitionId).toBe('existing_house');
    expect(state.buildings[1]?.definitionId).toBe('access_path');
    expect(state.lot.accessParkingCapacity).toBe(2);
    expect(state.market.residentialDemand).toBe(55);
    expect(state.market.retailDemand).toBe(32);
    expect(state.appeal).toBe(config.balance.baseAppeal);
  });

  it('creates the riverside starter run by default', () => {
    const state = createStarterGameState();

    expect(state.scenarioId).toBe(RIVERSIDE_STARTER_SCENARIO_ID);
    expect(state.buildings).toHaveLength(2);
  });
});

describe('configuration loaders', () => {
  it('loads building definitions from JSON', () => {
    const buildings = loadBuildingDefinitions();

    expect(buildings.some((building) => building.id === 'shop_apartments')).toBe(true);
    expect(buildings.every((building) => building.footprint.width > 0)).toBe(true);
  });

  it('loads balance assumptions from CSV', () => {
    const balance = loadBalanceAssumptions();

    expect(balance.startingCash).toBe(180_000);
    expect(balance.discountRentMultiplier).toBe(0.85);
    expect(balance.premiumRentMultiplier).toBe(1.18);
  });

  it('bundles config maps for domain use', () => {
    const config = createGameConfig();

    expect(config.buildings.size).toBeGreaterThan(0);
    expect(config.scenarios.has(RIVERSIDE_STARTER_SCENARIO_ID)).toBe(true);
  });
});

describe('placement validation', () => {
  const config = createGameConfig();
  const starterState = createStarterGameState(RIVERSIDE_STARTER_SCENARIO_ID);

  it('places a valid structure in a headless test', () => {
    const footprint = {
      origin: { x: 6, y: 6 },
      width: 2,
      height: 3,
      rotation: 0,
    } as const;

    const result = placeStructure(starterState, config, 'small_house', footprint);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.state.buildings).toHaveLength(3);
      expect(result.state.buildings[2]?.lifecycleState).toBe('planned');
      expect(result.state.counters.nextBuildingSequence).toBe(4);
    }
  });

  it('rejects off-lot placement', () => {
    const definition = getBuildingDefinition(config.buildings, 'small_house');
    const validation = validatePlacement({
      state: starterState,
      config,
      definition,
      footprint: {
        origin: { x: 11, y: 10 },
        width: 2,
        height: 3,
        rotation: 0,
      },
    });

    expect(validation.ok).toBe(false);
    if (!validation.ok) {
      expect(validation.reason).toBe('out_of_bounds');
    }
  });

  it('rejects overlapping footprints', () => {
    const definition = getBuildingDefinition(config.buildings, 'small_house');
    const validation = validatePlacement({
      state: starterState,
      config,
      definition,
      footprint: starterState.buildings[0]?.footprint ?? {
        origin: { x: 0, y: 0 },
        width: 1,
        height: 1,
        rotation: 0,
      },
    });

    expect(validation.ok).toBe(false);
    if (!validation.ok) {
      expect(validation.reason).toBe('tile_occupied');
    }
  });

  it('rejects under-approved structures', () => {
    const underApproved = validatePlacement({
      state: {
        ...starterState,
        approval: { level: 1, unlockedLevels: [1] },
        cash: 500_000,
      },
      config,
      definition: getBuildingDefinition(config.buildings, 'shop_apartments'),
      footprint: {
        origin: { x: 7, y: 0 },
        width: 3,
        height: 3,
        rotation: 0,
      },
    });

    expect(underApproved.ok).toBe(false);
    if (!underApproved.ok) {
      expect(underApproved.reason).toBe('insufficient_approval');
    }
  });

  it('rejects driveway overlap and insufficient cash', () => {
    const parking = getBuildingDefinition(config.buildings, 'surface_parking');

    const drivewayOverlap = validatePlacement({
      state: starterState,
      config,
      definition: parking,
      footprint: {
        origin: { x: 5, y: 10 },
        width: 1,
        height: 2,
        rotation: 0,
      },
    });

    expect(drivewayOverlap.ok).toBe(false);
    if (!drivewayOverlap.ok) {
      expect(drivewayOverlap.reason).toBe('access_tile_blocked');
    }

    const poorState = { ...starterState, cash: 10_000 };
    const insufficientCash = validatePlacement({
      state: poorState,
      config,
      definition: getBuildingDefinition(config.buildings, 'small_house'),
      footprint: {
        origin: { x: 6, y: 6 },
        width: 2,
        height: 3,
        rotation: 0,
      },
    });

    expect(insufficientCash.ok).toBe(false);
    if (!insufficientCash.ok) {
      expect(insufficientCash.reason).toBe('insufficient_cash');
      expect(insufficientCash.message).toMatch(/commitment/i);
    }
  });
});
