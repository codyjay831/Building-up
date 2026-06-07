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

export function findValidPlacement(
  state: Readonly<GameState>,
  config: Readonly<GameConfig>,
  definitionId: string,
): PlacedFootprint | null {
  const definition = getBuildingDefinition(config.buildings, definitionId);

  for (let y = 0; y < state.lot.height; y += 1) {
    for (let x = 0; x < state.lot.width; x += 1) {
      const footprint = buildFootprint(definition, x, y);
      const validation = validatePlacement({ state, config, definition, footprint });

      if (validation.ok) {
        return footprint;
      }
    }
  }

  return null;
}
