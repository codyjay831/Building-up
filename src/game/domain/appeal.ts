import { calculateAverageCondition, isActiveEconomyBuilding } from '@/game/domain/condition';
import type {
  BalanceAssumptions,
  GameConfig,
  GameState,
  ParkingSnapshot,
} from '@/game/domain/types';

const RENOVATED_APPEAL_BONUS = 4;
const MIXED_USE_OPERATING_BONUS = 5;
const HIGH_CONDITION_APPEAL_BONUS = 5;
const LOW_CONDITION_APPEAL_PENALTY = 10;
const VACANCY_APPEAL_PENALTY = 8;
const PARKING_SHORTAGE_MILD_PENALTY = 3;
const PARKING_SHORTAGE_SEVERE_PENALTY = 8;
const CONSTRUCTION_APPEAL_PENALTY_PER_SITE = 2;
const CONSTRUCTION_APPEAL_PENALTY_CAP = 6;

export interface AppealBreakdownLine {
  readonly id: string;
  readonly label: string;
  readonly value: number;
}

export interface AppealBreakdown {
  readonly baseAppeal: number;
  readonly lines: readonly AppealBreakdownLine[];
  readonly total: number;
}

function clampAppeal(value: number): number {
  return Math.max(0, Math.min(100, value));
}

function calculateCombinedOccupancyPercent(
  state: Readonly<GameState>,
  config: Readonly<GameConfig>,
): number {
  let totalUnits = 0;
  let occupiedUnits = 0;

  for (const building of state.buildings) {
    const definition = config.buildings.get(building.definitionId);
    if (!definition || !isActiveEconomyBuilding(building)) {
      continue;
    }

    const buildingUnits = definition.residentialUnits + definition.retailUnits;
    if (buildingUnits === 0) {
      continue;
    }

    totalUnits += buildingUnits;
    occupiedUnits += building.residentialOccupied + building.retailOccupied;
  }

  if (totalUnits === 0) {
    return 100;
  }

  return Math.round((occupiedUnits / totalUnits) * 100);
}

export function calculateAppealBreakdown(
  state: Readonly<GameState>,
  config: Readonly<GameConfig>,
  balance: Readonly<BalanceAssumptions>,
  parking: Readonly<ParkingSnapshot>,
): AppealBreakdown {
  const lines: AppealBreakdownLine[] = [];
  let appeal = balance.baseAppeal;

  const parks = state.buildings.filter((building) => {
    const definition = config.buildings.get(building.definitionId);
    return definition?.category === 'amenity' && isActiveEconomyBuilding(building);
  });

  for (const [index, park] of parks.entries()) {
    const definition = config.buildings.get(park.definitionId);
    if (!definition) {
      continue;
    }

    const value =
      index === 0
        ? definition.appealModifier
        : Math.max(5, Math.round(definition.appealModifier / 2));
    appeal += value;
    lines.push({
      id: `park_${park.id}`,
      label:
        index === 0 ? `${definition.name} (primary park)` : `${definition.name} (additional park)`,
      value,
    });
  }

  for (const building of state.buildings) {
    const definition = config.buildings.get(building.definitionId);
    if (!definition || !isActiveEconomyBuilding(building) || definition.category === 'amenity') {
      continue;
    }

    if (definition.appealModifier !== 0) {
      appeal += definition.appealModifier;
      lines.push({
        id: `building_${building.id}_modifier`,
        label: `${definition.name} type modifier`,
        value: definition.appealModifier,
      });
    }

    if (building.renovated) {
      appeal += RENOVATED_APPEAL_BONUS;
      lines.push({
        id: `building_${building.id}_renovated`,
        label: `${definition.name} renovated bonus`,
        value: RENOVATED_APPEAL_BONUS,
      });
    }

    if (definition.category === 'mixed' && building.lifecycleState === 'operating') {
      appeal += MIXED_USE_OPERATING_BONUS;
      lines.push({
        id: `building_${building.id}_mixed_use`,
        label: `${definition.name} mixed-use operating bonus`,
        value: MIXED_USE_OPERATING_BONUS,
      });
    }
  }

  const averageCondition = calculateAverageCondition(state, config);
  if (averageCondition >= balance.highConditionAppealThreshold) {
    appeal += HIGH_CONDITION_APPEAL_BONUS;
    lines.push({
      id: 'high_condition',
      label: `High average condition (${String(averageCondition)})`,
      value: HIGH_CONDITION_APPEAL_BONUS,
    });
  } else if (averageCondition < balance.lowConditionAppealThreshold) {
    appeal -= LOW_CONDITION_APPEAL_PENALTY;
    lines.push({
      id: 'low_condition',
      label: `Low average condition (${String(averageCondition)})`,
      value: -LOW_CONDITION_APPEAL_PENALTY,
    });
  }

  const occupancyPercent = calculateCombinedOccupancyPercent(state, config);
  const scenario = config.scenarios.get(state.scenarioId);
  const vacancyPenaltyEnabled = scenario?.appealRules?.vacancyPenaltyEnabled ?? true;
  if (vacancyPenaltyEnabled && occupancyPercent < balance.vacancyAppealThresholdPercent) {
    appeal -= VACANCY_APPEAL_PENALTY;
    lines.push({
      id: 'vacancy_penalty',
      label: `Vacancy penalty (occupancy ${String(occupancyPercent)}% below ${String(balance.vacancyAppealThresholdPercent)}%)`,
      value: -VACANCY_APPEAL_PENALTY,
    });
  }

  if (parking.shortfall >= 3) {
    appeal -= PARKING_SHORTAGE_SEVERE_PENALTY;
    lines.push({
      id: 'parking_shortage',
      label: `Parking shortage (${String(parking.shortfall)} spaces)`,
      value: -PARKING_SHORTAGE_SEVERE_PENALTY,
    });
  } else if (parking.shortfall >= 1) {
    appeal -= PARKING_SHORTAGE_MILD_PENALTY;
    lines.push({
      id: 'parking_shortage',
      label: `Parking shortage (${String(parking.shortfall)} space${parking.shortfall === 1 ? '' : 's'})`,
      value: -PARKING_SHORTAGE_MILD_PENALTY,
    });
  }

  const activeConstructionSites = state.projects.filter(
    (project) => project.status === 'under_construction' && project.monthsRemaining > 0,
  ).length;
  const constructionPenalty = Math.min(
    CONSTRUCTION_APPEAL_PENALTY_CAP,
    activeConstructionSites * CONSTRUCTION_APPEAL_PENALTY_PER_SITE,
  );
  if (constructionPenalty > 0) {
    appeal -= constructionPenalty;
    lines.push({
      id: 'construction',
      label: `Active construction (${String(activeConstructionSites)} site${activeConstructionSites === 1 ? '' : 's'})`,
      value: -constructionPenalty,
    });
  }

  return {
    baseAppeal: balance.baseAppeal,
    lines,
    total: clampAppeal(appeal),
  };
}

export function calculateAppeal(
  state: Readonly<GameState>,
  config: Readonly<GameConfig>,
  balance: Readonly<BalanceAssumptions>,
  parking: Readonly<ParkingSnapshot>,
): number {
  return calculateAppealBreakdown(state, config, balance, parking).total;
}
