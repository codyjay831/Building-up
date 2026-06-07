import {
  calculateCancellationRefund,
  canCancelBeforeFirstAdvancement,
} from '@/game/domain/construction';
import { getBuildingDefinition } from '@/game/config/buildings';
import { appendTransactionLedgerEntry, createLedgerLine } from '@/game/domain/ledger';
import type {
  CommandResult,
  CommandRuleFailure,
  DomainEvent,
  GameConfig,
  GameState,
} from '@/game/domain/types';

export interface CancelProjectCommand {
  readonly projectId: string;
}

function failure(reason: CommandRuleFailure['reason'], message: string): CommandRuleFailure {
  return {
    ok: false,
    reason,
    message,
  };
}

export function cancelProject(
  state: Readonly<GameState>,
  config: Readonly<GameConfig>,
  command: CancelProjectCommand,
): CommandResult {
  const project = state.projects.find((activeProject) => activeProject.id === command.projectId);

  if (!project) {
    return {
      ok: false,
      error: failure('project_not_found', `Unknown project ${command.projectId}`),
    };
  }

  if (project.status === 'completed' || project.status === 'cancelled') {
    return {
      ok: false,
      error: failure('project_not_cancellable', 'Completed projects cannot be cancelled'),
    };
  }

  if (!canCancelBeforeFirstAdvancement(project)) {
    return {
      ok: false,
      error: failure(
        'project_not_cancellable',
        'Only projects awaiting the first monthly advancement can be cancelled in Phase 3',
      ),
    };
  }

  const refund = calculateCancellationRefund(project);
  const definition = getBuildingDefinition(config.buildings, project.definitionId);
  const entryId = `ledger-${String(state.month)}-${String(state.ledger.length + 1)}`;
  const events: DomainEvent[] = [
    {
      type: 'ProjectCancelled',
      projectId: project.id,
      refund,
    },
  ];

  const withRefund = appendTransactionLedgerEntry(
    {
      ...state,
      buildings: state.buildings.filter((building) => building.id !== project.buildingId),
      debt: project.financedWithLoan
        ? state.debt.filter((instrument) => instrument.projectId !== project.id)
        : state.debt,
      projects: state.projects.map((activeProject) =>
        activeProject.id === project.id
          ? {
              ...activeProject,
              status: 'cancelled',
              monthsRemaining: 0,
            }
          : activeProject,
      ),
    },
    [
      createLedgerLine(
        entryId,
        0,
        'project_refund',
        `${definition.name} — cancellation refund`,
        refund,
        { projectId: project.id },
      ),
    ],
  );

  return {
    ok: true,
    events,
    state: withRefund.state,
  };
}
