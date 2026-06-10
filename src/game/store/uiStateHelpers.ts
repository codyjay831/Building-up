import { createInitialUiState, type UiState } from '@/game/store/storeTypes';

export interface ResetSelectionUiOptions {
  readonly selectedBuildingId?: string | null;
  readonly selectedProjectId?: string | null;
  readonly preserveReportDrawer?: boolean;
}

export function resetSelectionUi(current: UiState, options: ResetSelectionUiOptions = {}): UiState {
  return {
    ...createInitialUiState(),
    settingsOpen: current.settingsOpen,
    reportDrawerOpen: options.preserveReportDrawer ? current.reportDrawerOpen : false,
    milestoneToasts: current.milestoneToasts,
    winResultsDismissed: current.winResultsDismissed,
    monthTickPulse: current.monthTickPulse,
    selectedBuildingId: options.selectedBuildingId ?? null,
    selectedProjectId: options.selectedProjectId ?? null,
  };
}

export function clearPlacementUi(current: UiState): UiState {
  return {
    ...current,
    selectedCatalogItemId: null,
    placementPreview: null,
    placementLocked: false,
    relocateBuildingId: null,
    drivewayPreview: null,
    drivewayPreviewLocked: false,
  };
}
