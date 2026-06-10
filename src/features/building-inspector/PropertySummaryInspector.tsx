import {
  formatEffectiveRetailDemandLabel,
  formatEffectiveRetailDemandLine,
} from '@/game/selectors/leasingSelectors';
import { ApprovalProgressPanel } from '@/features/approval-progress/ApprovalProgress';
import { DetailRow } from '@/features/building-inspector/inspectorShared';
import {
  RETAIL_DEMAND_KEYS,
  formatSignedScore,
} from '@/features/building-inspector/inspectorFormat';
import type { useInspectorView } from '@/features/building-inspector/useInspectorView';

import styles from '@/features/building-inspector/BuildingInspector.module.css';

interface PropertySummaryInspectorProps {
  readonly view: ReturnType<typeof useInspectorView>;
}

export function PropertySummaryInspector({ view }: PropertySummaryInspectorProps) {
  const { summary, demandView, propertyHealth, demandNarrative, appealBreakdown } = view;

  return (
    <aside className={styles.inspector} aria-label="Property inspector">
      <section className={styles.section} data-testid="property-health-panel">
        <h2 className={styles.title}>Property health</h2>
        <dl className={styles.detailList}>
          <DetailRow
            label="Health score"
            value={`${String(propertyHealth.score)} / 100`}
            tone={
              propertyHealth.tone === 'healthy'
                ? 'positive'
                : propertyHealth.tone === 'critical' || propertyHealth.tone === 'declining'
                  ? 'negative'
                  : 'neutral'
            }
          />
          <DetailRow label="Occupancy" value={propertyHealth.occupancyLabel} />
        </dl>
        {propertyHealth.factors.length > 0 && (
          <>
            <h3 className={styles.subtitle}>Issues & fixes</h3>
            <ul className={styles.factorList} data-testid="property-health-factors">
              {propertyHealth.factors.map((factor) => (
                <li key={factor.id} className={styles.factorItem}>
                  <strong>{factor.label}</strong>
                  <span>{factor.suggestion}</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

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

      <section className={styles.section} data-testid="appeal-breakdown-panel">
        <h2 className={styles.title}>Appeal breakdown</h2>
        <dl className={styles.breakdownList}>
          <DetailRow label="Base appeal" value={String(appealBreakdown.baseAppeal)} />
          {appealBreakdown.lines.map((line) => (
            <DetailRow
              key={line.id}
              label={line.label}
              value={formatSignedScore(line.value)}
              tone={line.value > 0 ? 'positive' : line.value < 0 ? 'negative' : 'neutral'}
            />
          ))}
          <DetailRow
            label="Total appeal"
            value={String(appealBreakdown.total)}
            tone={
              appealBreakdown.total >= 65
                ? 'positive'
                : appealBreakdown.total < 45
                  ? 'negative'
                  : 'neutral'
            }
          />
        </dl>
      </section>

      <ApprovalProgressPanel />

      <section className={styles.section} data-testid="demand-panel">
        <h2 className={styles.title}>Demand</h2>
        <p className={styles.narrative} data-testid="demand-narrative-residential">
          {demandNarrative.residentialNarrative}
        </p>
        <p className={styles.narrative} data-testid="demand-narrative-retail">
          {demandNarrative.retailNarrative}
        </p>
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
        <p className={styles.note}>Select a building on the board to inspect leasing factors.</p>
      </section>
    </aside>
  );
}
