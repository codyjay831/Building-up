import { useGameStore } from '@/game/store/gameStore';
import { AccessTileInspector } from '@/features/building-inspector/AccessTileInspector';
import { BuildingDetailInspector } from '@/features/building-inspector/BuildingDetailInspector';
import { PlacementInspector } from '@/features/building-inspector/PlacementInspector';
import { PropertySummaryInspector } from '@/features/building-inspector/PropertySummaryInspector';
import { useInspectorView } from '@/features/building-inspector/useInspectorView';

export function BuildingInspector() {
  const config = useGameStore((store) => store.config);
  const gameState = useGameStore((store) => store.gameState);
  const ui = useGameStore((store) => store.ui);
  const lastCommandError = useGameStore((store) => store.lastCommandError);
  const cancelPlacement = useGameStore((store) => store.cancelPlacement);
  const commitProject = useGameStore((store) => store.commitProject);
  const commitProjectWithFinancing = useGameStore((store) => store.commitProjectWithFinancing);
  const commitRelocate = useGameStore((store) => store.commitRelocate);
  const rotatePlacementPreview = useGameStore((store) => store.rotatePlacementPreview);
  const startRelocateBuilding = useGameStore((store) => store.startRelocateBuilding);
  const startRelocateDriveway = useGameStore((store) => store.startRelocateDriveway);
  const commitDrivewayRelocate = useGameStore((store) => store.commitDrivewayRelocate);
  const rotateDrivewayPreview = useGameStore((store) => store.rotateDrivewayPreview);
  const cancelCommittedProject = useGameStore((store) => store.cancelCommittedProject);
  const setRentPosture = useGameStore((store) => store.setRentPosture);
  const renovateBuildingAction = useGameStore((store) => store.renovateBuilding);
  const keepBuildingAsIs = useGameStore((store) => store.keepBuildingAsIs);
  const sellBuildingAction = useGameStore((store) => store.sellBuilding);
  const demolishBuildingAction = useGameStore((store) => store.demolishBuilding);

  const view = useInspectorView(gameState, config, ui);

  if (ui.placementPreview) {
    return (
      <PlacementInspector
        gameState={gameState}
        config={config}
        ui={ui}
        lastCommandError={lastCommandError}
        cancelPlacement={cancelPlacement}
        commitProject={commitProject}
        commitProjectWithFinancing={commitProjectWithFinancing}
        commitRelocate={commitRelocate}
        rotatePlacementPreview={rotatePlacementPreview}
      />
    );
  }

  if (ui.drivewayPreview || ui.selectedAccessTile) {
    return (
      <AccessTileInspector
        gameState={gameState}
        config={config}
        ui={ui}
        lastCommandError={lastCommandError}
        startRelocateDriveway={startRelocateDriveway}
        cancelPlacement={cancelPlacement}
        commitDrivewayRelocate={commitDrivewayRelocate}
        rotateDrivewayPreview={rotateDrivewayPreview}
      />
    );
  }

  if (view.selectedBuilding) {
    return (
      <BuildingDetailInspector
        gameState={gameState}
        config={config}
        ui={ui}
        selectedBuilding={view.selectedBuilding}
        setRentPosture={setRentPosture}
        startRelocateBuilding={startRelocateBuilding}
        renovateBuildingAction={renovateBuildingAction}
        keepBuildingAsIs={keepBuildingAsIs}
        sellBuildingAction={sellBuildingAction}
        demolishBuildingAction={demolishBuildingAction}
        cancelCommittedProject={cancelCommittedProject}
      />
    );
  }

  return <PropertySummaryInspector view={view} />;
}
