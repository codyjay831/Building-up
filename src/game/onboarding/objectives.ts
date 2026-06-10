import type { ScenarioDefinition } from '@/game/domain/types';
import { getTutorialBuildingDefinitionId } from '@/game/config/scenario';

export const ONBOARDING_OBJECTIVE_IDS = [
  'select_house',
  'review_condition',
  'keep_or_renovate',
  'advance_month',
  'read_report',
] as const;

export type OnboardingObjectiveId = (typeof ONBOARDING_OBJECTIVE_IDS)[number];

export interface OnboardingObjective {
  readonly id: OnboardingObjectiveId;
  readonly title: string;
  readonly description: string;
}

const DEFAULT_ONBOARDING_OBJECTIVES: readonly OnboardingObjective[] = [
  {
    id: 'select_house',
    title: 'Select the existing house',
    description: 'Click the starter house on the property board to inspect it.',
  },
  {
    id: 'review_condition',
    title: 'Review condition and rent',
    description: 'Check the condition score, occupancy, and rent posture in the inspector.',
  },
  {
    id: 'keep_or_renovate',
    title: 'Choose Keep or Renovate',
    description: 'Decide whether to keep the house as-is or start a renovation.',
  },
  {
    id: 'advance_month',
    title: 'Advance one month',
    description: 'Use Next Month to run the first monthly simulation.',
  },
  {
    id: 'read_report',
    title: 'Read the monthly report',
    description: 'Open the monthly report drawer and review income, expenses, and net cash flow.',
  },
];

export const ONBOARDING_OBJECTIVES = DEFAULT_ONBOARDING_OBJECTIVES;

export function getOnboardingObjectivesForScenario(
  scenario: ScenarioDefinition,
): readonly OnboardingObjective[] {
  const copyOverrides = scenario.onboardingObjectiveCopy;

  if (!copyOverrides) {
    return DEFAULT_ONBOARDING_OBJECTIVES;
  }

  return DEFAULT_ONBOARDING_OBJECTIVES.map((objective) => {
    const override = copyOverrides[objective.id as keyof typeof copyOverrides];

    if (!override) {
      return objective;
    }

    return {
      ...objective,
      title: override.title,
      description: override.description,
    };
  });
}

export interface OnboardingProgress {
  readonly completedObjectiveIds: readonly OnboardingObjectiveId[];
  readonly keepDecisionMade: boolean;
  readonly reportReadAfterFirstMonth: boolean;
  readonly tutorialInspectorOpened: boolean;
  readonly tutorialComplete: boolean;
  readonly scenarioCardDismissed: boolean;
  readonly guideDisabled: boolean;
  readonly guideCollapsed: boolean;
}

export function createInitialOnboardingProgress(): OnboardingProgress {
  return {
    completedObjectiveIds: [],
    keepDecisionMade: false,
    reportReadAfterFirstMonth: false,
    tutorialInspectorOpened: false,
    tutorialComplete: false,
    scenarioCardDismissed: false,
    guideDisabled: false,
    guideCollapsed: false,
  };
}

export interface OnboardingContext {
  readonly selectedBuildingId: string | null;
  readonly selectedBuildingDefinitionId: string | null;
  readonly tutorialBuildingDefinitionId: string;
  readonly month: number;
  readonly hasMonthlyReport: boolean;
  readonly reportDrawerOpen: boolean;
  readonly keepDecisionMade: boolean;
  readonly reportReadAfterFirstMonth: boolean;
  readonly tutorialInspectorOpened: boolean;
  readonly tutorialBuildingRenovated: boolean;
}

function isTutorialBuildingSelected(context: OnboardingContext): boolean {
  return context.selectedBuildingDefinitionId === context.tutorialBuildingDefinitionId;
}

export function isObjectiveComplete(
  objectiveId: OnboardingObjectiveId,
  context: OnboardingContext,
): boolean {
  switch (objectiveId) {
    case 'select_house':
      return isTutorialBuildingSelected(context);
    case 'review_condition':
      return context.tutorialInspectorOpened;
    case 'keep_or_renovate':
      return context.keepDecisionMade || context.tutorialBuildingRenovated;
    case 'advance_month':
      return context.month >= 2;
    case 'read_report':
      return context.reportReadAfterFirstMonth;
    default:
      return false;
  }
}

export function deriveCompletedObjectiveIds(context: OnboardingContext): OnboardingObjectiveId[] {
  return ONBOARDING_OBJECTIVE_IDS.filter((objectiveId) =>
    isObjectiveComplete(objectiveId, context),
  );
}

export function getActiveObjectiveId(
  completedObjectiveIds: readonly OnboardingObjectiveId[],
): OnboardingObjectiveId | null {
  return (
    ONBOARDING_OBJECTIVE_IDS.find((objectiveId) => !completedObjectiveIds.includes(objectiveId)) ??
    null
  );
}

export function isTutorialComplete(
  completedObjectiveIds: readonly OnboardingObjectiveId[],
): boolean {
  return ONBOARDING_OBJECTIVE_IDS.every((objectiveId) =>
    completedObjectiveIds.includes(objectiveId),
  );
}

export function shouldMarkReportRead(context: OnboardingContext): boolean {
  return (
    context.month >= 2 &&
    context.hasMonthlyReport &&
    context.reportDrawerOpen &&
    !context.reportReadAfterFirstMonth
  );
}

export function buildOnboardingContextFromState(
  scenario: ScenarioDefinition,
  params: {
    readonly selectedBuildingId: string | null;
    readonly selectedBuildingDefinitionId: string | null;
    readonly month: number;
    readonly hasMonthlyReport: boolean;
    readonly reportDrawerOpen: boolean;
    readonly keepDecisionMade: boolean;
    readonly reportReadAfterFirstMonth: boolean;
    readonly tutorialInspectorOpened: boolean;
    readonly tutorialBuildingRenovated: boolean;
  },
): OnboardingContext {
  return {
    ...params,
    tutorialBuildingDefinitionId: getTutorialBuildingDefinitionId(scenario),
  };
}
