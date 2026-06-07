import {
  LOT_HEIGHT,
  LOT_WIDTH,
  type BuildingInstance,
  type LotState,
  type PlacedFootprint,
  type TileCoord,
} from '@/game/domain/types';

export function tileKey(coord: TileCoord): string {
  return `${String(coord.x)},${String(coord.y)}`;
}

export function parseTileKey(key: string): TileCoord {
  const [xText, yText] = key.split(',');
  const x = Number(xText);
  const y = Number(yText);

  if (!Number.isInteger(x) || !Number.isInteger(y)) {
    throw new RangeError(`Invalid tile key: ${key}`);
  }

  return { x, y };
}

export function coordsEqual(left: TileCoord, right: TileCoord): boolean {
  return left.x === right.x && left.y === right.y;
}

export function getEffectiveDimensions(footprint: PlacedFootprint): {
  width: number;
  height: number;
} {
  if (footprint.rotation === 90) {
    return { width: footprint.height, height: footprint.width };
  }

  return { width: footprint.width, height: footprint.height };
}

export function getFootprintTiles(footprint: PlacedFootprint): TileCoord[] {
  const { width, height } = getEffectiveDimensions(footprint);
  const tiles: TileCoord[] = [];

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      tiles.push({
        x: footprint.origin.x + x,
        y: footprint.origin.y + y,
      });
    }
  }

  return tiles;
}

export function isTileInLot(coord: TileCoord, lot: LotState): boolean {
  return coord.x >= 0 && coord.y >= 0 && coord.x < lot.width && coord.y < lot.height;
}

export function footprintWithinLot(footprint: PlacedFootprint, lot: LotState): boolean {
  return getFootprintTiles(footprint).every((tile) => isTileInLot(tile, lot));
}

export function isAccessTile(coord: TileCoord, lot: LotState): boolean {
  return lot.accessTiles.some((accessTile) => coordsEqual(accessTile, coord));
}

export function getOccupiedTileKeys(
  buildings: readonly BuildingInstance[],
  projects: readonly { footprint: PlacedFootprint }[] = [],
): ReadonlySet<string> {
  const occupied = new Set<string>();

  for (const building of buildings) {
    for (const tile of getFootprintTiles(building.footprint)) {
      occupied.add(tileKey(tile));
    }
  }

  for (const project of projects) {
    for (const tile of getFootprintTiles(project.footprint)) {
      occupied.add(tileKey(tile));
    }
  }

  return occupied;
}

export function footprintsOverlap(left: PlacedFootprint, right: PlacedFootprint): boolean {
  const rightKeys = new Set(getFootprintTiles(right).map(tileKey));

  return getFootprintTiles(left).some((tile) => rightKeys.has(tileKey(tile)));
}

export function footprintOverlapsAny(
  footprint: PlacedFootprint,
  others: readonly PlacedFootprint[],
): boolean {
  return others.some((other) => footprintsOverlap(footprint, other));
}

export function isTileOccupied(
  coord: TileCoord,
  buildings: readonly BuildingInstance[],
  projects: readonly { footprint: PlacedFootprint }[] = [],
): boolean {
  return getOccupiedTileKeys(buildings, projects).has(tileKey(coord));
}

export function getSouthBoundaryTiles(lot: LotState): TileCoord[] {
  const tiles: TileCoord[] = [];

  for (let x = 0; x < lot.width; x += 1) {
    tiles.push({ x, y: lot.height - 1 });
  }

  return tiles;
}

export function createDefaultLot(): LotState {
  return {
    width: LOT_WIDTH,
    height: LOT_HEIGHT,
    accessTiles: [],
    accessParkingCapacity: 0,
  };
}

export { LOT_HEIGHT, LOT_WIDTH };
