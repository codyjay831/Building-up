import { getBuildingDefinition } from '@/game/config/buildings';
import { isActiveEconomyBuilding } from '@/game/domain/condition';
import {
  calculateCombinedOccupancyPercent,
  calculateEffectiveRetailDemand,
  calculateLeasingScore,
} from '@/game/domain/leasing';
import { calculateEffectiveResidentialDemand } from '@/game/domain/demand';
import { calculatePropertyParking } from '@/game/domain/parking';
import { projectNextMonthNetCashFlow } from '@/game/domain/warnings';
import type { GameConfig, GameState, MonthlyLedgerEntry } from '@/game/domain/types';

export type OccupancyWarningLevel = 'none' | 'yellow' | 'orange' | 'red' | 'spiral';

export interface OccupancyWarningView {
  readonly level: OccupancyWarningLevel;
  readonly title: string;
  readonly message: string;
  readonly buildingsAtRisk: number;
  readonly occupancyPercent: number;
}

function getLatestMonthlyEntries(state: Readonly<GameState>, count: number): MonthlyLedgerEntry[] {
  const entries: MonthlyLedgerEntry[] = [];
  for (let index = state.ledger.length - 1; index >= 0 && entries.length < count; index -= 1) {
    const entry = state.ledger[index];
    if (entry.kind === 'monthly') {
      entries.push(entry);
    }
  }
  return entries;
}

function countCombinedUnits(
  state: Readonly<GameState>,
  config: Readonly<GameConfig>,
): {
  readonly total: number;
  readonly occupied: number;
} {
  let total = 0;
  let occupied = 0;

  for (const building of state.buildings) {
    const definition = config.buildings.get(building.definitionId);
    if (!definition || !isActiveEconomyBuilding(building)) {
      continue;
    }

    const buildingUnits = definition.residentialUnits + definition.retailUnits;
    if (buildingUnits === 0) {
      continue;
    }

    total += buildingUnits;
    occupied += building.residentialOccupied + building.retailOccupied;
  }

  return { total, occupied };
}

function getPreviousOccupancyPercent(state: Readonly<GameState>): number | null {
  const entries = getLatestMonthlyEntries(state, 1);
  if (entries.length === 0) {
    return null;
  }

  const latest = entries[0];
  if (latest.propertyHealthSnapshot === undefined) {
    return null;
  }

  return latest.propertyHealthSnapshot.occupancyPercent;
}

function countBuildingsAtMoveOutRisk(
  state: Readonly<GameState>,
  config: Readonly<GameConfig>,
  appeal: number,
): number {
  const balance = config.balance;
  const parking = calculatePropertyParking(state, config);
  const residentialDemand = calculateEffectiveResidentialDemand(state, config, balance);
  const retailDemand = calculateEffectiveRetailDemand(state, config, balance, parking);
  let atRisk = 0;

  for (const building of state.buildings) {
    const definition = getBuildingDefinition(config.buildings, building.definitionId);
    if (!isActiveEconomyBuilding(building)) {
      continue;
    }

    let buildingAtRisk = false;

    if (definition.residentialUnits > 0 && building.residentialOccupied > 0) {
      const score = calculateLeasingScore(
        building,
        definition,
        residentialDemand,
        appeal,
        parking,
        balance,
      );
      if (score.total <= balance.leasingMoveOutThreshold) {
        buildingAtRisk = true;
      }
    }

    if (definition.retailUnits > 0 && building.retailOccupied > 0) {
      const score = calculateLeasingScore(
        building,
        definition,
        retailDemand.effective,
        appeal,
        parking,
        balance,
      );
      if (score.total <= balance.leasingMoveOutThreshold) {
        buildingAtRisk = true;
      }
    }

    if (buildingAtRisk) {
      atRisk += 1;
    }
  }

  return atRisk;
}

function getConsecutiveNetResidentLossMonths(state: Readonly<GameState>): number {
  const entries = getLatestMonthlyEntries(state, 3);
  let streak = 0;

  for (const entry of entries) {
    const netResidential =
      entry.occupancyChanges?.reduce((total, change) => total + change.residentialDelta, 0) ?? 0;
    if (netResidential < 0) {
      streak += 1;
    } else {
      break;
    }
  }

  return streak;
}

export function getOccupancyWarningLevel(
  state: Readonly<GameState>,
  config: Readonly<GameConfig>,
): OccupancyWarningLevel {
  const { total } = countCombinedUnits(state, config);
  if (total === 0) {
    return 'none';
  }

  const occupancyPercent = calculateCombinedOccupancyPercent(state, config);
  const previousOccupancy = getPreviousOccupancyPercent(state);
  const buildingsAtRisk = countBuildingsAtMoveOutRisk(state, config, state.appeal);
  const consecutiveLossMonths = getConsecutiveNetResidentLossMonths(state);
  const projectedNet = projectNextMonthNetCashFlow(state, config);
  const balance = config.balance;

  const occupancyDrop = previousOccupancy !== null ? previousOccupancy - occupancyPercent : 0;

  const spiral = occupancyPercent < balance.vacancyAppealThresholdPercent && projectedNet < 0;

  if (spiral) {
    return 'spiral';
  }

  if (occupancyPercent < 25 || consecutiveLossMonths >= 3) {
    return 'red';
  }

  if (occupancyPercent < 50 || buildingsAtRisk >= 2) {
    return 'orange';
  }

  if (occupancyDrop >= 10 || buildingsAtRisk >= 1) {
    return 'yellow';
  }

  return 'none';
}

export function getOccupancyWarningView(
  state: Readonly<GameState>,
  config: Readonly<GameConfig>,
): OccupancyWarningView | null {
  const level = getOccupancyWarningLevel(state, config);
  if (level === 'none') {
    return null;
  }

  const occupancyPercent = calculateCombinedOccupancyPercent(state, config);
  const buildingsAtRisk = countBuildingsAtMoveOutRisk(state, config, state.appeal);

  switch (level) {
    case 'yellow':
      return {
        level,
        title: 'Tenants leaving',
        message:
          'Review leasing scores on at-risk buildings. Lower rent posture, improve condition, or add parking to retain tenants.',
        buildingsAtRisk,
        occupancyPercent,
      };
    case 'orange':
      return {
        level,
        title: 'Vacancy rising',
        message: `Combined occupancy is ${String(occupancyPercent)}%. Appeal and rent posture are under pressure — vacant units reduce income and retail demand.`,
        buildingsAtRisk,
        occupancyPercent,
      };
    case 'red':
      return {
        level,
        title: 'Occupancy critical',
        message:
          'Retail demand and rent income are collapsing. Fill vacant units or cut expenses before cash reserves run out.',
        buildingsAtRisk,
        occupancyPercent,
      };
    case 'spiral':
      return {
        level,
        title: 'Vacancy death spiral',
        message:
          'Low occupancy is reducing appeal and projected cash flow. Switch at-risk buildings to discount rent and prioritize filling units.',
        buildingsAtRisk,
        occupancyPercent,
      };
    default:
      return null;
  }
}
