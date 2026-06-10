import { getBuildingDefinition } from '@/game/config/buildings';
import { canCancelBeforeFirstAdvancement } from '@/game/domain/construction';
import {
  calculateConstructionLoanInterest,
  calculateNextLoanDisbursement,
} from '@/game/domain/debt';
import { formatMoney } from '@/game/domain/money';
import type { ConstructionProject, GameConfig, GameState } from '@/game/domain/types';

export interface ConstructionProgressView {
  readonly project: ConstructionProject;
  readonly buildingName: string;
  readonly monthsRemaining: number;
  readonly totalMonths: number;
  readonly progressPercent: number;
  readonly nextInterestLabel: string | null;
  readonly spentLabel: string;
  readonly totalCostLabel: string;
  readonly canCancel: boolean;
}

export function getActiveConstructionProjects(
  state: Readonly<GameState>,
): readonly ConstructionProject[] {
  return state.projects.filter((project) => project.status === 'under_construction');
}

export function getConstructionProgressView(
  state: Readonly<GameState>,
  config: Readonly<GameConfig>,
  projectId: string,
): ConstructionProgressView | undefined {
  const project = state.projects.find((activeProject) => activeProject.id === projectId);

  if (!project || project.status !== 'under_construction') {
    return undefined;
  }

  const definition = getBuildingDefinition(config.buildings, project.definitionId);
  const totalMonths = project.buildDurationMonths;
  const completedMonths = totalMonths - project.monthsRemaining;
  const progressPercent =
    totalMonths === 0 ? 100 : Math.round((completedMonths / totalMonths) * 100);

  let nextInterestLabel: string | null = null;

  if (project.financedWithLoan && project.loanDebtId) {
    const loanDebt = state.debt.find((instrument) => instrument.id === project.loanDebtId);

    if (loanDebt) {
      const nextDisbursement = calculateNextLoanDisbursement(
        loanDebt,
        project.buildDurationMonths,
        project.monthsRemaining,
      );
      const projectedDisbursed = loanDebt.disbursedPrincipal + nextDisbursement;
      const nextInterest = calculateConstructionLoanInterest(
        projectedDisbursed,
        loanDebt.annualInterestRate,
      );
      nextInterestLabel = nextInterest > 0 ? formatMoney(nextInterest) : null;
    }
  }

  return {
    project,
    buildingName: definition.name,
    monthsRemaining: project.monthsRemaining,
    totalMonths,
    progressPercent,
    nextInterestLabel,
    spentLabel: formatMoney(project.amountSpent),
    totalCostLabel: formatMoney(project.totalCost),
    canCancel: canCancelBeforeFirstAdvancement(project),
  };
}

export function getProjectByBuildingId(
  state: Readonly<GameState>,
  buildingId: string,
): ConstructionProject | undefined {
  return state.projects.find((project) => project.buildingId === buildingId);
}
