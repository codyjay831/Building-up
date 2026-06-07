import { describe, expect, it } from 'vitest';

import { createGameConfig, createStarterGameState } from '@/game/config/scenario';
import { getBuildingDefinition } from '@/game/config/buildings';
import {
  buildingHasRoadAccess,
  computeRoadAccessibleTileKeys,
  hasRoadAccess,
} from '@/game/domain/accessibility';

describe('road accessibility', () => {
  const config = createGameConfig();
  const starterState = createStarterGameState();

  it('marks starter house and driveway as road-connected', () => {
    const accessible = computeRoadAccessibleTileKeys(starterState.lot, starterState.buildings);
    const starterHouse = starterState.buildings[0];
    const starterDefinition = getBuildingDefinition(config.buildings, starterHouse.definitionId);

    expect(accessible.has('5,10')).toBe(true);
    expect(accessible.has('11,11')).toBe(true);
    expect(
      buildingHasRoadAccess(
        starterHouse,
        starterDefinition,
        starterState.lot,
        starterState.buildings,
      ),
    ).toBe(true);
  });

  it('rejects a structure enclosed away from the road', () => {
    const enclosedState = {
      ...starterState,
      buildings: [
        ...starterState.buildings,
        {
          ...starterState.buildings[0],
          id: 'building-2',
          footprint: {
            origin: { x: 0, y: 0 },
            width: 12,
            height: 10,
            rotation: 0 as const,
          },
        },
      ],
    };

    const surfaceParking = getBuildingDefinition(config.buildings, 'surface_parking');

    expect(
      hasRoadAccess(
        { origin: { x: 0, y: 0 }, width: 1, height: 2, rotation: 0 },
        surfaceParking,
        enclosedState.lot,
        enclosedState.buildings,
      ),
    ).toBe(false);
  });
});
