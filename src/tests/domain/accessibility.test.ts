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

  it('marks starter house and driveway as road-connected via access path', () => {
    const accessible = computeRoadAccessibleTileKeys(
      starterState.lot,
      starterState.buildings,
      config,
    );
    const starterHouse = starterState.buildings.find(
      (building) => building.definitionId === 'existing_house',
    );
    expect(starterHouse).toBeDefined();
    if (!starterHouse) {
      return;
    }

    const starterDefinition = getBuildingDefinition(config.buildings, starterHouse.definitionId);

    expect(accessible.has('5,10')).toBe(true);
    expect(accessible.has('5,9')).toBe(true);
    expect(accessible.has('11,11')).toBe(true);
    expect(
      buildingHasRoadAccess(
        starterHouse,
        starterDefinition,
        starterState.lot,
        starterState.buildings,
        config,
      ),
    ).toBe(true);
  });

  it('does not reach interior tiles through empty land alone', () => {
    const accessible = computeRoadAccessibleTileKeys(
      starterState.lot,
      starterState.buildings,
      config,
    );

    expect(accessible.has('0,0')).toBe(false);
    expect(accessible.has('3,6')).toBe(false);
  });

  it('rejects a structure enclosed away from the network', () => {
    const enclosedState = {
      ...starterState,
      buildings: [
        ...starterState.buildings,
        {
          ...starterState.buildings[0],
          id: 'building-99',
          definitionId: 'existing_house',
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
        config,
      ),
    ).toBe(false);
  });

  it('allows south-frontage buildings sitting on South Road', () => {
    const accessible = computeRoadAccessibleTileKeys(
      starterState.lot,
      starterState.buildings,
      config,
    );
    const cornerShop = getBuildingDefinition(config.buildings, 'corner_shop');

    expect(accessible.has('8,11')).toBe(true);
    expect(
      hasRoadAccess(
        { origin: { x: 8, y: 11 }, width: 3, height: 3, rotation: 0 },
        cornerShop,
        starterState.lot,
        starterState.buildings,
        config,
      ),
    ).toBe(true);
  });
});
