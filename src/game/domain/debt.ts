import { assertWholeDollars } from '@/game/domain/money';
import { calculatePropertyValue } from '@/game/domain/propertyValue';
import type {
  BalanceAssumptions,
  BuildingDefinition,
  ConstructionFinanceEra,
  DebtState,
  GameConfig,
  GameState,
  LedgerLine,
} from '@/game/domain/types';

export interface ConstructionLoanTerms {
  readonly equityRequired: number;
  readonly loanPrincipal: number;
  readonly monthlyPayment: number;
  readonly annualInterestRate: number;
  readonly estimatedFirstMonthInterest: number;
  readonly estimatedPeakMonthInterest: number;
}

export interface RefinanceTerms {
  readonly maxProceeds: number;
  readonly monthlyPayment: number;
}

export interface DebtPaymentResult {
  readonly state: GameState;
  readonly lines: readonly LedgerLine[];
}

export interface ConstructionInterestResult {
  readonly state: GameState;
  readonly interestPaid: number;
  readonly label: string;
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
    (instrument) =>
      instrument.type === 'construction_loan' &&
      !instrument.paymentsActive &&
      instrument.principal > 0,
  );
}

export function canOfferConstructionLoan(
  definition: Readonly<BuildingDefinition>,
  state: Readonly<GameState>,
  era: Readonly<ConstructionFinanceEra>,
): boolean {
  return (
    definition.constructionCost >= era.minProjectCost && !hasActiveConstructionLoan(state)
  );
}

export function calculateConstructionLoanInterest(
  disbursedPrincipal: number,
  annualInterestRate: number,
): number {
  if (disbursedPrincipal <= 0 || annualInterestRate <= 0) {
    return 0;
  }

  return assertWholeDollars(
    Math.round((disbursedPrincipal * annualInterestRate) / 12 / 100),
    'constructionLoanInterest',
  );
}

export function calculateLoanDisbursementSchedule(
  loanPrincipal: number,
  buildDurationMonths: number,
): readonly number[] {
  const normalizedPrincipal = assertWholeDollars(loanPrincipal, 'loanPrincipal');

  if (buildDurationMonths <= 0) {
    return [];
  }

  const disbursements: number[] = [];
  const baseDisbursement = Math.floor(normalizedPrincipal / buildDurationMonths);
  let allocated = 0;

  for (let monthIndex = 0; monthIndex < buildDurationMonths; monthIndex += 1) {
    if (monthIndex === buildDurationMonths - 1) {
      disbursements.push(normalizedPrincipal - allocated);
    } else {
      disbursements.push(baseDisbursement);
      allocated += baseDisbursement;
    }
  }

  return disbursements;
}

export function estimateConstructionInterestRange(
  loanPrincipal: number,
  buildDurationMonths: number,
  annualInterestRate: number,
): { readonly firstMonth: number; readonly peakMonth: number } {
  const schedule = calculateLoanDisbursementSchedule(loanPrincipal, buildDurationMonths);

  if (schedule.length === 0) {
    return { firstMonth: 0, peakMonth: 0 };
  }

  let cumulative = 0;
  let firstMonth = 0;

  for (const [index, disbursement] of schedule.entries()) {
    cumulative += disbursement;
    const interest = calculateConstructionLoanInterest(cumulative, annualInterestRate);

    if (index === 0) {
      firstMonth = interest;
    }
  }

  return {
    firstMonth,
    peakMonth: calculateConstructionLoanInterest(loanPrincipal, annualInterestRate),
  };
}

export function calculateConstructionLoanTerms(
  totalCost: number,
  era: Readonly<ConstructionFinanceEra>,
  balance: Readonly<BalanceAssumptions>,
  buildDurationMonths = 1,
): ConstructionLoanTerms {
  const normalizedCost = assertWholeDollars(totalCost, 'totalCost');
  const equityRequired = assertWholeDollars(
    Math.round((normalizedCost * era.equityPercent) / 100),
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
  const interestRange = estimateConstructionInterestRange(
    loanPrincipal,
    buildDurationMonths,
    era.annualInterestRate,
  );

  return {
    equityRequired,
    loanPrincipal,
    monthlyPayment,
    annualInterestRate: era.annualInterestRate,
    estimatedFirstMonthInterest: interestRange.firstMonth,
    estimatedPeakMonthInterest: interestRange.peakMonth,
  };
}

export function calculateNextLoanDisbursement(
  instrument: Readonly<DebtState>,
  buildDurationMonths: number,
  monthsRemaining: number,
): number {
  if (
    instrument.type !== 'construction_loan' ||
    buildDurationMonths <= 0 ||
    monthsRemaining <= 0
  ) {
    return 0;
  }

  const schedule = calculateLoanDisbursementSchedule(
    instrument.originalPrincipal,
    buildDurationMonths,
  );
  const completedMonths = buildDurationMonths - monthsRemaining;
  const nextDisbursement = schedule[completedMonths] ?? 0;
  const remainingPrincipal = instrument.originalPrincipal - instrument.disbursedPrincipal;

  return Math.min(nextDisbursement, remainingPrincipal);
}

export function disburseConstructionLoanFunds(
  state: Readonly<GameState>,
  debtId: string,
  amount: number,
): GameState {
  const normalizedAmount = assertWholeDollars(amount, 'disbursement');

  if (normalizedAmount <= 0) {
    return state;
  }

  return {
    ...state,
    debt: state.debt.map((instrument) =>
      instrument.id === debtId
        ? {
            ...instrument,
            disbursedPrincipal: instrument.disbursedPrincipal + normalizedAmount,
          }
        : instrument,
    ),
  };
}

export function chargeConstructionLoanInterest(
  state: Readonly<GameState>,
  instrument: Readonly<DebtState>,
  buildingName: string,
): ConstructionInterestResult {
  const interestPaid = calculateConstructionLoanInterest(
    instrument.disbursedPrincipal,
    instrument.annualInterestRate,
  );

  if (interestPaid <= 0) {
    return {
      state,
      interestPaid: 0,
      label: `${buildingName} — construction loan interest`,
    };
  }

  return {
    state: {
      ...state,
      cash: state.cash - interestPaid,
    },
    interestPaid,
    label: `${buildingName} — construction loan interest`,
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
    disbursedPrincipal: 0,
    annualInterestRate: terms.annualInterestRate,
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
    disbursedPrincipal: 0,
    annualInterestRate: 0,
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
