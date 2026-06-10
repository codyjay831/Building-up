import { getBuildingDefinition } from '@/game/config/buildings';
import { isActiveEconomyBuilding } from '@/game/domain/condition';
import { calculateEffectiveResidentialDemand } from '@/game/domain/demand';
import {
  calculateEffectiveRetailDemand,
  calculateLeasingScore,
  type EffectiveRetailDemandBreakdown,
  type LeasingFactorBreakdown,
} from '@/game/domain/leasing';
import { calculatePropertyParking } from '@/game/domain/parking';
import type {
  BalanceAssumptions,
  BuildingInstance,
  GameConfig,
  GameState,
} from '@/game/domain/types';

export interface BuildingLeasingView {
  readonly buildingId: string;
  readonly buildingName: string;
  readonly residentialScore: LeasingFactorBreakdown | null;
  readonly retailScore: LeasingFactorBreakdown | null;
  readonly residentialOccupancyLabel: string;
  readonly retailOccupancyLabel: string | null;
  readonly hasVacancy: boolean;
  readonly vacancyTone: 'positive' | 'neutral' | 'negative';
  readonly residentialLeasingStatus: LeasingStatusView | null;
  readonly retailLeasingStatus: LeasingStatusView | null;
}

export interface PropertyDemandView {
  readonly residentialDemandLabel: string;
  readonly retailDemandLabel: string;
  readonly effectiveRetailDemand: EffectiveRetailDemandBreakdown;
  readonly parkingShortfallLabel: string | null;
}

export type LeasingStatusTone = 'positive' | 'neutral' | 'negative';

export interface LeasingStatusView {
  readonly message: string;
  readonly tone: LeasingStatusTone;
}

export function getLeasingStatusView(input: {
  readonly score: number;
  readonly occupiedUnits: number;
  readonly totalUnits: number;
  readonly balance: Readonly<BalanceAssumptions>;
}): LeasingStatusView {
  const { score, occupiedUnits, totalUnits, balance } = input;
  const hasVacancy = occupiedUnits < totalUnits;
  const moveInThreshold = balance.leasingMoveInThreshold;
  const moveOutThreshold = balance.leasingMoveOutThreshold;

  if (hasVacancy && score >= moveInThreshold) {
    return {
      message: `Attracting tenants — leasing score is at or above the move-in threshold (${String(moveInThreshold)}).`,
      tone: 'positive',
    };
  }

  if (hasVacancy && score > moveOutThreshold && score < moveInThreshold) {
    return {
      message: `Stalled — raise leasing score to ${String(moveInThreshold)} or higher to attract tenants.`,
      tone: 'negative',
    };
  }

  if (occupiedUnits > 0 && score <= moveOutThreshold) {
    return {
      message: `At risk — tenants may move out while score is at or below ${String(moveOutThreshold)}.`,
      tone: 'negative',
    };
  }

  if (!hasVacancy) {
    return {
      message: 'Stable this month — all units occupied.',
      tone: 'positive',
    };
  }

  return {
    message: 'Stable this month — no move-ins or move-outs expected.',
    tone: 'neutral',
  };
}

function formatSigned(value: number): string {
  if (value > 0) {
    return `+${String(value)}`;
  }

  return String(value);
}

export function getPropertyDemandView(
  state: Readonly<GameState>,
  config: Readonly<GameConfig>,
): PropertyDemandView {
  const parking = calculatePropertyParking(state, config);
  const effectiveRetailDemand = calculateEffectiveRetailDemand(
    state,
    config,
    config.balance,
    parking,
  );

  return {
    residentialDemandLabel: `${String(state.market.residentialDemand)} / 100`,
    retailDemandLabel: `${String(state.market.retailDemand)} / 100`,
    effectiveRetailDemand,
    parkingShortfallLabel:
      parking.shortfall > 0
        ? `${String(parking.shortfall)} space shortage (${String(Math.round(parking.coverage * 100))}% covered)`
        : null,
  };
}

export function getBuildingLeasingView(
  state: Readonly<GameState>,
  config: Readonly<GameConfig>,
  building: Readonly<BuildingInstance>,
): BuildingLeasingView | null {
  const definition = getBuildingDefinition(config.buildings, building.definitionId);
  if (!isActiveEconomyBuilding(building)) {
    return null;
  }

  const parking = calculatePropertyParking(state, config);
  const effectiveRetailDemand = calculateEffectiveRetailDemand(
    state,
    config,
    config.balance,
    parking,
  );

  const residentialScore =
    definition.residentialUnits > 0
      ? calculateLeasingScore(
          building,
          definition,
          calculateEffectiveResidentialDemand(state, config, config.balance),
          state.appeal,
          parking,
          config.balance,
        )
      : null;

  const retailScore =
    definition.retailUnits > 0
      ? calculateLeasingScore(
          building,
          definition,
          effectiveRetailDemand.effective,
          state.appeal,
          parking,
          config.balance,
        )
      : null;

  const totalUnits = definition.residentialUnits + definition.retailUnits;
  const occupiedUnits = building.residentialOccupied + building.retailOccupied;
  const hasVacancy = occupiedUnits < totalUnits;
  const vacancyRatio = totalUnits === 0 ? 0 : (totalUnits - occupiedUnits) / totalUnits;

  return {
    buildingId: building.id,
    buildingName: definition.name,
    residentialScore,
    retailScore,
    residentialOccupancyLabel: `${String(building.residentialOccupied)}/${String(definition.residentialUnits)}`,
    retailOccupancyLabel:
      definition.retailUnits > 0
        ? `${String(building.retailOccupied)}/${String(definition.retailUnits)}`
        : null,
    hasVacancy,
    vacancyTone: hasVacancy ? (vacancyRatio >= 0.5 ? 'negative' : 'neutral') : 'positive',
    residentialLeasingStatus: residentialScore
      ? getLeasingStatusView({
          score: residentialScore.total,
          occupiedUnits: building.residentialOccupied,
          totalUnits: definition.residentialUnits,
          balance: config.balance,
        })
      : null,
    retailLeasingStatus:
      retailScore && definition.retailUnits > 0
        ? getLeasingStatusView({
            score: retailScore.total,
            occupiedUnits: building.retailOccupied,
            totalUnits: definition.retailUnits,
            balance: config.balance,
          })
        : null,
  };
}

export function formatLeasingFactorLabel(key: keyof LeasingFactorBreakdown): string {
  switch (key) {
    case 'demand':
      return 'Market demand';
    case 'appeal':
      return 'Property appeal';
    case 'condition':
      return 'Building condition';
    case 'rentPosture':
      return 'Rent posture';
    case 'parking':
      return 'Parking coverage';
    case 'buildingPreference':
      return 'Building preference';
    case 'total':
      return 'Leasing score';
    default:
      return key;
  }
}

export function formatEffectiveRetailDemandLine(value: number): string {
  return formatSigned(value);
}

export function formatEffectiveRetailDemandLabel(
  key: keyof Omit<EffectiveRetailDemandBreakdown, 'effective'>,
): string {
  switch (key) {
    case 'baseDemand':
      return 'Base retail demand';
    case 'residentCustomerBoost':
      return 'On-site residents';
    case 'mixedUseSynergy':
      return 'Mixed-use synergy';
    case 'frontageBonus':
      return 'Road frontage';
    case 'parkingPenalty':
      return 'Parking shortage';
    default:
      return key;
  }
}

export function getBuildingVacancyLevel(
  building: Readonly<BuildingInstance>,
  config: Readonly<GameConfig>,
): 'full' | 'partial' | 'vacant' | 'none' {
  const definition = config.buildings.get(building.definitionId);
  if (!definition || !isActiveEconomyBuilding(building)) {
    return 'none';
  }

  const totalUnits = definition.residentialUnits + definition.retailUnits;
  if (totalUnits === 0) {
    return 'none';
  }

  const occupiedUnits = building.residentialOccupied + building.retailOccupied;
  if (occupiedUnits === 0) {
    return 'vacant';
  }

  if (occupiedUnits < totalUnits) {
    return 'partial';
  }

  return 'full';
}
