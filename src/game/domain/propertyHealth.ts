import { getBuildingDefinition } from '@/game/config/buildings';
import { calculateAppealBreakdown } from '@/game/domain/appeal';
import { isActiveEconomyBuilding } from '@/game/domain/condition';
import { calculateEffectiveResidentialDemand } from '@/game/domain/demand';
import {
  calculateCombinedOccupancyPercent,
  calculateEffectiveRetailDemand,
  calculateLeasingScore,
  type LeasingFactorBreakdown,
} from '@/game/domain/leasing';
import { findStrandedBuilding } from '@/game/domain/roadAccessValidation';
import { calculatePropertyParking } from '@/game/domain/parking';
import type { BalanceAssumptions, GameConfig, GameState } from '@/game/domain/types';

export type PropertyHealthTone = 'healthy' | 'at_risk' | 'declining' | 'critical';

export interface PropertyHealthFactor {
  readonly id: string;
  readonly label: string;
  readonly impact: number;
  readonly suggestion: string;
}

export interface PropertyHealthSnapshot {
  readonly score: number;
  readonly occupancyPercent: number;
  readonly appeal: number;
  readonly effectiveResidentialDemand: number;
  readonly effectiveRetailDemand: number;
  readonly worstLeasingScore: number | null;
}

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function getWorstOccupiedLeasingScore(
  state: Readonly<GameState>,
  config: Readonly<GameConfig>,
  balance: Readonly<BalanceAssumptions>,
  appeal: number,
  parking: ReturnType<typeof calculatePropertyParking>,
  residentialDemand: number,
  retailDemandEffective: number,
): number | null {
  let worst: number | null = null;

  for (const building of state.buildings) {
    const definition = getBuildingDefinition(config.buildings, building.definitionId);
    if (!isActiveEconomyBuilding(building)) {
      continue;
    }

    if (definition.residentialUnits > 0 && building.residentialOccupied > 0) {
      const score = calculateLeasingScore(
        building,
        definition,
        residentialDemand,
        appeal,
        parking,
        balance,
      ).total;
      worst = worst === null ? score : Math.min(worst, score);
    }

    if (definition.retailUnits > 0 && building.retailOccupied > 0) {
      const score = calculateLeasingScore(
        building,
        definition,
        retailDemandEffective,
        appeal,
        parking,
        balance,
      ).total;
      worst = worst === null ? score : Math.min(worst, score);
    }
  }

  return worst;
}

export function calculatePropertyHealthSnapshot(
  state: Readonly<GameState>,
  config: Readonly<GameConfig>,
): PropertyHealthSnapshot {
  const balance = config.balance;
  const parking = calculatePropertyParking(state, config);
  const occupancyPercent = calculateCombinedOccupancyPercent(state, config);
  const appeal = state.appeal;
  const effectiveResidentialDemand = calculateEffectiveResidentialDemand(state, config, balance);
  const effectiveRetailDemand = calculateEffectiveRetailDemand(
    state,
    config,
    balance,
    parking,
  ).effective;
  const worstLeasingScore = getWorstOccupiedLeasingScore(
    state,
    config,
    balance,
    appeal,
    parking,
    effectiveResidentialDemand,
    effectiveRetailDemand,
  );

  const leasingComponent = worstLeasingScore ?? 50;
  const score = clampScore(
    occupancyPercent * 0.3 +
      appeal * 0.25 +
      effectiveResidentialDemand * 0.15 +
      effectiveRetailDemand * 0.15 +
      leasingComponent * 0.15,
  );

  return {
    score,
    occupancyPercent,
    appeal,
    effectiveResidentialDemand,
    effectiveRetailDemand,
    worstLeasingScore,
  };
}

export function getPropertyHealthTone(score: number): PropertyHealthTone {
  if (score >= 70) {
    return 'healthy';
  }
  if (score >= 50) {
    return 'at_risk';
  }
  if (score >= 30) {
    return 'declining';
  }
  return 'critical';
}

function getTopNegativeLeasingFactors(
  factors: LeasingFactorBreakdown,
): readonly { readonly key: keyof LeasingFactorBreakdown; readonly value: number }[] {
  const keys: (keyof LeasingFactorBreakdown)[] = [
    'demand',
    'appeal',
    'condition',
    'rentPosture',
    'parking',
    'buildingPreference',
  ];

  return keys
    .map((key) => ({ key, value: factors[key] }))
    .filter((entry) => entry.value < 0 || (entry.key === 'rentPosture' && entry.value < 0))
    .sort((left, right) => left.value - right.value)
    .slice(0, 3);
}

function countOccupiedResidentialUnits(state: Readonly<GameState>): number {
  return state.buildings.reduce((total, building) => total + building.residentialOccupied, 0);
}

export function collectPropertyHealthFactors(
  state: Readonly<GameState>,
  config: Readonly<GameConfig>,
): readonly PropertyHealthFactor[] {
  const balance = config.balance;
  const parking = calculatePropertyParking(state, config);
  const appealBreakdown = calculateAppealBreakdown(state, config, balance, parking);
  const snapshot = calculatePropertyHealthSnapshot(state, config);
  const scenario = config.scenarios.get(state.scenarioId);
  const factors: PropertyHealthFactor[] = [];

  const strandedBuilding = findStrandedBuilding(state, config);

  if (strandedBuilding) {
    const strandedDefinition = getBuildingDefinition(
      config.buildings,
      strandedBuilding.definitionId,
    );
    factors.push({
      id: 'road_access_disconnected',
      label: `${strandedDefinition.name} has no road access`,
      impact: -15,
      suggestion: 'Build or extend an Access Path from the driveway to reconnect buildings.',
    });
  }

  for (const line of appealBreakdown.lines) {
    if (line.value >= 0) {
      continue;
    }

    let suggestion = 'Improve property conditions to raise appeal.';
    if (line.id === 'vacancy_penalty') {
      suggestion = 'Fill vacant units — switch at-risk buildings to discount rent posture.';
    } else if (line.id === 'parking_shortage') {
      suggestion = 'Build parking or reduce retail/mixed footprint.';
    } else if (line.id === 'low_condition') {
      suggestion = 'Renovate buildings with low condition scores.';
    } else if (line.id === 'construction') {
      suggestion = 'Construction noise is temporary — completes when projects finish.';
    }

    factors.push({
      id: line.id,
      label: line.label,
      impact: line.value,
      suggestion,
    });
  }

  if (snapshot.effectiveResidentialDemand < balance.leasingMoveInThreshold) {
    factors.push({
      id: 'low_residential_demand',
      label: `Low effective residential demand (${String(snapshot.effectiveResidentialDemand)})`,
      impact: snapshot.effectiveResidentialDemand - balance.leasingMoveInThreshold,
      suggestion:
        'Wait for market drift or boost appeal and condition to compensate for weak demand.',
    });
  }

  if (snapshot.effectiveRetailDemand < balance.leasingMoveInThreshold) {
    factors.push({
      id: 'low_retail_demand',
      label: `Low effective retail demand (${String(snapshot.effectiveRetailDemand)})`,
      impact: snapshot.effectiveRetailDemand - balance.leasingMoveInThreshold,
      suggestion: 'Fill residential units to boost on-site customer traffic for retail.',
    });
  }

  if (
    scenario?.theme === 'suburb' &&
    countOccupiedResidentialUnits(state) < 3 &&
    state.buildings.some((building) => {
      const definition = config.buildings.get(building.definitionId);
      return definition && definition.residentialUnits > building.residentialOccupied;
    })
  ) {
    factors.push({
      id: 'suburb_network',
      label: `Weak suburb network effect (${String(countOccupiedResidentialUnits(state))} residents)`,
      impact: -5,
      suggestion: 'Prioritize filling the first houses — each resident boosts neighborhood demand.',
    });
  }

  if (snapshot.occupancyPercent < balance.vacancyAppealThresholdPercent) {
    factors.push({
      id: 'low_occupancy',
      label: `Combined occupancy ${String(snapshot.occupancyPercent)}% (below ${String(balance.vacancyAppealThresholdPercent)}%)`,
      impact: -(100 - snapshot.occupancyPercent),
      suggestion: 'Vacancy reduces rent income and can trigger an appeal penalty.',
    });
  }

  for (const building of state.buildings) {
    const definition = getBuildingDefinition(config.buildings, building.definitionId);
    if (!isActiveEconomyBuilding(building)) {
      continue;
    }

    const hasOccupied = building.residentialOccupied > 0 || building.retailOccupied > 0;
    if (!hasOccupied) {
      continue;
    }

    const residentialDemand = calculateEffectiveResidentialDemand(state, config, balance);

    if (definition.residentialUnits > 0 && building.residentialOccupied > 0) {
      const score = calculateLeasingScore(
        building,
        definition,
        residentialDemand,
        state.appeal,
        parking,
        balance,
      );
      if (score.total <= balance.leasingMoveOutThreshold) {
        const negatives = getTopNegativeLeasingFactors(score);
        const factorSummary =
          negatives.length > 0
            ? negatives.map((entry) => `${entry.key} ${String(entry.value)}`).join(', ')
            : 'multiple factors';
        factors.push({
          id: `moveout_${building.id}_residential`,
          label: `${definition.name} at move-out risk (score ${String(score.total)})`,
          impact: score.total - balance.leasingMoveOutThreshold,
          suggestion: `Review ${definition.name}: ${factorSummary}. Try discount rent or renovate.`,
        });
      }
    }

    if (building.rentPosture === 'premium' && building.residentialOccupied > 0) {
      factors.push({
        id: `premium_${building.id}`,
        label: `Premium rent on ${definition.name}`,
        impact: balance.premiumLeasingModifier,
        suggestion: 'Switch to market or discount rent posture to retain tenants.',
      });
    }
  }

  return factors.sort((left, right) => left.impact - right.impact).slice(0, 5);
}
