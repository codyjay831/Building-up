import { describe, expect, it } from 'vitest';

import { acceptEmergencyOffer } from '@/game/commands/acceptEmergencyOffer';
import { advanceMonth } from '@/game/commands/advanceMonth';
import { placeProject } from '@/game/commands/placeProject';
import { refinanceProperty } from '@/game/commands/refinanceProperty';
import { getConstructionFinanceEra } from '@/game/config/constructionFinance';
import {
  createGameConfig,
  createStarterGameState,
  RIVERSIDE_STARTER_SCENARIO_ID,
} from '@/game/config/scenario';
import {
  calculateConstructionLoanInterest,
  calculateConstructionLoanTerms,
  calculateRefinanceCapacity,
  createConstructionLoanDebt,
  getTotalMonthlyDebtPayment,
} from '@/game/domain/debt';
import { calculatePropertyValue } from '@/game/domain/propertyValue';
import { hasValidRecoveryActions } from '@/game/domain/recovery';
import { simulateMonth } from '@/game/domain/simulateMonth';
import { getFinanceWarningView } from '@/game/domain/warnings';
import type { GameState } from '@/game/domain/types';

function withStatePatch(state: GameState, patch: Partial<GameState>): GameState {
  return { ...state, ...patch };
}

describe('construction loan', () => {
  const config = createGameConfig();
  const starter = createStarterGameState(RIVERSIDE_STARTER_SCENARIO_ID, 'phase7-loan');
  const era = getConstructionFinanceEra(config.constructionFinanceEras, 1946);

  it('requires era equity and creates inactive debt until completion', () => {
    const definition = config.buildings.get('corner_shop');
    expect(definition).toBeDefined();

    const terms = calculateConstructionLoanTerms(
      definition?.constructionCost ?? 0,
      era,
      config.balance,
      definition?.constructionMonths ?? 1,
    );
    expect(terms.equityRequired).toBe(48_000);
    expect(terms.loanPrincipal).toBe(72_000);

    const result = placeProject(starter, config, {
      definitionId: 'corner_shop',
      footprint: {
        origin: { x: 8, y: 9 },
        width: 3,
        height: 3,
        rotation: 0,
      },
      useConstructionLoan: true,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.state.cash).toBe(starter.cash - terms.equityRequired);
    expect(result.state.debt).toHaveLength(1);
    expect(result.state.debt[0]?.type).toBe('construction_loan');
    expect(result.state.debt[0]?.paymentsActive).toBe(false);
    expect(result.state.debt[0]?.disbursedPrincipal).toBe(0);
    expect(result.state.projects[0]?.financedWithLoan).toBe(true);
  });

  it('charges interest-only payments during construction and principal after completion', () => {
    const definition = config.buildings.get('corner_shop');
    expect(definition).toBeDefined();

    const terms = calculateConstructionLoanTerms(
      definition?.constructionCost ?? 0,
      era,
      config.balance,
      definition?.constructionMonths ?? 1,
    );

    const commit = placeProject(starter, config, {
      definitionId: 'corner_shop',
      footprint: {
        origin: { x: 8, y: 9 },
        width: 3,
        height: 3,
        rotation: 0,
      },
      useConstructionLoan: true,
    });

    expect(commit.ok).toBe(true);
    if (!commit.ok) {
      return;
    }

    let state = commit.state;
    const buildMonths = definition?.constructionMonths ?? 1;

    for (let monthIndex = 0; monthIndex < buildMonths; monthIndex += 1) {
      const advanced = advanceMonth(state, config);
      expect(advanced.ok).toBe(true);
      if (!advanced.ok) {
        return;
      }

      state = advanced.state;
      const debt = state.debt[0];
      expect(debt?.disbursedPrincipal).toBeGreaterThan(0);

      const entry = state.ledger.find((ledgerEntry) => ledgerEntry.month === state.month);
      const interestLine = entry?.lines.find(
        (line) => line.category === 'construction_loan_interest',
      );
      expect(interestLine).toBeDefined();
      expect(interestLine?.amount).toBeLessThan(0);
    }

    expect(state.projects[0]?.status).toBe('completed');
    expect(state.debt[0]?.paymentsActive).toBe(true);

    const completionEntry = state.ledger
      .filter((ledgerEntry) => ledgerEntry.kind === 'monthly')
      .at(-1);
    const debtLine = completionEntry?.lines.find((line) => line.category === 'debt_payment');

    expect(debtLine).toBeDefined();
    expect(debtLine?.amount).toBe(-terms.monthlyPayment);
    expect(getTotalMonthlyDebtPayment(state)).toBe(terms.monthlyPayment);
  });

  it('posts debt payments in the monthly ledger after completion', () => {
    const loanTerms = calculateConstructionLoanTerms(120_000, era, config.balance, 3);
    const debt = createConstructionLoanDebt('debt-1', 'project-1', loanTerms);
    const withActiveDebt = withStatePatch(starter, {
      debt: [{ ...debt, paymentsActive: true }],
    });

    const result = simulateMonth(withActiveDebt, config);
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    const entry = result.state.ledger.find((ledgerEntry) => ledgerEntry.kind === 'monthly');
    const debtLine = entry?.lines.find((line) => line.category === 'debt_payment');

    expect(debtLine).toBeDefined();
    expect(debtLine?.amount).toBe(-loanTerms.monthlyPayment);
    expect(getTotalMonthlyDebtPayment(result.state)).toBe(loanTerms.monthlyPayment);
  });

  it('calculates monthly construction interest from disbursed principal', () => {
    expect(calculateConstructionLoanInterest(17_000, 4.5)).toBe(64);
    expect(calculateConstructionLoanInterest(51_000, 4.5)).toBe(191);
  });
});

describe('refinance', () => {
  const config = createGameConfig();
  const starter = createStarterGameState(RIVERSIDE_STARTER_SCENARIO_ID, 'phase7-refinance');

  it('respects the property value cap', () => {
    const propertyValue = calculatePropertyValue(starter, config, config.balance);
    const capacity = calculateRefinanceCapacity(starter, config);
    const maxBorrowing = Math.round((propertyValue * config.balance.refinanceMaxLtvPercent) / 100);

    expect(capacity).toBe(maxBorrowing);
  });

  it('can only be used once per run', () => {
    const first = refinanceProperty(starter, config);
    expect(first.ok).toBe(true);

    if (!first.ok) {
      return;
    }

    const second = refinanceProperty(first.state, config);
    expect(second.ok).toBe(false);
    if (second.ok) {
      return;
    }

    expect(second.error.reason).toBe('refinance_unavailable');
  });
});

describe('insolvency and recovery', () => {
  const config = createGameConfig();
  const starter = createStarterGameState(RIVERSIDE_STARTER_SCENARIO_ID, 'phase7-insolvency');

  it('shows a three-month insolvency countdown while recovery remains possible', () => {
    const insolvent = withStatePatch(starter, {
      cash: -5_000,
      counters: {
        ...starter.counters,
        consecutiveInsolventMonths: 2,
      },
    });

    const warning = getFinanceWarningView(insolvent, config);
    expect(warning?.insolvencyMonthsRemaining).toBe(1);

    const afterMonth = simulateMonth(insolvent, config);
    expect(afterMonth.ok).toBe(true);
    if (!afterMonth.ok) {
      return;
    }

    expect(afterMonth.state.status).toBe('active');
    expect(afterMonth.state.counters.consecutiveInsolventMonths).toBe(3);
  });

  it('allows emergency recovery while insolvent', () => {
    const insolvent = withStatePatch(starter, {
      cash: -5_000,
      counters: {
        ...starter.counters,
        consecutiveInsolventMonths: 2,
      },
    });

    const afterMonth = simulateMonth(insolvent, config);
    expect(afterMonth.ok).toBe(true);
    if (!afterMonth.ok) {
      return;
    }

    expect(afterMonth.state.status).toBe('active');
    expect(hasValidRecoveryActions(afterMonth.state, config)).toBe(true);

    const cashBeforeRecovery = afterMonth.state.cash;
    const recovered = acceptEmergencyOffer(afterMonth.state, config);
    expect(recovered.ok).toBe(true);
    if (!recovered.ok) {
      return;
    }

    expect(recovered.state.cash).toBe(
      cashBeforeRecovery + config.balance.emergencyInvestorOfferAmount,
    );
  });

  it('ends the run after three consecutive insolvent months without recovery', () => {
    const insolvent = withStatePatch(starter, {
      cash: -5_000,
      buildings: [],
      counters: {
        ...starter.counters,
        consecutiveInsolventMonths: 2,
        emergencyOfferUsed: true,
        refinanceUsed: true,
      },
    });

    const afterMonth = simulateMonth(insolvent, config);
    expect(afterMonth.ok).toBe(true);
    if (!afterMonth.ok) {
      return;
    }

    expect(afterMonth.state.status).toBe('lost');
  });
});
