import { formatMoney } from '@/game/domain/money';
import { canRenovateBuilding, canSellOrDemolishBuilding } from '@/game/domain/progression';
import {
  calculateBuildingMonthlyNetIncome,
  calculateBuildingSaleProceeds,
  calculateDemolitionCost,
} from '@/game/domain/valuation';
import { getBuildingDefinitionForInstance } from '@/game/selectors/buildingSelectors';
import type { GameConfig, GameState } from '@/game/domain/types';

export interface RedevelopmentPreview {
  readonly canRenovate: boolean;
  readonly renovationCostLabel: string;
  readonly renovationBlockedReason: string | null;
  readonly canSell: boolean;
  readonly saleProceedsLabel: string;
  readonly saleBlockedReason: string | null;
  readonly canDemolish: boolean;
  readonly demolitionCostLabel: string;
  readonly lostIncomeLabel: string;
  readonly demolitionBlockedReason: string | null;
}

export function getRedevelopmentPreview(
  state: Readonly<GameState>,
  config: Readonly<GameConfig>,
  buildingId: string,
): RedevelopmentPreview | null {
  const building = state.buildings.find((candidate) => candidate.id === buildingId);

  if (!building) {
    return null;
  }

  const definition = getBuildingDefinitionForInstance(config, building);
  const canRenovate = canRenovateBuilding(state, building);
  const canSell = canSellOrDemolishBuilding(state, config, building);
  const canDemolish = canSellOrDemolishBuilding(state, config, building);
  const lostIncome = calculateBuildingMonthlyNetIncome(state, config, buildingId);
  const saleProceeds = calculateBuildingSaleProceeds(building, definition, config.balance);
  const demolitionCost = calculateDemolitionCost(definition, config.balance);

  let renovationBlockedReason: string | null = null;
  if (building.renovated) {
    renovationBlockedReason = 'Already renovated';
  } else if (building.lifecycleState === 'renovating') {
    renovationBlockedReason = 'Renovation in progress';
  } else if (!canRenovate) {
    renovationBlockedReason = 'Not available for this building state';
  } else if (state.cash < config.balance.renovationCost) {
    renovationBlockedReason = 'Insufficient cash';
  }

  let saleBlockedReason: string | null = null;
  if (!canSell) {
    saleBlockedReason = 'Not available for this building state';
  }

  let demolitionBlockedReason: string | null = null;
  if (!canDemolish) {
    demolitionBlockedReason = 'Not available for this building state';
  } else if (state.cash < demolitionCost) {
    demolitionBlockedReason = 'Insufficient cash';
  }

  return {
    canRenovate: canRenovate && state.cash >= config.balance.renovationCost,
    renovationCostLabel: formatMoney(config.balance.renovationCost),
    renovationBlockedReason,
    canSell,
    saleProceedsLabel: formatMoney(saleProceeds),
    saleBlockedReason,
    canDemolish: canDemolish && state.cash >= demolitionCost,
    demolitionCostLabel: formatMoney(demolitionCost),
    lostIncomeLabel: formatMoney(lostIncome),
    demolitionBlockedReason,
  };
}
