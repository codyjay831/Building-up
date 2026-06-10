import { getBuildingDefinition } from '@/game/config/buildings';
import { getBuildingEconomyPreview } from '@/game/domain/economy';
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
  const building = state.buildings.find((candidate) => candidate.id === buildingId);

  if (!building) {
    return 0;
  }

  const definition = getBuildingDefinition(config.buildings, building.definitionId);
  const preview = getBuildingEconomyPreview(building, definition, config.balance);

  if (!preview) {
    return 0;
  }

  return preview.rent.totalRent - preview.expense.totalExpense;
}
