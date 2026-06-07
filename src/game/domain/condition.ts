import type {
  BalanceAssumptions,
  BuildingInstance,
  GameConfig,
  GameState,
} from '@/game/domain/types';

const REVENUE_LIFECYCLE_STATES = new Set(['existing', 'operating', 'leasing']);

export function isRevenueBuilding(
  building: Readonly<BuildingInstance>,
  config: Readonly<GameConfig>,
): boolean {
  const definition = config.buildings.get(building.definitionId);
  if (!definition) {
    return false;
  }

  return definition.residentialUnits > 0 || definition.retailUnits > 0;
}

export function isActiveEconomyBuilding(building: Readonly<BuildingInstance>): boolean {
  return REVENUE_LIFECYCLE_STATES.has(building.lifecycleState);
}

export function calculateAverageCondition(
  state: Readonly<GameState>,
  config: Readonly<GameConfig>,
): number {
  const activeRevenueBuildings = state.buildings.filter(
    (building) => isRevenueBuilding(building, config) && isActiveEconomyBuilding(building),
  );

  if (activeRevenueBuildings.length === 0) {
    return 100;
  }

  const total = activeRevenueBuildings.reduce((sum, building) => sum + building.condition, 0);
  return Math.round(total / activeRevenueBuildings.length);
}

export function applyConditionDecay(
  state: Readonly<GameState>,
  config: Readonly<GameConfig>,
  balance: Readonly<BalanceAssumptions>,
): GameState {
  return {
    ...state,
    buildings: state.buildings.map((building) => {
      if (!isRevenueBuilding(building, config) || !isActiveEconomyBuilding(building)) {
        return building;
      }

      return {
        ...building,
        condition: Math.max(0, building.condition - balance.conditionDecayPerMonth),
      };
    }),
  };
}
