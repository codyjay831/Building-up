import { getBuildingDefinition } from '@/game/config/buildings';
import { activateConstructionLoanPayments } from '@/game/domain/debt';
import {
  addMoney,
  assertWholeDollars,
  hasSufficientCash,
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

export const COMMITMENT_DEPOSIT_RATIO = 0.25;
export const CANCEL_BEFORE_ADVANCE_RECOVERY_RATIO = 0.8;
export const CANCEL_DURING_CONSTRUCTION_RECOVERY_RATIO = 0.35;
export const MINIMUM_POST_COMMIT_RESERVE = 10_000;

export interface ProjectPaymentSchedule {
  readonly deposit: number;
  readonly monthlyDraws: readonly number[];
}

export interface ConstructionDrawLine {
  readonly projectId: string;
  readonly label: string;
  readonly amount: number;
}

export interface ConstructionAdvanceResult {
  readonly state: GameState;
  readonly events: readonly DomainEvent[];
  readonly drawLines: readonly ConstructionDrawLine[];
}

export function calculateProjectPaymentSchedule(
  totalCost: number,
  constructionMonths: number,
): ProjectPaymentSchedule {
  const normalizedCost = assertWholeDollars(totalCost, 'totalCost');

  if (constructionMonths <= 0) {
    return { deposit: normalizedCost, monthlyDraws: [] };
  }

  const deposit = assertWholeDollars(
    Math.round(normalizedCost * COMMITMENT_DEPOSIT_RATIO),
    'deposit',
  );
  const remaining = subtractMoney(normalizedCost, deposit);
  const monthlyDraws: number[] = [];
  const baseDraw = Math.floor(remaining / constructionMonths);
  let allocated = 0;

  for (let monthIndex = 0; monthIndex < constructionMonths; monthIndex += 1) {
    if (monthIndex === constructionMonths - 1) {
      monthlyDraws.push(subtractMoney(remaining, allocated));
    } else {
      monthlyDraws.push(baseDraw);
      allocated = addMoney(allocated, baseDraw);
    }
  }

  return { deposit, monthlyDraws };
}

export function getCommitmentDeposit(definition: Readonly<BuildingDefinition>): number {
  return calculateProjectPaymentSchedule(definition.constructionCost, definition.constructionMonths)
    .deposit;
}

export function calculateCompletionMonth(currentMonth: number, constructionMonths: number): number {
  return currentMonth + constructionMonths;
}

export function getNextDrawAmount(project: Readonly<ConstructionProject>): number {
  if (project.monthsRemaining <= 0) {
    return 0;
  }

  const drawIndex = project.monthlyDraws.length - project.monthsRemaining;
  return project.monthlyDraws[drawIndex] ?? 0;
}

export function hasAdvancedConstructionMonth(project: Readonly<ConstructionProject>): boolean {
  return project.monthsRemaining < project.monthlyDraws.length;
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
  const schedule = calculateProjectPaymentSchedule(
    definition.constructionCost,
    definition.constructionMonths,
  );
  const parkingAfterBuild = calculateParkingAfterBuild(state, config, definition);
  const risks: ForecastRisk[] = [];
  const cashAfterCommit = subtractMoney(state.cash, schedule.deposit);

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

  return {
    definitionId,
    footprint,
    totalCost: definition.constructionCost,
    cashDueNow: schedule.deposit,
    monthlyDraws: schedule.monthlyDraws,
    completionMonth: calculateCompletionMonth(state.month, definition.constructionMonths),
    buildDurationMonths: definition.constructionMonths,
    parkingAfterBuild,
    risks,
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
  const drawLines: ConstructionDrawLine[] = [];

  for (const project of state.projects) {
    if (project.status !== 'under_construction' || project.monthsRemaining <= 0) {
      continue;
    }

    const drawAmount = getNextDrawAmount(project);

    if (!project.financedWithLoan && !hasSufficientCash(nextState.cash, drawAmount)) {
      continue;
    }

    const definition = getBuildingDefinition(config.buildings, project.definitionId);

    nextState = {
      ...nextState,
      cash: project.financedWithLoan ? nextState.cash : subtractMoney(nextState.cash, drawAmount),
      projects: nextState.projects.map((activeProject) =>
        activeProject.id === project.id
          ? {
              ...activeProject,
              monthsRemaining: activeProject.monthsRemaining - 1,
              amountSpent: addMoney(activeProject.amountSpent, drawAmount),
            }
          : activeProject,
      ),
    };

    drawLines.push({
      projectId: project.id,
      label: `${definition.name} — construction draw`,
      amount: -drawAmount,
    });

    const updatedProject = nextState.projects.find(
      (activeProject) => activeProject.id === project.id,
    );

    if (!updatedProject) {
      continue;
    }

    events.push({
      type: 'ConstructionAdvanced',
      projectId: project.id,
      draw: drawAmount,
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

  return { state: nextState, events, drawLines };
}
