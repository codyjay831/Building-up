import { getBuildingDefinition } from '@/game/config/buildings';
import { calculateMonthlyEconomy } from '@/game/domain/economy';
import { assertWholeDollars } from '@/game/domain/money';
import { calculateDepreciatedImprovementValue } from '@/game/domain/valuation';
import type { BalanceAssumptions, GameConfig, GameState } from '@/game/domain/types';

const APPEAL_PREMIUM_BASELINE = 50;

export function calculateDepreciatedImprovementsValue(
  state: Readonly<GameState>,
  config: Readonly<GameConfig>,
  balance: Readonly<BalanceAssumptions>,
): number {
  let total = 0;

  for (const building of state.buildings) {
    const definition = getBuildingDefinition(config.buildings, building.definitionId);
    total += calculateDepreciatedImprovementValue(building, definition, balance);
  }

  return assertWholeDollars(total, 'depreciatedImprovementsValue');
}

export function calculateStabilizedIncomeValue(
  state: Readonly<GameState>,
  config: Readonly<GameConfig>,
  balance: Readonly<BalanceAssumptions>,
): number {
  const economy = calculateMonthlyEconomy(state, config, balance, 'property-value');
  const stabilizedNet = economy.grossRent - economy.operatingExpenses;

  return assertWholeDollars(
    Math.round(stabilizedNet * balance.stabilizedIncomeCapMonths),
    'stabilizedIncomeValue',
  );
}

export function calculateAppealPremium(
  state: Readonly<GameState>,
  balance: Readonly<BalanceAssumptions>,
): number {
  const appealDelta = Math.max(0, state.appeal - APPEAL_PREMIUM_BASELINE);

  return assertWholeDollars(
    Math.round(appealDelta * balance.appealPremiumPerPoint),
    'appealPremium',
  );
}

export function calculateActiveConstructionRisk(
  state: Readonly<GameState>,
  balance: Readonly<BalanceAssumptions>,
): number {
  let risk = 0;

  for (const project of state.projects) {
    if (project.status !== 'under_construction') {
      continue;
    }

    const unspent = Math.max(0, project.totalCost - project.amountSpent);
    risk += assertWholeDollars(
      Math.round((unspent * balance.constructionRiskPercent) / 100),
      'constructionRisk',
    );
  }

  return assertWholeDollars(risk, 'activeConstructionRisk');
}

export function calculatePropertyValue(
  state: Readonly<GameState>,
  config: Readonly<GameConfig>,
  balance: Readonly<BalanceAssumptions>,
): number {
  const value =
    balance.landBaseValue +
    calculateDepreciatedImprovementsValue(state, config, balance) +
    calculateStabilizedIncomeValue(state, config, balance) +
    calculateAppealPremium(state, balance) -
    calculateActiveConstructionRisk(state, balance);

  return assertWholeDollars(Math.max(0, value), 'propertyValue');
}
