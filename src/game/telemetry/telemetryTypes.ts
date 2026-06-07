import type { GameStatus } from '@/game/domain/types';

export const BALANCE_QUALITY_TARGETS = {
  approval2MonthMin: 7,
  approval2MonthMax: 12,
  mixedUseCompletionMin: 12,
  mixedUseCompletionMax: 20,
  maxConsecutiveIdleTurns: 3,
} as const;

export interface MonthlyTelemetrySnapshot {
  readonly month: number;
  readonly cash: number;
  readonly approvalLevel: number;
  readonly occupancyPercent: number;
  readonly appeal: number;
  readonly totalDebt: number;
  readonly warningLevel: string;
  readonly hadDecision: boolean;
}

export interface RunTelemetry {
  readonly seed: string;
  readonly strategy: string;
  readonly finalStatus: GameStatus;
  readonly monthsPlayed: number;
  readonly monthsToApproval2: number | null;
  readonly monthsToFirstMixedUseStart: number | null;
  readonly monthsToFirstMixedUseComplete: number | null;
  readonly idleTurnCount: number;
  readonly maxConsecutiveIdleTurns: number;
  readonly warningCount: number;
  readonly lowestCash: number;
  readonly peakDebt: number;
  readonly averageOccupancy: number;
  readonly averageAppeal: number;
  readonly buildingChoices: readonly string[];
  readonly firstBuildingChoice: string | null;
  readonly outcomeMonth: number | null;
  readonly monthlySnapshots: readonly MonthlyTelemetrySnapshot[];
}

export interface BalanceFinding {
  readonly id: string;
  readonly severity: 'pass' | 'warn' | 'fail';
  readonly message: string;
}

export interface BalanceAdjustmentReport {
  readonly generatedAt: string;
  readonly runs: readonly RunTelemetry[];
  readonly findings: readonly BalanceFinding[];
  readonly recommendations: readonly string[];
  readonly passesAcceptance: boolean;
}

export interface TelemetryExportBundle {
  readonly version: 1;
  readonly exportedAt: string;
  readonly currentRun: RunTelemetry | null;
  readonly balanceReport: BalanceAdjustmentReport;
}
