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

export const ONBOARDING_OBJECTIVES: readonly OnboardingObjective[] = [
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

export interface OnboardingProgress {
  readonly completedObjectiveIds: readonly OnboardingObjectiveId[];
  readonly keepDecisionMade: boolean;
  readonly reportReadAfterFirstMonth: boolean;
  readonly tutorialComplete: boolean;
  readonly scenarioCardDismissed: boolean;
}

export function createInitialOnboardingProgress(): OnboardingProgress {
  return {
    completedObjectiveIds: [],
    keepDecisionMade: false,
    reportReadAfterFirstMonth: false,
    tutorialComplete: false,
    scenarioCardDismissed: false,
  };
}

export interface OnboardingContext {
  readonly selectedBuildingId: string | null;
  readonly selectedBuildingDefinitionId: string | null;
  readonly month: number;
  readonly hasMonthlyReport: boolean;
  readonly reportDrawerOpen: boolean;
  readonly keepDecisionMade: boolean;
  readonly reportReadAfterFirstMonth: boolean;
  readonly starterHouseRenovated: boolean;
}

function isStarterHouseSelected(context: OnboardingContext): boolean {
  return context.selectedBuildingDefinitionId === 'existing_house';
}

export function isObjectiveComplete(
  objectiveId: OnboardingObjectiveId,
  context: OnboardingContext,
): boolean {
  switch (objectiveId) {
    case 'select_house':
      return isStarterHouseSelected(context);
    case 'review_condition':
      return isStarterHouseSelected(context);
    case 'keep_or_renovate':
      return context.keepDecisionMade || context.starterHouseRenovated;
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
