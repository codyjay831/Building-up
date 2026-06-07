import type { TileCoord } from '@/game/domain/types';

export type InspectorMode = 'property' | 'building' | 'placement';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export interface PlacementPreview {
  readonly definitionId: string;
  readonly origin: TileCoord;
  readonly rotation: 0 | 90;
  readonly relocateBuildingId?: string;
}

export interface UiState {
  readonly selectedBuildingId: string | null;
  readonly selectedProjectId: string | null;
  readonly selectedCatalogItemId: string | null;
  readonly placementPreview: PlacementPreview | null;
  readonly placementLocked: boolean;
  readonly relocateBuildingId: string | null;
  readonly reportDrawerOpen: boolean;
  readonly settingsOpen: boolean;
  readonly focusedTile: TileCoord | null;
}

export function createInitialUiState(): UiState {
  return {
    selectedBuildingId: null,
    selectedProjectId: null,
    selectedCatalogItemId: null,
    placementPreview: null,
    placementLocked: false,
    relocateBuildingId: null,
    reportDrawerOpen: false,
    settingsOpen: false,
    focusedTile: null,
  };
}

export interface PersistenceMeta {
  readonly saveStatus: SaveStatus;
  readonly lastSavedAt: string | null;
  readonly lastSaveError: string | null;
  readonly bootstrapped: boolean;
  readonly saveRevision: number;
}
