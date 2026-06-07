import { assertWholeDollars } from '@/game/domain/money';
import { calculatePropertyValue } from '@/game/domain/propertyValue';
import type {
  BalanceAssumptions,
  BuildingDefinition,
  DebtState,
  GameConfig,
  GameState,
  LedgerLine,
} from '@/game/domain/types';

export interface ConstructionLoanTerms {
  readonly equityRequired: number;
  readonly loanPrincipal: number;
  readonly monthlyPayment: number;
}

export interface RefinanceTerms {
  readonly maxProceeds: number;
  readonly monthlyPayment: number;
}

export interface DebtPaymentResult {
  readonly state: GameState;
  readonly lines: readonly LedgerLine[];
}

export function getTotalDebtPrincipal(state: Readonly<GameState>): number {
  return state.debt.reduce((total, instrument) => total + instrument.principal, 0);
}

export function getTotalMonthlyDebtPayment(state: Readonly<GameState>): number {
  return state.debt.reduce(
    (total, instrument) => total + (instrument.paymentsActive ? instrument.monthlyPayment : 0),
    0,
  );
}

export function hasActiveConstructionLoan(state: Readonly<GameState>): boolean {
  return state.debt.some(
    (instrument) => instrument.type === 'construction_loan' && instrument.principal > 0,
  );
}

export function canOfferConstructionLoan(
  definition: Readonly<BuildingDefinition>,
  state: Readonly<GameState>,
  balance: Readonly<BalanceAssumptions>,
): boolean {
  return (
    definition.constructionCost >= balance.constructionLoanMinProjectCost &&
    !hasActiveConstructionLoan(state)
  );
}

export function calculateConstructionLoanTerms(
  totalCost: number,
  balance: Readonly<BalanceAssumptions>,
): ConstructionLoanTerms {
  const normalizedCost = assertWholeDollars(totalCost, 'totalCost');
  const equityRequired = assertWholeDollars(
    Math.round((normalizedCost * balance.constructionLoanEquityPercent) / 100),
    'equityRequired',
  );
  const loanPrincipal = assertWholeDollars(
    normalizedCost - equityRequired,
    'constructionLoanPrincipal',
  );
  const monthlyPayment = assertWholeDollars(
    Math.ceil(loanPrincipal / balance.constructionLoanTermMonths),
    'constructionLoanMonthlyPayment',
  );

  return {
    equityRequired,
    loanPrincipal,
    monthlyPayment,
  };
}

export function calculateRefinanceCapacity(
  state: Readonly<GameState>,
  config: Readonly<GameConfig>,
): number {
  const balance = config.balance;
  const propertyValue = calculatePropertyValue(state, config, balance);
  const maxBorrowing = assertWholeDollars(
    Math.round((propertyValue * balance.refinanceMaxLtvPercent) / 100),
    'maxBorrowing',
  );
  const existingPrincipal = getTotalDebtPrincipal(state);

  return assertWholeDollars(Math.max(0, maxBorrowing - existingPrincipal), 'refinanceCapacity');
}

export function calculateRefinanceTerms(
  state: Readonly<GameState>,
  config: Readonly<GameConfig>,
  requestedProceeds?: number,
): RefinanceTerms {
  const maxProceeds = calculateRefinanceCapacity(state, config);
  const proceeds =
    requestedProceeds === undefined
      ? maxProceeds
      : assertWholeDollars(Math.min(requestedProceeds, maxProceeds), 'refinanceProceeds');
  const monthlyPayment = assertWholeDollars(
    Math.round((proceeds * config.balance.refinancePaymentPer1000Principal) / 1000),
    'refinanceMonthlyPayment',
  );

  return { maxProceeds, monthlyPayment };
}

export function createConstructionLoanDebt(
  debtId: string,
  projectId: string,
  terms: Readonly<ConstructionLoanTerms>,
): DebtState {
  return {
    id: debtId,
    type: 'construction_loan',
    principal: terms.loanPrincipal,
    originalPrincipal: terms.loanPrincipal,
    monthlyPayment: terms.monthlyPayment,
    projectId,
    paymentsActive: false,
  };
}

export function createRefinanceDebt(
  debtId: string,
  proceeds: number,
  monthlyPayment: number,
): DebtState {
  return {
    id: debtId,
    type: 'refinance',
    principal: proceeds,
    originalPrincipal: proceeds,
    monthlyPayment,
    paymentsActive: true,
  };
}

export function activateConstructionLoanPayments(
  state: Readonly<GameState>,
  projectId: string,
): GameState {
  return {
    ...state,
    debt: state.debt.map((instrument) =>
      instrument.type === 'construction_loan' && instrument.projectId === projectId
        ? { ...instrument, paymentsActive: true }
        : instrument,
    ),
  };
}

export function applyDebtPayment(instrument: Readonly<DebtState>): DebtState | null {
  if (!instrument.paymentsActive || instrument.principal <= 0) {
    return instrument;
  }

  const payment = Math.min(instrument.monthlyPayment, instrument.principal);
  const nextPrincipal = instrument.principal - payment;

  if (nextPrincipal <= 0) {
    return null;
  }

  return {
    ...instrument,
    principal: nextPrincipal,
  };
}

export function processMonthlyDebtPayments(
  state: Readonly<GameState>,
  entryId: string,
  lineIndexStart: number,
): DebtPaymentResult {
  const lines: LedgerLine[] = [];
  let nextCash = state.cash;
  let lineIndex = lineIndexStart;
  const nextDebt: DebtState[] = [];

  for (const instrument of state.debt) {
    if (!instrument.paymentsActive || instrument.principal <= 0) {
      nextDebt.push(instrument);
      continue;
    }

    const payment = Math.min(instrument.monthlyPayment, instrument.principal);
    nextCash -= payment;
    lines.push({
      id: `${entryId}-line-${String(lineIndex)}`,
      category: 'debt_payment',
      label:
        instrument.type === 'construction_loan'
          ? 'Construction loan payment'
          : 'Refinance debt payment',
      amount: -payment,
      projectId: instrument.projectId,
    });
    lineIndex += 1;

    const updatedInstrument = applyDebtPayment(instrument);
    if (updatedInstrument) {
      nextDebt.push(updatedInstrument);
    }
  }

  return {
    state: {
      ...state,
      cash: nextCash,
      debt: nextDebt,
    },
    lines,
  };
}
