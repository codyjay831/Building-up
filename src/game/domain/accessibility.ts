import { getBuildingDefinition } from '@/game/config/buildings';
import {
  getFootprintTiles,
  getSouthBoundaryTiles,
  isDrivewayTile,
  isTileInLot,
  isTileOccupied,
  tileKey,
} from '@/game/domain/grid';
import type {
  BuildingDefinition,
  BuildingInstance,
  GameConfig,
  LotState,
  PlacedFootprint,
  TileCoord,
} from '@/game/domain/types';

const CARDINAL_OFFSETS: readonly TileCoord[] = [
  { x: 0, y: -1 },
  { x: 1, y: 0 },
  { x: 0, y: 1 },
  { x: -1, y: 0 },
];

export function getRoadNetworkTileKeys(
  lot: LotState,
  buildings: readonly BuildingInstance[],
  config: Readonly<GameConfig>,
): ReadonlySet<string> {
  const networkKeys = new Set<string>();

  for (const tile of getSouthBoundaryTiles(lot)) {
    networkKeys.add(tileKey(tile));
  }

  for (const tile of lot.drivewayTiles) {
    networkKeys.add(tileKey(tile));
  }

  for (const building of buildings) {
    const definition = config.buildings.get(building.definitionId);

    if (!definition?.isAccessPath || building.lifecycleState !== 'operating') {
      continue;
    }

    for (const tile of getFootprintTiles(building.footprint)) {
      networkKeys.add(tileKey(tile));
    }
  }

  return networkKeys;
}

export function computeRoadAccessibleTileKeys(
  lot: LotState,
  buildings: readonly BuildingInstance[],
  config: Readonly<GameConfig>,
  _projects: readonly { footprint: PlacedFootprint }[] = [],
): ReadonlySet<string> {
  const networkKeys = getRoadNetworkTileKeys(lot, buildings, config);
  const reachable = new Set<string>();
  const queue: TileCoord[] = [];

  for (const southTile of getSouthBoundaryTiles(lot)) {
    const key = tileKey(southTile);

    if (!networkKeys.has(key) || reachable.has(key)) {
      continue;
    }

    reachable.add(key);
    queue.push(southTile);
  }

  while (queue.length > 0) {
    const current = queue.shift();

    if (!current) {
      break;
    }

    for (const offset of CARDINAL_OFFSETS) {
      const neighbor: TileCoord = {
        x: current.x + offset.x,
        y: current.y + offset.y,
      };

      if (!isTileInLot(neighbor, lot)) {
        continue;
      }

      const neighborKey = tileKey(neighbor);

      if (reachable.has(neighborKey) || !networkKeys.has(neighborKey)) {
        continue;
      }

      reachable.add(neighborKey);
      queue.push(neighbor);
    }
  }

  return reachable;
}

export function hasRoadAccess(
  footprint: PlacedFootprint,
  definition: BuildingDefinition,
  lot: LotState,
  buildings: readonly BuildingInstance[],
  config: Readonly<GameConfig>,
  projects: readonly { footprint: PlacedFootprint }[] = [],
): boolean {
  if (!definition.roadAccessRequired) {
    return true;
  }

  const accessibleTileKeys = computeRoadAccessibleTileKeys(lot, buildings, config, projects);
  const footprintTiles = getFootprintTiles(footprint);

  return footprintTiles.some((tile) => {
    if (accessibleTileKeys.has(tileKey(tile))) {
      return true;
    }

    return CARDINAL_OFFSETS.some((offset) => {
      const neighbor: TileCoord = {
        x: tile.x + offset.x,
        y: tile.y + offset.y,
      };
      return accessibleTileKeys.has(tileKey(neighbor));
    });
  });
}

export function buildingHasRoadAccess(
  building: BuildingInstance,
  definition: BuildingDefinition,
  lot: LotState,
  buildings: readonly BuildingInstance[],
  config: Readonly<GameConfig>,
  projects: readonly { footprint: PlacedFootprint }[] = [],
): boolean {
  const otherBuildings = buildings.filter((candidate) => candidate.id !== building.id);
  return hasRoadAccess(building.footprint, definition, lot, otherBuildings, config, projects);
}

export function isTileOccupiedForPlacement(
  coord: TileCoord,
  lot: LotState,
  buildings: readonly BuildingInstance[],
  projects: readonly { footprint: PlacedFootprint }[] = [],
): boolean {
  if (isDrivewayTile(coord, lot)) {
    return true;
  }

  return isTileOccupied(coord, buildings, projects);
}

export function buildingDefinitionHasRoadAccess(
  building: BuildingInstance,
  config: Readonly<GameConfig>,
  lot: LotState,
  buildings: readonly BuildingInstance[],
  projects: readonly { footprint: PlacedFootprint }[] = [],
): boolean {
  const definition = getBuildingDefinition(config.buildings, building.definitionId);
  return buildingHasRoadAccess(building, definition, lot, buildings, config, projects);
}
