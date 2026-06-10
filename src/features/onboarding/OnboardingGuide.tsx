import { getScenarioDefinition } from '@/game/config/scenario';
import { getOnboardingView } from '@/game/onboarding/onboardingSelectors';
import { useGameStore } from '@/game/store/gameStore';

import styles from '@/features/onboarding/OnboardingGuide.module.css';

export function OnboardingGuide() {
  const gameState = useGameStore((store) => store.gameState);
  const ui = useGameStore((store) => store.ui);
  const onboarding = useGameStore((store) => store.onboarding);
  const config = useGameStore((store) => store.config);
  const dismissScenarioCard = useGameStore((store) => store.dismissScenarioCard);
  const dismissOnboardingGuide = useGameStore((store) => store.dismissOnboardingGuide);
  const setGuideCollapsed = useGameStore((store) => store.setGuideCollapsed);
  const view = getOnboardingView(gameState, ui, onboarding, config);
  const scenario = getScenarioDefinition(config.scenarios, gameState.scenarioId);
  const showRoadHint = !view.tutorialComplete && view.activeObjectiveId === 'select_house';
  const collapsed = onboarding.guideCollapsed;

  if (!view.showGuide) {
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
        <div className={styles.headerActions}>
          <button
            type="button"
            className={styles.dismissLink}
            data-testid="dismiss-onboarding-guide"
            onClick={dismissOnboardingGuide}
          >
            Don&apos;t show again
          </button>
          <button
            type="button"
            className={styles.collapseButton}
            aria-expanded={!collapsed}
            aria-label={collapsed ? 'Expand objectives' : 'Collapse objectives'}
            onClick={() => {
              setGuideCollapsed(!collapsed);
            }}
          >
            {collapsed ? '▲' : '▼'}
          </button>
        </div>
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

          {showRoadHint && (
            <p className={styles.roadHint} data-testid="onboarding-road-hint">
              Buildings need a driveway or access path to South Road. Use Access Path from the
              build menu to reach the back of the lot.
            </p>
          )}

          {view.showScenarioCard && (
            <article className={styles.scenarioCard} data-testid="scenario-objective-card">
              <h2 className={styles.scenarioTitle}>Scenario objective</h2>
              <p className={styles.scenarioBody}>{scenario.objectiveLabel}</p>
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
