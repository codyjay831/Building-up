import { getScenarioObjectiveHudView } from '@/game/selectors/approvalSelectors';
import { useGameStore } from '@/game/store/gameStore';

import styles from '@/features/scenario-objective/ScenarioObjectiveStrip.module.css';

interface ScenarioObjectiveStripProps {
  readonly onOpenProperty: () => void;
}

export function ScenarioObjectiveStrip({ onOpenProperty }: ScenarioObjectiveStripProps) {
  const gameState = useGameStore((store) => store.gameState);
  const config = useGameStore((store) => store.config);
  const view = getScenarioObjectiveHudView(gameState, config);

  if (gameState.status !== 'active' && !view.won) {
    return null;
  }

  return (
    <button
      type="button"
      className={styles.strip}
      data-testid="scenario-objective-strip"
      onClick={onOpenProperty}
      aria-label="Open property details and win progress"
    >
      <span className={styles.objective}>{view.objectiveLabel}</span>
      <span className={styles.meta}>
        {view.won ? (
          <span className={styles.chip} data-met="true">
            Complete
          </span>
        ) : (
          <>
            <span className={styles.chip}>{view.stableMonthsLabel}</span>
            {view.topBlockers.map((blocker) => (
              <span key={blocker.label} className={styles.blocker}>
                {blocker.label}: {blocker.currentLabel}
              </span>
            ))}
          </>
        )}
      </span>
    </button>
  );
}
