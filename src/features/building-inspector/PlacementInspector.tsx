import { getBuildingDefinition } from '@/game/config/buildings';
import { formatFootprintSize } from '@/game/selectors/buildingSelectors';
import { getProjectForecastForPreview } from '@/game/selectors/forecastSelectors';
import { evaluatePlacementPreview } from '@/game/selectors/placementSelectors';
import type { GameConfig, GameState } from '@/game/domain/types';
import type { UiState } from '@/game/store/storeTypes';
import { DetailRow } from '@/features/building-inspector/inspectorShared';

import styles from '@/features/building-inspector/BuildingInspector.module.css';

interface PlacementInspectorProps {
  readonly gameState: GameState;
  readonly config: GameConfig;
  readonly ui: UiState;
  readonly lastCommandError: string | null;
  readonly cancelPlacement: () => void;
  readonly commitProject: () => void;
  readonly commitProjectWithFinancing: () => void;
  readonly commitRelocate: () => void;
  readonly rotatePlacementPreview: () => void;
}

export function PlacementInspector({
  gameState,
  config,
  ui,
  lastCommandError,
  cancelPlacement,
  commitProject,
  commitProjectWithFinancing,
  commitRelocate,
  rotatePlacementPreview,
}: PlacementInspectorProps) {
  const preview = ui.placementPreview;

  if (!preview) {
    return null;
  }

  const definition = getBuildingDefinition(config.buildings, preview.definitionId);
  const previewResult = evaluatePlacementPreview(gameState, config, preview);
  const isRelocate = ui.relocateBuildingId !== null;

  if (isRelocate) {
    return (
      <aside className={styles.inspector} aria-label="Property inspector">
        <section className={styles.section}>
          <h2 className={styles.title}>Move building</h2>
          <dl className={styles.detailList}>
            <DetailRow label="Building" value={definition.name} />
            <DetailRow label="Footprint" value={formatFootprintSize(definition)} />
            <DetailRow label="Rotation" value={`${String(previewResult.footprint.rotation)}°`} />
            <DetailRow
              label="Origin"
              value={`(${String(previewResult.footprint.origin.x + 1)}, ${String(previewResult.footprint.origin.y + 1)})`}
            />
            <DetailRow
              label="Status"
              value={previewResult.isValid ? 'Ready to confirm' : 'Invalid placement'}
              tone={previewResult.isValid ? 'positive' : 'negative'}
            />
          </dl>
          {!previewResult.isValid && previewResult.primaryMessage && (
            <p className={styles.warning} data-testid="placement-invalid-reason">
              {previewResult.primaryMessage}
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
              data-testid="rotate-placement-button"
              onClick={rotatePlacementPreview}
            >
              Rotate (R)
            </button>
            <button
              type="button"
              className={styles.commitButton}
              disabled={!previewResult.isValid || !ui.placementLocked}
              data-testid="commit-relocate-button"
              onClick={commitRelocate}
            >
              Confirm move
            </button>
            <button type="button" className={styles.cancelButton} onClick={cancelPlacement}>
              Cancel move
            </button>
          </div>
          <p className={styles.note}>
            Click a tile to lock the new position. Occupancy and rent posture are preserved.
          </p>
        </section>
      </aside>
    );
  }

  const forecast = getProjectForecastForPreview(gameState, config, preview);

  return (
    <aside className={styles.inspector} aria-label="Property inspector">
      <section className={styles.section}>
        <h2 className={styles.title}>Project forecast</h2>
        <dl className={styles.detailList}>
          <DetailRow label="Building" value={definition.name} />
          <DetailRow label="Footprint" value={formatFootprintSize(definition)} />
          <DetailRow label="Rotation" value={`${String(previewResult.footprint.rotation)}°`} />
          <DetailRow
            label="Origin"
            value={`(${String(previewResult.footprint.origin.x + 1)}, ${String(previewResult.footprint.origin.y + 1)})`}
          />
          <DetailRow label="Total cost" value={forecast.totalCostLabel} />
          <DetailRow label="Cash due at start" value={forecast.cashDueNowLabel} />
          <DetailRow label="During construction" value={forecast.cashBuildNoteLabel} />
          {forecast.loanEligible && (
            <>
              <DetailRow label="Loan equity required" value={forecast.loanEquityRequiredLabel} />
              <DetailRow label="Financed amount" value={forecast.loanPrincipalLabel} />
              <DetailRow
                label="Est. interest during build"
                value={forecast.loanInterestRangeLabel}
              />
              <DetailRow
                label="Principal payment after build"
                value={forecast.loanPaymentAfterBuildLabel}
              />
            </>
          )}
          <DetailRow label="Build duration" value={forecast.buildDurationLabel} />
          <DetailRow label="Completion" value={forecast.completionMonthLabel} />
          <DetailRow label="Parking after build" value={forecast.parkingLabel} />
          <DetailRow
            label="Status"
            value={previewResult.isValid ? 'Ready to commit' : 'Invalid preview'}
            tone={previewResult.isValid ? 'positive' : 'negative'}
          />
        </dl>
        {forecast.forecast.risks.length > 0 && (
          <ul className={styles.riskList} data-testid="forecast-risks">
            {forecast.forecast.risks.map((risk) => (
              <li key={risk.code}>{risk.message}</li>
            ))}
          </ul>
        )}
        {!previewResult.isValid && previewResult.primaryMessage && (
          <p className={styles.warning} data-testid="placement-invalid-reason">
            {previewResult.primaryMessage}
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
            data-testid="rotate-placement-button"
            onClick={rotatePlacementPreview}
          >
            Rotate (R)
          </button>
          <button
            type="button"
            className={styles.commitButton}
            disabled={!previewResult.isValid}
            data-testid="commit-project-button"
            onClick={commitProject}
          >
            Build with cash ({forecast.cashDueNowLabel})
          </button>
          {forecast.loanEligible && (
            <button
              type="button"
              className={styles.commitButton}
              disabled={!previewResult.isValid}
              data-testid="commit-project-financing-button"
              onClick={commitProjectWithFinancing}
            >
              Build with loan ({forecast.loanEquityRequiredLabel})
            </button>
          )}
          <button type="button" className={styles.cancelButton} onClick={cancelPlacement}>
            Cancel placement
          </button>
        </div>
      </section>
    </aside>
  );
}
