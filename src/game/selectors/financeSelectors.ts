import { formatMoney } from '@/game/domain/money';
import {
  calculateConstructionLoanTerms,
  calculateRefinanceCapacity,
  calculateRefinanceTerms,
  canOfferConstructionLoan,
  getTotalDebtPrincipal,
  getTotalMonthlyDebtPayment,
} from '@/game/domain/debt';
import { calculatePropertyValue } from '@/game/domain/propertyValue';
import { hasValidRecoveryActions } from '@/game/domain/recovery';
import { getFinanceWarningView } from '@/game/domain/warnings';
import type { BuildingDefinition, DebtState, GameConfig, GameState } from '@/game/domain/types';

export interface DebtInstrumentView {
  readonly id: string;
  readonly typeLabel: string;
  readonly principalLabel: string;
  readonly originalPrincipalLabel: string;
  readonly monthlyPaymentLabel: string;
  readonly statusLabel: string;
}

export interface FinancePanelView {
  readonly propertyValueLabel: string;
  readonly totalDebtLabel: string;
  readonly monthlyDebtPaymentLabel: string;
  readonly debtInstruments: readonly DebtInstrumentView[];
  readonly refinanceAvailable: boolean;
  readonly refinanceCapacityLabel: string;
  readonly refinancePaymentLabel: string;
  readonly emergencyOfferAvailable: boolean;
  readonly emergencyOfferAmountLabel: string;
  readonly recoveryStillPossible: boolean;
  readonly emptyDebtMessage: string;
}

export interface ConstructionLoanForecastView {
  readonly eligible: boolean;
  readonly equityRequiredLabel: string;
  readonly loanPrincipalLabel: string;
  readonly monthlyPaymentLabel: string;
}

function formatDebtInstrument(instrument: Readonly<DebtState>): DebtInstrumentView {
  return {
    id: instrument.id,
    typeLabel: instrument.type === 'construction_loan' ? 'Construction loan' : 'Refinance',
    principalLabel: formatMoney(instrument.principal),
    originalPrincipalLabel: formatMoney(instrument.originalPrincipal),
    monthlyPaymentLabel: instrument.paymentsActive
      ? formatMoney(instrument.monthlyPayment)
      : 'Starts after completion',
    statusLabel: instrument.paymentsActive ? 'Payments active' : 'Construction phase',
  };
}

export function getFinancePanelView(
  state: Readonly<GameState>,
  config: Readonly<GameConfig>,
): FinancePanelView {
  const propertyValue = calculatePropertyValue(state, config, config.balance);
  const refinanceCapacity = calculateRefinanceCapacity(state, config);
  const refinanceTerms = calculateRefinanceTerms(state, config, refinanceCapacity);
  const emergencyAmount = config.balance.emergencyInvestorOfferAmount;

  return {
    propertyValueLabel: formatMoney(propertyValue),
    totalDebtLabel: formatMoney(getTotalDebtPrincipal(state)),
    monthlyDebtPaymentLabel: formatMoney(getTotalMonthlyDebtPayment(state)),
    debtInstruments: state.debt.map(formatDebtInstrument),
    refinanceAvailable: !state.counters.refinanceUsed && refinanceCapacity > 0,
    refinanceCapacityLabel: formatMoney(refinanceCapacity),
    refinancePaymentLabel: formatMoney(refinanceTerms.monthlyPayment),
    emergencyOfferAvailable: state.cash < 0 && !state.counters.emergencyOfferUsed,
    emergencyOfferAmountLabel: formatMoney(emergencyAmount),
    recoveryStillPossible: hasValidRecoveryActions(state, config),
    emptyDebtMessage: 'This property has no active debt.',
  };
}

export function getConstructionLoanForecastView(
  state: Readonly<GameState>,
  config: Readonly<GameConfig>,
  definition: Readonly<BuildingDefinition>,
): ConstructionLoanForecastView {
  const eligible = canOfferConstructionLoan(definition, state, config.balance);
  const terms = calculateConstructionLoanTerms(definition.constructionCost, config.balance);

  return {
    eligible,
    equityRequiredLabel: formatMoney(terms.equityRequired),
    loanPrincipalLabel: formatMoney(terms.loanPrincipal),
    monthlyPaymentLabel: formatMoney(terms.monthlyPayment),
  };
}

export { getFinanceWarningView };
