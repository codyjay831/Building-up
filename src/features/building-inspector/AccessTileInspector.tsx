import {
  canRelocateDriveway,
  getDrivewayPreviewMessage,
  isDrivewayPreviewValid,
} from '@/game/domain/accessTiles';
import type { GameConfig, GameState } from '@/game/domain/types';
import type { UiState } from '@/game/store/storeTypes';
import { DetailRow } from '@/features/building-inspector/inspectorShared';

import styles from '@/features/building-inspector/BuildingInspector.module.css';

interface AccessTileInspectorProps {
  readonly gameState: GameState;
  readonly config: GameConfig;
  readonly ui: UiState;
  readonly lastCommandError: string | null;
  readonly startRelocateDriveway: () => void;
  readonly cancelPlacement: () => void;
  readonly commitDrivewayRelocate: () => void;
  readonly rotateDrivewayPreview: () => void;
}

export function AccessTileInspector({
  gameState,
  config,
  ui,
  lastCommandError,
  startRelocateDriveway,
  cancelPlacement,
  commitDrivewayRelocate,
  rotateDrivewayPreview,
}: AccessTileInspectorProps) {
  const drivewayPreview = ui.drivewayPreview;
  const relocatable = canRelocateDriveway(gameState.lot);
  const selectedTile = ui.selectedAccessTile ?? drivewayPreview?.origin ?? null;

  if (drivewayPreview) {
    const isValid = isDrivewayPreviewValid(gameState, config, drivewayPreview);
    const message = getDrivewayPreviewMessage(gameState, config, drivewayPreview);

    return (
      <aside className={styles.inspector} aria-label="Property inspector">
        <section className={styles.section} data-testid="driveway-relocate-inspector">
          <h2 className={styles.title}>Relocate driveway</h2>
          <dl className={styles.detailList}>
            <DetailRow label="Spaces" value={String(gameState.lot.accessParkingCapacity)} />
            <DetailRow
              label="Rotation"
              value={drivewayPreview.rotation === 0 ? 'Horizontal' : 'Vertical'}
            />
            <DetailRow
              label="Origin"
              value={
                selectedTile
                  ? `(${String(drivewayPreview.origin.x + 1)}, ${String(drivewayPreview.origin.y + 1)})`
                  : '—'
              }
            />
            <DetailRow
              label="Status"
              value={isValid ? 'Ready to confirm' : 'Invalid placement'}
              tone={isValid ? 'positive' : 'negative'}
            />
          </dl>
          {!isValid && message && (
            <p className={styles.warning} data-testid="driveway-invalid-reason">
              {message}
            </p>
          )}
          {lastCommandError && (
            <p className={styles.warning} data-testid="command-error">
              {lastCommandError}
            </p>
          )}
          <div className={styles.actionRow}>
            <button
              type="button"
              className={styles.secondaryButton}
              data-testid="rotate-driveway-button"
              onClick={rotateDrivewayPreview}
            >
              Rotate (R)
            </button>
            <button
              type="button"
              className={styles.commitButton}
              disabled={!isValid || !ui.drivewayPreviewLocked}
              data-testid="commit-driveway-relocate-button"
              onClick={commitDrivewayRelocate}
            >
              Confirm move
            </button>
            <button type="button" className={styles.cancelButton} onClick={cancelPlacement}>
              Cancel move
            </button>
          </div>
          <p className={styles.note}>
            Click a tile to lock the new driveway position. Parking capacity stays the same.
          </p>
        </section>
      </aside>
    );
  }

  return (
    <aside className={styles.inspector} aria-label="Property inspector">
      <section className={styles.section} data-testid="access-tile-inspector">
        <h2 className={styles.title}>Driveway</h2>
        <dl className={styles.detailList}>
          {selectedTile && (
            <DetailRow
              label="Tile"
              value={`(${String(selectedTile.x + 1)}, ${String(selectedTile.y + 1)})`}
            />
          )}
          <DetailRow label="Parking spaces" value={String(gameState.lot.accessParkingCapacity)} />
          <DetailRow label="Tiles" value={String(gameState.lot.drivewayTiles.length)} />
          <DetailRow
            label="Role"
            value="Parking driveway to South Road — build Access Paths to reach buildings farther in"
          />
        </dl>
        <p className={styles.note}>
          Driveway tiles are not buildable. Build Access Paths from the catalog to extend the road
          network.
        </p>
        {relocatable ? (
          <div className={styles.actionRow}>
            <button
              type="button"
              className={styles.commitButton}
              data-testid="start-driveway-relocate-button"
              onClick={startRelocateDriveway}
            >
              Relocate driveway
            </button>
          </div>
        ) : (
          <p className={styles.note}>This scenario driveway layout cannot be changed.</p>
        )}
      </section>
    </aside>
  );
}
