import { useState } from 'react';

import { getOnboardingView } from '@/game/onboarding/onboardingSelectors';
import { useGameStore } from '@/game/store/gameStore';

import styles from '@/features/onboarding/OnboardingGuide.module.css';

export function OnboardingGuide() {
  const [collapsed, setCollapsed] = useState(false);
  const gameState = useGameStore((store) => store.gameState);
  const ui = useGameStore((store) => store.ui);
  const onboarding = useGameStore((store) => store.onboarding);
  const dismissScenarioCard = useGameStore((store) => store.dismissScenarioCard);
  const view = getOnboardingView(gameState, ui, onboarding);

  if (view.tutorialComplete && !view.showScenarioCard) {
    return null;
  }

  return (
    <section
      className={styles.guide}
      data-collapsed={collapsed ? 'true' : 'false'}
      aria-label="Guided objectives"
      data-testid="onboarding-guide"
    >
      <div className={styles.guideHeader}>
        <div className={styles.headerLeft}>
          <p className={styles.eyebrow}>Getting started</p>
        </div>
        <button
          type="button"
          className={styles.collapseButton}
          aria-expanded={!collapsed}
          aria-label={collapsed ? 'Expand objectives' : 'Collapse objectives'}
          onClick={() => {
            setCollapsed((c) => !c);
          }}
        >
          {collapsed ? '▲' : '▼'}
        </button>
      </div>

      {!collapsed && (
        <div className={styles.guideBody}>
          {!view.tutorialComplete && (
            <ol className={styles.objectiveList}>
              {view.objectives.map((objective) => {
                const complete = view.completedObjectiveIds.includes(objective.id);
                const active = view.activeObjectiveId === objective.id;

                return (
                  <li
                    key={objective.id}
                    className={styles.objectiveItem}
                    data-complete={complete ? 'true' : 'false'}
                    data-active={active ? 'true' : 'false'}
                    data-testid={`onboarding-objective-${objective.id}`}
                  >
                    <span className={styles.objectiveMarker}>{complete ? '✓' : '○'}</span>
                    <div>
                      <p className={styles.objectiveTitle}>{objective.title}</p>
                      {active && (
                        <p className={styles.objectiveDescription}>{objective.description}</p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          )}

          {view.showScenarioCard && (
            <article className={styles.scenarioCard} data-testid="scenario-objective-card">
              <h2 className={styles.scenarioTitle}>Scenario objective</h2>
              <p className={styles.scenarioBody}>
                Fill the neighborhood with residents. Improve homes, unlock apartment buildings at
                higher approval levels, and maintain healthy occupancy, appeal, and cash flow.
              </p>
              <button
                type="button"
                className={styles.dismissButton}
                data-testid="dismiss-scenario-card"
                onClick={dismissScenarioCard}
              >
                Got it
              </button>
            </article>
          )}
        </div>
      )}
    </section>
  );
}
