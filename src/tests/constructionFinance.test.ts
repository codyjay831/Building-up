import { describe, expect, it } from 'vitest';

import {
  getConstructionFinanceEra,
  loadConstructionFinanceEras,
} from '@/game/config/constructionFinance';
import {
  calculateConstructionLoanInterest,
  calculateConstructionLoanTerms,
  calculateLoanDisbursementSchedule,
  estimateConstructionInterestRange,
} from '@/game/domain/debt';
import { createGameConfig } from '@/game/config/scenario';
import { getCalendarYear } from '@/game/domain/calendar';
import { createStarterGameState, RIVERSIDE_STARTER_SCENARIO_ID } from '@/game/config/scenario';

describe('construction finance eras', () => {
  const eras = loadConstructionFinanceEras();

  it('loads the configured era ladder', () => {
    expect(eras.length).toBeGreaterThanOrEqual(5);
    expect(getConstructionFinanceEra(eras, 1946).equityPercent).toBe(40);
    expect(getConstructionFinanceEra(eras, 1965).equityPercent).toBe(35);
    expect(getConstructionFinanceEra(eras, 1980).annualInterestRate).toBe(8.5);
    expect(getConstructionFinanceEra(eras, 2024).annualInterestRate).toBe(7.5);
  });

  it('derives calendar year from scenario start year and month', () => {
    const config = createGameConfig();
    const state = createStarterGameState(RIVERSIDE_STARTER_SCENARIO_ID);

    expect(getCalendarYear(state, config)).toBe(1946);
    expect(getCalendarYear({ ...state, month: 13 }, config)).toBe(1947);
  });
});

describe('construction loan math', () => {
  const config = createGameConfig();
  const era = getConstructionFinanceEra(config.constructionFinanceEras, 1946);

  it('splits lender disbursements across build months', () => {
    expect(calculateLoanDisbursementSchedule(51_000, 3)).toEqual([17_000, 17_000, 17_000]);
  });

  it('estimates the first and peak interest payments during construction', () => {
    const range = estimateConstructionInterestRange(51_000, 3, 4.5);

    expect(range.firstMonth).toBe(64);
    expect(range.peakMonth).toBe(191);
  });

  it('builds loan terms from era assumptions', () => {
    const terms = calculateConstructionLoanTerms(85_000, era, config.balance, 3);

    expect(terms.equityRequired).toBe(34_000);
    expect(terms.loanPrincipal).toBe(51_000);
    expect(terms.estimatedFirstMonthInterest).toBe(64);
    expect(terms.estimatedPeakMonthInterest).toBe(191);
    expect(calculateConstructionLoanInterest(17_000, 4.5)).toBe(terms.estimatedFirstMonthInterest);
  });
});
