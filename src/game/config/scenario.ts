import { createBuildingDefinitionMap, loadBuildingDefinitions } from '@/game/config/buildings';
import { loadBalanceAssumptions } from '@/game/config/balance';
import { deriveRunId } from '@/game/domain/prng';
import type {
  GameConfig,
  GameState,
  ProgressCounters,
  ScenarioDefinition,
  StarterBuildingSpec,
  TileCoord,
} from '@/game/domain/types';

export const RIVERSIDE_STARTER_SCENARIO_ID = 'riverside_starter';
export const SUBURB_STARTER_SCENARIO_ID = 'suburb_starter';

const SUBURB_LOT_WIDTH = 24;
const SUBURB_LOT_HEIGHT = 18;

function createSuburbStreetTiles(): readonly TileCoord[] {
  const tiles: TileCoord[] = [];
  const streetRows = [4, 9, 14, SUBURB_LOT_HEIGHT - 1];

  for (const y of streetRows) {
    for (let x = 0; x < SUBURB_LOT_WIDTH; x += 1) {
      tiles.push({ x, y });
    }
  }

  return tiles;
}

function createSuburbStarterBuildings(): readonly StarterBuildingSpec[] {
  const xOrigins = [1, 5, 9, 13, 17, 21];
  const yOrigins = [1, 6, 11];
  const buildings: StarterBuildingSpec[] = [];

  for (const y of yOrigins) {
    for (const x of xOrigins) {
      buildings.push({
        definitionId: 'suburb_house',
        footprint: {
          origin: { x, y },
          width: 2,
          height: 3,
          rotation: 0,
        },
        condition: 72,
        residentialOccupied: 0,
        lifecycleState: 'leasing',
      });
    }
  }

  return buildings;
}

const STARTER_SCENARIOS: readonly ScenarioDefinition[] = [
  {
    id: RIVERSIDE_STARTER_SCENARIO_ID,
    name: 'Lot 12 — Riverside Starter',
    theme: 'urban',
    residentialDemand: 55,
    retailDemand: 32,
    lockedBuildingIds: ['duplex', 'small_apartment', 'apartment_4u'],
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
  },
  {
    id: SUBURB_STARTER_SCENARIO_ID,
    name: 'Oak Hollow — Suburb Starter',
    theme: 'suburb',
    residentialDemand: 50,
    retailDemand: 32,
    lockedBuildingIds: [],
    lot: {
      width: SUBURB_LOT_WIDTH,
      height: SUBURB_LOT_HEIGHT,
    },
    starterBuildings: createSuburbStarterBuildings(),
    driveway: {
      tiles: createSuburbStreetTiles(),
      parkingCapacity: 0,
    },
    startingCashOverride: 280_000,
    appealRules: {
      vacancyPenaltyEnabled: false,
    },
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
    scenarios: createScenarioMap(),
  };
}

export function createStarterGameState(
  scenarioId: string = SUBURB_STARTER_SCENARIO_ID,
  seed = 'suburb-starter-default',
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
    schemaVersion: 1,
    runId: deriveRunId(seed),
    seed,
    scenarioId,
    month: 1,
    cash: scenario.startingCashOverride ?? config.balance.startingCash,
    debt: [],
    lot: {
      width: scenario.lot.width,
      height: scenario.lot.height,
      accessTiles: scenario.driveway.tiles,
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

export function isBuildingLockedInScenario(
  scenario: ScenarioDefinition,
  definitionId: string,
): boolean {
  return scenario.lockedBuildingIds.includes(definitionId);
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
