import { useEffect, useMemo, useRef } from 'react';

import { getBuildingDefinition } from '@/game/config/buildings';
import { evaluatePlacementPreview } from '@/game/selectors/placementSelectors';
import { useGameStore } from '@/game/store/gameStore';
import {
  buildAccessTileKeys,
  buildBuildingTileMap,
  buildProjectTileMap,
  resolveTileVisualState,
} from '@/features/property-board/tilePresentation';
import { getBuildingVacancyLevel } from '@/game/selectors/leasingSelectors';

import styles from '@/features/property-board/PropertyBoard.module.css';

export function PropertyBoard() {
  const gameState = useGameStore((store) => store.gameState);
  const config = useGameStore((store) => store.config);
  const ui = useGameStore((store) => store.ui);
  const selectBuilding = useGameStore((store) => store.selectBuilding);
  const setPlacementOrigin = useGameStore((store) => store.setPlacementOrigin);
  const cancelPlacement = useGameStore((store) => store.cancelPlacement);
  const clearSelection = useGameStore((store) => store.clearSelection);
  const setFocusedTile = useGameStore((store) => store.setFocusedTile);
  const tileRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  const buildingByTileKey = useMemo(
    () => buildBuildingTileMap(gameState.buildings),
    [gameState.buildings],
  );
  const projectByTileKey = useMemo(
    () => buildProjectTileMap(gameState.projects),
    [gameState.projects],
  );
  const accessTileKeys = useMemo(
    () => buildAccessTileKeys(gameState.lot.accessTiles),
    [gameState.lot.accessTiles],
  );

  const previewResult = useMemo(() => {
    if (!ui.placementPreview) {
      return null;
    }

    return evaluatePlacementPreview(gameState, config, ui.placementPreview);
  }, [config, gameState, ui.placementPreview]);

  const isPlacementMode = ui.placementPreview !== null;
  const isRelocateMode = ui.relocateBuildingId !== null;
  const focusedTile = ui.focusedTile ?? { x: 0, y: 0 };

  useEffect(() => {
    if (!isPlacementMode) {
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
  }, [cancelPlacement, isPlacementMode]);

  useEffect(() => {
    const key = `${String(focusedTile.x)},${String(focusedTile.y)}`;
    tileRefs.current.get(key)?.focus();
  }, [focusedTile.x, focusedTile.y]);

  const handleTileActivate = (x: number, y: number) => {
    setFocusedTile({ x, y });

    if (isPlacementMode) {
      setPlacementOrigin({ x, y }, { lock: true });
      return;
    }

    const building = buildingByTileKey.get(`${String(x)},${String(y)}`);
    if (building) {
      selectBuilding(building.id);
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

  const tiles = [];

  for (let y = 0; y < lotHeight; y += 1) {
    for (let x = 0; x < lotWidth; x += 1) {
      const visual = resolveTileVisualState({
        x,
        y,
        accessTileKeys,
        buildingByTileKey,
        projectByTileKey,
        selectedBuildingId: ui.selectedBuildingId,
        previewResult,
      });

      const buildingDefinition =
        visual.building !== undefined
          ? getBuildingDefinition(config.buildings, visual.building.definitionId)
          : undefined;
      const vacancyLevel =
        visual.building !== undefined ? getBuildingVacancyLevel(visual.building, config) : 'none';
      const tileKey = `${String(x)},${String(y)}`;

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
          aria-label={`Tile ${String(x + 1)}, ${String(y + 1)}`}
          aria-pressed={visual.building?.id === ui.selectedBuildingId}
          tabIndex={focusedTile.x === x && focusedTile.y === y ? 0 : -1}
          onClick={() => {
            handleTileActivate(x, y);
          }}
          onFocus={() => {
            setFocusedTile({ x, y });
          }}
          onMouseEnter={() => {
            if (isPlacementMode && !ui.placementLocked) {
              setPlacementOrigin({ x, y });
            }
          }}
        />,
      );
    }
  }

  return (
    <main className={styles.board} aria-label="Property board">
      <div className={styles.boardFrame}>
        <div className={styles.boardScroll}>
          <div
            className={styles.boardGrid}
            role="grid"
            aria-label={`${String(lotWidth)} by ${String(lotHeight)} property grid`}
            data-placement-mode={isPlacementMode ? 'true' : 'false'}
            style={{
              gridTemplateColumns: `repeat(${String(lotWidth)}, minmax(10px, 1fr))`,
              gridTemplateRows: `repeat(${String(lotHeight)}, minmax(10px, 1fr))`,
            }}
            onKeyDown={handleGridKeyDown}
          >
            {tiles}
          </div>
        </div>
        <div className={styles.roadStrip}>South Road</div>
      </div>

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
              : previewResult.primaryMessage}
        </p>
      )}
    </main>
  );
}
