import { getBuildingDefinition } from '@/game/config/buildings';
import { buildingHasRoadAccess, computeRoadAccessibleTileKeys } from '@/game/domain/accessibility';
import { getFootprintTiles, isTileInLot, tileKey } from '@/game/domain/grid';
import type {
  BuildingInstance,
  CommandRuleFailure,
  GameConfig,
  GameState,
  LotState,
  Rotation,
  TileCoord,
} from '@/game/domain/types';

export interface DrivewayPreview {
  readonly origin: TileCoord;
  readonly rotation: Rotation;
}

export function getDrivewaySegmentTiles(
  origin: TileCoord,
  rotation: Rotation,
  tileCount: number,
): TileCoord[] {
  const tiles: TileCoord[] = [];

  for (let index = 0; index < tileCount; index += 1) {
    if (rotation === 0) {
      tiles.push({ x: origin.x + index, y: origin.y });
    } else {
      tiles.push({ x: origin.x, y: origin.y + index });
    }
  }

  return tiles;
}

export function canRelocateDriveway(lot: LotState): boolean {
  return lot.drivewayTiles.length > 0 && lot.drivewayTiles.length <= 8;
}

function commandFailure(reason: CommandRuleFailure['reason'], message: string): CommandRuleFailure {
  return { ok: false, reason, message };
}

function tilesOverlapBuildings(
  tiles: readonly TileCoord[],
  buildings: readonly BuildingInstance[],
): boolean {
  for (const building of buildings) {
    const footprintKeys = new Set(getFootprintTiles(building.footprint).map(tileKey));

    if (tiles.some((tile) => footprintKeys.has(tileKey(tile)))) {
      return true;
    }
  }

  return false;
}

function lotWithDrivewayTiles(lot: LotState, drivewayTiles: readonly TileCoord[]): LotState {
  return {
    ...lot,
    drivewayTiles,
  };
}

export function validateDrivewayRelocation(
  state: Readonly<GameState>,
  config: Readonly<GameConfig>,
  preview: DrivewayPreview,
): CommandRuleFailure | { ok: true; tiles: TileCoord[] } {
  if (state.status !== 'active') {
    return commandFailure('game_not_active', 'The run has already ended');
  }

  if (!canRelocateDriveway(state.lot)) {
    return commandFailure(
      'driveway_not_relocatable',
      'This scenario driveway cannot be relocated',
    );
  }

  const tileCount = state.lot.drivewayTiles.length;
  const tiles = getDrivewaySegmentTiles(preview.origin, preview.rotation, tileCount);

  if (!tiles.every((tile) => isTileInLot(tile, state.lot))) {
    return commandFailure('out_of_bounds', 'Driveway extends outside the lot');
  }

  if (tilesOverlapBuildings(tiles, state.buildings)) {
    return commandFailure('tile_occupied', 'Driveway overlaps a building footprint');
  }

  const nextLot = lotWithDrivewayTiles(state.lot, tiles);
  const accessibleKeys = computeRoadAccessibleTileKeys(
    nextLot,
    state.buildings,
    config,
    state.projects,
  );

  if (!tiles.every((tile) => accessibleKeys.has(tileKey(tile)))) {
    return commandFailure('driveway_not_connected', 'Driveway must connect to South Road');
  }

  for (const building of state.buildings) {
    const definition = getBuildingDefinition(config.buildings, building.definitionId);

    if (!definition.roadAccessRequired) {
      continue;
    }

    if (
      !buildingHasRoadAccess(
        building,
        definition,
        nextLot,
        state.buildings,
        config,
        state.projects,
      )
    ) {
      return commandFailure(
        'blocks_road_access',
        `Moving the driveway would cut road access to ${definition.name}`,
      );
    }
  }

  return { ok: true, tiles };
}

export function isDrivewayPreviewValid(
  state: Readonly<GameState>,
  config: Readonly<GameConfig>,
  preview: DrivewayPreview,
): boolean {
  return validateDrivewayRelocation(state, config, preview).ok === true;
}

export function isTileInDrivewayPreview(
  coord: TileCoord,
  preview: DrivewayPreview,
  tileCount: number,
): boolean {
  const tiles = getDrivewaySegmentTiles(preview.origin, preview.rotation, tileCount);
  return tiles.some((tile) => tile.x === coord.x && tile.y === coord.y);
}

export function getDrivewayPreviewMessage(
  state: Readonly<GameState>,
  config: Readonly<GameConfig>,
  preview: DrivewayPreview,
): string | null {
  const result = validateDrivewayRelocation(state, config, preview);

  if (result.ok) {
    return null;
  }

  return result.message;
}
