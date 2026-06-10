import { describe, expect, it } from 'vitest';

import { placeProject } from '@/game/commands/placeProject';
import { demolishBuilding, sellBuilding } from '@/game/commands/redevelopBuilding';
import { renovateBuilding } from '@/game/commands/renovateBuilding';
import {
  createGameConfig,
  createStarterGameState,
  RIVERSIDE_STARTER_SCENARIO_ID,
} from '@/game/config/scenario';
import {
  applyApprovalUnlocks,
  checkApprovalLevel2Unlock,
  getApprovalProgressView,
} from '@/game/domain/progression';
import { simulateMonth } from '@/game/domain/simulateMonth';
import { calculateBuildingSaleProceeds, calculateDemolitionCost } from '@/game/domain/valuation';
import { applyWinProgress, checkWinConditionsMet } from '@/game/domain/winLoss';
import { validatePlacement } from '@/game/domain/placement';
import { getBuildingDefinition } from '@/game/config/buildings';
import type { BuildingInstance, GameState } from '@/game/domain/types';

function withStatePatch(state: GameState, patch: Partial<GameState>): GameState {
  return { ...state, ...patch };
}

describe('approval progression', () => {
  const config = createGameConfig();
  const starter = createStarterGameState(RIVERSIDE_STARTER_SCENARIO_ID, 'phase6-approval');

  it('does not unlock Approval Level 2 until all conditions are met', () => {
    const almostReady = withStatePatch(starter, {
      cash: 50_000,
      counters: {
        ...starter.counters,
        consecutivePositiveCashFlowMonths: 2,
      },
    });

    expect(checkApprovalLevel2Unlock(almostReady, config, config.balance)).toBe(false);

    const ready = withStatePatch(almostReady, {
      counters: {
        ...almostReady.counters,
        consecutivePositiveCashFlowMonths: 3,
      },
    });

    expect(checkApprovalLevel2Unlock(ready, config, config.balance)).toBe(true);
  });

  it('exposes deterministic unlock progress in the UI view', () => {
    const view = getApprovalProgressView(starter, config, config.balance);
    const level2 = view.levels.find((level) => level.level === 2);

    expect(level2?.unlocked).toBe(false);
    expect(level2?.conditions).toHaveLength(3);
    expect(level2?.conditions.every((condition) => typeof condition.met === 'boolean')).toBe(true);
  });

  it('unlocks Approval Level 2 during monthly simulation when thresholds are met', () => {
    const ready = withStatePatch(starter, {
      cash: 50_000,
      counters: {
        ...starter.counters,
        consecutivePositiveCashFlowMonths: 2,
      },
    });

    const unlocked = applyApprovalUnlocks(
      withStatePatch(ready, {
        counters: {
          ...ready.counters,
          consecutivePositiveCashFlowMonths: 3,
        },
      }),
      config,
      config.balance,
    );

    expect(unlocked.approval.level).toBe(2);
    expect(unlocked.approval.unlockedLevels).toContain(2);
  });
});

describe('redevelopment commands', () => {
  const config = createGameConfig();
  const starter = createStarterGameState(RIVERSIDE_STARTER_SCENARIO_ID, 'phase6-redevelop');

  it('renovates a building once and records the ledger cost', () => {
    const result = renovateBuilding(starter, config, { buildingId: 'building-1' });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.state.cash).toBe(starter.cash - config.balance.renovationCost);
    expect(result.state.buildings[0]?.lifecycleState).toBe('renovating');
    expect(result.state.ledger.at(-1)?.lines[0]?.category).toBe('renovation_cost');
  });

  it('rejects a second renovation on the same building', () => {
    expect(starter.buildings[0]).toBeDefined();
    const starterBuilding = starter.buildings[0];
    const renovated = withStatePatch(starter, {
      buildings: [
        {
          ...starterBuilding,
          renovated: true,
        },
      ],
    });

    const result = renovateBuilding(renovated, config, { buildingId: 'building-1' });
    expect(result.ok).toBe(false);
  });

  it('completes renovation after one monthly advancement', () => {
    expect(starter.buildings[0]).toBeDefined();
    const starterBuilding = starter.buildings[0];
    const renovating = withStatePatch(starter, {
      buildings: [
        {
          ...starterBuilding,
          lifecycleState: 'renovating',
          condition: 60,
        },
      ],
    });

    const next = simulateMonth(renovating, config);
    expect(next.ok).toBe(true);
    if (!next.ok) {
      return;
    }

    expect(next.state.buildings[0]?.lifecycleState).toBe('operating');
    expect(next.state.buildings[0]?.renovated).toBe(true);
    expect(next.state.buildings[0]?.condition).toBe(80);
  });

  it('demolishes a building with a ledger entry and clears the footprint', () => {
    const definition = getBuildingDefinition(config.buildings, 'existing_house');
    const cost = calculateDemolitionCost(definition, config.balance);
    const result = demolishBuilding(starter, config, { buildingId: 'building-1' });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.state.buildings).toHaveLength(1);
    expect(result.state.cash).toBe(starter.cash - cost);
    expect(result.state.ledger.at(-1)?.lines[0]?.category).toBe('demolition_cost');
  });

  it('sells a building for configured proceeds', () => {
    const definition = getBuildingDefinition(config.buildings, 'existing_house');
    expect(starter.buildings[0]).toBeDefined();
    const starterBuilding = starter.buildings[0];
    const proceeds = calculateBuildingSaleProceeds(starterBuilding, definition, config.balance);
    const result = sellBuilding(starter, config, { buildingId: 'building-1' });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.state.buildings).toHaveLength(1);
    expect(result.state.cash).toBe(starter.cash + proceeds);
    expect(result.state.ledger.at(-1)?.lines[0]?.category).toBe('sale_proceeds');
  });
});

describe('placement locks', () => {
  const config = createGameConfig();
  const starter = createStarterGameState(RIVERSIDE_STARTER_SCENARIO_ID);

  it('blocks shop + apartments before Approval Level 2', () => {
    const definition = getBuildingDefinition(config.buildings, 'shop_apartments');
    const validation = validatePlacement({
      state: starter,
      config,
      definition,
      footprint: {
        origin: { x: 0, y: 0 },
        width: definition.footprint.width,
        height: definition.footprint.height,
        rotation: 0,
      },
    });

    expect(validation.ok).toBe(false);
    if (validation.ok) {
      return;
    }

    expect(validation.reason).toBe('insufficient_approval');
  });
});

describe('mixed-use win objective', () => {
  const config = createGameConfig();

  it('requires an operating mixed-use building and three stable months', () => {
    const mixedUseBuilding: BuildingInstance = {
      id: 'building-mixed',
      definitionId: 'shop_apartments',
      footprint: { origin: { x: 0, y: 0 }, width: 3, height: 3, rotation: 0 },
      lifecycleState: 'operating',
      condition: 90,
      residentialOccupied: 2,
      retailOccupied: 1,
      rentPosture: 'market',
      renovated: false,
    };

    let state = withStatePatch(
      createStarterGameState(RIVERSIDE_STARTER_SCENARIO_ID, 'phase6-win'),
      {
        approval: { level: 2, unlockedLevels: [1, 2] },
        cash: 80_000,
        appeal: 70,
        buildings: [mixedUseBuilding],
        counters: {
          ...createStarterGameState(RIVERSIDE_STARTER_SCENARIO_ID).counters,
          consecutiveWinConditionMonths: 2,
        },
      },
    );

    const met = checkWinConditionsMet(state, config, config.balance, 15_000, 100);
    expect(met).toBe(true);

    state = applyWinProgress(state, config, config.balance, 15_000, 100);
    expect(state.status).toBe('won');
    expect(state.counters.consecutiveWinConditionMonths).toBe(3);
  });

  it('can reach win through applyWinProgress after stable months', () => {
    const mixedUseBuilding: BuildingInstance = {
      id: 'building-mixed',
      definitionId: 'shop_apartments',
      footprint: { origin: { x: 0, y: 0 }, width: 3, height: 3, rotation: 0 },
      lifecycleState: 'operating',
      condition: 95,
      residentialOccupied: 2,
      retailOccupied: 1,
      rentPosture: 'market',
      renovated: false,
    };

    const state = withStatePatch(
      createStarterGameState(RIVERSIDE_STARTER_SCENARIO_ID, 'phase6-win-path'),
      {
        approval: { level: 2, unlockedLevels: [1, 2] },
        cash: 120_000,
        appeal: 70,
        buildings: [mixedUseBuilding],
        counters: {
          ...createStarterGameState(RIVERSIDE_STARTER_SCENARIO_ID).counters,
          consecutiveWinConditionMonths: 2,
        },
      },
    );

    const won = applyWinProgress(state, config, config.balance, 15_000, 100);
    expect(won.status).toBe('won');
  });
});

describe('starter scenario win path setup', () => {
  const config = createGameConfig();

  it('allows committing shop + apartments after approval unlock and demolition', () => {
    const demolished = demolishBuilding(
      createStarterGameState(RIVERSIDE_STARTER_SCENARIO_ID, 'phase6-starter-win'),
      config,
      { buildingId: 'building-1' },
    );
    expect(demolished.ok).toBe(true);
    if (!demolished.ok) {
      return;
    }

    const state = withStatePatch(demolished.state, {
      approval: { level: 2, unlockedLevels: [1, 2] },
      cash: 300_000,
    });

    const definition = getBuildingDefinition(config.buildings, 'shop_apartments');
    const commit = placeProject(state, config, {
      definitionId: 'shop_apartments',
      footprint: {
        origin: { x: 6, y: 6 },
        width: definition.footprint.width,
        height: definition.footprint.height,
        rotation: 0,
      },
    });

    expect(commit.ok).toBe(true);
  });
});
