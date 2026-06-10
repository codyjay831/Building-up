import { getScenarioDefinition } from '@/game/config/scenario';
import { formatMoney } from '@/game/domain/money';
import { getApprovalProgressView } from '@/game/domain/progression';
import { getWinProgressView } from '@/game/domain/winLoss';
import { getLatestMonthlyLedgerEntry } from '@/game/selectors/propertySelectors';
import type { GameConfig, GameState } from '@/game/domain/types';

export function getApprovalProgressPanel(state: Readonly<GameState>, config: Readonly<GameConfig>) {
  const scenario = getScenarioDefinition(config.scenarios, state.scenarioId);
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
    scenarioObjective: scenario.objectiveLabel,
    winBannerLabel: scenario.winBannerLabel,
  };
}

export interface ScenarioObjectiveHudView {
  readonly objectiveLabel: string;
  readonly winBannerLabel: string;
  readonly stableMonthsLabel: string;
  readonly topBlockers: readonly { readonly label: string; readonly currentLabel: string }[];
  readonly won: boolean;
}

export function getScenarioObjectiveHudView(
  state: Readonly<GameState>,
  config: Readonly<GameConfig>,
): ScenarioObjectiveHudView {
  const scenario = getScenarioDefinition(config.scenarios, state.scenarioId);
  const latestMonthly = getLatestMonthlyLedgerEntry(state);
  const winView = getWinProgressView(state, config, config.balance, latestMonthly?.netCashFlow);

  return {
    objectiveLabel: scenario.objectiveLabel,
    winBannerLabel: scenario.winBannerLabel,
    stableMonthsLabel: `${String(winView.consecutiveMonths)}/${String(winView.requiredMonths)} stable months`,
    topBlockers: winView.conditions
      .filter((condition) => !condition.met)
      .slice(0, 2)
      .map((condition) => ({
        label: condition.label,
        currentLabel: condition.currentLabel,
      })),
    won: winView.won,
  };
}

export function formatApprovalConditionMoney(value: number): string {
  return formatMoney(value);
}
