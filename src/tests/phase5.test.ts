import { describe, expect, it, vi } from 'vitest';

import { advanceMonth } from '@/game/commands/advanceMonth';
import { setRentPosture } from '@/game/commands/setRentPosture';
import {
  createGameConfig,
  createStarterGameState,
  RIVERSIDE_STARTER_SCENARIO_ID,
} from '@/game/config/scenario';
import { advanceMarketDemand } from '@/game/domain/demand';
import {
  calculateEffectiveRetailDemand,
  calculateLeasingScore,
  processMonthlyLeasing,
} from '@/game/domain/leasing';
import * as prng from '@/game/domain/prng';
import { calculatePropertyParking } from '@/game/domain/parking';
import { simulateMonth } from '@/game/domain/simulateMonth';
import type { BuildingInstance, GameState } from '@/game/domain/types';

function withBuildingPatch(
  state: GameState,
  buildingId: string,
  patch: Partial<BuildingInstance>,
): GameState {
  return {
    ...state,
    buildings: state.buildings.map((building) =>
      building.id === buildingId ? { ...building, ...patch } : building,
    ),
  };
}

function withExtraBuilding(state: GameState, building: BuildingInstance): GameState {
  return {
    ...state,
    buildings: [...state.buildings, building],
  };
}

describe('market demand', () => {
  const config = createGameConfig();
  const state = createStarterGameState(RIVERSIDE_STARTER_SCENARIO_ID, 'phase5-demand-seed');

  it('drifts deterministically toward scenario baselines with seeded variation', () => {
    const first = advanceMarketDemand(state.market, config.balance, state.seed, 0);
    const second = advanceMarketDemand(state.market, config.balance, state.seed, 0);

    expect(first.market).toEqual(second.market);
    expect(first.market.residentialDemand).toBeGreaterThanOrEqual(0);
    expect(first.market.residentialDemand).toBeLessThanOrEqual(100);
  });
});

describe('leasing score', () => {
  const config = createGameConfig();
  const state = createStarterGameState(RIVERSIDE_STARTER_SCENARIO_ID);
  it('gives discount a higher score than premium for the same building', () => {
    expect(state.buildings[0]).toBeDefined();
    expect(config.buildings.get('existing_house')).toBeDefined();

    const building = state.buildings[0];
    const definition = config.buildings.get('existing_house') as NonNullable<
      ReturnType<typeof config.buildings.get>
    >;
    const parking = calculatePropertyParking(state, config);

    const discountScore = calculateLeasingScore(
      { ...building, rentPosture: 'discount' },
      definition,
      state.market.residentialDemand,
      state.appeal,
      parking,
      config.balance,
    );
    const premiumScore = calculateLeasingScore(
      { ...building, rentPosture: 'premium' },
      definition,
      state.market.residentialDemand,
      state.appeal,
      parking,
      config.balance,
    );

    expect(discountScore.total).toBeGreaterThan(premiumScore.total);
    expect(discountScore.rentPosture).toBe(config.balance.discountLeasingModifier);
    expect(premiumScore.rentPosture).toBe(config.balance.premiumLeasingModifier);
  });
});

describe('effective retail demand', () => {
  const config = createGameConfig();
  const starter = createStarterGameState(RIVERSIDE_STARTER_SCENARIO_ID);

  it('boosts retail demand from occupied residential units', () => {
    const parking = calculatePropertyParking(starter, config);
    const baseline = calculateEffectiveRetailDemand(starter, config, config.balance, parking);

    expect(baseline.residentCustomerBoost).toBe(3);
    expect(baseline.effective).toBeGreaterThan(baseline.baseDemand);
  });

  it('applies a stronger parking shortage penalty to retail demand', () => {
    const cornerShop: BuildingInstance = {
      id: 'building-shop',
      definitionId: 'corner_shop',
      footprint: { origin: { x: 0, y: 0 }, width: 3, height: 3, rotation: 0 },
      lifecycleState: 'operating',
      condition: 80,
      residentialOccupied: 0,
      retailOccupied: 0,
      rentPosture: 'market',
      renovated: false,
    };

    const withShop = withExtraBuilding(starter, cornerShop);
    const parking = calculatePropertyParking(withShop, config);
    const retailDemand = calculateEffectiveRetailDemand(withShop, config, config.balance, parking);

    expect(parking.shortfall).toBeGreaterThan(0);
    expect(retailDemand.parkingPenalty).toBeGreaterThan(0);
    expect(retailDemand.effective).toBeLessThan(retailDemand.baseDemand);
  });
});

describe('occupancy movement', () => {
  const config = createGameConfig();

  it('can move a vacant retail unit in under strong demand with discount posture', () => {
    const nextRandomSpy = vi
      .spyOn(prng, 'nextRandom')
      .mockReturnValue([0, { state: 1, counter: 1 }]);

    const cornerShop: BuildingInstance = {
      id: 'building-shop',
      definitionId: 'corner_shop',
      footprint: { origin: { x: 0, y: 0 }, width: 3, height: 3, rotation: 0 },
      lifecycleState: 'leasing',
      condition: 85,
      residentialOccupied: 0,
      retailOccupied: 0,
      rentPosture: 'discount',
      renovated: false,
    };

    let state = withExtraBuilding(
      createStarterGameState(RIVERSIDE_STARTER_SCENARIO_ID, 'phase5-leasing-seed'),
      cornerShop,
    );
    state = {
      ...state,
      market: {
        ...state.market,
        retailDemand: 70,
        residentialDemand: 70,
      },
      appeal: 70,
    };

    const parking = calculatePropertyParking(state, config);
    const result = processMonthlyLeasing(state, config, config.balance, state.appeal, parking, 0);
    const shop = result.state.buildings.find((building) => building.id === 'building-shop');

    expect(shop?.retailOccupied).toBe(1);
    expect(result.changes).toHaveLength(1);

    nextRandomSpy.mockRestore();
  });

  it('produces deterministic occupancy results for the same seed', () => {
    const vacantHouse = withBuildingPatch(
      createStarterGameState(RIVERSIDE_STARTER_SCENARIO_ID, 'phase5-occ-seed'),
      'building-1',
      {
        residentialOccupied: 0,
        lifecycleState: 'leasing',
        rentPosture: 'discount',
      },
    );

    const parking = calculatePropertyParking(vacantHouse, config);
    const first = processMonthlyLeasing(
      vacantHouse,
      config,
      config.balance,
      vacantHouse.appeal,
      parking,
      0,
    );
    const second = processMonthlyLeasing(
      vacantHouse,
      config,
      config.balance,
      vacantHouse.appeal,
      parking,
      0,
    );

    expect(first.state.buildings[0]?.residentialOccupied).toBe(
      second.state.buildings[0]?.residentialOccupied,
    );
  });
});

describe('monthly ledger occupancy changes', () => {
  const config = createGameConfig();

  it('records occupancy changes on the monthly ledger entry', () => {
    const nextRandomSpy = vi
      .spyOn(prng, 'nextRandom')
      .mockReturnValue([0, { state: 1, counter: 1 }]);

    const cornerShop: BuildingInstance = {
      id: 'building-shop',
      definitionId: 'corner_shop',
      footprint: { origin: { x: 0, y: 0 }, width: 3, height: 3, rotation: 0 },
      lifecycleState: 'leasing',
      condition: 85,
      residentialOccupied: 0,
      retailOccupied: 0,
      rentPosture: 'discount',
      renovated: false,
    };

    let state = withExtraBuilding(
      createStarterGameState(RIVERSIDE_STARTER_SCENARIO_ID, 'phase5-ledger-occ'),
      cornerShop,
    );
    state = {
      ...state,
      market: {
        ...state.market,
        retailDemand: 70,
        residentialDemand: 70,
      },
      appeal: 70,
    };

    const result = advanceMonth(state, config);
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    const entry = result.state.ledger.find((ledgerEntry) => ledgerEntry.kind === 'monthly');
    expect(entry?.occupancyChanges?.length).toBeGreaterThan(0);

    nextRandomSpy.mockRestore();
  });
});

describe('setRentPosture command', () => {
  const config = createGameConfig();
  const state = createStarterGameState(RIVERSIDE_STARTER_SCENARIO_ID);

  it('updates building rent posture immediately', () => {
    const result = setRentPosture(state, config, {
      buildingId: 'building-1',
      posture: 'discount',
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.state.buildings[0]?.rentPosture).toBe('discount');
  });
});

describe('simulateMonth with demand and leasing', () => {
  const config = createGameConfig();

  it('remains deterministic with demand and leasing enabled', () => {
    const first = simulateMonth(
      createStarterGameState(RIVERSIDE_STARTER_SCENARIO_ID, 'phase5-month-seed'),
      config,
    );
    const second = simulateMonth(
      createStarterGameState(RIVERSIDE_STARTER_SCENARIO_ID, 'phase5-month-seed'),
      config,
    );

    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    if (!first.ok || !second.ok) {
      return;
    }

    expect(first.state).toEqual(second.state);
  });

  it('advances market demand through the command boundary', () => {
    const state = createStarterGameState(RIVERSIDE_STARTER_SCENARIO_ID, 'phase5-advance-seed');
    const result = advanceMonth(state, config);

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.state.month).toBe(2);
    expect(result.state.market.residentialDemand).not.toBe(state.market.residentialDemand);
    expect(result.events.some((event) => event.type === 'MarketDemandChanged')).toBe(true);
  });
});
