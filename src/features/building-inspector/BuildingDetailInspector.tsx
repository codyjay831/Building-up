import { buildingDefinitionHasRoadAccess } from '@/game/domain/accessibility';
import { canRelocateBuilding } from '@/game/domain/progression';
import {
  formatFootprintSize,
  formatLifecycleState,
  getBuildingDefinitionForInstance,
} from '@/game/selectors/buildingSelectors';
import { getBuildingFinanceView } from '@/game/selectors/buildingFinanceSelectors';
import { getConstructionProgressView } from '@/game/selectors/constructionSelectors';
import { getBuildingLeasingView } from '@/game/selectors/leasingSelectors';
import { getRedevelopmentPreview } from '@/game/selectors/redevelopmentSelectors';
import type { BuildingInstance, GameConfig, GameState } from '@/game/domain/types';
import type { UiState } from '@/game/store/storeTypes';
import { DetailRow, LeasingScoreTable } from '@/features/building-inspector/inspectorShared';
import { RENT_POSTURES, formatPostureLabel } from '@/features/building-inspector/inspectorFormat';

import styles from '@/features/building-inspector/BuildingInspector.module.css';

interface BuildingDetailInspectorProps {
  readonly gameState: GameState;
  readonly config: GameConfig;
  readonly ui: UiState;
  readonly selectedBuilding: BuildingInstance;
  readonly setRentPosture: (buildingId: string, posture: 'discount' | 'market' | 'premium') => void;
  readonly startRelocateBuilding: (buildingId: string) => void;
  readonly renovateBuildingAction: (buildingId: string) => void;
  readonly keepBuildingAsIs: (buildingId: string) => void;
  readonly sellBuildingAction: (buildingId: string) => void;
  readonly demolishBuildingAction: (buildingId: string) => void;
  readonly cancelCommittedProject: (projectId: string) => void;
}

export function BuildingDetailInspector({
  gameState,
  config,
  ui,
  selectedBuilding,
  setRentPosture,
  startRelocateBuilding,
  renovateBuildingAction,
  keepBuildingAsIs,
  sellBuildingAction,
  demolishBuildingAction,
  cancelCommittedProject,
}: BuildingDetailInspectorProps) {
  const definition = getBuildingDefinitionForInstance(config, selectedBuilding);
  const leasingView = getBuildingLeasingView(gameState, config, selectedBuilding);
  const financeView = getBuildingFinanceView(gameState, config, selectedBuilding);
  const redevelop = getRedevelopmentPreview(gameState, config, selectedBuilding.id);
  const hasRoadAccess =
    !definition.roadAccessRequired ||
    buildingDefinitionHasRoadAccess(
      selectedBuilding,
      config,
      gameState.lot,
      gameState.buildings,
      gameState.projects,
    );

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
                value={`${String(progress.progressPercent)}% (${String(progress.totalMonths - progress.monthsRemaining)}/${String(progress.totalMonths)} months)`}
              />
              <DetailRow label="Months remaining" value={String(progress.monthsRemaining)} />
              {progress.nextInterestLabel && (
                <DetailRow label="Next interest payment" value={progress.nextInterestLabel} />
              )}
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
                Cancel project (80% payment refund)
              </button>
            )}
            {!progress.canCancel && (
              <p className={styles.note}>
                Construction advances after each monthly turn with no additional cash payments.
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
          <DetailRow label="State" value={formatLifecycleState(selectedBuilding.lifecycleState)} />
          <DetailRow label="Footprint" value={formatFootprintSize(definition)} />
          <DetailRow label="Floors" value={String(definition.floors)} />
          <DetailRow label="Condition" value={`${String(selectedBuilding.condition)} / 100`} />
          {definition.roadAccessRequired && (
            <DetailRow
              label="Road access"
              value={hasRoadAccess ? 'Connected' : 'No access — build or extend path'}
              tone={hasRoadAccess ? 'positive' : 'negative'}
            />
          )}
          {definition.isAccessPath && (
            <DetailRow label="Role" value="Extends driveway network to reach buildings" />
          )}
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

      {financeView?.showFinance && (
        <section className={styles.section} data-testid="building-finance">
          <h2 className={styles.title}>Monthly finances</h2>
          <dl className={styles.detailList}>
            {financeView.residentialRentLabel && (
              <DetailRow label="Residential rent" value={financeView.residentialRentLabel} />
            )}
            {financeView.retailRentLabel && (
              <DetailRow label="Retail rent" value={financeView.retailRentLabel} />
            )}
            <DetailRow
              label="Gross rent"
              value={financeView.grossRentLabel}
              tone={financeView.grossRentTone}
            />
            <DetailRow label="Operating expenses" value={financeView.operatingExpensesLabel} />
            <DetailRow
              label="Net operating income"
              value={financeView.netOperatingIncomeLabel}
              tone={financeView.netOperatingIncomeTone}
              valueTestId="building-finance-net"
            />
          </dl>
          <p className={styles.note}>Projected from current occupancy and rent posture.</p>
        </section>
      )}

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

      {canRelocateBuilding(gameState, config, selectedBuilding) && (
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
            Demolition and sale both remove the structure. Demolition costs more but is the standard
            path before rebuilding on the same footprint.
          </p>
        </section>
      )}
    </aside>
  );
}
