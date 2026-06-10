import type { GameConfig, GameState, RentPosture, TileCoord } from '@/game/domain/types';
import type { OnboardingProgress } from '@/game/onboarding/objectives';
import type { ManualSaveSlot } from '@/game/persistence/saveSchema';

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
  readonly selectedAccessTile: TileCoord | null;
  readonly placementPreview: PlacementPreview | null;
  readonly placementLocked: boolean;
  readonly relocateBuildingId: string | null;
  readonly drivewayPreview: DrivewayPreviewState | null;
  readonly drivewayPreviewLocked: boolean;
  readonly reportDrawerOpen: boolean;
  readonly settingsOpen: boolean;
  readonly focusedTile: TileCoord | null;
  readonly milestoneToasts: readonly string[];
  readonly winResultsDismissed: boolean;
  readonly monthTickPulse: boolean;
}

export interface DrivewayPreviewState {
  readonly origin: TileCoord;
  readonly rotation: 0 | 90;
}

export function createInitialUiState(): UiState {
  return {
    selectedBuildingId: null,
    selectedProjectId: null,
    selectedCatalogItemId: null,
    selectedAccessTile: null,
    placementPreview: null,
    placementLocked: false,
    relocateBuildingId: null,
    drivewayPreview: null,
    drivewayPreviewLocked: false,
    reportDrawerOpen: false,
    settingsOpen: false,
    focusedTile: null,
    milestoneToasts: [],
    winResultsDismissed: false,
    monthTickPulse: false,
  };
}

export interface PersistenceMeta {
  readonly saveStatus: SaveStatus;
  readonly lastSavedAt: string | null;
  readonly lastSaveError: string | null;
  readonly bootstrapped: boolean;
  readonly saveRevision: number;
}

export interface GameStoreState {
  readonly config: GameConfig;
  readonly gameState: GameState;
  readonly ui: UiState;
  readonly onboarding: OnboardingProgress;
  readonly persistence: PersistenceMeta;
  readonly lastCommandError: string | null;
}

export interface GameStoreActions {
  selectBuilding: (buildingId: string | null) => void;
  selectCatalogItem: (definitionId: string | null) => void;
  setPlacementOrigin: (origin: TileCoord, options?: { lock?: boolean }) => void;
  rotatePlacementPreview: () => void;
  startRelocateBuilding: (buildingId: string) => void;
  cancelPlacement: () => void;
  clearSelection: () => void;
  selectAccessTile: (tile: TileCoord) => void;
  commitProject: () => void;
  commitProjectWithFinancing: () => void;
  commitRelocate: () => void;
  startRelocateDriveway: () => void;
  setDrivewayPreviewOrigin: (origin: TileCoord, options?: { lock?: boolean }) => void;
  rotateDrivewayPreview: () => void;
  commitDrivewayRelocate: () => void;
  cancelCommittedProject: (projectId: string) => void;
  refinanceProperty: () => void;
  acceptEmergencyOffer: () => void;
  advanceMonth: () => void;
  setRentPosture: (buildingId: string, posture: RentPosture) => void;
  renovateBuilding: (buildingId: string) => void;
  keepBuildingAsIs: (buildingId: string) => void;
  sellBuilding: (buildingId: string) => void;
  demolishBuilding: (buildingId: string) => void;
  toggleReportDrawer: () => void;
  setFocusedTile: (tile: TileCoord | null) => void;
  toggleSettings: () => void;
  closeSettings: () => void;
  bootstrapFromStorage: () => void;
  newGame: (scenarioId?: string, seed?: string) => void;
  dismissMilestoneToasts: () => void;
  dismissWinResults: () => void;
  saveToSlot: (slot: ManualSaveSlot) => void;
  loadFromSlot: (slot: ManualSaveSlot) => void;
  clearSlot: (slot: ManualSaveSlot) => void;
  exportCurrentSave: () => void;
  importSaveFile: (file: File) => Promise<void>;
  dismissScenarioCard: () => void;
  dismissOnboardingGuide: () => void;
  setGuideEnabled: (enabled: boolean) => void;
  setGuideCollapsed: (collapsed: boolean) => void;
  resetOnboarding: () => void;
  debugAddCash: (amount: number) => void;
  debugAdvanceMonths: (count: number) => void;
  debugLoadFixedSeed: (presetId: string) => void;
  debugExportTelemetry: () => void;
  debugRunBalanceValidation: () => string;
}

export type GameStore = GameStoreState & GameStoreActions;
