import { describe, expect, it } from 'vitest';

import { advanceMonth } from '@/game/commands/advanceMonth';
import { createGameConfig, createStarterGameState, RIVERSIDE_STARTER_SCENARIO_ID } from '@/game/config/scenario';
import { calculateAppeal } from '@/game/domain/appeal';
import { applyConditionDecay } from '@/game/domain/condition';
import { calculateMonthlyEconomy } from '@/game/domain/economy';
import { reconcileLedgerEntry } from '@/game/domain/ledger';
import { calculatePropertyParking } from '@/game/domain/parking';
import { simulateMonth } from '@/game/domain/simulateMonth';

describe('property parking', () => {
  const config = createGameConfig();
  const state = createStarterGameState(RIVERSIDE_STARTER_SCENARIO_ID);

  it('calculates driveway capacity and building demand', () => {
    const parking = calculatePropertyParking(state, config);

    expect(parking.capacity).toBe(2);
    expect(parking.demand).toBe(1);
    expect(parking.shortfall).toBe(0);
    expect(parking.coverage).toBe(1);
  });
});

describe('appeal and condition', () => {
  const config = createGameConfig();
  const state = createStarterGameState(RIVERSIDE_STARTER_SCENARIO_ID);

  it('recalculates appeal from property factors', () => {
    const parking = calculatePropertyParking(state, config);
    const appeal = calculateAppeal(state, config, config.balance, parking);

    expect(appeal).toBeGreaterThanOrEqual(0);
    expect(appeal).toBeLessThanOrEqual(100);
    expect(appeal).toBe(43);
  });

  it('decays revenue building condition each month', () => {
    const next = applyConditionDecay(state, config, config.balance);

    expect(next.buildings[0]?.condition).toBe(71);
  });
});

describe('monthly economy', () => {
  const config = createGameConfig();
  const state = createStarterGameState(RIVERSIDE_STARTER_SCENARIO_ID);

  it('collects rent and operating expenses for the starter house', () => {
    const economy = calculateMonthlyEconomy(state, config, config.balance, 'ledger-test');

    expect(economy.grossRent).toBe(2_200);
    expect(economy.operatingExpenses).toBe(650);
    expect(economy.rentLines).toHaveLength(1);
    expect(economy.expenseLines).toHaveLength(1);
  });
});

describe('simulateMonth pipeline', () => {
  const config = createGameConfig();

  it('produces deterministic monthly results for the same seed', () => {
    const first = simulateMonth(createStarterGameState(RIVERSIDE_STARTER_SCENARIO_ID, 'phase4-seed'), config);
    const second = simulateMonth(createStarterGameState(RIVERSIDE_STARTER_SCENARIO_ID, 'phase4-seed'), config);

    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    if (!first.ok || !second.ok) {
      return;
    }

    expect(first.state.cash).toBe(second.state.cash);
    expect(first.state.appeal).toBe(second.state.appeal);
    expect(first.state.buildings[0]?.condition).toBe(second.state.buildings[0]?.condition);
    expect(first.state.ledger).toEqual(second.state.ledger);
  });

  it('records a reconciled monthly ledger entry with every cash change', () => {
    const result = simulateMonth(createStarterGameState(RIVERSIDE_STARTER_SCENARIO_ID), config);

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.state.month).toBe(2);
    expect(result.state.cash).toBe(181_550);
    expect(result.state.ledger).toHaveLength(1);

    const entry = result.state.ledger[0];
    expect(entry.kind).toBe('monthly');
    expect(entry.grossRent).toBe(2_200);
    expect(entry.operatingExpenses).toBe(650);
    expect(entry.netCashFlow).toBe(1_550);
    expect(entry.lines).toHaveLength(2);
    expect(reconcileLedgerEntry(entry)).toBe(true);
    expect(result.events.at(-1)).toEqual({
      type: 'MonthSimulated',
      month: 2,
      netCashFlow: 1_550,
    });
  });

  it('advances month through the command boundary with config', () => {
    const state = createStarterGameState(RIVERSIDE_STARTER_SCENARIO_ID);
    const result = advanceMonth(state, config);

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.state.month).toBe(2);
    expect(result.state.counters.consecutivePositiveCashFlowMonths).toBe(1);
  });
});
