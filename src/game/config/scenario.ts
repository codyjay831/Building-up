import { createBuildingDefinitionMap, loadBuildingDefinitions } from '@/game/config/buildings';
import { loadBalanceAssumptions } from '@/game/config/balance';
import { loadConstructionFinanceEras } from '@/game/config/constructionFinance';
import { deriveRunId } from '@/game/domain/prng';
import { SCHEMA_VERSION } from '@/game/domain/types';
import type {
  GameConfig,
  GameState,
  ProgressCounters,
  ScenarioDefinition,
} from '@/game/domain/types';

export const RIVERSIDE_STARTER_SCENARIO_ID = 'riverside_starter';

const STARTER_SCENARIOS: readonly ScenarioDefinition[] = [
  {
    id: RIVERSIDE_STARTER_SCENARIO_ID,
    name: 'Lot 12 — Riverside Starter',
    startYear: 1946,
    theme: 'urban',
    winProfile: 'mixed_use_stabilization',
    objectiveLabel: 'Build and stabilize a mixed-use property.',
    winBannerLabel: 'Mixed-use stabilized.',
    residentialDemand: 55,
    retailDemand: 32,
    lot: {
      width: 12,
      height: 12,
    },
    starterBuildings: [
      {
        definitionId: 'existing_house',
        footprint: {
          origin: { x: 3, y: 6 },
          width: 2,
          height: 3,
          rotation: 0,
        },
        condition: 72,
        residentialOccupied: 1,
        lifecycleState: 'operating',
      },
      {
        definitionId: 'access_path',
        footprint: {
          origin: { x: 5, y: 7 },
          width: 1,
          height: 3,
          rotation: 0,
        },
        condition: 100,
        residentialOccupied: 0,
        lifecycleState: 'operating',
      },
    ],
    driveway: {
      tiles: [
        { x: 5, y: 10 },
        { x: 6, y: 10 },
      ],
      parkingCapacity: 2,
    },
    appealRules: {
      vacancyPenaltyEnabled: true,
    },
    tutorialBuildingDefinitionId: 'existing_house',
  },
];

function createDefaultCounters(): ProgressCounters {
  return {
    consecutivePositiveCashFlowMonths: 0,
    consecutiveHighOccupancyMonths: 0,
    consecutiveApproval3OccupancyMonths: 0,
    consecutiveInsolventMonths: 0,
    consecutiveWinConditionMonths: 0,
    refinanceUsed: false,
    emergencyOfferUsed: false,
    nextBuildingSequence: 2,
    nextProjectSequence: 1,
    nextDebtSequence: 1,
    rngCounter: 0,
  };
}

export function loadScenarioDefinitions(): readonly ScenarioDefinition[] {
  return STARTER_SCENARIOS;
}

export function createScenarioMap(
  scenarios: readonly ScenarioDefinition[] = loadScenarioDefinitions(),
): ReadonlyMap<string, ScenarioDefinition> {
  return new Map(scenarios.map((scenario) => [scenario.id, scenario]));
}

export function getScenarioDefinition(
  scenarios: ReadonlyMap<string, ScenarioDefinition>,
  scenarioId: string,
): ScenarioDefinition {
  const scenario = scenarios.get(scenarioId);

  if (!scenario) {
    throw new RangeError(`Unknown scenario: ${scenarioId}`);
  }

  return scenario;
}

export function createGameConfig(): GameConfig {
  const buildingList = loadBuildingDefinitions();

  return {
    buildings: createBuildingDefinitionMap(buildingList),
    buildingList,
    balance: loadBalanceAssumptions(),
    constructionFinanceEras: loadConstructionFinanceEras(),
    scenarios: createScenarioMap(),
  };
}

export function createStarterGameState(
  scenarioId: string = RIVERSIDE_STARTER_SCENARIO_ID,
  seed = 'riverside-starter-default',
  config: GameConfig = createGameConfig(),
): GameState {
  const scenario = getScenarioDefinition(config.scenarios, scenarioId);

  if (scenario.starterBuildings.length === 0) {
    throw new Error(`Scenario ${scenarioId} requires at least one starter building`);
  }

  const buildings = scenario.starterBuildings.map((spec, index) => ({
    id: `building-${String(index + 1)}`,
    definitionId: spec.definitionId,
    footprint: spec.footprint,
    lifecycleState: spec.lifecycleState ?? 'operating',
    condition: spec.condition,
    residentialOccupied: spec.residentialOccupied,
    retailOccupied: 0,
    rentPosture: 'market' as const,
    renovated: false,
  }));

  return {
    schemaVersion: SCHEMA_VERSION,
    runId: deriveRunId(seed),
    seed,
    scenarioId,
    month: 1,
    cash: scenario.startingCashOverride ?? config.balance.startingCash,
    debt: [],
    lot: {
      width: scenario.lot.width,
      height: scenario.lot.height,
      drivewayTiles: scenario.driveway.tiles,
      accessParkingCapacity: scenario.driveway.parkingCapacity,
    },
    buildings,
    projects: [],
    market: {
      residentialDemand: scenario.residentialDemand,
      retailDemand: scenario.retailDemand,
      residentialBaseline: scenario.residentialDemand,
      retailBaseline: scenario.retailDemand,
    },
    approval: {
      level: 1,
      unlockedLevels: [1],
    },
    appeal: config.balance.baseAppeal,
    events: [],
    ledger: [],
    counters: {
      ...createDefaultCounters(),
      nextBuildingSequence: buildings.length + 1,
    },
    status: 'active',
  };
}

export function getScenarioAppealRules(
  scenarios: ReadonlyMap<string, ScenarioDefinition>,
  scenarioId: string,
): { readonly vacancyPenaltyEnabled: boolean } {
  const scenario = getScenarioDefinition(scenarios, scenarioId);
  return {
    vacancyPenaltyEnabled: scenario.appealRules?.vacancyPenaltyEnabled ?? true,
  };
}

export function getTutorialBuildingId(
  _scenario: ScenarioDefinition,
  buildings: readonly { readonly id: string }[],
): string | null {
  return buildings[0]?.id ?? null;
}

export function getTutorialBuildingDefinitionId(scenario: ScenarioDefinition): string {
  if (scenario.tutorialBuildingDefinitionId) {
    return scenario.tutorialBuildingDefinitionId;
  }

  const firstStarter = scenario.starterBuildings.at(0);

  if (firstStarter === undefined) {
    throw new Error(`Scenario ${scenario.id} requires at least one starter building`);
  }

  return firstStarter.definitionId;
}
