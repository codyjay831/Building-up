import { advanceMonth } from '@/game/commands/advanceMonth';
import { placeProject } from '@/game/commands/placeProject';
import { refinanceProperty } from '@/game/commands/refinanceProperty';
import { renovateBuilding } from '@/game/commands/renovateBuilding';
import { setRentPosture } from '@/game/commands/setRentPosture';
import { getBuildingDefinition } from '@/game/config/buildings';
import {
  createGameConfig,
  createStarterGameState,
  getScenarioDefinition,
  getTutorialBuildingDefinitionId,
  RIVERSIDE_STARTER_SCENARIO_ID,
} from '@/game/config/scenario';
import { getConstructionFinanceEra } from '@/game/config/constructionFinance';
import { getCommitmentDeposit } from '@/game/domain/construction';
import { getCalendarYear } from '@/game/domain/calendar';
import { calculateConstructionLoanTerms, canOfferConstructionLoan } from '@/game/domain/debt';
import { calculateCombinedOccupancyPercent } from '@/game/domain/leasing';
import { getFinanceWarningLevel } from '@/game/domain/warnings';
import type { CommandResult, GameConfig, GameState, PlacedFootprint } from '@/game/domain/types';
import type { FixedSeedPreset } from '@/game/telemetry/fixedSeeds';
import { applyFixedSeedMarketPreset } from '@/game/telemetry/fixedSeeds';
import { findValidPlacement, findValidPlacementPreservingFutureBuild } from '@/game/telemetry/placementScan';
import type { MonthlyTelemetrySnapshot, RunTelemetry } from '@/game/telemetry/telemetryTypes';

export type OpeningStrategy = 'retail_first' | 'residential_first' | 'amenity_first';

export interface SmokeBotOptions {
  readonly strategy: OpeningStrategy;
  readonly seed: string;
  readonly preset?: FixedSeedPreset;
  readonly scenarioId?: string;
  readonly maxMonths?: number;
  readonly config?: GameConfig;
}

interface BotAction {
  readonly kind: 'place' | 'renovate' | 'rent_posture' | 'refinance' | 'advance';
  readonly definitionId?: string;
  readonly footprint?: PlacedFootprint;
  readonly buildingId?: string;
  readonly posture?: 'discount' | 'market' | 'premium';
  readonly useConstructionLoan?: boolean;
}

function applyPresetMarket(state: GameState, preset?: FixedSeedPreset): GameState {
  if (!preset) {
    return state;
  }

  return applyFixedSeedMarketPreset(state, preset);
}

function hasActiveProjects(state: Readonly<GameState>): boolean {
  return state.projects.some(
    (project) => project.status === 'committed' || project.status === 'under_construction',
  );
}

function hasBuildingDefinition(state: Readonly<GameState>, definitionId: string): boolean {
  return (
    state.buildings.some((building) => building.definitionId === definitionId) ||
    state.projects.some((project) => project.definitionId === definitionId)
  );
}

function isMixedUseComplete(state: Readonly<GameState>): boolean {
  return state.buildings.some(
    (building) =>
      building.definitionId === 'shop_apartments' &&
      (building.lifecycleState === 'operating' || building.lifecycleState === 'leasing'),
  );
}

function findTutorialRenovationTarget(
  state: Readonly<GameState>,
  config: Readonly<GameConfig>,
): (typeof state.buildings)[number] | undefined {
  const scenario = getScenarioDefinition(config.scenarios, state.scenarioId);
  const tutorialDefinitionId = getTutorialBuildingDefinitionId(scenario);

  return state.buildings.find(
    (building) =>
      building.definitionId === tutorialDefinitionId &&
      !building.renovated &&
      (building.lifecycleState === 'operating' || building.lifecycleState === 'leasing'),
  );
}

function listPlayerPlacedBuildingChoices(
  state: Readonly<GameState>,
  config: Readonly<GameConfig>,
): string[] {
  const scenario = getScenarioDefinition(config.scenarios, state.scenarioId);
  const starterCount = scenario.starterBuildings.length;

  return state.buildings
    .filter((building) => {
      const match = /^building-(\d+)$/.exec(building.id);
      return match !== null && Number(match[1]) > starterCount;
    })
    .map((building) => building.definitionId);
}

function chooseOpeningBuild(strategy: OpeningStrategy): string {
  switch (strategy) {
    case 'retail_first':
      return 'corner_shop';
    case 'residential_first':
      return 'small_house';
    case 'amenity_first':
      return 'small_park';
    default:
      return 'corner_shop';
  }
}

function createPlaceAction(
  state: Readonly<GameState>,
  config: Readonly<GameConfig>,
  definitionId: string,
  options: { readonly preferLoan?: boolean; readonly preserveMixedUseRoom?: boolean } = {},
): BotAction | null {
  const footprint =
    options.preserveMixedUseRoom === true
      ? findValidPlacementPreservingFutureBuild(state, config, definitionId, 'shop_apartments')
      : findValidPlacement(state, config, definitionId);

  if (!footprint) {
    return null;
  }

  const definition = getBuildingDefinition(config.buildings, definitionId);
  const calendarYear = getCalendarYear(state, config);
  const era = getConstructionFinanceEra(config.constructionFinanceEras, calendarYear);
  const loanEligible = canOfferConstructionLoan(definition, state, era);
  const loanTerms = calculateConstructionLoanTerms(
    definition.constructionCost,
    era,
    config.balance,
    definition.constructionMonths,
  );
  const fullCost = getCommitmentDeposit(definition);
  const preferLoan = options.preferLoan === true;

  if (preferLoan && loanEligible && state.cash >= loanTerms.equityRequired) {
    return {
      kind: 'place',
      definitionId,
      footprint,
      useConstructionLoan: true,
    };
  }

  if (state.cash >= fullCost) {
    return {
      kind: 'place',
      definitionId,
      footprint,
      useConstructionLoan: false,
    };
  }

  if (loanEligible && state.cash >= loanTerms.equityRequired) {
    return {
      kind: 'place',
      definitionId,
      footprint,
      useConstructionLoan: true,
    };
  }

  return null;
}

function getBuildingVacancy(
  building: GameState['buildings'][number],
  config: Readonly<GameConfig>,
): { residentialVacant: boolean; retailVacant: boolean } {
  const definition = config.buildings.get(building.definitionId);

  return {
    residentialVacant: (definition?.residentialUnits ?? 0) > building.residentialOccupied,
    retailVacant: (definition?.retailUnits ?? 0) > building.retailOccupied,
  };
}

function listRentTuningActions(
  state: Readonly<GameState>,
  config: Readonly<GameConfig>,
): BotAction[] {
  const actions: BotAction[] = [];

  for (const building of state.buildings) {
    if (building.lifecycleState !== 'operating' && building.lifecycleState !== 'leasing') {
      continue;
    }

    const { residentialVacant, retailVacant } = getBuildingVacancy(building, config);

    if ((residentialVacant || retailVacant) && building.rentPosture !== 'discount') {
      actions.push({ kind: 'rent_posture', buildingId: building.id, posture: 'discount' });
      continue;
    }

    if (
      !residentialVacant &&
      !retailVacant &&
      building.rentPosture === 'discount' &&
      state.counters.consecutivePositiveCashFlowMonths >= 1
    ) {
      actions.push({ kind: 'rent_posture', buildingId: building.id, posture: 'market' });
      continue;
    }

    if (
      !residentialVacant &&
      !retailVacant &&
      building.rentPosture === 'market' &&
      state.counters.consecutivePositiveCashFlowMonths >= 2 &&
      state.cash >= config.balance.approval2CashReserve
    ) {
      actions.push({ kind: 'rent_posture', buildingId: building.id, posture: 'premium' });
    }
  }

  return actions;
}

function listAvailableBotActions(
  state: Readonly<GameState>,
  config: Readonly<GameConfig>,
  strategy: OpeningStrategy,
): BotAction[] {
  const actions: BotAction[] = [];
  const openingBuild = chooseOpeningBuild(strategy);

  if (!hasBuildingDefinition(state, openingBuild) && !hasActiveProjects(state)) {
    const placeAction = createPlaceAction(state, config, openingBuild, {
      preferLoan: true,
      preserveMixedUseRoom: true,
    });

    if (placeAction) {
      actions.push(placeAction);
    }
  }

  if (
    state.approval.level >= 2 &&
    !hasBuildingDefinition(state, 'shop_apartments') &&
    !hasActiveProjects(state)
  ) {
    const footprint = findValidPlacement(state, config, 'shop_apartments');
    const mixedUseDefinition = getBuildingDefinition(config.buildings, 'shop_apartments');
    const calendarYear = getCalendarYear(state, config);
    const era = getConstructionFinanceEra(config.constructionFinanceEras, calendarYear);
    const loanEligible = canOfferConstructionLoan(mixedUseDefinition, state, era);
    const loanTerms = calculateConstructionLoanTerms(
      mixedUseDefinition.constructionCost,
      era,
      config.balance,
      mixedUseDefinition.constructionMonths,
    );

    if (footprint) {
      if (loanEligible && state.cash >= loanTerms.equityRequired) {
        actions.push({
          kind: 'place',
          definitionId: 'shop_apartments',
          useConstructionLoan: true,
        });
      } else if (state.cash >= getCommitmentDeposit(mixedUseDefinition)) {
        actions.push({
          kind: 'place',
          definitionId: 'shop_apartments',
          useConstructionLoan: false,
        });
      } else if (!state.counters.refinanceUsed) {
        actions.push({ kind: 'refinance' });
      }
    }
  }

  const starterHouse = findTutorialRenovationTarget(state, config);

  if (starterHouse && state.cash >= config.balance.renovationCost && state.month >= 2) {
    actions.push({ kind: 'renovate', buildingId: starterHouse.id });
  }

  if (
    strategy === 'retail_first' &&
    hasBuildingDefinition(state, 'corner_shop') &&
    !hasBuildingDefinition(state, 'surface_parking') &&
    !hasActiveProjects(state) &&
    state.cash >= 12_000
  ) {
    const footprint = findValidPlacement(state, config, 'surface_parking');

    if (footprint) {
      actions.push({ kind: 'place', definitionId: 'surface_parking' });
    }
  }

  if (
    strategy === 'amenity_first' &&
    hasBuildingDefinition(state, 'small_park') &&
    !hasBuildingDefinition(state, 'corner_shop') &&
    !hasActiveProjects(state)
  ) {
    const placeAction = createPlaceAction(state, config, 'corner_shop', { preferLoan: true });

    if (placeAction) {
      actions.push(placeAction);
    }
  }

  actions.push(...listRentTuningActions(state, config));
  actions.push(...listCashResponsiveActions(state, config));

  return actions;
}

function listCashResponsiveActions(
  state: Readonly<GameState>,
  config: Readonly<GameConfig>,
): BotAction[] {
  const actions: BotAction[] = [];

  for (const building of state.buildings) {
    if (building.lifecycleState !== 'operating' && building.lifecycleState !== 'leasing') {
      continue;
    }

    if (state.cash < config.balance.approval2CashReserve && building.rentPosture === 'premium') {
      actions.push({ kind: 'rent_posture', buildingId: building.id, posture: 'market' });
      continue;
    }

    if (
      state.cash < config.balance.warningOrangeReserveMonths * 8_000 &&
      building.rentPosture === 'market'
    ) {
      const { residentialVacant, retailVacant } = getBuildingVacancy(building, config);

      if (!residentialVacant && !retailVacant) {
        actions.push({ kind: 'rent_posture', buildingId: building.id, posture: 'discount' });
      }
    }
  }

  return actions;
}

function executeBotAction(
  state: Readonly<GameState>,
  config: Readonly<GameConfig>,
  action: BotAction,
): CommandResult | null {
  if (action.kind === 'advance') {
    return null;
  }

  if (action.kind === 'renovate' && action.buildingId) {
    return renovateBuilding(state, config, { buildingId: action.buildingId });
  }

  if (action.kind === 'rent_posture' && action.buildingId && action.posture) {
    return setRentPosture(state, config, {
      buildingId: action.buildingId,
      posture: action.posture,
    });
  }

  if (action.kind === 'refinance') {
    return refinanceProperty(state, config);
  }

  if (action.kind === 'place' && action.definitionId) {
    const footprint =
      action.footprint ?? findValidPlacement(state, config, action.definitionId);

    if (!footprint) {
      return null;
    }

    return placeProject(state, config, {
      definitionId: action.definitionId,
      footprint,
      useConstructionLoan: action.useConstructionLoan === true,
    });
  }

  return null;
}

function getTotalDebt(state: Readonly<GameState>): number {
  return state.debt.reduce((total, loan) => total + loan.principal, 0);
}

function recordSnapshot(
  state: Readonly<GameState>,
  config: Readonly<GameConfig>,
  hadDecision: boolean,
): MonthlyTelemetrySnapshot {
  return {
    month: state.month,
    cash: state.cash,
    approvalLevel: state.approval.level,
    occupancyPercent: calculateCombinedOccupancyPercent(state, config),
    appeal: state.appeal,
    totalDebt: getTotalDebt(state),
    warningLevel: getFinanceWarningLevel(state, config),
    hadDecision,
  };
}

export function runSmokeSimulation(options: SmokeBotOptions): RunTelemetry {
  const config = options.config ?? createGameConfig();
  const maxMonths = options.maxMonths ?? 36;
  const scenarioId = options.scenarioId ?? options.preset?.scenarioId ?? RIVERSIDE_STARTER_SCENARIO_ID;
  let state = applyPresetMarket(
    createStarterGameState(scenarioId, options.seed, config),
    options.preset,
  );

  const monthlySnapshots: MonthlyTelemetrySnapshot[] = [];
  const buildingChoices: string[] = [];
  let monthsToApproval2: number | null = null;
  let monthsToFirstMixedUseStart: number | null = null;
  let monthsToFirstMixedUseComplete: number | null = null;
  let idleTurnCount = 0;
  let consecutiveIdleTurns = 0;
  let maxConsecutiveIdleTurns = 0;
  let warningCount = 0;
  let lowestCash = state.cash;
  let peakDebt = 0;
  let occupancyTotal = 0;
  let appealTotal = 0;
  let outcomeMonth: number | null = null;
  let firstBuildingChoice: string | null = null;

  for (let turn = 0; turn < maxMonths && state.status === 'active'; turn += 1) {
    const availableActions = listAvailableBotActions(state, config, options.strategy);
    const action = availableActions[0] ?? { kind: 'advance' as const };
    const hadDecision = action.kind !== 'advance';
    const forcedWait = availableActions.length === 0;

    if (action.kind === 'place' && action.definitionId) {
      buildingChoices.push(action.definitionId);

      if (!firstBuildingChoice) {
        firstBuildingChoice = action.definitionId;
      }

      if (action.definitionId === 'shop_apartments' && monthsToFirstMixedUseStart === null) {
        monthsToFirstMixedUseStart = state.month;
      }
    }

    const commandResult = executeBotAction(state, config, action);

    if (commandResult?.ok) {
      state = commandResult.state;
    }

    if (!hadDecision && !forcedWait) {
      idleTurnCount += 1;
      consecutiveIdleTurns += 1;
      maxConsecutiveIdleTurns = Math.max(maxConsecutiveIdleTurns, consecutiveIdleTurns);
    } else if (hadDecision) {
      consecutiveIdleTurns = 0;
    } else {
      consecutiveIdleTurns = 0;
    }

    const advanced = advanceMonth(state, config);

    if (!advanced.ok) {
      break;
    }

    state = advanced.state;

    if (state.approval.level >= 2 && monthsToApproval2 === null) {
      monthsToApproval2 = state.month;
    }

    if (isMixedUseComplete(state) && monthsToFirstMixedUseComplete === null) {
      monthsToFirstMixedUseComplete = state.month;
    }

    const warningLevel = getFinanceWarningLevel(state, config);

    if (warningLevel !== 'none') {
      warningCount += 1;
    }

    lowestCash = Math.min(lowestCash, state.cash);
    peakDebt = Math.max(peakDebt, getTotalDebt(state));
    occupancyTotal += calculateCombinedOccupancyPercent(state, config);
    appealTotal += state.appeal;

    monthlySnapshots.push(recordSnapshot(state, config, hadDecision));

    if (state.status !== 'active' && outcomeMonth === null) {
      outcomeMonth = state.month;
    }
  }

  const monthsPlayed = monthlySnapshots.length;

  return {
    seed: options.seed,
    strategy: options.strategy,
    finalStatus: state.status,
    monthsPlayed,
    monthsToApproval2,
    monthsToFirstMixedUseStart,
    monthsToFirstMixedUseComplete,
    idleTurnCount,
    maxConsecutiveIdleTurns,
    warningCount,
    lowestCash,
    peakDebt,
    averageOccupancy: monthsPlayed > 0 ? Math.round(occupancyTotal / monthsPlayed) : 0,
    averageAppeal: monthsPlayed > 0 ? Math.round(appealTotal / monthsPlayed) : 0,
    buildingChoices,
    firstBuildingChoice,
    outcomeMonth,
    monthlySnapshots,
  };
}

export function collectTelemetryFromState(
  state: Readonly<GameState>,
  config: Readonly<GameConfig>,
  seed: string,
  strategy = 'manual',
): RunTelemetry {
  const warningLevel = getFinanceWarningLevel(state, config);
  const snapshot = recordSnapshot(state, config, false);

  return {
    seed,
    strategy,
    finalStatus: state.status,
    monthsPlayed: state.month - 1,
    monthsToApproval2: state.approval.level >= 2 ? state.month : null,
    monthsToFirstMixedUseStart: state.projects.some(
      (project) => project.definitionId === 'shop_apartments',
    )
      ? state.month
      : state.buildings.some((building) => building.definitionId === 'shop_apartments')
        ? state.month
        : null,
    monthsToFirstMixedUseComplete: state.buildings.some(
      (building) =>
        building.definitionId === 'shop_apartments' &&
        (building.lifecycleState === 'operating' || building.lifecycleState === 'leasing'),
    )
      ? state.month
      : null,
    idleTurnCount: 0,
    maxConsecutiveIdleTurns: 0,
    warningCount: warningLevel === 'none' ? 0 : 1,
    lowestCash: state.cash,
    peakDebt: getTotalDebt(state),
    averageOccupancy: snapshot.occupancyPercent,
    averageAppeal: snapshot.appeal,
    buildingChoices: listPlayerPlacedBuildingChoices(state, config),
    firstBuildingChoice: listPlayerPlacedBuildingChoices(state, config)[0] ?? null,
    outcomeMonth: state.status === 'active' ? null : state.month,
    monthlySnapshots: [snapshot],
  };
}
