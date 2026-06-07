import { getApprovalProgressPanel } from '@/game/selectors/approvalSelectors';
import { useGameStore } from '@/game/store/gameStore';

import styles from '@/features/approval-progress/ApprovalProgress.module.css';

export function ApprovalProgressPanel() {
  const gameState = useGameStore((store) => store.gameState);
  const config = useGameStore((store) => store.config);
  const panel = getApprovalProgressPanel(gameState, config);

  if (panel.nextUnlockLevel === null && panel.currentLevel >= 3) {
    return (
      <section className={styles.panel} data-testid="approval-progress">
        <h2 className={styles.title}>Approval Level 3 unlocked</h2>
        <p className={styles.note}>All approval tiers are available in this run.</p>
      </section>
    );
  }

  const nextLevel = panel.nextLevel;

  return (
    <section className={styles.panel} data-testid="approval-progress">
      <header className={styles.header}>
        <h2 className={styles.title}>Approval progress</h2>
        <p className={styles.subtitle}>
          Current level: {String(panel.currentLevel)}
          {nextLevel ? ` · Next: Level ${String(nextLevel.level)}` : ''}
        </p>
      </header>

      {nextLevel && nextLevel.conditions.length > 0 && (
        <ul className={styles.conditionList}>
          {nextLevel.conditions.map((condition) => (
            <li key={condition.id} className={styles.conditionItem} data-met={condition.met}>
              <span className={styles.conditionLabel}>{condition.label}</span>
              <span className={styles.conditionValue}>{condition.currentLabel}</span>
              <span className={styles.conditionTarget}>{condition.targetLabel}</span>
            </li>
          ))}
        </ul>
      )}

      <div className={styles.winBlock} data-testid="win-progress">
        <h3 className={styles.winTitle}>Scenario win</h3>
        <p className={styles.objective}>{panel.scenarioObjective}</p>
        <p className={styles.winStatus}>{panel.winProgressLabel}</p>
        <ul className={styles.conditionList}>
          {panel.winView.conditions.map((condition) => (
            <li key={condition.id} className={styles.conditionItem} data-met={condition.met}>
              <span className={styles.conditionLabel}>{condition.label}</span>
              <span className={styles.conditionValue}>{condition.currentLabel}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
