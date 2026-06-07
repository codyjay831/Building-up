import { getBuildingDefinition } from '@/game/config/buildings';
import { appendTransactionLedgerEntry, createLedgerLine } from '@/game/domain/ledger';
import { hasSufficientCash } from '@/game/domain/money';
import { canRenovateBuilding } from '@/game/domain/progression';
import type { CommandResult, CommandRuleFailure, GameConfig, GameState } from '@/game/domain/types';

export interface RenovateBuildingCommand {
  readonly buildingId: string;
}

function commandFailure(reason: CommandRuleFailure['reason'], message: string): CommandRuleFailure {
  return { ok: false, reason, message };
}

export function renovateBuilding(
  state: Readonly<GameState>,
  config: Readonly<GameConfig>,
  command: RenovateBuildingCommand,
): CommandResult {
  if (state.status !== 'active') {
    return { ok: false, error: commandFailure('game_not_active', 'The run has already ended') };
  }

  const building = state.buildings.find((candidate) => candidate.id === command.buildingId);

  if (!building) {
    return {
      ok: false,
      error: commandFailure('building_not_found', `Building not found: ${command.buildingId}`),
    };
  }

  if (building.renovated) {
    return {
      ok: false,
      error: commandFailure('already_renovated', `${building.id} has already been renovated`),
    };
  }

  if (!canRenovateBuilding(state, building)) {
    return {
      ok: false,
      error: commandFailure(
        'building_not_renovatable',
        'This building cannot be renovated right now',
      ),
    };
  }

  const definition = getBuildingDefinition(config.buildings, building.definitionId);
  const cost = config.balance.renovationCost;

  if (!hasSufficientCash(state.cash, cost)) {
    return {
      ok: false,
      error: commandFailure(
        'insufficient_cash',
        `Insufficient cash for renovation. Required ${String(cost)}, available ${String(state.cash)}`,
      ),
    };
  }

  const entryId = `ledger-${String(state.month)}-${String(state.ledger.length + 1)}`;
  const withLedger = appendTransactionLedgerEntry(state, [
    createLedgerLine(entryId, 0, 'renovation_cost', `${definition.name} — renovation`, -cost, {
      buildingId: building.id,
    }),
  ]);

  return {
    ok: true,
    events: [],
    state: {
      ...withLedger.state,
      buildings: withLedger.state.buildings.map((candidate) =>
        candidate.id === building.id
          ? {
              ...candidate,
              lifecycleState: 'renovating',
            }
          : candidate,
      ),
    },
  };
}
