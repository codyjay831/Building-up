import { getFinancePanelView } from '@/game/selectors/financeSelectors';
import { useGameStore } from '@/game/store/gameStore';

import styles from '@/features/finance-panel/FinancePanel.module.css';

export function FinancePanel() {
  const gameState = useGameStore((store) => store.gameState);
  const config = useGameStore((store) => store.config);
  const lastCommandError = useGameStore((store) => store.lastCommandError);
  const refinanceProperty = useGameStore((store) => store.refinanceProperty);
  const acceptEmergencyOffer = useGameStore((store) => store.acceptEmergencyOffer);
  const finance = getFinancePanelView(gameState, config);

  return (
    <section className={styles.panel} aria-label="Finance panel" data-testid="finance-panel">
      <header className={styles.header}>
        <h2 className={styles.title}>Finance</h2>
        <p className={styles.subtitle}>Property value, debt service, and recovery actions.</p>
      </header>

      <dl className={styles.summaryList}>
        <SummaryRow label="Property value" value={finance.propertyValueLabel} />
        <SummaryRow label="Total debt" value={finance.totalDebtLabel} />
        <SummaryRow label="Monthly debt payment" value={finance.monthlyDebtPaymentLabel} />
      </dl>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Active debt</h3>
        {finance.debtInstruments.length === 0 ? (
          <p className={styles.emptyState}>{finance.emptyDebtMessage}</p>
        ) : (
          <ul className={styles.debtList}>
            {finance.debtInstruments.map((instrument) => (
              <li key={instrument.id} className={styles.debtCard}>
                <p className={styles.debtType}>{instrument.typeLabel}</p>
                <dl className={styles.debtMeta}>
                  <div>
                    <dt>Current principal</dt>
                    <dd>{instrument.principalLabel}</dd>
                  </div>
                  <div>
                    <dt>Original principal</dt>
                    <dd>{instrument.originalPrincipalLabel}</dd>
                  </div>
                  <div>
                    <dt>Monthly payment</dt>
                    <dd>{instrument.monthlyPaymentLabel}</dd>
                  </div>
                  <div>
                    <dt>Status</dt>
                    <dd>{instrument.statusLabel}</dd>
                  </div>
                </dl>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Recovery actions</h3>
        <div className={styles.actionStack}>
          <button
            type="button"
            className={styles.actionButton}
            data-testid="refinance-button"
            disabled={!finance.refinanceAvailable || gameState.status !== 'active'}
            onClick={refinanceProperty}
          >
            Refinance up to {finance.refinanceCapacityLabel}
          </button>
          <p className={styles.actionNote}>
            Adds {finance.refinancePaymentLabel}/mo. Available once per run and capped by property
            value.
          </p>

          <button
            type="button"
            className={styles.actionButton}
            data-testid="emergency-offer-button"
            disabled={!finance.emergencyOfferAvailable || gameState.status !== 'active'}
            onClick={acceptEmergencyOffer}
          >
            Accept emergency investor offer ({finance.emergencyOfferAmountLabel})
          </button>
          <p className={styles.actionNote}>
            Low-value bridge capital offered only while cash is negative.
          </p>
        </div>

        {!finance.recoveryStillPossible && gameState.cash < 0 && (
          <p className={styles.criticalNote} data-testid="no-recovery-note">
            No remaining recovery action can restore solvency.
          </p>
        )}
      </section>

      {lastCommandError && (
        <p className={styles.error} data-testid="finance-command-error">
          {lastCommandError}
        </p>
      )}
    </section>
  );
}

interface SummaryRowProps {
  label: string;
  value: string;
}

function SummaryRow({ label, value }: SummaryRowProps) {
  return (
    <>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </>
  );
}
