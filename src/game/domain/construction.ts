import { getBuildingDefinition } from '@/game/config/buildings';
import { getConstructionFinanceEra } from '@/game/config/constructionFinance';
import { getCalendarYear } from '@/game/domain/calendar';
import {
  activateConstructionLoanPayments,
  calculateConstructionLoanTerms,
  calculateNextLoanDisbursement,
  chargeConstructionLoanInterest,
  disburseConstructionLoanFunds,
} from '@/game/domain/debt';
import {
  addMoney,
  assertWholeDollars,
  subtractMoney,
} from '@/game/domain/money';
import { calculateParkingAfterBuild } from '@/game/domain/parking';
import type {
  BuildingDefinition,
  ConstructionProject,
  DomainEvent,
  ForecastRisk,
  GameConfig,
  GameState,
  ProjectForecast,
} from '@/game/domain/types';

export { calculateParkingAfterBuild } from '@/game/domain/parking';

export const CANCEL_BEFORE_ADVANCE_RECOVERY_RATIO = 0.8;
export const CANCEL_DURING_CONSTRUCTION_RECOVERY_RATIO = 0.35;
export const MINIMUM_POST_COMMIT_RESERVE = 10_000;

export interface ConstructionAdvanceLine {
  readonly projectId: string;
  readonly label: string;
  readonly amount: number;
  readonly category: 'construction_loan_interest';
}

export interface ConstructionAdvanceResult {
  readonly state: GameState;
  readonly events: readonly DomainEvent[];
  readonly advanceLines: readonly ConstructionAdvanceLine[];
}

export function getCashDueAtCommit(totalCost: number): number {
  return assertWholeDollars(totalCost, 'cashDueAtCommit');
}

export function getCommitmentDeposit(definition: Readonly<BuildingDefinition>): number {
  return getCashDueAtCommit(definition.constructionCost);
}

export function calculateCompletionMonth(currentMonth: number, constructionMonths: number): number {
  return currentMonth + constructionMonths;
}

export function hasAdvancedConstructionMonth(project: Readonly<ConstructionProject>): boolean {
  return project.monthsRemaining < project.buildDurationMonths;
}

export function canCancelBeforeFirstAdvancement(project: Readonly<ConstructionProject>): boolean {
  return project.status === 'under_construction' && !hasAdvancedConstructionMonth(project);
}

export function calculateCancellationRefund(project: Readonly<ConstructionProject>): number {
  if (canCancelBeforeFirstAdvancement(project)) {
    return assertWholeDollars(
      Math.round(project.depositPaid * CANCEL_BEFORE_ADVANCE_RECOVERY_RATIO),
      'refund',
    );
  }

  const unspent = subtractMoney(project.totalCost, project.amountSpent);
  return assertWholeDollars(
    Math.round(unspent * CANCEL_DURING_CONSTRUCTION_RECOVERY_RATIO),
    'refund',
  );
}

export function buildProjectForecast(
  state: Readonly<GameState>,
  config: Readonly<GameConfig>,
  definitionId: string,
  footprint: ProjectForecast['footprint'],
): ProjectForecast {
  const definition = getBuildingDefinition(config.buildings, definitionId);
  const calendarYear = getCalendarYear(state, config);
  const era = getConstructionFinanceEra(config.constructionFinanceEras, calendarYear);
  const loanTerms = calculateConstructionLoanTerms(
    definition.constructionCost,
    era,
    config.balance,
    definition.constructionMonths,
  );
  const parkingAfterBuild = calculateParkingAfterBuild(state, config, definition);
  const risks: ForecastRisk[] = [];
  const cashDueNow = getCashDueAtCommit(definition.constructionCost);
  const cashAfterCommit = subtractMoney(state.cash, cashDueNow);

  if (cashAfterCommit < MINIMUM_POST_COMMIT_RESERVE) {
    risks.push({
      code: 'insufficient_reserve',
      message: `Cash reserve after commitment would fall below ${String(MINIMUM_POST_COMMIT_RESERVE)}`,
    });
  }

  if (parkingAfterBuild.demand > parkingAfterBuild.capacity) {
    risks.push({
      code: 'parking_shortage',
      message: 'Parking demand exceeds capacity after this build',
    });
  }

  const loanEligible =
    definition.constructionCost >= era.minProjectCost &&
    !state.debt.some(
      (instrument) =>
        instrument.type === 'construction_loan' && !instrument.paymentsActive,
    );

  return {
    definitionId,
    footprint,
    totalCost: definition.constructionCost,
    cashDueNow,
    completionMonth: calculateCompletionMonth(state.month, definition.constructionMonths),
    buildDurationMonths: definition.constructionMonths,
    parkingAfterBuild,
    risks,
    constructionLoan: {
      eligible: loanEligible,
      equityRequired: loanTerms.equityRequired,
      loanPrincipal: loanTerms.loanPrincipal,
      monthlyPaymentAfterCompletion: loanTerms.monthlyPayment,
      annualInterestRate: loanTerms.annualInterestRate,
      estimatedFirstMonthInterest: loanTerms.estimatedFirstMonthInterest,
      estimatedPeakMonthInterest: loanTerms.estimatedPeakMonthInterest,
    },
  };
}

export function completeConstructionProject(
  state: Readonly<GameState>,
  project: Readonly<ConstructionProject>,
): GameState {
  let nextState: GameState = {
    ...state,
    buildings: state.buildings.map((building) =>
      building.id === project.buildingId
        ? {
            ...building,
            lifecycleState: 'leasing',
          }
        : building,
    ),
    projects: state.projects.map((activeProject) =>
      activeProject.id === project.id
        ? {
            ...activeProject,
            status: 'completed',
            monthsRemaining: 0,
          }
        : activeProject,
    ),
  };

  if (project.financedWithLoan) {
    nextState = activateConstructionLoanPayments(nextState, project.id);
  }

  return nextState;
}

export function processConstructionDraws(
  state: Readonly<GameState>,
  config: Readonly<GameConfig>,
): ConstructionAdvanceResult {
  let nextState = state;
  const events: DomainEvent[] = [];
  const advanceLines: ConstructionAdvanceLine[] = [];

  for (const project of state.projects) {
    if (project.status !== 'under_construction' || project.monthsRemaining <= 0) {
      continue;
    }

    const definition = getBuildingDefinition(config.buildings, project.definitionId);
    let interestPaid = 0;
    let disbursed = 0;

    if (project.financedWithLoan && project.loanDebtId) {
      const loanDebt = nextState.debt.find((instrument) => instrument.id === project.loanDebtId);

      if (!loanDebt || loanDebt.type !== 'construction_loan') {
        continue;
      }

      const disbursement = calculateNextLoanDisbursement(
        loanDebt,
        project.buildDurationMonths,
        project.monthsRemaining,
      );

      if (disbursement > 0) {
        nextState = disburseConstructionLoanFunds(nextState, loanDebt.id, disbursement);
        disbursed = disbursement;
      }

      const updatedDebt = nextState.debt.find((instrument) => instrument.id === loanDebt.id);

      if (updatedDebt) {
        const interestResult = chargeConstructionLoanInterest(
          nextState,
          updatedDebt,
          definition.name,
        );
        nextState = interestResult.state;
        interestPaid = interestResult.interestPaid;

        if (interestPaid > 0) {
          advanceLines.push({
            projectId: project.id,
            label: interestResult.label,
            amount: -interestPaid,
            category: 'construction_loan_interest',
          });
        }
      }
    }

    nextState = {
      ...nextState,
      projects: nextState.projects.map((activeProject) =>
        activeProject.id === project.id
          ? {
              ...activeProject,
              monthsRemaining: activeProject.monthsRemaining - 1,
              amountSpent: addMoney(activeProject.amountSpent, disbursed),
            }
          : activeProject,
      ),
    };

    const updatedProject = nextState.projects.find(
      (activeProject) => activeProject.id === project.id,
    );

    if (!updatedProject) {
      continue;
    }

    events.push({
      type: 'ConstructionAdvanced',
      projectId: project.id,
      interestPaid,
      disbursed,
      monthsRemaining: updatedProject.monthsRemaining,
    });

    if (updatedProject.monthsRemaining === 0) {
      nextState = completeConstructionProject(nextState, updatedProject);
      events.push({
        type: 'ConstructionCompleted',
        projectId: project.id,
        buildingId: project.buildingId,
      });
    }
  }

  return { state: nextState, events, advanceLines };
}
