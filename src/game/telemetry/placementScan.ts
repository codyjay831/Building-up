import { getBuildingDefinition } from '@/game/config/buildings';
import { validatePlacement } from '@/game/domain/placement';
import type {
  BuildingDefinition,
  GameConfig,
  GameState,
  PlacedFootprint,
} from '@/game/domain/types';

function buildFootprint(
  definition: BuildingDefinition,
  originX: number,
  originY: number,
): PlacedFootprint {
  return {
    origin: { x: originX, y: originY },
    width: definition.footprint.width,
    height: definition.footprint.height,
    rotation: 0,
  };
}

function listValidPlacements(
  state: Readonly<GameState>,
  config: Readonly<GameConfig>,
  definitionId: string,
): PlacedFootprint[] {
  const definition = getBuildingDefinition(config.buildings, definitionId);
  const placements: PlacedFootprint[] = [];

  for (let y = 0; y < state.lot.height; y += 1) {
    for (let x = 0; x < state.lot.width; x += 1) {
      const footprint = buildFootprint(definition, x, y);
      const validation = validatePlacement({
        state,
        config,
        definition,
        footprint,
        skipCashCheck: true,
      });

      if (validation.ok) {
        placements.push(footprint);
      }
    }
  }

  return placements;
}

export function findValidPlacement(
  state: Readonly<GameState>,
  config: Readonly<GameConfig>,
  definitionId: string,
): PlacedFootprint | null {
  return listValidPlacements(state, config, definitionId)[0] ?? null;
}

export function findValidPlacementPreservingFutureBuild(
  state: Readonly<GameState>,
  config: Readonly<GameConfig>,
  definitionId: string,
  futureDefinitionId: string,
): PlacedFootprint | null {
  const candidates = listValidPlacements(state, config, definitionId);
  const futureDefinition = getBuildingDefinition(config.buildings, futureDefinitionId);

  for (const footprint of candidates) {
    const simulatedState: GameState = {
      ...state,
      approval: {
        ...state.approval,
        level: Math.max(state.approval.level, futureDefinition.approvalRequired),
      },
      buildings: [
        ...state.buildings,
        {
          id: 'placement-scan-probe',
          definitionId,
          footprint,
          lifecycleState: 'under_construction',
          condition: 100,
          residentialOccupied: 0,
          retailOccupied: 0,
          rentPosture: 'market',
          renovated: false,
        },
      ],
    };

    for (let y = 0; y < simulatedState.lot.height; y += 1) {
      for (let x = 0; x < simulatedState.lot.width; x += 1) {
        const futureFootprint = buildFootprint(futureDefinition, x, y);
      const validation = validatePlacement({
        state: simulatedState,
        config,
        definition: futureDefinition,
        footprint: futureFootprint,
        skipCashCheck: true,
      });

        if (validation.ok) {
          return footprint;
        }
      }
    }
  }

  return candidates[0] ?? null;
}
