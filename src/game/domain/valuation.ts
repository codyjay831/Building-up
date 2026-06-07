import { calculateMonthlyEconomy } from '@/game/domain/economy';
import { assertWholeDollars } from '@/game/domain/money';
import type {
  BalanceAssumptions,
  BuildingDefinition,
  BuildingInstance,
  GameConfig,
  GameState,
} from '@/game/domain/types';

export function calculateDepreciatedImprovementValue(
  building: Readonly<BuildingInstance>,
  definition: Readonly<BuildingDefinition>,
  balance: Readonly<BalanceAssumptions>,
): number {
  const baseValue =
    definition.constructionCost > 0 ? definition.constructionCost : balance.existingHouseSaleBase;

  return assertWholeDollars(
    Math.round((baseValue * building.condition) / 100),
    'depreciatedImprovementValue',
  );
}

export function calculateBuildingSaleProceeds(
  building: Readonly<BuildingInstance>,
  definition: Readonly<BuildingDefinition>,
  balance: Readonly<BalanceAssumptions>,
): number {
  const depreciated = calculateDepreciatedImprovementValue(building, definition, balance);

  return assertWholeDollars(
    Math.round((depreciated * balance.saleValuePercent) / 100),
    'saleProceeds',
  );
}

export function calculateDemolitionCost(
  definition: Readonly<BuildingDefinition>,
  balance: Readonly<BalanceAssumptions>,
): number {
  if (definition.constructionCost <= 0) {
    return balance.existingHouseDemolitionCost;
  }

  const percentCost = assertWholeDollars(
    Math.round((definition.constructionCost * balance.demolitionCostPercent) / 100),
    'demolitionCost',
  );

  return Math.max(balance.minDemolitionCost, percentCost);
}

export function calculateBuildingMonthlyNetIncome(
  state: Readonly<GameState>,
  config: Readonly<GameConfig>,
  buildingId: string,
): number {
  const economy = calculateMonthlyEconomy(state, config, config.balance, 'preview');
  let net = 0;

  for (const line of economy.rentLines) {
    if (line.buildingId === buildingId) {
      net += line.amount;
    }
  }

  for (const line of economy.expenseLines) {
    if (line.buildingId === buildingId) {
      net += line.amount;
    }
  }

  return net;
}
