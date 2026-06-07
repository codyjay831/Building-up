import { getBuildingDefinition } from '@/game/config/buildings';
import { canCancelBeforeFirstAdvancement, getNextDrawAmount } from '@/game/domain/construction';
import { formatMoney } from '@/game/domain/money';
import type { ConstructionProject, GameConfig, GameState } from '@/game/domain/types';

export interface ConstructionProgressView {
  readonly project: ConstructionProject;
  readonly buildingName: string;
  readonly monthsRemaining: number;
  readonly totalMonths: number;
  readonly progressPercent: number;
  readonly nextDrawLabel: string;
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
  const totalMonths = project.monthlyDraws.length;
  const completedMonths = totalMonths - project.monthsRemaining;
  const progressPercent =
    totalMonths === 0 ? 100 : Math.round((completedMonths / totalMonths) * 100);
  const nextDraw = getNextDrawAmount(project);

  return {
    project,
    buildingName: definition.name,
    monthsRemaining: project.monthsRemaining,
    totalMonths,
    progressPercent,
    nextDrawLabel: nextDraw > 0 ? formatMoney(nextDraw) : '—',
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
