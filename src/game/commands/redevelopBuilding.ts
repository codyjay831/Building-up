import { getBuildingDefinition } from '@/game/config/buildings';
import { appendTransactionLedgerEntry, createLedgerLine } from '@/game/domain/ledger';
import { hasSufficientCash } from '@/game/domain/money';
import { canSellOrDemolishBuilding, getBuildingByIdOrThrow } from '@/game/domain/progression';
import { validateBuildingRemoval } from '@/game/domain/roadAccessValidation';
import { calculateBuildingSaleProceeds, calculateDemolitionCost } from '@/game/domain/valuation';
import type { CommandResult, CommandRuleFailure, GameConfig, GameState } from '@/game/domain/types';

export interface DemolishBuildingCommand {
  readonly buildingId: string;
}

function commandFailure(reason: CommandRuleFailure['reason'], message: string): CommandRuleFailure {
  return { ok: false, reason, message };
}

export function demolishBuilding(
  state: Readonly<GameState>,
  config: Readonly<GameConfig>,
  command: DemolishBuildingCommand,
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

  if (!canSellOrDemolishBuilding(state, config, building)) {
    return {
      ok: false,
      error: commandFailure(
        'building_not_redevelopable',
        'This building cannot be demolished right now',
      ),
    };
  }

  const definition = getBuildingDefinition(config.buildings, building.definitionId);

  const removalValidation = validateBuildingRemoval(state, config, command.buildingId);

  if (!removalValidation.ok) {
    return { ok: false, error: removalValidation };
  }

  const cost = calculateDemolitionCost(definition, config.balance);

  if (!hasSufficientCash(state.cash, cost)) {
    return {
      ok: false,
      error: commandFailure(
        'insufficient_cash',
        `Insufficient cash for demolition. Required ${String(cost)}, available ${String(state.cash)}`,
      ),
    };
  }

  const entryId = `ledger-${String(state.month)}-${String(state.ledger.length + 1)}`;
  const withLedger = appendTransactionLedgerEntry(state, [
    createLedgerLine(entryId, 0, 'demolition_cost', `${definition.name} — demolition`, -cost, {
      buildingId: building.id,
    }),
  ]);

  return {
    ok: true,
    events: [],
    state: {
      ...withLedger.state,
      buildings: withLedger.state.buildings.filter((candidate) => candidate.id !== building.id),
      projects: withLedger.state.projects.filter((project) => project.buildingId !== building.id),
    },
  };
}

export interface SellBuildingCommand {
  readonly buildingId: string;
}

export function sellBuilding(
  state: Readonly<GameState>,
  config: Readonly<GameConfig>,
  command: SellBuildingCommand,
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

  if (!canSellOrDemolishBuilding(state, config, building)) {
    return {
      ok: false,
      error: commandFailure('building_not_redevelopable', 'This building cannot be sold right now'),
    };
  }

  const definition = getBuildingDefinition(config.buildings, building.definitionId);

  const removalValidation = validateBuildingRemoval(state, config, command.buildingId);

  if (!removalValidation.ok) {
    return { ok: false, error: removalValidation };
  }

  const proceeds = calculateBuildingSaleProceeds(building, definition, config.balance);

  const entryId = `ledger-${String(state.month)}-${String(state.ledger.length + 1)}`;
  const withLedger = appendTransactionLedgerEntry(state, [
    createLedgerLine(entryId, 0, 'sale_proceeds', `${definition.name} — sale proceeds`, proceeds, {
      buildingId: building.id,
    }),
  ]);

  return {
    ok: true,
    events: [],
    state: {
      ...withLedger.state,
      buildings: withLedger.state.buildings.filter((candidate) => candidate.id !== building.id),
      projects: withLedger.state.projects.filter((project) => project.buildingId !== building.id),
    },
  };
}

export { getBuildingByIdOrThrow };
