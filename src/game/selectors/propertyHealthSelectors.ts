import { calculateAppealBreakdown } from '@/game/domain/appeal';
import { calculateEffectiveResidentialDemand } from '@/game/domain/demand';
import { calculatePropertyParking } from '@/game/domain/parking';
import {
  calculatePropertyHealthSnapshot,
  collectPropertyHealthFactors,
  getPropertyHealthTone,
  type PropertyHealthFactor,
  type PropertyHealthTone,
} from '@/game/domain/propertyHealth';
import { getOccupancyWarningView } from '@/game/domain/occupancyWarnings';
import { calculateCombinedOccupancyPercent } from '@/game/domain/leasing';
import { hasValidRecoveryActions } from '@/game/domain/recovery';
import { getFinanceWarningView } from '@/game/domain/warnings';
import type { GameConfig, GameState } from '@/game/domain/types';

export interface PropertyHealthView {
  readonly score: number;
  readonly tone: PropertyHealthTone;
  readonly occupancyPercent: number;
  readonly occupancyLabel: string;
  readonly residentsLabel: string;
  readonly factors: readonly PropertyHealthFactor[];
}

export interface DemandNarrativeView {
  readonly residentialNarrative: string;
  readonly retailNarrative: string;
}

export interface LossRecapView {
  readonly occupancyPercent: number;
  readonly insolventMonths: number;
  readonly propertyHealthScore: number;
  readonly topFactors: readonly PropertyHealthFactor[];
  readonly recoveryExhausted: boolean;
  readonly financeWarningTitle: string | null;
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
    if (!definition) {
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

export function getPropertyHealthView(
  state: Readonly<GameState>,
  config: Readonly<GameConfig>,
): PropertyHealthView {
  const snapshot = calculatePropertyHealthSnapshot(state, config);
  const units = countCombinedUnits(state, config);

  return {
    score: snapshot.score,
    tone: getPropertyHealthTone(snapshot.score),
    occupancyPercent: snapshot.occupancyPercent,
    occupancyLabel:
      units.total > 0
        ? `${String(units.occupied)}/${String(units.total)} (${String(snapshot.occupancyPercent)}%)`
        : '—',
    residentsLabel: units.total > 0 ? `${String(units.occupied)}/${String(units.total)}` : '—',
    factors: collectPropertyHealthFactors(state, config),
  };
}

function describeDemandStrength(score: number): string {
  if (score >= 70) {
    return 'strong';
  }
  if (score >= 50) {
    return 'moderate';
  }
  return 'weak';
}

export function getDemandNarrativeView(
  state: Readonly<GameState>,
  config: Readonly<GameConfig>,
): DemandNarrativeView {
  const balance = config.balance;
  const parking = calculatePropertyParking(state, config);
  const appealBreakdown = calculateAppealBreakdown(state, config, balance, parking);
  const effectiveResidential = calculateEffectiveResidentialDemand(state, config, balance);
  const residentialStrength = describeDemandStrength(effectiveResidential);

  const parkingPenalty = appealBreakdown.lines.find((line) => line.id === 'parking_shortage');
  const vacancyPenalty = appealBreakdown.lines.find((line) => line.id === 'vacancy_penalty');

  let residentialNarrative = `Residential demand is ${residentialStrength}. Market demand and property appeal support leasing`;
  if (parkingPenalty) {
    residentialNarrative += ', but the parking shortage is reducing applications';
  } else if (vacancyPenalty) {
    residentialNarrative += ', but low occupancy is reducing property appeal';
  } else if (effectiveResidential < balance.leasingMoveInThreshold) {
    residentialNarrative += ', but effective demand is below the move-in threshold';
  } else {
    residentialNarrative += '.';
  }

  const retailStrength = describeDemandStrength(state.market.retailDemand);
  let retailNarrative = `Retail market demand is ${retailStrength}.`;
  const residentBoost = state.buildings.reduce(
    (total, building) => total + building.residentialOccupied,
    0,
  );
  if (residentBoost === 0) {
    retailNarrative += ' No on-site residents are boosting foot traffic yet.';
  } else if (parkingPenalty) {
    retailNarrative += ` ${String(residentBoost)} on-site resident${residentBoost === 1 ? '' : 's'} help, but parking shortages limit retail leasing.`;
  } else {
    retailNarrative += ` ${String(residentBoost)} on-site resident${residentBoost === 1 ? '' : 's'} boost effective retail demand.`;
  }

  return {
    residentialNarrative,
    retailNarrative,
  };
}

export function getLossRecapView(
  state: Readonly<GameState>,
  config: Readonly<GameConfig>,
): LossRecapView {
  const health = getPropertyHealthView(state, config);
  const financeWarning = getFinanceWarningView(state, config);

  return {
    occupancyPercent: calculateCombinedOccupancyPercent(state, config),
    insolventMonths: state.counters.consecutiveInsolventMonths,
    propertyHealthScore: health.score,
    topFactors: health.factors.slice(0, 3),
    recoveryExhausted: !hasValidRecoveryActions(state, config),
    financeWarningTitle: financeWarning?.title ?? null,
  };
}

export { getOccupancyWarningView };
