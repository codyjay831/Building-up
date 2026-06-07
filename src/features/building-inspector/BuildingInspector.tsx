import { getBuildingDefinition } from '@/game/config/buildings';
import { formatMoney } from '@/game/domain/money';
import {
  formatEffectiveRetailDemandLabel,
  formatEffectiveRetailDemandLine,
  formatLeasingFactorLabel,
  getBuildingLeasingView,
  getPropertyDemandView,
} from '@/game/selectors/leasingSelectors';
import {
  formatFootprintSize,
  formatLifecycleState,
  getBuildingById,
  getBuildingDefinitionForInstance,
} from '@/game/selectors/buildingSelectors';
import { getConstructionProgressView } from '@/game/selectors/constructionSelectors';
import { getProjectForecastForPreview } from '@/game/selectors/forecastSelectors';
import { evaluatePlacementPreview } from '@/game/selectors/placementSelectors';
import { getPropertySummary } from '@/game/selectors/propertySelectors';
import { getRedevelopmentPreview } from '@/game/selectors/redevelopmentSelectors';
import { canRelocateBuilding } from '@/game/domain/progression';
import { useGameStore } from '@/game/store/gameStore';
import { ApprovalProgressPanel } from '@/features/approval-progress/ApprovalProgress';
import type { RentPosture } from '@/game/domain/types';

import styles from '@/features/building-inspector/BuildingInspector.module.css';

const LEASING_FACTOR_KEYS = [
  'demand',
  'appeal',
  'condition',
  'rentPosture',
  'parking',
  'buildingPreference',
  'total',
] as const;

const RETAIL_DEMAND_KEYS = [
  'baseDemand',
  'residentCustomerBoost',
  'mixedUseSynergy',
  'frontageBonus',
  'parkingPenalty',
] as const;

const RENT_POSTURES: readonly RentPosture[] = ['discount', 'market', 'premium'];

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
  const cancelCommittedProject = useGameStore((store) => store.cancelCommittedProject);
  const setRentPosture = useGameStore((store) => store.setRentPosture);
  const renovateBuildingAction = useGameStore((store) => store.renovateBuilding);
  const keepBuildingAsIs = useGameStore((store) => store.keepBuildingAsIs);
  const sellBuildingAction = useGameStore((store) => store.sellBuilding);
  const demolishBuildingAction = useGameStore((store) => store.demolishBuilding);

  const summary = getPropertySummary(gameState, config);
  const demandView = getPropertyDemandView(gameState, config);
  const selectedBuilding = ui.selectedBuildingId
    ? getBuildingById(gameState, ui.selectedBuildingId)
    : undefined;

  if (ui.placementPreview && ui.relocateBuildingId) {
    const definition = getBuildingDefinition(config.buildings, ui.placementPreview.definitionId);
    const preview = evaluatePlacementPreview(gameState, config, ui.placementPreview);

    return (
      <aside className={styles.inspector} aria-label="Property inspector">
        <section className={styles.section}>
          <h2 className={styles.title}>Move building</h2>
          <dl className={styles.detailList}>
            <DetailRow label="Building" value={definition.name} />
            <DetailRow label="Footprint" value={formatFootprintSize(definition)} />
            <DetailRow label="Rotation" value={`${String(preview.footprint.rotation)}°`} />
            <DetailRow
              label="Origin"
              value={`(${String(preview.footprint.origin.x + 1)}, ${String(preview.footprint.origin.y + 1)})`}
            />
            <DetailRow
              label="Status"
              value={preview.isValid ? 'Ready to confirm' : 'Invalid placement'}
              tone={preview.isValid ? 'positive' : 'negative'}
            />
          </dl>
          {!preview.isValid && preview.primaryMessage && (
            <p className={styles.warning} data-testid="placement-invalid-reason">
              {preview.primaryMessage}
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
              disabled={!preview.isValid || !ui.placementLocked}
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

  if (ui.selectedCatalogItemId && ui.placementPreview) {
    const definition = getBuildingDefinition(config.buildings, ui.selectedCatalogItemId);
    const preview = evaluatePlacementPreview(gameState, config, ui.placementPreview);
    const forecast = getProjectForecastForPreview(gameState, config, ui.placementPreview);

    return (
      <aside className={styles.inspector} aria-label="Property inspector">
        <section className={styles.section}>
          <h2 className={styles.title}>Project forecast</h2>
          <dl className={styles.detailList}>
            <DetailRow label="Building" value={definition.name} />
            <DetailRow label="Footprint" value={formatFootprintSize(definition)} />
            <DetailRow label="Rotation" value={`${String(preview.footprint.rotation)}°`} />
            <DetailRow
              label="Origin"
              value={`(${String(preview.footprint.origin.x + 1)}, ${String(preview.footprint.origin.y + 1)})`}
            />
            <DetailRow label="Total cost" value={forecast.totalCostLabel} />
            <DetailRow label="Cash due now" value={forecast.cashDueNowLabel} />
            {forecast.constructionLoan.eligible && (
              <>
                <DetailRow
                  label="Loan equity required"
                  value={forecast.constructionLoan.equityRequiredLabel}
                />
                <DetailRow
                  label="Financed principal"
                  value={forecast.constructionLoan.loanPrincipalLabel}
                />
                <DetailRow
                  label="Loan payment after build"
                  value={forecast.constructionLoan.monthlyPaymentLabel}
                />
              </>
            )}
            <DetailRow label="Monthly draws" value={forecast.monthlyDrawsLabel} />
            <DetailRow label="Build duration" value={forecast.buildDurationLabel} />
            <DetailRow label="Completion" value={forecast.completionMonthLabel} />
            <DetailRow label="Parking after build" value={forecast.parkingLabel} />
            <DetailRow
              label="Status"
              value={preview.isValid ? 'Ready to commit' : 'Invalid preview'}
              tone={preview.isValid ? 'positive' : 'negative'}
            />
          </dl>
          {forecast.forecast.risks.length > 0 && (
            <ul className={styles.riskList} data-testid="forecast-risks">
              {forecast.forecast.risks.map((risk) => (
                <li key={risk.code}>{risk.message}</li>
              ))}
            </ul>
          )}
          {!preview.isValid && preview.primaryMessage && (
            <p className={styles.warning} data-testid="placement-invalid-reason">
              {preview.primaryMessage}
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
              disabled={!preview.isValid}
              data-testid="commit-project-button"
              onClick={commitProject}
            >
              Build with cash ({forecast.cashDueNowLabel})
            </button>
            {forecast.constructionLoan.eligible && (
              <button
                type="button"
                className={styles.commitButton}
                disabled={!preview.isValid}
                data-testid="commit-project-financing-button"
                onClick={commitProjectWithFinancing}
              >
                Build with financing ({forecast.constructionLoan.equityRequiredLabel})
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

  if (selectedBuilding) {
    const definition = getBuildingDefinitionForInstance(config, selectedBuilding);
    const leasingView = getBuildingLeasingView(gameState, config, selectedBuilding);
    const redevelop = getRedevelopmentPreview(gameState, config, selectedBuilding.id);

    if (selectedBuilding.lifecycleState === 'under_construction' && ui.selectedProjectId) {
      const progress = getConstructionProgressView(gameState, config, ui.selectedProjectId);

      if (progress) {
        return (
          <aside className={styles.inspector} aria-label="Property inspector">
            <section className={styles.section}>
              <h2 className={styles.title}>{progress.buildingName}</h2>
              <dl className={styles.detailList}>
                <DetailRow label="State" value="Under construction" />
                <DetailRow
                  label="Progress"
                  value={`${String(progress.progressPercent)}% (${String(progress.totalMonths - progress.monthsRemaining)}/${String(progress.totalMonths)} draws)`}
                />
                <DetailRow label="Months remaining" value={String(progress.monthsRemaining)} />
                <DetailRow label="Next draw" value={progress.nextDrawLabel} />
                <DetailRow label="Spent" value={progress.spentLabel} />
                <DetailRow label="Total cost" value={progress.totalCostLabel} />
              </dl>
              <div
                className={styles.progressTrack}
                role="progressbar"
                aria-valuenow={progress.progressPercent}
                aria-valuemin={0}
                aria-valuemax={100}
                data-testid="construction-progress"
              >
                <div
                  className={styles.progressFill}
                  style={{ width: `${String(progress.progressPercent)}%` }}
                />
              </div>
              {progress.canCancel && (
                <button
                  type="button"
                  className={styles.cancelButton}
                  data-testid="cancel-project-button"
                  onClick={() => {
                    cancelCommittedProject(progress.project.id);
                  }}
                >
                  Cancel project (80% deposit refund)
                </button>
              )}
              {!progress.canCancel && (
                <p className={styles.note}>
                  Construction draws begin after the next monthly advancement.
                </p>
              )}
            </section>
          </aside>
        );
      }
    }

    return (
      <aside className={styles.inspector} aria-label="Property inspector">
        <section className={styles.section}>
          <h2 className={styles.title}>{definition.name}</h2>
          <dl className={styles.detailList}>
            <DetailRow
              label="State"
              value={formatLifecycleState(selectedBuilding.lifecycleState)}
            />
            <DetailRow label="Footprint" value={formatFootprintSize(definition)} />
            <DetailRow label="Floors" value={String(definition.floors)} />
            <DetailRow label="Condition" value={`${String(selectedBuilding.condition)} / 100`} />
            {definition.residentialUnits > 0 && leasingView && (
              <DetailRow
                label="Residential occupancy"
                value={leasingView.residentialOccupancyLabel}
                tone={leasingView.hasVacancy ? 'negative' : 'positive'}
              />
            )}
            {definition.retailUnits > 0 && leasingView?.retailOccupancyLabel && (
              <DetailRow
                label="Retail occupancy"
                value={leasingView.retailOccupancyLabel}
                tone={leasingView.hasVacancy ? 'negative' : 'positive'}
              />
            )}
            <DetailRow
              label="Operating expense"
              value={`${formatMoney(definition.operatingExpense)}/mo`}
            />
          </dl>
        </section>

        <section className={styles.section}>
          <h2 className={styles.title}>Rent posture</h2>
          <div className={styles.postureRow} role="group" aria-label="Rent posture">
            {RENT_POSTURES.map((posture) => (
              <button
                key={posture}
                type="button"
                className={styles.postureButton}
                data-active={selectedBuilding.rentPosture === posture ? 'true' : 'false'}
                data-testid={`rent-posture-${posture}`}
                onClick={() => {
                  setRentPosture(selectedBuilding.id, posture);
                }}
              >
                {formatPostureLabel(posture)}
              </button>
            ))}
          </div>
          <p className={styles.note}>
            Discount lowers rent and improves leasing. Premium raises rent but slows leasing.
          </p>
        </section>

        {leasingView && (leasingView.residentialScore || leasingView.retailScore) && (
          <section className={styles.section} data-testid="leasing-breakdown">
            <h2 className={styles.title}>Leasing factors</h2>
            {leasingView.residentialLeasingStatus && (
              <p className={styles.note} data-tone={leasingView.residentialLeasingStatus.tone}>
                {leasingView.residentialLeasingStatus.message}
              </p>
            )}
            {leasingView.residentialScore && (
              <LeasingScoreTable
                title="Residential"
                score={leasingView.residentialScore}
                moveInThreshold={config.balance.leasingMoveInThreshold}
                moveOutThreshold={config.balance.leasingMoveOutThreshold}
              />
            )}
            {leasingView.retailLeasingStatus && (
              <p className={styles.note} data-tone={leasingView.retailLeasingStatus.tone}>
                {leasingView.retailLeasingStatus.message}
              </p>
            )}
            {leasingView.retailScore && (
              <LeasingScoreTable
                title="Retail"
                score={leasingView.retailScore}
                moveInThreshold={config.balance.leasingMoveInThreshold}
                moveOutThreshold={config.balance.leasingMoveOutThreshold}
              />
            )}
          </section>
        )}

        {canRelocateBuilding(gameState, selectedBuilding) && (
          <section className={styles.section}>
            <h2 className={styles.title}>Placement</h2>
            <p className={styles.note}>Move this building to a new tile on the lot.</p>
            <button
              type="button"
              className={styles.secondaryButton}
              data-testid="move-building-button"
              onClick={() => {
                startRelocateBuilding(selectedBuilding.id);
              }}
            >
              Move building
            </button>
          </section>
        )}

        {redevelop && gameState.status === 'active' && (
          <section className={styles.section} data-testid="redevelopment-actions">
            <h2 className={styles.title}>Improve & redevelop</h2>
            <dl className={styles.detailList}>
              <DetailRow label="Renovation" value={redevelop.renovationCostLabel} />
              {redevelop.canDemolish && (
                <>
                  <DetailRow label="Demolition cost" value={redevelop.demolitionCostLabel} />
                  <DetailRow
                    label="Lost monthly income"
                    value={redevelop.lostIncomeLabel}
                    tone="negative"
                  />
                </>
              )}
              {redevelop.canSell && (
                <DetailRow
                  label="Sale proceeds"
                  value={redevelop.saleProceedsLabel}
                  tone="positive"
                />
              )}
            </dl>
            <div className={styles.actionRow}>
              <button
                type="button"
                className={styles.secondaryButton}
                data-testid="keep-building-button"
                onClick={() => {
                  keepBuildingAsIs(selectedBuilding.id);
                }}
              >
                Keep as-is
              </button>
              <button
                type="button"
                className={styles.commitButton}
                disabled={!redevelop.canRenovate}
                data-testid="renovate-building-button"
                onClick={() => {
                  renovateBuildingAction(selectedBuilding.id);
                }}
              >
                Renovate ({redevelop.renovationCostLabel})
              </button>
              <button
                type="button"
                className={styles.secondaryButton}
                disabled={!redevelop.canSell}
                data-testid="sell-building-button"
                onClick={() => {
                  sellBuildingAction(selectedBuilding.id);
                }}
              >
                Sell ({redevelop.saleProceedsLabel})
              </button>
              <button
                type="button"
                className={styles.dangerButton}
                disabled={!redevelop.canDemolish}
                data-testid="demolish-building-button"
                onClick={() => {
                  demolishBuildingAction(selectedBuilding.id);
                }}
              >
                Demolish ({redevelop.demolitionCostLabel})
              </button>
            </div>
            {redevelop.renovationBlockedReason && !redevelop.canRenovate && (
              <p className={styles.note}>{redevelop.renovationBlockedReason}</p>
            )}
            {redevelop.demolitionBlockedReason && !redevelop.canDemolish && (
              <p className={styles.note}>{redevelop.demolitionBlockedReason}</p>
            )}
            <p className={styles.note}>
              Demolition and sale both remove the structure. Demolition costs more but is the
              standard path before rebuilding on the same footprint.
            </p>
          </section>
        )}
      </aside>
    );
  }

  return (
    <aside className={styles.inspector} aria-label="Property inspector">
      <section className={styles.section}>
        <h2 className={styles.title}>Property summary</h2>
        <dl className={styles.detailList}>
          <DetailRow label="Occupancy" value={summary.occupancyLabel} />
          <DetailRow label="Parking" value={summary.parkingLabel} />
          {summary.parkingShortfallLabel && (
            <DetailRow
              label="Parking shortage"
              value={summary.parkingShortfallLabel}
              tone="negative"
            />
          )}
          <DetailRow label="Appeal" value={summary.appealLabel} />
          <DetailRow label="Approval" value={summary.approvalLabel} />
        </dl>
      </section>

      <ApprovalProgressPanel />

      <section className={styles.section} data-testid="demand-panel">
        <h2 className={styles.title}>Demand</h2>
        <dl className={styles.detailList}>
          <DetailRow label="Residential" value={summary.residentialDemandLabel} />
          <DetailRow label="Retail market" value={summary.retailDemandLabel} />
          <DetailRow label="Effective retail" value={summary.effectiveRetailDemandLabel} />
        </dl>
        <dl className={styles.breakdownList}>
          {RETAIL_DEMAND_KEYS.map((key) => (
            <DetailRow
              key={key}
              label={formatEffectiveRetailDemandLabel(key)}
              value={formatEffectiveRetailDemandLine(demandView.effectiveRetailDemand[key])}
              tone={
                key === 'parkingPenalty' && demandView.effectiveRetailDemand[key] > 0
                  ? 'negative'
                  : key === 'residentCustomerBoost' && demandView.effectiveRetailDemand[key] > 0
                    ? 'positive'
                    : 'neutral'
              }
            />
          ))}
        </dl>
        <p className={styles.note}>
          Residential demand is the regional market score (0–100). Each building leases based on
          its leasing score — select a building on the board to see the breakdown.
        </p>
        <p className={styles.note}>Select a building on the board to inspect leasing factors.</p>
      </section>
    </aside>
  );
}

interface LeasingScoreTableProps {
  readonly title: string;
  readonly score: NonNullable<ReturnType<typeof getBuildingLeasingView>>['residentialScore'];
  readonly moveInThreshold: number;
  readonly moveOutThreshold: number;
}

function LeasingScoreTable({
  title,
  score,
  moveInThreshold,
  moveOutThreshold,
}: LeasingScoreTableProps) {
  if (!score) {
    return null;
  }

  return (
    <div className={styles.scoreBlock}>
      <h3 className={styles.subtitle}>{title}</h3>
      <dl className={styles.breakdownList}>
        {LEASING_FACTOR_KEYS.map((key) => (
          <DetailRow
            key={key}
            label={formatLeasingFactorLabel(key)}
            value={formatSignedScore(score[key])}
            tone={
              key === 'rentPosture'
                ? score[key] > 0
                  ? 'positive'
                  : score[key] < 0
                    ? 'negative'
                    : 'neutral'
                : key === 'total'
                  ? score.total >= moveInThreshold
                    ? 'positive'
                    : score.total <= moveOutThreshold
                      ? 'negative'
                      : 'neutral'
                  : 'neutral'
            }
          />
        ))}
      </dl>
    </div>
  );
}

function formatPostureLabel(posture: RentPosture): string {
  switch (posture) {
    case 'discount':
      return 'Discount';
    case 'premium':
      return 'Premium';
    default:
      return 'Market';
  }
}

function formatSignedScore(value: number): string {
  if (value > 0) {
    return `+${String(value)}`;
  }

  return String(value);
}

interface DetailRowProps {
  label: string;
  value: string;
  tone?: 'neutral' | 'positive' | 'negative';
}

function DetailRow({ label, value, tone = 'neutral' }: DetailRowProps) {
  return (
    <>
      <dt>{label}</dt>
      <dd data-tone={tone}>{value}</dd>
    </>
  );
}
