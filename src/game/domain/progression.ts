import { getBuildingDefinition } from '@/game/config/buildings';
import { calculateAverageCondition } from '@/game/domain/condition';
import { isRevenueBuilding } from '@/game/domain/condition';
import type {
  ApprovalState,
  BalanceAssumptions,
  BuildingInstance,
  GameConfig,
  GameState,
} from '@/game/domain/types';

export interface ApprovalConditionProgress {
  readonly id: string;
  readonly label: string;
  readonly currentLabel: string;
  readonly targetLabel: string;
  readonly met: boolean;
}

export interface ApprovalLevelProgress {
  readonly level: number;
  readonly unlocked: boolean;
  readonly current: boolean;
  readonly conditions: readonly ApprovalConditionProgress[];
}

export interface ApprovalProgressView {
  readonly currentLevel: number;
  readonly levels: readonly ApprovalLevelProgress[];
  readonly nextUnlockLevel: number | null;
}

const REDEVELOPABLE_LIFECYCLE_STATES = new Set(['existing', 'operating', 'leasing']);

export function isRedevelopableBuilding(building: Readonly<BuildingInstance>): boolean {
  return REDEVELOPABLE_LIFECYCLE_STATES.has(building.lifecycleState);
}

export function hasActiveProjectForBuilding(
  state: Readonly<GameState>,
  buildingId: string,
): boolean {
  return state.projects.some(
    (project) =>
      project.buildingId === buildingId &&
      (project.status === 'committed' || project.status === 'under_construction'),
  );
}

export function getBuildingByIdOrThrow(
  state: Readonly<GameState>,
  buildingId: string,
): BuildingInstance {
  const building = state.buildings.find((candidate) => candidate.id === buildingId);

  if (!building) {
    throw new RangeError(`Building not found: ${buildingId}`);
  }

  return building;
}

export function canRenovateBuilding(
  state: Readonly<GameState>,
  building: Readonly<BuildingInstance>,
): boolean {
  if (state.status !== 'active') {
    return false;
  }

  if (building.renovated || building.lifecycleState === 'renovating') {
    return false;
  }

  if (!isRedevelopableBuilding(building)) {
    return false;
  }

  if (hasActiveProjectForBuilding(state, building.id)) {
    return false;
  }

  return true;
}

export function canSellOrDemolishBuilding(
  state: Readonly<GameState>,
  config: Readonly<GameConfig>,
  building: Readonly<BuildingInstance>,
): boolean {
  if (state.status !== 'active') {
    return false;
  }

  if (!isRedevelopableBuilding(building)) {
    return false;
  }

  if (hasActiveProjectForBuilding(state, building.id)) {
    return false;
  }

  const definition = getBuildingDefinition(config.buildings, building.definitionId);

  if (definition.category === 'parking' || definition.category === 'amenity' || definition.category === 'infrastructure') {
    return true;
  }

  return isRevenueBuilding(building, config);
}

export function canRelocateBuilding(
  state: Readonly<GameState>,
  config: Readonly<GameConfig>,
  building: Readonly<BuildingInstance>,
): boolean {
  if (state.status !== 'active') {
    return false;
  }

  if (
    building.lifecycleState === 'under_construction' ||
    building.lifecycleState === 'renovating'
  ) {
    return false;
  }

  if (!isRedevelopableBuilding(building)) {
    return false;
  }

  if (hasActiveProjectForBuilding(state, building.id)) {
    return false;
  }

  const definition = config.buildings.get(building.definitionId);

  if (definition?.isAccessPath) {
    return false;
  }

  return true;
}

function mergeUnlockedLevels(approval: Readonly<ApprovalState>, level: number): readonly number[] {
  if (approval.unlockedLevels.includes(level)) {
    return approval.unlockedLevels;
  }

  return [...approval.unlockedLevels, level].sort((left, right) => left - right);
}

export function checkApprovalLevel2Unlock(
  state: Readonly<GameState>,
  config: Readonly<GameConfig>,
  balance: Readonly<BalanceAssumptions>,
): boolean {
  if (state.approval.level >= 2) {
    return false;
  }

  const averageCondition = calculateAverageCondition(state, config);

  return (
    state.counters.consecutivePositiveCashFlowMonths >= balance.approval2PositiveMonths &&
    averageCondition >= balance.approval2MinCondition &&
    state.cash >= balance.approval2CashReserve
  );
}

export function checkApprovalLevel3Unlock(
  state: Readonly<GameState>,
  balance: Readonly<BalanceAssumptions>,
): boolean {
  if (state.approval.level < 2 || state.approval.level >= 3) {
    return false;
  }

  return (
    state.counters.consecutiveApproval3OccupancyMonths >= balance.approval3OccupancyMonths &&
    state.appeal >= balance.approval3MinAppeal &&
    state.cash >= balance.approval3CashReserve
  );
}

export function applyApprovalUnlocks(
  state: Readonly<GameState>,
  config: Readonly<GameConfig>,
  balance: Readonly<BalanceAssumptions>,
): GameState {
  let nextState = state;

  if (checkApprovalLevel2Unlock(nextState, config, balance)) {
    nextState = {
      ...nextState,
      approval: {
        level: 2,
        unlockedLevels: mergeUnlockedLevels(nextState.approval, 2),
      },
    };
  }

  if (checkApprovalLevel3Unlock(nextState, balance)) {
    nextState = {
      ...nextState,
      approval: {
        level: 3,
        unlockedLevels: mergeUnlockedLevels(nextState.approval, 3),
      },
    };
  }

  return nextState;
}

export function getApprovalLevel2Progress(
  state: Readonly<GameState>,
  config: Readonly<GameConfig>,
  balance: Readonly<BalanceAssumptions>,
): readonly ApprovalConditionProgress[] {
  const averageCondition = calculateAverageCondition(state, config);

  return [
    {
      id: 'positive_cash_flow',
      label: 'Positive net cash flow',
      currentLabel: `${String(state.counters.consecutivePositiveCashFlowMonths)}/${String(balance.approval2PositiveMonths)} months`,
      targetLabel: `${String(balance.approval2PositiveMonths)} consecutive months`,
      met: state.counters.consecutivePositiveCashFlowMonths >= balance.approval2PositiveMonths,
    },
    {
      id: 'condition',
      label: 'Property condition',
      currentLabel: `${String(averageCondition)} / 100`,
      targetLabel: `≥ ${String(balance.approval2MinCondition)}`,
      met: averageCondition >= balance.approval2MinCondition,
    },
    {
      id: 'cash_reserve',
      label: 'Cash reserve',
      currentLabel: `$${String(state.cash)}`,
      targetLabel: `≥ $${String(balance.approval2CashReserve)}`,
      met: state.cash >= balance.approval2CashReserve,
    },
  ];
}

export function getApprovalLevel3Progress(
  state: Readonly<GameState>,
  balance: Readonly<BalanceAssumptions>,
): readonly ApprovalConditionProgress[] {
  return [
    {
      id: 'approval_2',
      label: 'Approval Level 2',
      currentLabel: state.approval.level >= 2 ? 'Unlocked' : 'Locked',
      targetLabel: 'Required',
      met: state.approval.level >= 2,
    },
    {
      id: 'occupancy',
      label: 'Combined occupancy',
      currentLabel: `${String(state.counters.consecutiveApproval3OccupancyMonths)}/${String(balance.approval3OccupancyMonths)} months at ${String(balance.approval3MinOccupancy)}%`,
      targetLabel: `${String(balance.approval3OccupancyMonths)} months at ≥ ${String(balance.approval3MinOccupancy)}%`,
      met: state.counters.consecutiveApproval3OccupancyMonths >= balance.approval3OccupancyMonths,
    },
    {
      id: 'appeal',
      label: 'Property appeal',
      currentLabel: `${String(state.appeal)} / 100`,
      targetLabel: `≥ ${String(balance.approval3MinAppeal)}`,
      met: state.appeal >= balance.approval3MinAppeal,
    },
    {
      id: 'cash_reserve',
      label: 'Cash reserve',
      currentLabel: `$${String(state.cash)}`,
      targetLabel: `≥ $${String(balance.approval3CashReserve)}`,
      met: state.cash >= balance.approval3CashReserve,
    },
  ];
}

export function getApprovalProgressView(
  state: Readonly<GameState>,
  config: Readonly<GameConfig>,
  balance: Readonly<BalanceAssumptions>,
): ApprovalProgressView {
  const levels: ApprovalLevelProgress[] = [
    {
      level: 1,
      unlocked: true,
      current: state.approval.level === 1,
      conditions: [],
    },
    {
      level: 2,
      unlocked: state.approval.level >= 2,
      current: state.approval.level === 2,
      conditions: getApprovalLevel2Progress(state, config, balance),
    },
    {
      level: 3,
      unlocked: state.approval.level >= 3,
      current: state.approval.level === 3,
      conditions: getApprovalLevel3Progress(state, balance),
    },
  ];

  const nextUnlockLevel = state.approval.level >= 3 ? null : state.approval.level === 2 ? 3 : 2;

  return {
    currentLevel: state.approval.level,
    levels,
    nextUnlockLevel,
  };
}

export function completeRenovations(
  state: Readonly<GameState>,
  balance: Readonly<BalanceAssumptions>,
): GameState {
  return {
    ...state,
    buildings: state.buildings.map((building) => {
      if (building.lifecycleState !== 'renovating') {
        return building;
      }

      return {
        ...building,
        lifecycleState: 'operating',
        condition: Math.min(100, building.condition + balance.renovationConditionGain),
        renovated: true,
      };
    }),
  };
}
