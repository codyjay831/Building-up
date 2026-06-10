import { getMonthlyReportView } from '@/game/selectors/monthlyReportSelectors';
import { useGameStore } from '@/game/store/gameStore';

import styles from '@/features/monthly-report/MonthlyReport.module.css';

export function MonthlyReportDrawer() {
  const gameState = useGameStore((store) => store.gameState);
  const config = useGameStore((store) => store.config);
  const reportDrawerOpen = useGameStore((store) => store.ui.reportDrawerOpen);
  const toggleReportDrawer = useGameStore((store) => store.toggleReportDrawer);
  const report = getMonthlyReportView(gameState, config);

  if (!reportDrawerOpen) {
    return null;
  }

  return (
    <aside
      className={styles.drawer}
      aria-label="Monthly report"
      data-testid="monthly-report-drawer"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          toggleReportDrawer();
        }
      }}
    >
      <div className={styles.drawerPanel} role="dialog">
        <div className={styles.drawerHeader}>
          <h2 className={styles.drawerTitle}>
            {report.hasReport ? `Month ${String(report.month)} report` : 'Monthly report'}
          </h2>
          <button type="button" className={styles.closeButton} onClick={toggleReportDrawer}>
            Close
          </button>
        </div>

        <div className={styles.drawerBody}>
          {!report.hasReport ? (
            <p className={styles.emptyState}>{report.summary}</p>
          ) : (
            <>
              <dl className={styles.totalsList}>
                <TotalRow label="Opening cash" value={report.openingCashLabel} />
                <TotalRow label="Gross rent" value={report.grossRentLabel} tone="positive" />
                <TotalRow
                  label="Operating expenses"
                  value={report.operatingExpensesLabel}
                  tone="negative"
                />
                <TotalRow
                  label="Net cash flow"
                  value={report.netCashFlowLabel}
                  tone={report.netCashFlowLabel.startsWith('-') ? 'negative' : 'positive'}
                />
                <TotalRow label="Closing cash" value={report.closingCashLabel} />
              </dl>

              {report.propertyHealth && (
                <>
                  <h3 className={styles.sectionTitle}>Property health</h3>
                  <p className={styles.detailLine} data-testid="report-property-health">
                    {report.propertyHealth.label}
                    {report.propertyHealth.deltaLabel && <> ({report.propertyHealth.deltaLabel})</>}
                  </p>
                </>
              )}

              {report.demandChanges.length > 0 && (
                <>
                  <h3 className={styles.sectionTitle}>Demand changes</h3>
                  <ul className={styles.lineList} data-testid="demand-changes">
                    {report.demandChanges.map((change) => (
                      <li key={change.id} className={styles.lineItem} data-tone={change.tone}>
                        <span>{change.label}</span>
                      </li>
                    ))}
                  </ul>
                </>
              )}

              <ul className={styles.lineList}>
                {report.lines.map((line) => (
                  <li key={line.id} className={styles.lineItem} data-tone={line.tone}>
                    <span>{line.label}</span>
                    <span>{line.amountLabel}</span>
                  </li>
                ))}
              </ul>

              {report.occupancyChanges.length > 0 && (
                <>
                  <h3 className={styles.sectionTitle}>Leasing changes</h3>
                  <ul className={styles.lineList} data-testid="occupancy-changes">
                    {report.occupancyChanges.map((change) => (
                      <li key={change.id} className={styles.changeItem} data-tone={change.tone}>
                        <span>{change.label}</span>
                        {change.detail && (
                          <span className={styles.changeDetail}>{change.detail}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </>
              )}

              {report.winConditions.length > 0 && (
                <>
                  <h3 className={styles.sectionTitle}>Win progress</h3>
                  {report.winStableMonthsLabel && (
                    <p className={styles.detailLine} data-testid="report-win-stable-months">
                      {report.winStableMonthsLabel}
                    </p>
                  )}
                  <ul className={styles.lineList} data-testid="report-win-conditions">
                    {report.winConditions.map((condition) => (
                      <li
                        key={condition.id}
                        className={styles.lineItem}
                        data-tone={condition.met ? 'positive' : 'neutral'}
                        data-met={condition.met ? 'true' : 'false'}
                      >
                        <span>
                          {condition.label}: {condition.currentLabel}
                        </span>
                      </li>
                    ))}
                  </ul>
                </>
              )}

              {report.warnings.length > 0 && (
                <>
                  <h3 className={styles.sectionTitle}>Warnings</h3>
                  <ul className={styles.lineList} data-testid="report-warnings">
                    {report.warnings.map((warning) => (
                      <li key={warning.id} className={styles.lineItem} data-tone={warning.tone}>
                        <span>{warning.label}</span>
                      </li>
                    ))}
                  </ul>
                </>
              )}

              <p className={styles.explanation}>{report.summary}</p>
            </>
          )}
        </div>
      </div>
    </aside>
  );
}

interface TotalRowProps {
  label: string;
  value: string;
  tone?: 'positive' | 'negative' | 'neutral';
}

function TotalRow({ label, value, tone = 'neutral' }: TotalRowProps) {
  return (
    <>
      <dt>{label}</dt>
      <dd data-tone={tone}>{value}</dd>
    </>
  );
}
