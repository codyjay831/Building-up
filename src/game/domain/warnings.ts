import { calculateMonthlyEconomy } from '@/game/domain/economy';
import { getTotalMonthlyDebtPayment } from '@/game/domain/debt';
import type { GameConfig, GameState } from '@/game/domain/types';

export type FinanceWarningLevel = 'none' | 'yellow' | 'orange' | 'red' | 'insolvency';

export interface FinanceWarningView {
  readonly level: FinanceWarningLevel;
  readonly title: string;
  readonly message: string;
  readonly insolvencyCountdownMonths: number;
  readonly insolvencyMonthsRemaining: number;
}

export function projectNextMonthNetCashFlow(
  state: Readonly<GameState>,
  config: Readonly<GameConfig>,
): number {
  const economy = calculateMonthlyEconomy(state, config, config.balance, 'warning-preview');
  const debtPayments = getTotalMonthlyDebtPayment(state);

  return economy.grossRent - economy.operatingExpenses - debtPayments;
}

function estimateMonthlyBurn(state: Readonly<GameState>, config: Readonly<GameConfig>): number {
  const projectedNet = projectNextMonthNetCashFlow(state, config);
  return projectedNet < 0 ? -projectedNet : 0;
}

export function getFinanceWarningLevel(
  state: Readonly<GameState>,
  config: Readonly<GameConfig>,
): FinanceWarningLevel {
  if (state.cash < 0) {
    if (state.counters.consecutiveInsolventMonths > 0) {
      return 'insolvency';
    }

    return 'red';
  }

  const projectedNet = projectNextMonthNetCashFlow(state, config);
  const monthlyBurn = estimateMonthlyBurn(state, config);
  const reserveMonths =
    monthlyBurn > 0 ? Math.floor(state.cash / monthlyBurn) : Number.POSITIVE_INFINITY;

  if (projectedNet < 0) {
    return 'yellow';
  }

  if (reserveMonths < config.balance.warningOrangeReserveMonths) {
    return 'orange';
  }

  return 'none';
}

export function getFinanceWarningView(
  state: Readonly<GameState>,
  config: Readonly<GameConfig>,
): FinanceWarningView | null {
  const level = getFinanceWarningLevel(state, config);
  const balance = config.balance;

  if (level === 'none') {
    return null;
  }

  const insolvencyMonthsRemaining = Math.max(
    0,
    balance.insolvencyLossMonths - state.counters.consecutiveInsolventMonths,
  );

  switch (level) {
    case 'yellow':
      return {
        level,
        title: 'Projected shortfall',
        message:
          'Next month is projected to close negative. Review rent posture, expenses, or recovery options before advancing.',
        insolvencyCountdownMonths: balance.insolvencyLossMonths,
        insolvencyMonthsRemaining,
      };
    case 'orange':
      return {
        level,
        title: 'Low cash reserve',
        message: `Cash covers fewer than ${String(balance.warningOrangeReserveMonths)} months at the current burn rate.`,
        insolvencyCountdownMonths: balance.insolvencyLossMonths,
        insolvencyMonthsRemaining,
      };
    case 'red':
      return {
        level,
        title: 'Negative cash',
        message:
          'Cash is below zero. Use recovery actions in Finance before the insolvency countdown expires.',
        insolvencyCountdownMonths: balance.insolvencyLossMonths,
        insolvencyMonthsRemaining,
      };
    case 'insolvency':
      return {
        level,
        title: 'Insolvency countdown',
        message: `Negative cash for ${String(state.counters.consecutiveInsolventMonths)} month(s). Loss triggers after ${String(balance.insolvencyLossMonths)} unresolved months with no valid recovery.`,
        insolvencyCountdownMonths: balance.insolvencyLossMonths,
        insolvencyMonthsRemaining,
      };
    default:
      return null;
  }
}
