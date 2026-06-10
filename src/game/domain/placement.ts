import { getBuildingDefinition } from '@/game/config/buildings';
import { getFootprintTiles, footprintWithinLot } from '@/game/domain/grid';
import { getCommitmentDeposit } from '@/game/domain/construction';
import { hasSufficientCash } from '@/game/domain/money';
import {
  simulateBuildingsAfterPlacement,
  validateRoadAccessPlacement,
} from '@/game/domain/roadAccessValidation';
import type {
  BuildingDefinition,
  GameConfig,
  GameState,
  PlaceStructureResult,
  PlacedFootprint,
  PlacementFailure,
  PlacementFailureReason,
} from '@/game/domain/types';

function failure(reason: PlacementFailureReason, message: string): PlacementFailure {
  return { ok: false, reason, message };
}

export interface ValidatePlacementInput {
  readonly state: Readonly<GameState>;
  readonly config: Readonly<GameConfig>;
  readonly definition: BuildingDefinition;
  readonly footprint: PlacedFootprint;
  readonly ignoreBuildingId?: string;
  readonly purpose?: 'place' | 'relocate';
  readonly minimumCashRequired?: number;
  readonly skipCashCheck?: boolean;
}

export function validatePlacement(input: ValidatePlacementInput): PlacementFailure | { ok: true } {
  const {
    state,
    config,
    definition,
    footprint,
    ignoreBuildingId,
    purpose = 'place',
    minimumCashRequired,
    skipCashCheck = false,
  } = input;
  const scenario = config.scenarios.get(state.scenarioId);

  if (!scenario) {
    return failure('building_locked', `Unknown scenario ${state.scenarioId}`);
  }

  if (purpose === 'place') {
    if (!definition.enabledInMvp) {
      return failure('building_locked', `${definition.name} is not enabled in the MVP`);
    }

    if (state.approval.level < definition.approvalRequired) {
      return failure(
        'insufficient_approval',
        `${definition.name} requires Approval Level ${String(definition.approvalRequired)}`,
      );
    }

    if (!skipCashCheck) {
      const requiredCash = minimumCashRequired ?? getCommitmentDeposit(definition);

      if (!hasSufficientCash(state.cash, requiredCash)) {
        return failure(
          'insufficient_cash',
          `Insufficient cash for ${definition.name} commitment. Required ${String(requiredCash)}, available ${String(state.cash)}`,
        );
      }
    }
  }

  if (!footprintWithinLot(footprint, state.lot)) {
    return failure('out_of_bounds', 'Footprint extends outside the lot');
  }

  for (const tile of getFootprintTiles(footprint)) {
    const blockedByBuilding = state.buildings.some((building) => {
      if (ignoreBuildingId && building.id === ignoreBuildingId) {
        return false;
      }

      return getFootprintTiles(building.footprint).some(
        (occupied) => occupied.x === tile.x && occupied.y === tile.y,
      );
    });

    if (blockedByBuilding) {
      return failure('tile_occupied', 'Footprint overlaps an existing structure');
    }

    const blockedByProject = state.projects.some((project) =>
      getFootprintTiles(project.footprint).some(
        (occupied) => occupied.x === tile.x && occupied.y === tile.y,
      ),
    );

    if (blockedByProject) {
      return failure('construction_overlap', 'Footprint overlaps an active construction project');
    }

    const blockedByDriveway = state.lot.drivewayTiles.some(
      (drivewayTile) => drivewayTile.x === tile.x && drivewayTile.y === tile.y,
    );

    if (blockedByDriveway) {
      return failure('access_tile_blocked', 'Footprint overlaps the driveway');
    }
  }

  const buildingsForCheck = ignoreBuildingId
    ? state.buildings.filter((building) => building.id !== ignoreBuildingId)
    : state.buildings;

  const buildingsAfter = simulateBuildingsAfterPlacement(
    state,
    footprint,
    definition.id,
    ignoreBuildingId,
  );

  const roadAccessValidation = validateRoadAccessPlacement(
    state,
    config,
    definition,
    footprint,
    buildingsForCheck,
    buildingsAfter,
  );

  if (!roadAccessValidation.ok) {
    return roadAccessValidation;
  }

  return { ok: true };
}

export function placeStructure(
  state: Readonly<GameState>,
  config: Readonly<GameConfig>,
  definitionId: string,
  footprint: PlacedFootprint,
): PlaceStructureResult {
  const definition = getBuildingDefinition(config.buildings, definitionId);
  const validation = validatePlacement({ state, config, definition, footprint });

  if (!validation.ok) {
    return validation;
  }

  const buildingId = `building-${state.counters.nextBuildingSequence.toString()}`;

  return {
    ok: true,
    buildingId,
    state: {
      ...state,
      buildings: [
        ...state.buildings,
        {
          id: buildingId,
          definitionId: definition.id,
          footprint,
          lifecycleState: 'planned',
          condition: 100,
          residentialOccupied: 0,
          retailOccupied: 0,
          rentPosture: 'market',
          renovated: false,
        },
      ],
      counters: {
        ...state.counters,
        nextBuildingSequence: state.counters.nextBuildingSequence + 1,
      },
    },
  };
}

export function listPlacementFailures(
  state: Readonly<GameState>,
  config: Readonly<GameConfig>,
  definitionId: string,
  footprint: PlacedFootprint,
): readonly PlacementFailure[] {
  const definition = getBuildingDefinition(config.buildings, definitionId);
  const validation = validatePlacement({ state, config, definition, footprint });

  if (validation.ok) {
    return [];
  }

  return [validation];
}
