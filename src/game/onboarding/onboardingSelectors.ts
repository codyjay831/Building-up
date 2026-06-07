import { getLatestMonthlyLedgerEntry } from '@/game/selectors/propertySelectors';
import type { GameState } from '@/game/domain/types';
import type { UiState } from '@/game/store/storeTypes';

import {
  ONBOARDING_OBJECTIVES,
  createInitialOnboardingProgress,
  deriveCompletedObjectiveIds,
  getActiveObjectiveId,
  isTutorialComplete,
  type OnboardingContext,
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
}

function buildOnboardingContext(
  gameState: GameState,
  ui: UiState,
  progress: OnboardingProgress,
): OnboardingContext {
  const selectedBuilding = ui.selectedBuildingId
    ? gameState.buildings.find((building) => building.id === ui.selectedBuildingId)
    : undefined;
  const starterHouse = gameState.buildings.find(
    (building) => building.definitionId === 'existing_house',
  );

  return {
    selectedBuildingId: ui.selectedBuildingId,
    selectedBuildingDefinitionId: selectedBuilding?.definitionId ?? null,
    month: gameState.month,
    hasMonthlyReport: getLatestMonthlyLedgerEntry(gameState) !== undefined,
    reportDrawerOpen: ui.reportDrawerOpen,
    keepDecisionMade: progress.keepDecisionMade,
    reportReadAfterFirstMonth: progress.reportReadAfterFirstMonth,
    starterHouseRenovated: starterHouse?.renovated === true,
  };
}

export function getOnboardingView(
  gameState: GameState,
  ui: UiState,
  progress: OnboardingProgress,
): OnboardingView {
  const context = buildOnboardingContext(gameState, ui, progress);
  const completedObjectiveIds = deriveCompletedObjectiveIds(context);
  const activeObjectiveId = getActiveObjectiveId(completedObjectiveIds);
  const tutorialComplete = isTutorialComplete(completedObjectiveIds);

  return {
    progress: {
      ...progress,
      completedObjectiveIds,
      tutorialComplete,
    },
    objectives: ONBOARDING_OBJECTIVES,
    completedObjectiveIds,
    activeObjectiveId,
    activeObjective:
      ONBOARDING_OBJECTIVES.find((objective) => objective.id === activeObjectiveId) ?? null,
    tutorialComplete,
    showScenarioCard: tutorialComplete && !progress.scenarioCardDismissed,
  };
}

export { createInitialOnboardingProgress };
