import { getBuildingDefinition } from '@/game/config/buildings';
import {
  buildingHasRoadAccess,
  computeRoadAccessibleTileKeys,
  hasRoadAccess,
} from '@/game/domain/accessibility';
import { getFootprintTiles, tileKey } from '@/game/domain/grid';
import type {
  BuildingDefinition,
  BuildingInstance,
  CommandRuleFailure,
  GameConfig,
  GameState,
  PlacedFootprint,
  PlacementFailure,
  PlacementFailureReason,
} from '@/game/domain/types';

const SIMULATED_BUILDING_ID = '__simulated__';

const CARDINAL_OFFSETS = [
  { x: 0, y: -1 },
  { x: 1, y: 0 },
  { x: 0, y: 1 },
  { x: -1, y: 0 },
] as const;

function placementFailure(reason: PlacementFailureReason, message: string): PlacementFailure {
  return { ok: false, reason, message };
}

function commandFailure(reason: CommandRuleFailure['reason'], message: string): CommandRuleFailure {
  return { ok: false, reason, message };
}

export function createSimulatedBuilding(
  definitionId: string,
  footprint: PlacedFootprint,
): BuildingInstance {
  return {
    id: SIMULATED_BUILDING_ID,
    definitionId,
    footprint,
    lifecycleState: 'operating',
    condition: 100,
    residentialOccupied: 0,
    retailOccupied: 0,
    rentPosture: 'market',
    renovated: false,
  };
}

export function simulateBuildingsAfterPlacement(
  state: Readonly<GameState>,
  footprint: PlacedFootprint,
  definitionId: string,
  ignoreBuildingId?: string,
): readonly BuildingInstance[] {
  const filtered = ignoreBuildingId
    ? state.buildings.filter((building) => building.id !== ignoreBuildingId)
    : state.buildings;

  return [...filtered, createSimulatedBuilding(definitionId, footprint)];
}

export function simulateBuildingsAfterRemoval(
  state: Readonly<GameState>,
  buildingId: string,
): readonly BuildingInstance[] {
  return state.buildings.filter((building) => building.id !== buildingId);
}

export function findStrandedBuilding(
  state: Readonly<GameState>,
  config: Readonly<GameConfig>,
  buildings: readonly BuildingInstance[] = state.buildings,
): BuildingInstance | null {
  for (const building of buildings) {
    const definition = getBuildingDefinition(config.buildings, building.definitionId);

    if (!definition.roadAccessRequired) {
      continue;
    }

    if (
      !buildingHasRoadAccess(building, definition, state.lot, buildings, config, state.projects)
    ) {
      return building;
    }
  }

  return null;
}

export function validateAccessPathConnection(
  state: Readonly<GameState>,
  config: Readonly<GameConfig>,
  footprint: PlacedFootprint,
  buildings: readonly BuildingInstance[],
): boolean {
  const reachable = computeRoadAccessibleTileKeys(state.lot, buildings, config, state.projects);
  const proposedTiles = getFootprintTiles(footprint);

  return proposedTiles.some((tile) => {
    if (reachable.has(tileKey(tile))) {
      return true;
    }

    return CARDINAL_OFFSETS.some((offset) => {
      const neighbor = { x: tile.x + offset.x, y: tile.y + offset.y };
      return reachable.has(tileKey(neighbor));
    });
  });
}

export function validateAntiStranding(
  state: Readonly<GameState>,
  config: Readonly<GameConfig>,
  buildingsAfter: readonly BuildingInstance[],
): PlacementFailure | { ok: true } {
  const stranded = findStrandedBuilding(state, config, buildingsAfter);

  if (!stranded) {
    return { ok: true };
  }

  const definition = getBuildingDefinition(config.buildings, stranded.definitionId);
  return placementFailure(
    'blocks_road_access',
    `Would cut road access to ${definition.name}`,
  );
}

export function validateBuildingRemoval(
  state: Readonly<GameState>,
  config: Readonly<GameConfig>,
  buildingId: string,
): CommandRuleFailure | { ok: true } {
  const buildingsAfter = simulateBuildingsAfterRemoval(state, buildingId);
  const stranded = findStrandedBuilding(state, config, buildingsAfter);

  if (!stranded) {
    return { ok: true };
  }

  const definition = getBuildingDefinition(config.buildings, stranded.definitionId);
  return commandFailure(
    'blocks_road_access',
    `Would cut road access to ${definition.name}`,
  );
}

export function validateRoadAccessPlacement(
  state: Readonly<GameState>,
  config: Readonly<GameConfig>,
  definition: BuildingDefinition,
  footprint: PlacedFootprint,
  buildingsForCheck: readonly BuildingInstance[],
  buildingsAfter: readonly BuildingInstance[],
): PlacementFailure | { ok: true } {
  if (definition.isAccessPath) {
    if (!validateAccessPathConnection(state, config, footprint, buildingsForCheck)) {
      return placementFailure(
        'access_path_disconnected',
        'Access path must connect to the existing driveway/path network',
      );
    }

    return validateAntiStranding(state, config, buildingsAfter);
  }

  if (
    definition.roadAccessRequired &&
    !hasRoadAccess(footprint, definition, state.lot, buildingsForCheck, config, state.projects)
  ) {
    return placementFailure(
      'no_road_access',
      `${definition.name} must touch driveway, access path, or South Road connected to the network`,
    );
  }

  return validateAntiStranding(state, config, buildingsAfter);
}
