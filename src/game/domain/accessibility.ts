import {
  getFootprintTiles,
  getSouthBoundaryTiles,
  isAccessTile,
  isTileInLot,
  isTileOccupied,
  tileKey,
} from '@/game/domain/grid';
import type {
  BuildingDefinition,
  BuildingInstance,
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

function isPassableTile(
  coord: TileCoord,
  lot: LotState,
  occupiedTileKeys: ReadonlySet<string>,
): boolean {
  if (!isTileInLot(coord, lot)) {
    return false;
  }

  if (occupiedTileKeys.has(tileKey(coord))) {
    return false;
  }

  return true;
}

export function computeRoadAccessibleTileKeys(
  lot: LotState,
  buildings: readonly BuildingInstance[],
  projects: readonly { footprint: PlacedFootprint }[] = [],
): ReadonlySet<string> {
  const occupiedTileKeys = new Set<string>();

  for (const building of buildings) {
    for (const tile of getFootprintTiles(building.footprint)) {
      occupiedTileKeys.add(tileKey(tile));
    }
  }

  for (const project of projects) {
    for (const tile of getFootprintTiles(project.footprint)) {
      occupiedTileKeys.add(tileKey(tile));
    }
  }

  const accessible = new Set<string>();
  const queue: TileCoord[] = [];

  for (const southTile of getSouthBoundaryTiles(lot)) {
    if (!isPassableTile(southTile, lot, occupiedTileKeys) && !isAccessTile(southTile, lot)) {
      continue;
    }

    const key = tileKey(southTile);
    if (accessible.has(key)) {
      continue;
    }

    accessible.add(key);
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
      if (accessible.has(neighborKey)) {
        continue;
      }

      const passable =
        isPassableTile(neighbor, lot, occupiedTileKeys) || isAccessTile(neighbor, lot);

      if (!passable) {
        continue;
      }

      accessible.add(neighborKey);
      queue.push(neighbor);
    }
  }

  return accessible;
}

export function hasRoadAccess(
  footprint: PlacedFootprint,
  definition: BuildingDefinition,
  lot: LotState,
  buildings: readonly BuildingInstance[],
  projects: readonly { footprint: PlacedFootprint }[] = [],
): boolean {
  if (!definition.roadAccessRequired) {
    return true;
  }

  const accessibleTileKeys = computeRoadAccessibleTileKeys(lot, buildings, projects);
  const footprintTiles = getFootprintTiles(footprint);

  return footprintTiles.some((tile) =>
    CARDINAL_OFFSETS.some((offset) => {
      const neighbor: TileCoord = {
        x: tile.x + offset.x,
        y: tile.y + offset.y,
      };
      return accessibleTileKeys.has(tileKey(neighbor));
    }),
  );
}

export function buildingHasRoadAccess(
  building: BuildingInstance,
  definition: BuildingDefinition,
  lot: LotState,
  buildings: readonly BuildingInstance[],
  projects: readonly { footprint: PlacedFootprint }[] = [],
): boolean {
  const otherBuildings = buildings.filter((candidate) => candidate.id !== building.id);
  return hasRoadAccess(building.footprint, definition, lot, otherBuildings, projects);
}

export function isTileOccupiedForPlacement(
  coord: TileCoord,
  lot: LotState,
  buildings: readonly BuildingInstance[],
  projects: readonly { footprint: PlacedFootprint }[] = [],
): boolean {
  if (isAccessTile(coord, lot)) {
    return true;
  }

  return isTileOccupied(coord, buildings, projects);
}
