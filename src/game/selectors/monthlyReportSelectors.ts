import { calculateMonthlyEconomy } from '@/game/domain/economy';
import { formatMoney } from '@/game/domain/money';
import { getFinanceWarningView } from '@/game/domain/warnings';
import { getOccupancyWarningView } from '@/game/domain/occupancyWarnings';
import { getWinProgressView, type WinConditionProgress } from '@/game/domain/winLoss';
import { getLatestMonthlyLedgerEntry } from '@/game/selectors/propertySelectors';
import type {
  GameConfig,
  GameState,
  LedgerLine,
  MonthlyLedgerEntry,
  OccupancyLedgerChange,
} from '@/game/domain/types';

export interface MonthlyReportLineView {
  readonly id: string;
  readonly label: string;
  readonly amountLabel: string;
  readonly tone: 'positive' | 'negative' | 'neutral';
}

export interface MonthlyReportOccupancyView {
  readonly id: string;
  readonly label: string;
  readonly detail: string | null;
  readonly tone: 'positive' | 'negative' | 'neutral';
}

export interface MonthlyReportDemandView {
  readonly id: string;
  readonly label: string;
  readonly tone: 'positive' | 'negative' | 'neutral';
}

export interface MonthlyReportWarningView {
  readonly id: string;
  readonly label: string;
  readonly tone: 'negative' | 'neutral';
}

export interface MonthlyReportHealthView {
  readonly label: string;
  readonly deltaLabel: string | null;
  readonly tone: 'positive' | 'negative' | 'neutral';
}

export interface MonthlyReportView {
  readonly hasReport: boolean;
  readonly month: number;
  readonly openingCashLabel: string;
  readonly closingCashLabel: string;
  readonly netCashFlowLabel: string;
  readonly grossRentLabel: string;
  readonly operatingExpensesLabel: string;
  readonly summary: string;
  readonly lines: readonly MonthlyReportLineView[];
  readonly occupancyChanges: readonly MonthlyReportOccupancyView[];
  readonly demandChanges: readonly MonthlyReportDemandView[];
  readonly warnings: readonly MonthlyReportWarningView[];
  readonly propertyHealth: MonthlyReportHealthView | null;
  readonly winConditions: readonly WinConditionProgress[];
  readonly winStableMonthsLabel: string | null;
}

function formatLedgerLine(line: Readonly<LedgerLine>): MonthlyReportLineView {
  return {
    id: line.id,
    label: line.label,
    amountLabel: formatMoney(line.amount),
    tone: line.amount > 0 ? 'positive' : line.amount < 0 ? 'negative' : 'neutral',
  };
}

function sumDebtPayments(lines: readonly LedgerLine[]): number {
  return lines
    .filter((line) => line.category === 'debt_payment')
    .reduce((total, line) => total + line.amount, 0);
}

function formatFactorSummary(
  factors: Readonly<OccupancyLedgerChange['residentialTopFactors']>,
): string {
  if (!factors || factors.length === 0) {
    return '';
  }

  return factors.map((factor) => `${factor.key} ${String(factor.value)}`).join(', ');
}

function formatOccupancyChange(
  change: Readonly<OccupancyLedgerChange>,
): MonthlyReportOccupancyView {
  const parts: string[] = [];

  if (change.residentialDelta !== 0) {
    const sign = change.residentialDelta > 0 ? '+' : '';
    parts.push(
      `${sign}${String(change.residentialDelta)} resident${Math.abs(change.residentialDelta) === 1 ? '' : 's'}`,
    );
  }

  if (change.retailDelta !== 0) {
    const sign = change.retailDelta > 0 ? '+' : '';
    parts.push(
      `${sign}${String(change.retailDelta)} retail unit${Math.abs(change.retailDelta) === 1 ? '' : 's'}`,
    );
  }

  const deltaTotal = change.residentialDelta + change.retailDelta;
  let detail: string | null = null;

  if (change.residentialDelta < 0 && change.residentialLeasingScore !== undefined) {
    const factors = formatFactorSummary(change.residentialTopFactors);
    detail = `Leasing score ${String(change.residentialLeasingScore)} (below move-out threshold ${String(change.moveOutThreshold ?? 45)})`;
    if (factors) {
      detail += `. Top factors: ${factors}`;
    }
  } else if (change.retailDelta < 0 && change.retailLeasingScore !== undefined) {
    const factors = formatFactorSummary(change.retailTopFactors);
    detail = `Retail leasing score ${String(change.retailLeasingScore)} (below move-out threshold ${String(change.moveOutThreshold ?? 45)})`;
    if (factors) {
      detail += `. Top factors: ${factors}`;
    }
  } else if (deltaTotal > 0) {
    detail = 'Leasing score met the move-in threshold this month.';
  }

  return {
    id: `${change.buildingId}-${parts.join('-')}`,
    label: `${change.buildingName}: ${parts.join(', ')}`,
    detail,
    tone: deltaTotal > 0 ? 'positive' : deltaTotal < 0 ? 'negative' : 'neutral',
  };
}

function buildDemandChanges(entry: Readonly<MonthlyLedgerEntry>): MonthlyReportDemandView[] {
  if (!entry.demandChange) {
    return [];
  }

  const changes: MonthlyReportDemandView[] = [];
  const residentialDelta =
    entry.demandChange.residentialDemand - entry.demandChange.previousResidentialDemand;
  const retailDelta = entry.demandChange.retailDemand - entry.demandChange.previousRetailDemand;

  if (residentialDelta !== 0) {
    const sign = residentialDelta > 0 ? '+' : '';
    changes.push({
      id: 'residential-demand',
      label: `Residential demand ${sign}${String(residentialDelta)} (${String(entry.demandChange.previousResidentialDemand)} → ${String(entry.demandChange.residentialDemand)})`,
      tone: residentialDelta > 0 ? 'positive' : 'negative',
    });
  }

  if (retailDelta !== 0) {
    const sign = retailDelta > 0 ? '+' : '';
    changes.push({
      id: 'retail-demand',
      label: `Retail demand ${sign}${String(retailDelta)} (${String(entry.demandChange.previousRetailDemand)} → ${String(entry.demandChange.retailDemand)})`,
      tone: retailDelta > 0 ? 'positive' : 'negative',
    });
  }

  return changes;
}

function buildPropertyHealthView(
  entry: Readonly<MonthlyLedgerEntry>,
): MonthlyReportHealthView | null {
  if (!entry.propertyHealthSnapshot) {
    return null;
  }

  const previousScore = entry.previousPropertyHealthSnapshot?.score;
  const delta =
    previousScore !== undefined ? entry.propertyHealthSnapshot.score - previousScore : null;

  return {
    label: `Property health ${String(entry.propertyHealthSnapshot.score)} (occupancy ${String(entry.propertyHealthSnapshot.occupancyPercent)}%)`,
    deltaLabel:
      delta === null
        ? null
        : delta === 0
          ? 'unchanged'
          : delta > 0
            ? `+${String(delta)}`
            : String(delta),
    tone: delta === null || delta === 0 ? 'neutral' : delta > 0 ? 'positive' : 'negative',
  };
}

function buildSummary(entry: Readonly<MonthlyLedgerEntry>): string {
  const debtPayments = sumDebtPayments(entry.lines);
  const occupancySuffix =
    entry.occupancyChanges && entry.occupancyChanges.length > 0
      ? ` ${String(entry.occupancyChanges.length)} leasing change${entry.occupancyChanges.length === 1 ? '' : 's'}.`
      : '';

  if (entry.netCashFlow >= 0) {
    const debtSuffix = debtPayments < 0 ? ` and ${formatMoney(-debtPayments)} debt payments` : '';
    return `Month ${String(entry.month)} closed with ${formatMoney(entry.netCashFlow)} net cash flow after ${formatMoney(entry.grossRent)} rent and ${formatMoney(entry.operatingExpenses)} operating expenses${debtSuffix}.${occupancySuffix}`;
  }

  const debtSuffix =
    debtPayments < 0 ? ` Debt payments totaled ${formatMoney(-debtPayments)}.` : '';

  return `Month ${String(entry.month)} closed with ${formatMoney(entry.netCashFlow)} net cash flow. Review operating expenses (${formatMoney(entry.operatingExpenses)}) against rent collected (${formatMoney(entry.grossRent)}).${debtSuffix}${occupancySuffix}`;
}

function buildWarnings(
  state: Readonly<GameState>,
  config: Readonly<GameConfig>,
): MonthlyReportWarningView[] {
  const warnings: MonthlyReportWarningView[] = [];
  const financeWarning = getFinanceWarningView(state, config);
  const occupancyWarning = getOccupancyWarningView(state, config);

  if (financeWarning) {
    warnings.push({
      id: 'finance-warning',
      label: `${financeWarning.title}: ${financeWarning.message}`,
      tone: 'negative',
    });
  }

  if (occupancyWarning) {
    warnings.push({
      id: 'occupancy-warning',
      label: `${occupancyWarning.title}: ${occupancyWarning.message}`,
      tone: 'negative',
    });
  }

  return warnings;
}

export function getMonthlyReportView(
  state: Readonly<GameState>,
  config: Readonly<GameConfig>,
): MonthlyReportView {
  const entry = getLatestMonthlyLedgerEntry(state);

  if (!entry) {
    const projected = calculateMonthlyEconomy(state, config, config.balance, 'projected-report');
    const projectedNet = projected.grossRent - projected.operatingExpenses;
    const projectedHint =
      projected.grossRent > 0
        ? ` Projected net ~${formatMoney(projectedNet)}/mo from current occupancy.`
        : '';

    return {
      hasReport: false,
      month: state.month,
      openingCashLabel: '—',
      closingCashLabel: '—',
      netCashFlowLabel: '—',
      grossRentLabel: '—',
      operatingExpensesLabel: '—',
      summary: `Advance one month to begin the property ledger.${projectedHint}`,
      lines: [],
      occupancyChanges: [],
      demandChanges: [],
      warnings: [],
      propertyHealth: null,
      winConditions: getWinProgressView(state, config, config.balance, undefined).conditions,
      winStableMonthsLabel: null,
    };
  }

  const winView = getWinProgressView(state, config, config.balance, entry.netCashFlow);

  return {
    hasReport: true,
    month: entry.month,
    openingCashLabel: formatMoney(entry.openingCash),
    closingCashLabel: formatMoney(entry.closingCash),
    netCashFlowLabel: formatMoney(entry.netCashFlow),
    grossRentLabel: formatMoney(entry.grossRent),
    operatingExpensesLabel: formatMoney(entry.operatingExpenses),
    summary: buildSummary(entry),
    lines: entry.lines.map(formatLedgerLine),
    occupancyChanges: (entry.occupancyChanges ?? []).map(formatOccupancyChange),
    demandChanges: buildDemandChanges(entry),
    warnings: buildWarnings(state, config),
    propertyHealth: buildPropertyHealthView(entry),
    winConditions: winView.conditions,
    winStableMonthsLabel: `${String(winView.consecutiveMonths)}/${String(winView.requiredMonths)} stable months`,
  };
}

export function getMonthlyReportStripLabel(state: Readonly<GameState>): string {
  const entry = getLatestMonthlyLedgerEntry(state);
  if (!entry) {
    return 'Advance one month to begin the property ledger.';
  }

  const occupancyCount = entry.occupancyChanges?.length ?? 0;
  const occupancySuffix =
    occupancyCount > 0
      ? ` · ${String(occupancyCount)} leasing change${occupancyCount === 1 ? '' : 's'}`
      : '';

  const healthSuffix = entry.propertyHealthSnapshot
    ? ` · Health ${String(entry.propertyHealthSnapshot.score)}`
    : '';

  return `Month ${String(entry.month)}: ${formatMoney(entry.netCashFlow)} net cash flow${occupancySuffix}${healthSuffix}`;
}
