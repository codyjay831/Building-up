import { getBuildingDefinition } from '@/game/config/buildings';
import { calculateEffectiveResidentialDemand } from '@/game/domain/demand';
import { isActiveEconomyBuilding } from '@/game/domain/condition';
import type {
  BalanceAssumptions,
  BuildingDefinition,
  BuildingInstance,
  BuildingLifecycleState,
  GameConfig,
  GameState,
  ParkingSnapshot,
  RentPosture,
} from '@/game/domain/types';
import { createRng, nextRandom } from '@/game/domain/prng';

export interface LeasingFactorBreakdown {
  readonly demand: number;
  readonly appeal: number;
  readonly condition: number;
  readonly rentPosture: number;
  readonly parking: number;
  readonly buildingPreference: number;
  readonly total: number;
}

export interface EffectiveRetailDemandBreakdown {
  readonly baseDemand: number;
  readonly residentCustomerBoost: number;
  readonly mixedUseSynergy: number;
  readonly frontageBonus: number;
  readonly parkingPenalty: number;
  readonly effective: number;
}

export interface OccupancyChange {
  readonly buildingId: string;
  readonly residentialDelta: number;
  readonly retailDelta: number;
}

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function getRentPostureModifier(
  posture: RentPosture,
  balance: Readonly<BalanceAssumptions>,
): number {
  switch (posture) {
    case 'discount':
      return balance.discountLeasingModifier;
    case 'premium':
      return balance.premiumLeasingModifier;
    default:
      return 0;
  }
}

function getBuildingPreferenceBonus(definition: Readonly<BuildingDefinition>): number {
  return Math.max(-5, Math.min(10, definition.appealModifier));
}

function countOccupiedResidentialUnits(state: Readonly<GameState>): number {
  return state.buildings.reduce((total, building) => total + building.residentialOccupied, 0);
}

function hasOperatingMixedUse(state: Readonly<GameState>, config: Readonly<GameConfig>): boolean {
  return state.buildings.some((building) => {
    const definition = config.buildings.get(building.definitionId);
    return (
      definition?.category === 'mixed' &&
      isActiveEconomyBuilding(building) &&
      building.lifecycleState === 'operating'
    );
  });
}

export function calculateEffectiveRetailDemand(
  state: Readonly<GameState>,
  config: Readonly<GameConfig>,
  balance: Readonly<BalanceAssumptions>,
  parking: Readonly<ParkingSnapshot>,
): EffectiveRetailDemandBreakdown {
  const baseDemand = state.market.retailDemand;
  const residentCustomerBoost = countOccupiedResidentialUnits(state) * balance.localCustomerFactor;
  const mixedUseSynergy = hasOperatingMixedUse(state, config) ? balance.mixedUseRetailSynergy : 0;

  let frontageBonus = 0;
  for (const building of state.buildings) {
    const definition = config.buildings.get(building.definitionId);
    if (
      !definition ||
      definition.retailUnits === 0 ||
      !isActiveEconomyBuilding(building) ||
      !definition.roadAccessRequired
    ) {
      continue;
    }

    frontageBonus += balance.retailFrontageBonus;
  }

  const coveragePenalty =
    parking.demand === 0
      ? 0
      : Math.round((1 - parking.coverage) * balance.retailParkingCoveragePenalty);
  const shortfallPenalty = parking.shortfall * balance.retailParkingShortfallPenalty;
  const parkingPenalty = coveragePenalty + shortfallPenalty;

  const effective = clampScore(
    baseDemand + residentCustomerBoost + mixedUseSynergy + frontageBonus - parkingPenalty,
  );

  return {
    baseDemand,
    residentCustomerBoost,
    mixedUseSynergy,
    frontageBonus,
    parkingPenalty,
    effective,
  };
}

function getParkingLeasingContribution(
  parking: Readonly<ParkingSnapshot>,
  balance: Readonly<BalanceAssumptions>,
  isRetail: boolean,
): number {
  const weight = balance.leasingParkingWeight;
  const coverageContribution = parking.coverage * weight;

  if (!isRetail || parking.shortfall === 0) {
    return Math.round(coverageContribution);
  }

  const retailShortfallPenalty = Math.min(weight, parking.shortfall * 2);
  return Math.max(0, Math.round(coverageContribution - retailShortfallPenalty));
}

export function calculateLeasingScore(
  building: Readonly<BuildingInstance>,
  definition: Readonly<BuildingDefinition>,
  demandScore: number,
  appeal: number,
  parking: Readonly<ParkingSnapshot>,
  balance: Readonly<BalanceAssumptions>,
): LeasingFactorBreakdown {
  const isRetail = definition.retailUnits > 0 && definition.residentialUnits === 0;
  const isMixedRetail = definition.category === 'mixed';

  const demand = Math.round((demandScore / 100) * balance.leasingDemandWeight);
  const appealFactor = Math.round((appeal / 100) * balance.leasingAppealWeight);
  const condition = Math.round((building.condition / 100) * balance.leasingConditionWeight);
  const rentPosture = getRentPostureModifier(building.rentPosture, balance);
  const parkingFactor = getParkingLeasingContribution(parking, balance, isRetail || isMixedRetail);
  const buildingPreference = getBuildingPreferenceBonus(definition);

  const total = clampScore(
    demand + appealFactor + condition + rentPosture + parkingFactor + buildingPreference,
  );

  return {
    demand,
    appeal: appealFactor,
    condition,
    rentPosture,
    parking: parkingFactor,
    buildingPreference,
    total,
  };
}

function getMaxMonthlyOccupancyChanges(
  definition: Readonly<BuildingDefinition>,
  balance: Readonly<BalanceAssumptions>,
): number {
  if (definition.residentialUnits >= 4) {
    return balance.apartmentMaxOccupancyChanges;
  }

  return balance.defaultMaxOccupancyChanges;
}

function resolveLifecycleAfterOccupancy(
  building: Readonly<BuildingInstance>,
  definition: Readonly<BuildingDefinition>,
  residentialOccupied: number,
  retailOccupied: number,
): BuildingLifecycleState {
  if (building.lifecycleState !== 'leasing') {
    return building.lifecycleState;
  }

  const residentialFull =
    definition.residentialUnits === 0 || residentialOccupied >= definition.residentialUnits;
  const retailFull = definition.retailUnits === 0 || retailOccupied >= definition.retailUnits;

  return residentialFull && retailFull ? 'operating' : 'leasing';
}

function rollMoveIn(probability: number, rng: ReturnType<typeof createRng>): [boolean, number] {
  const [roll, nextRng] = nextRandom(rng);
  return [roll < probability, nextRng.counter];
}

function rollMoveOut(probability: number, rng: ReturnType<typeof createRng>): [boolean, number] {
  const [roll, nextRng] = nextRandom(rng);
  return [roll < probability, nextRng.counter];
}

function processUnitOccupancy(input: {
  readonly occupied: number;
  readonly totalUnits: number;
  readonly leasingScore: number;
  readonly balance: Readonly<BalanceAssumptions>;
  readonly rngCounter: number;
  readonly seed: string;
  readonly remainingChanges: number;
}): { readonly occupied: number; readonly delta: number; readonly rngCounter: number } {
  if (input.totalUnits === 0 || input.remainingChanges === 0) {
    return { occupied: input.occupied, delta: 0, rngCounter: input.rngCounter };
  }

  const vacant = input.totalUnits - input.occupied;
  let rng = createRng(input.seed, input.rngCounter);

  if (vacant > 0 && input.leasingScore >= input.balance.leasingMoveInThreshold) {
    const span = 100 - input.balance.leasingMoveInThreshold + 1;
    const probability =
      span === 0
        ? 1
        : (input.leasingScore - input.balance.leasingMoveInThreshold + 1) / span;
    const [shouldMoveIn, nextCounter] = rollMoveIn(probability, rng);
    rng = { ...rng, counter: nextCounter };

    if (shouldMoveIn) {
      const changes = Math.min(vacant, input.remainingChanges);
      return {
        occupied: input.occupied + changes,
        delta: changes,
        rngCounter: rng.counter,
      };
    }

    return { occupied: input.occupied, delta: 0, rngCounter: rng.counter };
  }

  if (input.occupied > 0 && input.leasingScore <= input.balance.leasingMoveOutThreshold) {
    const span = input.balance.leasingMoveOutThreshold + 1;
    const probability =
      span === 0 ? 1 : (input.balance.leasingMoveOutThreshold - input.leasingScore + 1) / span;
    const [shouldMoveOut, nextCounter] = rollMoveOut(probability, rng);
    rng = { ...rng, counter: nextCounter };

    if (shouldMoveOut) {
      const changes = Math.min(input.occupied, input.remainingChanges);
      return {
        occupied: input.occupied - changes,
        delta: -changes,
        rngCounter: rng.counter,
      };
    }

    return { occupied: input.occupied, delta: 0, rngCounter: rng.counter };
  }

  return { occupied: input.occupied, delta: 0, rngCounter: rng.counter };
}

export function processMonthlyLeasing(
  state: Readonly<GameState>,
  config: Readonly<GameConfig>,
  balance: Readonly<BalanceAssumptions>,
  appeal: number,
  parking: Readonly<ParkingSnapshot>,
  rngCounter: number,
): {
  readonly state: GameState;
  readonly changes: readonly OccupancyChange[];
  readonly rngCounter: number;
} {
  const retailDemand = calculateEffectiveRetailDemand(state, config, balance, parking);
  const changes: OccupancyChange[] = [];
  let counter = rngCounter;

  const buildings = state.buildings.map((building) => {
    const definition = getBuildingDefinition(config.buildings, building.definitionId);
    if (!isActiveEconomyBuilding(building)) {
      return building;
    }

    const totalUnits = definition.residentialUnits + definition.retailUnits;
    if (totalUnits === 0) {
      return building;
    }

    const residentialDemandScore = calculateEffectiveResidentialDemand(state, config, balance);
    const retailDemandScore = retailDemand.effective;
    const residentialScore = calculateLeasingScore(
      building,
      definition,
      residentialDemandScore,
      appeal,
      parking,
      balance,
    );
    const retailScore =
      definition.retailUnits > 0
        ? calculateLeasingScore(building, definition, retailDemandScore, appeal, parking, balance)
        : null;

    let remainingChanges = getMaxMonthlyOccupancyChanges(definition, balance);
    let residentialOccupied = building.residentialOccupied;
    let retailOccupied = building.retailOccupied;

    if (definition.residentialUnits > 0) {
      const residentialResult = processUnitOccupancy({
        occupied: residentialOccupied,
        totalUnits: definition.residentialUnits,
        leasingScore: residentialScore.total,
        balance,
        rngCounter: counter,
        seed: state.seed,
        remainingChanges,
      });
      residentialOccupied = residentialResult.occupied;
      remainingChanges = Math.max(0, remainingChanges - Math.abs(residentialResult.delta));
      counter = residentialResult.rngCounter;
    }

    if (definition.retailUnits > 0 && retailScore && remainingChanges > 0) {
      const retailResult = processUnitOccupancy({
        occupied: retailOccupied,
        totalUnits: definition.retailUnits,
        leasingScore: retailScore.total,
        balance,
        rngCounter: counter,
        seed: state.seed,
        remainingChanges,
      });
      retailOccupied = retailResult.occupied;
      counter = retailResult.rngCounter;
    }

    const residentialDelta = residentialOccupied - building.residentialOccupied;
    const retailDelta = retailOccupied - building.retailOccupied;

    if (residentialDelta !== 0 || retailDelta !== 0) {
      changes.push({
        buildingId: building.id,
        residentialDelta,
        retailDelta,
      });
    }

    return {
      ...building,
      residentialOccupied,
      retailOccupied,
      lifecycleState: resolveLifecycleAfterOccupancy(
        building,
        definition,
        residentialOccupied,
        retailOccupied,
      ),
    };
  });

  return {
    state: {
      ...state,
      buildings,
    },
    changes,
    rngCounter: counter,
  };
}

export function calculateCombinedOccupancyPercent(
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

export function getRentPostureLeasingModifier(
  posture: RentPosture,
  balance: Readonly<BalanceAssumptions>,
): number {
  return getRentPostureModifier(posture, balance);
}
