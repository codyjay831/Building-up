import {
  createInitialOnboardingProgress,
  type OnboardingProgress,
} from '@/game/onboarding/objectives';

const ONBOARDING_STORAGE_KEY = 'vpm:onboarding';

export function loadOnboardingProgress(): OnboardingProgress {
  if (typeof localStorage === 'undefined') {
    return createInitialOnboardingProgress();
  }

  const raw = localStorage.getItem(ONBOARDING_STORAGE_KEY);

  if (!raw) {
    return createInitialOnboardingProgress();
  }

  try {
    const parsed = JSON.parse(raw) as Partial<OnboardingProgress>;
    const initial = createInitialOnboardingProgress();

    return {
      completedObjectiveIds: parsed.completedObjectiveIds ?? initial.completedObjectiveIds,
      keepDecisionMade: parsed.keepDecisionMade ?? initial.keepDecisionMade,
      reportReadAfterFirstMonth:
        parsed.reportReadAfterFirstMonth ?? initial.reportReadAfterFirstMonth,
      tutorialInspectorOpened: parsed.tutorialInspectorOpened ?? initial.tutorialInspectorOpened,
      tutorialComplete: parsed.tutorialComplete ?? initial.tutorialComplete,
      scenarioCardDismissed: parsed.scenarioCardDismissed ?? initial.scenarioCardDismissed,
      guideDisabled: parsed.guideDisabled ?? initial.guideDisabled,
      guideCollapsed: parsed.guideCollapsed ?? initial.guideCollapsed,
    };
  } catch {
    return createInitialOnboardingProgress();
  }
}

export function saveOnboardingProgress(progress: OnboardingProgress): void {
  if (typeof localStorage === 'undefined') {
    return;
  }

  localStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify(progress));
}

export function resetOnboardingProgress(): OnboardingProgress {
  const progress = createInitialOnboardingProgress();
  saveOnboardingProgress(progress);
  return progress;
}
