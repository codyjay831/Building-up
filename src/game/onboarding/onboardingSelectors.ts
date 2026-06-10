import { getScenarioDefinition, getTutorialBuildingDefinitionId } from '@/game/config/scenario';
import { getLatestMonthlyLedgerEntry } from '@/game/selectors/propertySelectors';
import type { GameConfig, GameState } from '@/game/domain/types';
import type { UiState } from '@/game/store/storeTypes';

import {
  buildOnboardingContextFromState,
  createInitialOnboardingProgress,
  deriveCompletedObjectiveIds,
  getActiveObjectiveId,
  getOnboardingObjectivesForScenario,
  isTutorialComplete,
  type OnboardingObjective,
  type OnboardingObjectiveId,
  type OnboardingProgress,
} from '@/game/onboarding/objectives';

export interface OnboardingView {
  readonly progress: OnboardingProgress;
  readonly objectives: readonly OnboardingObjective[];
  readonly completedObjectiveIds: readonly OnboardingObjectiveId[];
  readonly activeObjectiveId: OnboardingObjectiveId | null;
  readonly activeObjective: OnboardingObjective | null;
  readonly tutorialComplete: boolean;
  readonly showScenarioCard: boolean;
  readonly showGuide: boolean;
}

function isTutorialBuildingRenovated(gameState: GameState, config: GameConfig): boolean {
  const scenario = getScenarioDefinition(config.scenarios, gameState.scenarioId);
  const tutorialDefinitionId = getTutorialBuildingDefinitionId(scenario);

  return gameState.buildings.some(
    (building) => building.definitionId === tutorialDefinitionId && building.renovated,
  );
}

function buildOnboardingContext(
  gameState: GameState,
  ui: UiState,
  progress: OnboardingProgress,
  config: GameConfig,
) {
  const selectedBuilding = ui.selectedBuildingId
    ? gameState.buildings.find((building) => building.id === ui.selectedBuildingId)
    : undefined;
  const scenario = getScenarioDefinition(config.scenarios, gameState.scenarioId);

  return buildOnboardingContextFromState(scenario, {
    selectedBuildingId: ui.selectedBuildingId,
    selectedBuildingDefinitionId: selectedBuilding?.definitionId ?? null,
    month: gameState.month,
    hasMonthlyReport: getLatestMonthlyLedgerEntry(gameState) !== undefined,
    reportDrawerOpen: ui.reportDrawerOpen,
    keepDecisionMade: progress.keepDecisionMade,
    reportReadAfterFirstMonth: progress.reportReadAfterFirstMonth,
    tutorialInspectorOpened: progress.tutorialInspectorOpened,
    tutorialBuildingRenovated: isTutorialBuildingRenovated(gameState, config),
  });
}

export function getOnboardingView(
  gameState: GameState,
  ui: UiState,
  progress: OnboardingProgress,
  config: GameConfig,
): OnboardingView {
  const scenario = getScenarioDefinition(config.scenarios, gameState.scenarioId);
  const context = buildOnboardingContext(gameState, ui, progress, config);
  const objectives = getOnboardingObjectivesForScenario(scenario);
  const completedObjectiveIds = deriveCompletedObjectiveIds(context);
  const activeObjectiveId = getActiveObjectiveId(completedObjectiveIds);
  const tutorialComplete = isTutorialComplete(completedObjectiveIds);

  const showScenarioCard = tutorialComplete && !progress.scenarioCardDismissed;
  const showGuide =
    !progress.guideDisabled && (!tutorialComplete || showScenarioCard);

  return {
    progress: {
      ...progress,
      completedObjectiveIds,
      tutorialComplete,
    },
    objectives,
    completedObjectiveIds,
    activeObjectiveId,
    activeObjective: objectives.find((objective) => objective.id === activeObjectiveId) ?? null,
    tutorialComplete,
    showScenarioCard,
    showGuide,
  };
}

export { createInitialOnboardingProgress };
