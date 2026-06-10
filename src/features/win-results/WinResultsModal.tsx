import { getCombinedOccupancyView } from '@/game/selectors/occupancySelectors';
import { getLatestMonthlyLedgerEntry } from '@/game/selectors/propertySelectors';
import { getScenarioObjectiveHudView } from '@/game/selectors/approvalSelectors';
import { formatMoney } from '@/game/domain/money';
import { useGameStore } from '@/game/store/gameStore';

import styles from '@/features/win-results/WinResultsModal.module.css';

export function WinResultsModal() {
  const gameState = useGameStore((store) => store.gameState);
  const config = useGameStore((store) => store.config);
  const ui = useGameStore((store) => store.ui);
  const dismissWinResults = useGameStore((store) => store.dismissWinResults);

  if (gameState.status !== 'won' || ui.winResultsDismissed) {
    return null;
  }

  const objective = getScenarioObjectiveHudView(gameState, config);
  const occupancy = getCombinedOccupancyView(gameState, config);
  const latestMonthly = getLatestMonthlyLedgerEntry(gameState);

  return (
    <div className={styles.backdrop} data-testid="win-results-modal">
      <div className={styles.panel} role="dialog" aria-label="Scenario complete">
        <h2 className={styles.title}>{objective.winBannerLabel}</h2>
        <p className={styles.subtitle}>{objective.objectiveLabel}</p>

        <dl className={styles.stats}>
          <div>
            <dt>Month reached</dt>
            <dd>{String(gameState.month)}</dd>
          </div>
          <div>
            <dt>Occupancy</dt>
            <dd>{occupancy.label}</dd>
          </div>
          <div>
            <dt>Monthly net</dt>
            <dd>{latestMonthly ? formatMoney(latestMonthly.netCashFlow) : '—'}</dd>
          </div>
          <div>
            <dt>Buildings</dt>
            <dd>{String(gameState.buildings.length)}</dd>
          </div>
        </dl>

        <button type="button" className={styles.closeButton} onClick={dismissWinResults}>
          Continue
        </button>
      </div>
    </div>
  );
}
