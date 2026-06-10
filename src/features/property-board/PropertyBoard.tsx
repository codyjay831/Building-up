import { useEffect, useMemo, useRef, type CSSProperties } from 'react';

import { getBuildingDefinition } from '@/game/config/buildings';
import { getScenarioDefinition, getTutorialBuildingId } from '@/game/config/scenario';
import { computeRoadAccessibleTileKeys } from '@/game/domain/accessibility';
import { isDrivewayPreviewValid } from '@/game/domain/accessTiles';
import { getFootprintTiles } from '@/game/domain/grid';
import { evaluatePlacementPreview } from '@/game/selectors/placementSelectors';
import { useGameStore } from '@/game/store/gameStore';
import { getOnboardingView } from '@/game/onboarding/onboardingSelectors';
import {
  buildDrivewayTileKeys,
  buildBuildingTileMap,
  buildProjectTileMap,
  resolveTileVisualState,
} from '@/features/property-board/tilePresentation';
import { getBuildingVacancyLevel } from '@/game/selectors/leasingSelectors';

import styles from '@/features/property-board/PropertyBoard.module.css';

function buildTutorialTileKeys(
  tutorialBuildingId: string | null,
  buildings: readonly {
    readonly id: string;
    readonly footprint: {
      readonly origin: { readonly x: number; readonly y: number };
      readonly width: number;
      readonly height: number;
      readonly rotation: 0 | 90;
    };
  }[],
): ReadonlySet<string> {
  if (!tutorialBuildingId) {
    return new Set();
  }

  const building = buildings.find((candidate) => candidate.id === tutorialBuildingId);
  if (!building) {
    return new Set();
  }

  return new Set(
    getFootprintTiles(building.footprint).map((tile) => `${String(tile.x)},${String(tile.y)}`),
  );
}

function formatTileAriaLabel(input: {
  readonly x: number;
  readonly y: number;
  readonly kind: string;
  readonly buildingName?: string;
  readonly vacancyLevel?: string;
}): string {
  const position = `Tile ${String(input.x + 1)}, ${String(input.y + 1)}`;

  if (input.kind === 'access') {
    return `${position}, driveway (not buildable)`;
  }

  if (input.kind === 'road-network') {
    return `${position}, road network`;
  }

  if (input.buildingName) {
    const vacancy =
      input.vacancyLevel === 'vacant'
        ? 'vacant'
        : input.vacancyLevel === 'partial'
          ? 'partially vacant'
          : 'occupied';
    return `${position}, ${input.buildingName} (${vacancy})`;
  }

  return position;
}

export function PropertyBoard() {
  const gameState = useGameStore((store) => store.gameState);
  const config = useGameStore((store) => store.config);
  const ui = useGameStore((store) => store.ui);
  const onboarding = useGameStore((store) => store.onboarding);
  const selectBuilding = useGameStore((store) => store.selectBuilding);
  const selectAccessTile = useGameStore((store) => store.selectAccessTile);
  const setPlacementOrigin = useGameStore((store) => store.setPlacementOrigin);
  const setDrivewayPreviewOrigin = useGameStore((store) => store.setDrivewayPreviewOrigin);
  const cancelPlacement = useGameStore((store) => store.cancelPlacement);
  const clearSelection = useGameStore((store) => store.clearSelection);
  const setFocusedTile = useGameStore((store) => store.setFocusedTile);
  const tileRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  const scenario = getScenarioDefinition(config.scenarios, gameState.scenarioId);
  const onboardingView = getOnboardingView(gameState, ui, onboarding, config);
  const showTutorialPulse =
    !onboarding.guideDisabled &&
    !onboardingView.tutorialComplete &&
    onboardingView.activeObjectiveId === 'select_house';
  const tutorialBuildingId = getTutorialBuildingId(scenario, gameState.buildings);
  const tutorialTileKeys = useMemo(
    () => buildTutorialTileKeys(tutorialBuildingId, gameState.buildings),
    [gameState.buildings, tutorialBuildingId],
  );

  const buildingByTileKey = useMemo(
    () => buildBuildingTileMap(gameState.buildings),
    [gameState.buildings],
  );
  const projectByTileKey = useMemo(
    () => buildProjectTileMap(gameState.projects),
    [gameState.projects],
  );
  const drivewayTileKeys = useMemo(
    () => buildDrivewayTileKeys(gameState.lot.drivewayTiles),
    [gameState.lot.drivewayTiles],
  );

  const previewResult = useMemo(() => {
    if (!ui.placementPreview) {
      return null;
    }

    return evaluatePlacementPreview(gameState, config, ui.placementPreview);
  }, [config, gameState, ui.placementPreview]);

  const roadNetworkTileKeys = useMemo(() => {
    if (!ui.placementPreview) {
      return new Set<string>();
    }

    return computeRoadAccessibleTileKeys(gameState.lot, gameState.buildings, config, gameState.projects);
  }, [config, gameState.buildings, gameState.lot, gameState.projects, ui.placementPreview]);

  const isPlacementMode = ui.placementPreview !== null;
  const isDrivewayRelocateMode = ui.drivewayPreview !== null;
  const isRelocateMode = ui.relocateBuildingId !== null;
  const drivewayPreviewValid =
    ui.drivewayPreview !== null &&
    isDrivewayPreviewValid(gameState, config, ui.drivewayPreview);
  const focusedTile = ui.focusedTile ?? { x: 0, y: 0 };
  const showSouthRoadStrip = true;

  useEffect(() => {
    if (!isPlacementMode && !isDrivewayRelocateMode) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        cancelPlacement();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [cancelPlacement, isDrivewayRelocateMode, isPlacementMode]);

  useEffect(() => {
    const key = `${String(focusedTile.x)},${String(focusedTile.y)}`;
    tileRefs.current.get(key)?.focus();
  }, [focusedTile.x, focusedTile.y]);

  const handleTileActivate = (x: number, y: number) => {
    setFocusedTile({ x, y });

    if (isDrivewayRelocateMode && ui.drivewayPreview) {
      setDrivewayPreviewOrigin({ x, y }, { lock: true });
      return;
    }

    if (isPlacementMode) {
      setPlacementOrigin({ x, y }, { lock: true });
      return;
    }

    const tileKeyValue = `${String(x)},${String(y)}`;
    const building = buildingByTileKey.get(tileKeyValue);
    if (building) {
      selectBuilding(building.id);
      return;
    }

    if (drivewayTileKeys.has(tileKeyValue)) {
      selectAccessTile({ x, y });
      return;
    }

    clearSelection();
  };

  const lotWidth = gameState.lot.width;
  const lotHeight = gameState.lot.height;

  const moveFocusedTile = (x: number, y: number) => {
    const nextX = Math.max(0, Math.min(lotWidth - 1, x));
    const nextY = Math.max(0, Math.min(lotHeight - 1, y));
    setFocusedTile({ x: nextX, y: nextY });

    if (isDrivewayRelocateMode && !ui.drivewayPreviewLocked) {
      setDrivewayPreviewOrigin({ x: nextX, y: nextY });
      return;
    }

    if (isPlacementMode && !ui.placementLocked) {
      setPlacementOrigin({ x: nextX, y: nextY });
    }
  };

  const handleGridKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    switch (event.key) {
      case 'ArrowUp':
        moveFocusedTile(focusedTile.x, focusedTile.y - 1);
        event.preventDefault();
        break;
      case 'ArrowDown':
        moveFocusedTile(focusedTile.x, focusedTile.y + 1);
        event.preventDefault();
        break;
      case 'ArrowLeft':
        moveFocusedTile(focusedTile.x - 1, focusedTile.y);
        event.preventDefault();
        break;
      case 'ArrowRight':
        moveFocusedTile(focusedTile.x + 1, focusedTile.y);
        event.preventDefault();
        break;
      case 'Enter':
      case ' ':
        handleTileActivate(focusedTile.x, focusedTile.y);
        event.preventDefault();
        break;
      default:
        break;
    }
  };

  const placementStatusMessage = (() => {
    if (!previewResult || previewResult.isValid) {
      return null;
    }

    const roadFailure = previewResult.failures.find(
      (failure) =>
        failure.reason === 'no_road_access' ||
        failure.reason === 'access_path_disconnected' ||
        failure.reason === 'blocks_road_access',
    );
    if (roadFailure) {
      return roadFailure.reason === 'no_road_access'
        ? 'Needs road network — green tiles show connected paths'
        : previewResult.primaryMessage;
    }

    return previewResult.primaryMessage;
  })();

  const tiles = [];

  for (let y = 0; y < lotHeight; y += 1) {
    for (let x = 0; x < lotWidth; x += 1) {
      const tileKey = `${String(x)},${String(y)}`;
      const visual = resolveTileVisualState({
        x,
        y,
        accessTileKeys: drivewayTileKeys,
        roadNetworkTileKeys,
        buildingByTileKey,
        projectByTileKey,
        selectedBuildingId: ui.selectedBuildingId,
        previewResult,
        drivewayPreview: ui.drivewayPreview,
        drivewayPreviewValid,
        drivewayTileCount: gameState.lot.drivewayTiles.length,
      });

      const buildingDefinition =
        visual.building !== undefined
          ? getBuildingDefinition(config.buildings, visual.building.definitionId)
          : undefined;
      const vacancyLevel =
        visual.building !== undefined ? getBuildingVacancyLevel(visual.building, config) : 'none';
      const isTutorialTarget = showTutorialPulse && tutorialTileKeys.has(tileKey);

      tiles.push(
        <button
          key={`${String(x)}-${String(y)}`}
          ref={(element) => {
            if (element) {
              tileRefs.current.set(tileKey, element);
            } else {
              tileRefs.current.delete(tileKey);
            }
          }}
          type="button"
          className={styles.tileButton}
          data-testid={`tile-${String(x)}-${String(y)}`}
          data-tile-kind={visual.kind}
          data-category={buildingDefinition?.category}
          data-vacancy={vacancyLevel !== 'none' ? vacancyLevel : undefined}
          data-tutorial-target={isTutorialTarget ? 'true' : undefined}
          aria-label={formatTileAriaLabel({
            x,
            y,
            kind: visual.kind,
            buildingName: buildingDefinition?.name,
            vacancyLevel,
          })}
          aria-pressed={visual.building?.id === ui.selectedBuildingId}
          tabIndex={focusedTile.x === x && focusedTile.y === y ? 0 : -1}
          onClick={() => {
            handleTileActivate(x, y);
          }}
          onFocus={() => {
            setFocusedTile({ x, y });
          }}
          onMouseEnter={() => {
            if (isDrivewayRelocateMode && !ui.drivewayPreviewLocked) {
              setDrivewayPreviewOrigin({ x, y });
              return;
            }

            if (isPlacementMode && !ui.placementLocked) {
              setPlacementOrigin({ x, y });
            }
          }}
        />,
      );
    }
  }

  const lotAspectRatio = lotWidth / lotHeight;
  const lotLayoutStyle = {
    '--lot-aspect-ratio': lotAspectRatio,
  } as CSSProperties;

  return (
    <main className={styles.board} aria-label="Property board">
      <div
        className={styles.boardFrame}
        style={lotLayoutStyle}
        data-scenario-theme={scenario.theme ?? 'urban'}
      >
        <div className={styles.boardScroll}>
          <div
            className={styles.boardGrid}
            role="grid"
            aria-label={`${String(lotWidth)} by ${String(lotHeight)} property grid`}
            data-placement-mode={isPlacementMode || isDrivewayRelocateMode ? 'true' : 'false'}
            style={{
              ...lotLayoutStyle,
              aspectRatio: `${String(lotWidth)} / ${String(lotHeight)}`,
              gridTemplateColumns: `repeat(${String(lotWidth)}, 1fr)`,
              gridTemplateRows: `repeat(${String(lotHeight)}, 1fr)`,
            }}
            onKeyDown={handleGridKeyDown}
          >
            {tiles}
          </div>
        </div>
        {showSouthRoadStrip && <div className={styles.roadStrip}>South Road</div>}
      </div>

      <p className={styles.boardLegend} data-testid="board-legend">
        Striped tiles = driveway · Dotted tiles = access path · Green tint = road network during
        placement · Yellow border = partial vacancy · Red border = empty building
      </p>

      {isDrivewayRelocateMode && ui.drivewayPreview && (
        <p
          className={styles.previewStatus}
          data-valid={drivewayPreviewValid ? 'true' : 'false'}
          data-testid="driveway-preview-status"
        >
          {!ui.drivewayPreviewLocked
            ? 'Click a tile to lock the new driveway position, then confirm in the inspector'
            : drivewayPreviewValid
              ? 'Valid driveway preview — confirm in the inspector'
              : 'Invalid driveway placement — choose a position connected to South Road'}
        </p>
      )}

      {isPlacementMode && previewResult && (
        <p
          className={styles.previewStatus}
          data-valid={previewResult.isValid ? 'true' : 'false'}
          data-testid="placement-preview-status"
        >
          {!ui.placementLocked
            ? isRelocateMode
              ? 'Click a tile to lock the new position, then confirm in the inspector'
              : 'Click a tile to lock placement, then commit in the inspector'
            : previewResult.isValid
              ? isRelocateMode
                ? 'Valid move preview — confirm in the inspector'
                : 'Valid placement preview — review forecast and commit in the inspector'
              : placementStatusMessage}
        </p>
      )}
    </main>
  );
}
