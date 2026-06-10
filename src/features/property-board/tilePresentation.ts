import type { BuildingCategory, BuildingInstance, ConstructionProject } from '@/game/domain/types';
import type { DrivewayPreview } from '@/game/domain/accessTiles';
import { getDrivewaySegmentTiles } from '@/game/domain/accessTiles';
import type { PlacementPreviewResult } from '@/game/selectors/placementSelectors';

export type TileVisualKind =
  | 'empty'
  | 'access'
  | 'road-network'
  | 'building'
  | 'construction'
  | 'selected-building'
  | 'selected-construction'
  | 'preview-valid'
  | 'preview-invalid'
  | 'driveway-preview-valid'
  | 'driveway-preview-invalid';

export interface TileVisualState {
  readonly kind: TileVisualKind;
  readonly building?: BuildingInstance;
  readonly project?: ConstructionProject;
  readonly category?: BuildingCategory;
}

export function resolveTileVisualState(input: {
  readonly x: number;
  readonly y: number;
  readonly accessTileKeys: ReadonlySet<string>;
  readonly buildingByTileKey: ReadonlyMap<string, BuildingInstance>;
  readonly projectByTileKey: ReadonlyMap<string, ConstructionProject>;
  readonly selectedBuildingId: string | null;
  readonly previewResult: PlacementPreviewResult | null;
  readonly roadNetworkTileKeys?: ReadonlySet<string>;
  readonly drivewayPreview?: DrivewayPreview | null;
  readonly drivewayPreviewValid?: boolean;
  readonly drivewayTileCount?: number;
}): TileVisualState {
  const key = `${String(input.x)},${String(input.y)}`;

  if (input.drivewayPreview && input.drivewayTileCount !== undefined) {
    const previewTiles = getDrivewaySegmentTiles(
      input.drivewayPreview.origin,
      input.drivewayPreview.rotation,
      input.drivewayTileCount,
    );
    const inDrivewayPreview = previewTiles.some((tile) => `${String(tile.x)},${String(tile.y)}` === key);

    if (inDrivewayPreview) {
      return {
        kind: input.drivewayPreviewValid ? 'driveway-preview-valid' : 'driveway-preview-invalid',
      };
    }
  }

  if (input.previewResult) {
    const inPreview =
      input.y >= input.previewResult.footprint.origin.y &&
      input.y <
        input.previewResult.footprint.origin.y +
          (input.previewResult.footprint.rotation === 90
            ? input.previewResult.footprint.width
            : input.previewResult.footprint.height) &&
      input.x >= input.previewResult.footprint.origin.x &&
      input.x <
        input.previewResult.footprint.origin.x +
          (input.previewResult.footprint.rotation === 90
            ? input.previewResult.footprint.height
            : input.previewResult.footprint.width);

    if (inPreview) {
      return {
        kind: input.previewResult.isValid ? 'preview-valid' : 'preview-invalid',
      };
    }
  }

  if (input.accessTileKeys.has(key)) {
    return { kind: 'access' };
  }

  if (input.previewResult && input.roadNetworkTileKeys?.has(key)) {
    return { kind: 'road-network' };
  }

  const building = input.buildingByTileKey.get(key);
  if (building) {
    const isUnderConstruction = building.lifecycleState === 'under_construction';
    const isSelected = building.id === input.selectedBuildingId;

    if (isUnderConstruction) {
      return {
        kind: isSelected ? 'selected-construction' : 'construction',
        building,
        project: input.projectByTileKey.get(key),
      };
    }

    return {
      kind: isSelected ? 'selected-building' : 'building',
      building,
      category: undefined,
    };
  }

  return { kind: 'empty' };
}

export function buildProjectTileMap(
  projects: readonly ConstructionProject[],
): ReadonlyMap<string, ConstructionProject> {
  const map = new Map<string, ConstructionProject>();

  for (const project of projects) {
    if (project.status !== 'under_construction') {
      continue;
    }

    const { origin, width, height, rotation } = project.footprint;
    const effectiveWidth = rotation === 90 ? height : width;
    const effectiveHeight = rotation === 90 ? width : height;

    for (let y = origin.y; y < origin.y + effectiveHeight; y += 1) {
      for (let x = origin.x; x < origin.x + effectiveWidth; x += 1) {
        map.set(`${String(x)},${String(y)}`, project);
      }
    }
  }

  return map;
}

export function buildBuildingTileMap(
  buildings: readonly BuildingInstance[],
): ReadonlyMap<string, BuildingInstance> {
  const map = new Map<string, BuildingInstance>();

  for (const building of buildings) {
    const { origin, width, height, rotation } = building.footprint;
    const effectiveWidth = rotation === 90 ? height : width;
    const effectiveHeight = rotation === 90 ? width : height;

    for (let y = origin.y; y < origin.y + effectiveHeight; y += 1) {
      for (let x = origin.x; x < origin.x + effectiveWidth; x += 1) {
        map.set(`${String(x)},${String(y)}`, building);
      }
    }
  }

  return map;
}

export function buildDrivewayTileKeys(
  drivewayTiles: readonly { readonly x: number; readonly y: number }[],
): ReadonlySet<string> {
  return new Set(drivewayTiles.map((tile) => `${String(tile.x)},${String(tile.y)}`));
}

/** @deprecated Use buildDrivewayTileKeys */
export function buildAccessTileKeys(
  accessTiles: readonly { readonly x: number; readonly y: number }[],
): ReadonlySet<string> {
  return buildDrivewayTileKeys(accessTiles);
}
