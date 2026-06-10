import {
  BALANCE_QUALITY_TARGETS,
  type BalanceAdjustmentReport,
  type BalanceFinding,
  type RunTelemetry,
} from '@/game/telemetry/telemetryTypes';

const OPENING_STRATEGIES = ['retail_first', 'residential_first', 'amenity_first'] as const;

function finding(
  id: string,
  severity: BalanceFinding['severity'],
  message: string,
): BalanceFinding {
  return { id, severity, message };
}

function median(values: readonly number[]): number | null {
  if (values.length === 0) {
    return null;
  }

  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 0) {
    return Math.round(((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2);
  }

  return sorted[middle] ?? null;
}

function evaluateViableOpenings(runs: readonly RunTelemetry[]): BalanceFinding[] {
  const openingRuns = runs.filter((run) =>
    OPENING_STRATEGIES.includes(run.strategy as (typeof OPENING_STRATEGIES)[number]),
  );
  const viable = openingRuns.filter((run) => run.finalStatus !== 'lost' && run.monthsPlayed >= 12);
  const uniqueFirstChoices = new Set(
    viable
      .map((run) => run.firstBuildingChoice)
      .filter((choice): choice is string => choice !== null),
  );

  const findings: BalanceFinding[] = [];

  if (viable.length >= 2) {
    findings.push(
      finding(
        'viable_openings',
        'pass',
        `${String(viable.length)} opening strategies remained viable through Month 12 without loss.`,
      ),
    );
  } else {
    findings.push(
      finding(
        'viable_openings',
        'fail',
        `Only ${String(viable.length)} opening strategy remained viable; at least two are required.`,
      ),
    );
  }

  if (uniqueFirstChoices.size >= 2) {
    findings.push(
      finding(
        'opening_diversity',
        'pass',
        `First-build diversity includes ${[...uniqueFirstChoices].join(', ')}.`,
      ),
    );
  } else {
    findings.push(
      finding(
        'opening_diversity',
        'warn',
        'Opening strategies converge on the same first build; review whether one path dominates.',
      ),
    );
  }

  return findings;
}

function evaluateApprovalTiming(runs: readonly RunTelemetry[]): BalanceFinding {
  const approvalMonths = runs
    .map((run) => run.monthsToApproval2)
    .filter((month): month is number => month !== null);
  const medianMonth = median(approvalMonths);

  if (medianMonth === null) {
    return finding(
      'approval_level_2_timing',
      'fail',
      'No smoke run reached Approval Level 2 within the simulation horizon.',
    );
  }

  const { approval2MonthMin, approval2MonthMax } = BALANCE_QUALITY_TARGETS;

  if (medianMonth >= approval2MonthMin && medianMonth <= approval2MonthMax) {
    return finding(
      'approval_level_2_timing',
      'pass',
      `Median Approval Level 2 unlock is Month ${String(medianMonth)} (target ${String(approval2MonthMin)}–${String(approval2MonthMax)}).`,
    );
  }

  if (medianMonth < approval2MonthMin) {
    return finding(
      'approval_level_2_timing',
      'warn',
      `Median Approval Level 2 unlock is Month ${String(medianMonth)}, which is faster than the ${String(approval2MonthMin)}–${String(approval2MonthMax)} target band.`,
    );
  }

  return finding(
    'approval_level_2_timing',
    'warn',
    `Median Approval Level 2 unlock is Month ${String(medianMonth)}, which is slower than the ${String(approval2MonthMin)}–${String(approval2MonthMax)} target band.`,
  );
}

function evaluateMixedUseTiming(runs: readonly RunTelemetry[]): BalanceFinding {
  const completionMonths = runs
    .map((run) => run.monthsToFirstMixedUseComplete)
    .filter((month): month is number => month !== null);
  const medianMonth = median(completionMonths);

  if (medianMonth === null) {
    return finding(
      'mixed_use_completion_timing',
      'fail',
      'No smoke run completed a mixed-use building within the simulation horizon.',
    );
  }

  const { mixedUseCompletionMin, mixedUseCompletionMax } = BALANCE_QUALITY_TARGETS;

  if (medianMonth >= mixedUseCompletionMin && medianMonth <= mixedUseCompletionMax) {
    return finding(
      'mixed_use_completion_timing',
      'pass',
      `Median mixed-use completion is Month ${String(medianMonth)} (target ${String(mixedUseCompletionMin)}–${String(mixedUseCompletionMax)}).`,
    );
  }

  if (medianMonth < mixedUseCompletionMin) {
    return finding(
      'mixed_use_completion_timing',
      'warn',
      `Median mixed-use completion is Month ${String(medianMonth)}, ahead of the ${String(mixedUseCompletionMin)}–${String(mixedUseCompletionMax)} target band.`,
    );
  }

  return finding(
    'mixed_use_completion_timing',
    'warn',
    `Median mixed-use completion is Month ${String(medianMonth)}, slower than the ${String(mixedUseCompletionMin)}–${String(mixedUseCompletionMax)} target band.`,
  );
}

function evaluateIdleTurns(runs: readonly RunTelemetry[]): BalanceFinding {
  const worstIdleStreak = runs.reduce(
    (worst, run) => Math.max(worst, run.maxConsecutiveIdleTurns),
    0,
  );

  if (worstIdleStreak <= BALANCE_QUALITY_TARGETS.maxConsecutiveIdleTurns) {
    return finding(
      'idle_turn_streak',
      'pass',
      `Longest no-decision streak is ${String(worstIdleStreak)} turn(s) (limit ${String(BALANCE_QUALITY_TARGETS.maxConsecutiveIdleTurns)}).`,
    );
  }

  return finding(
    'idle_turn_streak',
    'fail',
    `Longest no-decision streak is ${String(worstIdleStreak)} turns; normal play should stay below four consecutive idle turns.`,
  );
}

function buildRecommendations(findings: readonly BalanceFinding[]): readonly string[] {
  const recommendations: string[] = [];

  for (const item of findings) {
    if (item.id === 'viable_openings' && item.severity !== 'pass') {
      recommendations.push(
        'Review starting cash, construction costs, or first-year operating expenses so retail-first and residential-first paths both survive.',
      );
    }

    if (item.id === 'approval_level_2_timing' && item.severity === 'warn') {
      recommendations.push(
        'Tune approval_2_positive_months, approval_2_cash_reserve, or approval_2_min_condition to land unlocks in the Month 7–12 band.',
      );
    }

    if (item.id === 'mixed_use_completion_timing' && item.severity !== 'pass') {
      recommendations.push(
        'Adjust shop_apartments cost/duration or Approval Level 2 thresholds so mixed-use completion typically lands between Months 12–20.',
      );
    }

    if (item.id === 'idle_turn_streak' && item.severity === 'fail') {
      recommendations.push(
        'Introduce clearer mid-month opportunities such as leasing posture changes, renovation prompts, or forecast shifts to reduce idle streaks.',
      );
    }

    if (item.id === 'opening_diversity' && item.severity === 'warn') {
      recommendations.push(
        'Rebalance corner_shop versus small_house early economics so neither opening dominates every seed.',
      );
    }
  }

  return recommendations;
}

export function buildBalanceAdjustmentReport(
  runs: readonly RunTelemetry[],
): BalanceAdjustmentReport {
  const findings: BalanceFinding[] = [
    ...evaluateViableOpenings(runs),
    evaluateApprovalTiming(runs),
    evaluateMixedUseTiming(runs),
    evaluateIdleTurns(runs),
  ];

  const passesAcceptance = findings.every((item) => item.severity !== 'fail');

  return {
    generatedAt: new Date(0).toISOString(),
    runs,
    findings,
    recommendations: buildRecommendations(findings),
    passesAcceptance,
  };
}

export function buildBalanceAdjustmentReportAt(
  runs: readonly RunTelemetry[],
  generatedAt: string,
): BalanceAdjustmentReport {
  return {
    ...buildBalanceAdjustmentReport(runs),
    generatedAt,
  };
}
