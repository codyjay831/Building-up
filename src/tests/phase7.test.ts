import { describe, expect, it } from 'vitest';

import { acceptEmergencyOffer } from '@/game/commands/acceptEmergencyOffer';
import { placeProject } from '@/game/commands/placeProject';
import { refinanceProperty } from '@/game/commands/refinanceProperty';
import { createGameConfig, createStarterGameState, RIVERSIDE_STARTER_SCENARIO_ID } from '@/game/config/scenario';
import {
  calculateConstructionLoanTerms,
  calculateRefinanceCapacity,
  createConstructionLoanDebt,
  getTotalMonthlyDebtPayment,
} from '@/game/domain/debt';
import { calculatePropertyValue } from '@/game/domain/propertyValue';
import { hasValidRecoveryActions } from '@/game/domain/recovery';
import { simulateMonth } from '@/game/domain/simulateMonth';
import { getFinanceWarningView } from '@/game/domain/warnings';
import type { DebtState, GameState } from '@/game/domain/types';

function withStatePatch(state: GameState, patch: Partial<GameState>): GameState {
  return { ...state, ...patch };
}

describe('construction loan', () => {
  const config = createGameConfig();
  const starter = createStarterGameState(RIVERSIDE_STARTER_SCENARIO_ID, 'phase7-loan');

  it('requires 30% equity and creates inactive debt until completion', () => {
    const definition = config.buildings.get('corner_shop');
    expect(definition).toBeDefined();

    const terms = calculateConstructionLoanTerms(definition?.constructionCost ?? 0, config.balance);
    expect(terms.equityRequired).toBe(36_000);
    expect(terms.loanPrincipal).toBe(84_000);

    const result = placeProject(starter, config, {
      definitionId: 'corner_shop',
      footprint: {
        origin: { x: 0, y: 0 },
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
    expect(result.state.projects[0]?.financedWithLoan).toBe(true);
  });

  it('posts debt payments in the monthly ledger after completion', () => {
    const loanTerms = calculateConstructionLoanTerms(120_000, config.balance);
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
    expect(warning?.level).toBe('insolvency');
    expect(warning?.insolvencyMonthsRemaining).toBe(1);
    expect(hasValidRecoveryActions(insolvent, config)).toBe(true);

    const afterMonth = simulateMonth(insolvent, config);
    expect(afterMonth.ok).toBe(true);
    if (!afterMonth.ok) {
      return;
    }

    expect(afterMonth.state.status).toBe('active');
    expect(afterMonth.state.counters.consecutiveInsolventMonths).toBe(3);
  });

  it('does not trigger loss while emergency recovery can restore solvency', () => {
    const insolvent = withStatePatch(starter, {
      cash: -12_000,
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

  it('triggers loss after three unresolved months with no valid recovery', () => {
    const insolvent = withStatePatch(starter, {
      cash: -120_000,
      counters: {
        ...starter.counters,
        consecutiveInsolventMonths: 2,
        refinanceUsed: true,
        emergencyOfferUsed: true,
      },
      debt: [
        {
          id: 'debt-1',
          type: 'refinance',
          principal: 250_000,
          originalPrincipal: 250_000,
          monthlyPayment: 4_500,
          paymentsActive: true,
        } satisfies DebtState,
      ],
    });

    expect(hasValidRecoveryActions(insolvent, config)).toBe(false);

    const afterMonth = simulateMonth(insolvent, config);
    expect(afterMonth.ok).toBe(true);
    if (!afterMonth.ok) {
      return;
    }

    expect(afterMonth.state.status).toBe('lost');
  });
});
