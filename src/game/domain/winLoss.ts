import { calculateCombinedOccupancyPercent } from '@/game/domain/leasing';
import type { BalanceAssumptions, GameConfig, GameState } from '@/game/domain/types';

export interface WinConditionProgress {
  readonly id: string;
  readonly label: string;
  readonly currentLabel: string;
  readonly targetLabel: string;
  readonly met: boolean;
}

export interface WinProgressView {
  readonly conditions: readonly WinConditionProgress[];
  readonly consecutiveMonths: number;
  readonly requiredMonths: number;
  readonly won: boolean;
}

function hasOperatingMixedUse(state: Readonly<GameState>, config: Readonly<GameConfig>): boolean {
  return state.buildings.some((building) => {
    const definition = config.buildings.get(building.definitionId);
    return definition?.category === 'mixed' && building.lifecycleState === 'operating';
  });
}

export function checkWinConditionsMet(
  state: Readonly<GameState>,
  config: Readonly<GameConfig>,
  balance: Readonly<BalanceAssumptions>,
  netCashFlow: number,
  occupancyPercent: number,
): boolean {
  return (
    state.approval.level >= 2 &&
    netCashFlow >= balance.winNetCashFlow &&
    occupancyPercent >= balance.winOccupancy &&
    state.appeal >= balance.winAppeal &&
    state.cash >= balance.winCashReserve &&
    hasOperatingMixedUse(state, config)
  );
}

export function applyWinProgress(
  state: Readonly<GameState>,
  config: Readonly<GameConfig>,
  balance: Readonly<BalanceAssumptions>,
  netCashFlow: number,
  occupancyPercent: number,
): GameState {
  if (state.status !== 'active') {
    return state;
  }

  const met = checkWinConditionsMet(state, config, balance, netCashFlow, occupancyPercent);
  const consecutiveWinConditionMonths = met ? state.counters.consecutiveWinConditionMonths + 1 : 0;

  if (consecutiveWinConditionMonths >= balance.winConsecutiveMonths) {
    return {
      ...state,
      status: 'won',
      counters: {
        ...state.counters,
        consecutiveWinConditionMonths,
      },
    };
  }

  return {
    ...state,
    counters: {
      ...state.counters,
      consecutiveWinConditionMonths,
    },
  };
}

export function getWinProgressView(
  state: Readonly<GameState>,
  config: Readonly<GameConfig>,
  balance: Readonly<BalanceAssumptions>,
  netCashFlow: number | undefined,
): WinProgressView {
  const occupancyPercent = calculateCombinedOccupancyPercent(state, config);
  const resolvedNetCashFlow = netCashFlow ?? 0;

  const conditions: WinConditionProgress[] = [
    {
      id: 'approval',
      label: 'Approval Level 2+',
      currentLabel: `Level ${String(state.approval.level)}`,
      targetLabel: 'Level 2 or higher',
      met: state.approval.level >= 2,
    },
    {
      id: 'net_cash_flow',
      label: 'Monthly net cash flow',
      currentLabel: netCashFlow === undefined ? '—' : `$${String(resolvedNetCashFlow)}`,
      targetLabel: `≥ $${String(balance.winNetCashFlow)}/mo`,
      met: resolvedNetCashFlow >= balance.winNetCashFlow,
    },
    {
      id: 'occupancy',
      label: 'Combined occupancy',
      currentLabel: `${String(occupancyPercent)}%`,
      targetLabel: `≥ ${String(balance.winOccupancy)}%`,
      met: occupancyPercent >= balance.winOccupancy,
    },
    {
      id: 'appeal',
      label: 'Property appeal',
      currentLabel: `${String(state.appeal)} / 100`,
      targetLabel: `≥ ${String(balance.winAppeal)}`,
      met: state.appeal >= balance.winAppeal,
    },
    {
      id: 'mixed_use',
      label: 'Operating mixed-use building',
      currentLabel: hasOperatingMixedUse(state, config) ? 'Yes' : 'No',
      targetLabel: 'Required',
      met: hasOperatingMixedUse(state, config),
    },
    {
      id: 'cash_reserve',
      label: 'Cash reserve',
      currentLabel: `$${String(state.cash)}`,
      targetLabel: `≥ $${String(balance.winCashReserve)}`,
      met: state.cash >= balance.winCashReserve,
    },
  ];

  return {
    conditions,
    consecutiveMonths: state.counters.consecutiveWinConditionMonths,
    requiredMonths: balance.winConsecutiveMonths,
    won: state.status === 'won',
  };
}
