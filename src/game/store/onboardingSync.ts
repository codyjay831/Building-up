import { getScenarioDefinition, getTutorialBuildingDefinitionId } from '@/game/config/scenario';
import { getOnboardingView } from '@/game/onboarding/onboardingSelectors';
import {
  buildOnboardingContextFromState,
  shouldMarkReportRead,
  type OnboardingProgress,
} from '@/game/onboarding/objectives';
import { saveOnboardingProgress } from '@/game/onboarding/onboardingStorage';
import { autosaveGameState } from '@/game/persistence/storage';
import { getLatestMonthlyLedgerEntry } from '@/game/selectors/propertySelectors';
import { runStoreSoundEffect } from '@/game/store/storeEffects';
import type { GameStoreState } from '@/game/store/storeTypes';
import type { PersistenceMeta, UiState } from '@/game/store/storeTypes';
import type { GameConfig, GameState } from '@/game/domain/types';

export function syncOnboardingProgress(
  gameState: GameState,
  ui: UiState,
  onboarding: OnboardingProgress,
  config: GameConfig,
): OnboardingProgress {
  const view = getOnboardingView(gameState, ui, onboarding, config);
  const nextProgress: OnboardingProgress = {
    ...onboarding,
    completedObjectiveIds: view.completedObjectiveIds,
    tutorialComplete: view.tutorialComplete,
  };

  if (nextProgress.tutorialComplete !== onboarding.tutorialComplete) {
    saveOnboardingProgress(nextProgress);
  }

  return nextProgress;
}

export function maybeMarkReportRead(
  gameState: GameState,
  ui: UiState,
  onboarding: OnboardingProgress,
  config: GameConfig,
): OnboardingProgress {
  const scenario = getScenarioDefinition(config.scenarios, gameState.scenarioId);
  const tutorialDefinitionId = getTutorialBuildingDefinitionId(scenario);
  const context = buildOnboardingContextFromState(scenario, {
    selectedBuildingId: ui.selectedBuildingId,
    selectedBuildingDefinitionId:
      gameState.buildings.find((building) => building.id === ui.selectedBuildingId)?.definitionId ??
      null,
    month: gameState.month,
    hasMonthlyReport: getLatestMonthlyLedgerEntry(gameState) !== undefined,
    reportDrawerOpen: ui.reportDrawerOpen,
    keepDecisionMade: onboarding.keepDecisionMade,
    reportReadAfterFirstMonth: onboarding.reportReadAfterFirstMonth,
    tutorialInspectorOpened: onboarding.tutorialInspectorOpened,
    tutorialBuildingRenovated: gameState.buildings.some(
      (building) => building.definitionId === tutorialDefinitionId && building.renovated,
    ),
  });

  if (!shouldMarkReportRead(context)) {
    return onboarding;
  }

  const nextProgress: OnboardingProgress = {
    ...onboarding,
    reportReadAfterFirstMonth: true,
  };
  saveOnboardingProgress(nextProgress);
  return nextProgress;
}

export function persistAutosave(
  gameState: GameState,
  previous: PersistenceMeta,
  playSound = true,
): PersistenceMeta {
  const result = autosaveGameState(gameState);

  if (!result.ok) {
    return {
      ...previous,
      saveStatus: 'error',
      lastSaveError: result.error,
    };
  }

  if (playSound) {
    runStoreSoundEffect('save_completed');
  }

  return {
    ...previous,
    saveStatus: 'saved',
    lastSavedAt: result.savedAt,
    lastSaveError: null,
  };
}

export function applyGameStateUpdate(
  store: GameStoreState,
  gameState: GameState,
  uiPatch?: Partial<UiState>,
): Partial<GameStoreState> {
  const ui = uiPatch ? { ...store.ui, ...uiPatch } : store.ui;
  const onboarding = syncOnboardingProgress(
    gameState,
    ui,
    maybeMarkReportRead(gameState, ui, store.onboarding, store.config),
    store.config,
  );

  return {
    gameState,
    ui,
    onboarding,
    persistence: persistAutosave(gameState, store.persistence),
    lastCommandError: null,
  };
}
