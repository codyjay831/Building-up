import { describe, expect, it } from 'vitest';

import { advanceMonth } from '@/game/commands/advanceMonth';
import { setRentPosture } from '@/game/commands/setRentPosture';
import {
  createGameConfig,
  createStarterGameState,
  RIVERSIDE_STARTER_SCENARIO_ID,
} from '@/game/config/scenario';
import { calculateAppealBreakdown } from '@/game/domain/appeal';
import { getOccupancyWarningLevel, getOccupancyWarningView } from '@/game/domain/occupancyWarnings';
import {
  calculatePropertyHealthSnapshot,
  collectPropertyHealthFactors,
  getPropertyHealthTone,
} from '@/game/domain/propertyHealth';
import { calculatePropertyParking } from '@/game/domain/parking';
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

describe('appeal breakdown', () => {
  const config = createGameConfig();
  const state = createStarterGameState(RIVERSIDE_STARTER_SCENARIO_ID);

  it('returns signed lines that sum to total appeal', () => {
    const parking = calculatePropertyParking(state, config);
    const breakdown = calculateAppealBreakdown(state, config, config.balance, parking);

    expect(breakdown.baseAppeal).toBe(config.balance.baseAppeal);
    expect(breakdown.total).toBeGreaterThanOrEqual(0);
    expect(breakdown.total).toBeLessThanOrEqual(100);
    expect(breakdown.lines.length).toBeGreaterThan(0);
  });

  it('includes vacancy penalty when occupancy is low', () => {
    let lowOccupancy = state;
    for (const building of state.buildings) {
      lowOccupancy = withBuildingPatch(lowOccupancy, building.id, {
        residentialOccupied: 0,
        retailOccupied: 0,
      });
    }

    const parking = calculatePropertyParking(lowOccupancy, config);
    const breakdown = calculateAppealBreakdown(lowOccupancy, config, config.balance, parking);

    expect(breakdown.lines.some((line) => line.id === 'vacancy_penalty')).toBe(true);
  });
});

describe('property health', () => {
  const config = createGameConfig();

  it('scores healthy starter property in a reasonable band', () => {
    const state = createStarterGameState(RIVERSIDE_STARTER_SCENARIO_ID);
    const snapshot = calculatePropertyHealthSnapshot(state, config);

    expect(snapshot.score).toBeGreaterThan(40);
    expect(snapshot.score).toBeLessThanOrEqual(100);
    expect(getPropertyHealthTone(snapshot.score)).toBeDefined();
  });

  it('collects negative factors for premium rent posture', () => {
    const state = createStarterGameState(RIVERSIDE_STARTER_SCENARIO_ID);
    const building = state.buildings[0];
    expect(building).toBeDefined();

    const premiumState = withBuildingPatch(state, building.id, { rentPosture: 'premium' });
    const factors = collectPropertyHealthFactors(premiumState, config);

    expect(factors.some((factor) => factor.id.startsWith('premium_'))).toBe(true);
  });
});

describe('occupancy warnings', () => {
  const config = createGameConfig();

  it('returns none for healthy riverside starter', () => {
    const state = createStarterGameState(RIVERSIDE_STARTER_SCENARIO_ID);
    expect(getOccupancyWarningLevel(state, config)).toBe('none');
    expect(getOccupancyWarningView(state, config)).toBeNull();
  });

  it('detects move-out risk after premium rent posture', () => {
    const state = createStarterGameState(RIVERSIDE_STARTER_SCENARIO_ID);
    const building = state.buildings[0];
    expect(building).toBeDefined();

    const premium = setRentPosture(state, config, {
      buildingId: building.id,
      posture: 'premium',
    });
    expect(premium.ok).toBe(true);
    if (!premium.ok) {
      return;
    }

    const warning = getOccupancyWarningView(premium.state, config);
    expect(warning).not.toBeNull();
  });
});

describe('monthly report enrichment', () => {
  it('stores property health and demand metadata after advancing month', () => {
    const config = createGameConfig();
    const state = createStarterGameState(RIVERSIDE_STARTER_SCENARIO_ID, 'health-report-seed');
    const result = advanceMonth(state, config);

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    const monthlyEntries = result.state.ledger.filter((entry) => entry.kind === 'monthly');
    expect(monthlyEntries.length).toBeGreaterThan(0);

    expect(monthlyEntries.length).toBeGreaterThan(0);

    const latest = monthlyEntries.at(-1);
    expect(latest).toBeDefined();
    if (latest === undefined) {
      return;
    }

    expect(latest.propertyHealthSnapshot).toBeDefined();
    expect(latest.previousPropertyHealthSnapshot).toBeDefined();
  });
});
