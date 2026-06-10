import { addMoney, assertWholeDollars, sumMoney } from '@/game/domain/money';
import type {
  DemandLedgerChange,
  GameState,
  LedgerLine,
  LedgerLineCategory,
  MonthlyLedgerEntry,
  OccupancyLedgerChange,
  PropertyHealthLedgerSnapshot,
} from '@/game/domain/types';

export function createLedgerLineId(entryId: string, index: number): string {
  return `${entryId}-line-${String(index)}`;
}

export function createLedgerLine(
  entryId: string,
  index: number,
  category: LedgerLineCategory,
  label: string,
  amount: number,
  refs?: { readonly buildingId?: string; readonly projectId?: string },
): LedgerLine {
  return {
    id: createLedgerLineId(entryId, index),
    category,
    label,
    amount: assertWholeDollars(amount, 'ledger line amount'),
    buildingId: refs?.buildingId,
    projectId: refs?.projectId,
  };
}

function createLedgerEntryId(state: Readonly<GameState>, month: number): string {
  return `ledger-${String(month)}-${String(state.ledger.length + 1)}`;
}

export function appendTransactionLedgerEntry(
  state: Readonly<GameState>,
  lines: readonly LedgerLine[],
): { readonly state: GameState; readonly entry: MonthlyLedgerEntry } {
  const netCashFlow = sumMoney(lines.map((line) => line.amount));
  const openingCash = state.cash;
  const closingCash = addMoney(openingCash, netCashFlow);
  const entryId = createLedgerEntryId(state, state.month);
  const entry: MonthlyLedgerEntry = {
    id: entryId,
    month: state.month,
    kind: 'transaction',
    openingCash,
    closingCash,
    netCashFlow,
    lines: lines.map((line, index) =>
      line.id === createLedgerLineId(entryId, index)
        ? line
        : { ...line, id: createLedgerLineId(entryId, index) },
    ),
    grossRent: 0,
    operatingExpenses: 0,
  };

  return {
    state: {
      ...state,
      cash: closingCash,
      ledger: [...state.ledger, entry],
    },
    entry,
  };
}

export function appendMonthlyLedgerEntry(
  state: Readonly<GameState>,
  month: number,
  openingCash: number,
  lines: readonly LedgerLine[],
  totals: {
    readonly grossRent: number;
    readonly operatingExpenses: number;
    readonly occupancyChanges?: readonly OccupancyLedgerChange[];
    readonly demandChange?: DemandLedgerChange;
    readonly propertyHealthSnapshot?: PropertyHealthLedgerSnapshot;
    readonly previousPropertyHealthSnapshot?: PropertyHealthLedgerSnapshot;
  },
): { readonly state: GameState; readonly entry: MonthlyLedgerEntry } {
  const netCashFlow = sumMoney(lines.map((line) => line.amount));
  const closingCash = addMoney(openingCash, netCashFlow);
  const entryId = createLedgerEntryId({ ...state, month }, month);
  const entry: MonthlyLedgerEntry = {
    id: entryId,
    month,
    kind: 'monthly',
    openingCash,
    closingCash,
    netCashFlow,
    lines: lines.map((line, index) => ({
      ...line,
      id: createLedgerLineId(entryId, index),
    })),
    grossRent: totals.grossRent,
    operatingExpenses: totals.operatingExpenses,
    occupancyChanges:
      totals.occupancyChanges && totals.occupancyChanges.length > 0
        ? totals.occupancyChanges
        : undefined,
    demandChange: totals.demandChange,
    propertyHealthSnapshot: totals.propertyHealthSnapshot,
    previousPropertyHealthSnapshot: totals.previousPropertyHealthSnapshot,
  };

  return {
    state: {
      ...state,
      cash: closingCash,
      ledger: [...state.ledger, entry],
    },
    entry,
  };
}

export function reconcileLedgerEntry(entry: Readonly<MonthlyLedgerEntry>): boolean {
  const lineTotal = sumMoney(entry.lines.map((line) => line.amount));
  return (
    lineTotal === entry.netCashFlow &&
    addMoney(entry.openingCash, entry.netCashFlow) === entry.closingCash
  );
}
