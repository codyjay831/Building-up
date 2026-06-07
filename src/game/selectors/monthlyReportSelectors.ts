import { formatMoney } from '@/game/domain/money';
import { getLatestMonthlyLedgerEntry } from '@/game/selectors/propertySelectors';
import type { GameState, LedgerLine, MonthlyLedgerEntry, OccupancyLedgerChange } from '@/game/domain/types';

export interface MonthlyReportLineView {
  readonly id: string;
  readonly label: string;
  readonly amountLabel: string;
  readonly tone: 'positive' | 'negative' | 'neutral';
}

export interface MonthlyReportOccupancyView {
  readonly id: string;
  readonly label: string;
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

function formatOccupancyChange(change: Readonly<OccupancyLedgerChange>): MonthlyReportOccupancyView {
  const parts: string[] = [];

  if (change.residentialDelta !== 0) {
    const sign = change.residentialDelta > 0 ? '+' : '';
    parts.push(`${sign}${String(change.residentialDelta)} resident${Math.abs(change.residentialDelta) === 1 ? '' : 's'}`);
  }

  if (change.retailDelta !== 0) {
    const sign = change.retailDelta > 0 ? '+' : '';
    parts.push(`${sign}${String(change.retailDelta)} retail unit${Math.abs(change.retailDelta) === 1 ? '' : 's'}`);
  }

  const deltaTotal = change.residentialDelta + change.retailDelta;

  return {
    id: `${change.buildingId}-${parts.join('-')}`,
    label: `${change.buildingName}: ${parts.join(', ')}`,
    tone: deltaTotal > 0 ? 'positive' : deltaTotal < 0 ? 'negative' : 'neutral',
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

export function getMonthlyReportView(state: Readonly<GameState>): MonthlyReportView {
  const entry = getLatestMonthlyLedgerEntry(state);

  if (!entry) {
    return {
      hasReport: false,
      month: state.month,
      openingCashLabel: '—',
      closingCashLabel: '—',
      netCashFlowLabel: '—',
      grossRentLabel: '—',
      operatingExpensesLabel: '—',
      summary: 'Advance one month to begin the property ledger.',
      lines: [],
      occupancyChanges: [],
    };
  }

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

  return `Month ${String(entry.month)}: ${formatMoney(entry.netCashFlow)} net cash flow${occupancySuffix}`;
}
