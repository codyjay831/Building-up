import { getBuildingDefinition } from '@/game/config/buildings';
import { validatePlacement } from '@/game/domain/placement';
import { canRelocateBuilding } from '@/game/domain/progression';
import type {
  CommandResult,
  CommandRuleFailure,
  GameConfig,
  GameState,
  PlacedFootprint,
} from '@/game/domain/types';

export interface RelocateBuildingCommand {
  readonly buildingId: string;
  readonly footprint: PlacedFootprint;
}

function commandFailure(reason: CommandRuleFailure['reason'], message: string): CommandRuleFailure {
  return { ok: false, reason, message };
}

export function relocateBuilding(
  state: Readonly<GameState>,
  config: Readonly<GameConfig>,
  command: RelocateBuildingCommand,
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

  if (!canRelocateBuilding(state, config, building)) {
    return {
      ok: false,
      error: commandFailure(
        'building_not_redevelopable',
        'This building cannot be moved right now',
      ),
    };
  }

  const definition = getBuildingDefinition(config.buildings, building.definitionId);
  const validation = validatePlacement({
    state,
    config,
    definition,
    footprint: command.footprint,
    ignoreBuildingId: building.id,
    purpose: 'relocate',
  });

  if (!validation.ok) {
    return { ok: false, error: validation };
  }

  return {
    ok: true,
    events: [],
    state: {
      ...state,
      buildings: state.buildings.map((candidate) =>
        candidate.id === building.id
          ? {
              ...candidate,
              footprint: command.footprint,
            }
          : candidate,
      ),
    },
  };
}
