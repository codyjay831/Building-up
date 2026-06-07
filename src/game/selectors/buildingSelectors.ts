import { getBuildingDefinition } from '@/game/config/buildings';
import type {
  BuildingDefinition,
  BuildingInstance,
  GameConfig,
  GameState,
} from '@/game/domain/types';

export function getBuildingById(
  state: Readonly<GameState>,
  buildingId: string,
): BuildingInstance | undefined {
  return state.buildings.find((building) => building.id === buildingId);
}

export function getBuildingDefinitionForInstance(
  config: Readonly<GameConfig>,
  building: BuildingInstance,
): BuildingDefinition {
  return getBuildingDefinition(config.buildings, building.definitionId);
}

export function formatFootprintSize(definition: BuildingDefinition): string {
  const { width, height } = definition.footprint;
  return `${String(width)}×${String(height)}`;
}

export function formatLifecycleState(state: BuildingInstance['lifecycleState']): string {
  switch (state) {
    case 'existing':
      return 'Existing';
    case 'planned':
      return 'Planned';
    case 'under_construction':
      return 'Under construction';
    case 'leasing':
      return 'Leasing';
    case 'operating':
      return 'Operating';
    case 'renovating':
      return 'Renovating';
    case 'for_sale':
      return 'For sale';
    case 'demolishing':
      return 'Demolishing';
  }
}

export function getBuildingAtTile(
  state: Readonly<GameState>,
  coord: { readonly x: number; readonly y: number },
): BuildingInstance | undefined {
  return state.buildings.find((building) => {
    const { origin, width, height, rotation } = building.footprint;
    const effectiveWidth = rotation === 90 ? height : width;
    const effectiveHeight = rotation === 90 ? width : height;

    return (
      coord.x >= origin.x &&
      coord.x < origin.x + effectiveWidth &&
      coord.y >= origin.y &&
      coord.y < origin.y + effectiveHeight
    );
  });
}
