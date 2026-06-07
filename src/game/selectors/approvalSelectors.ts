import { formatMoney } from '@/game/domain/money';
import { getApprovalProgressView } from '@/game/domain/progression';
import { getWinProgressView } from '@/game/domain/winLoss';
import { getLatestMonthlyLedgerEntry } from '@/game/selectors/propertySelectors';
import type { GameConfig, GameState } from '@/game/domain/types';

export function getApprovalProgressPanel(state: Readonly<GameState>, config: Readonly<GameConfig>) {
  const view = getApprovalProgressView(state, config, config.balance);
  const latestMonthly = getLatestMonthlyLedgerEntry(state);
  const winView = getWinProgressView(state, config, config.balance, latestMonthly?.netCashFlow);

  const nextLevel = view.levels.find((level) => level.level === view.nextUnlockLevel);

  return {
    ...view,
    nextLevel,
    winView,
    winProgressLabel: winView.won
      ? 'Scenario complete'
      : `${String(winView.consecutiveMonths)}/${String(winView.requiredMonths)} stable months`,
    scenarioObjective: 'Build and stabilize a mixed-use property.',
  };
}

export function formatApprovalConditionMoney(value: number): string {
  return formatMoney(value);
}
