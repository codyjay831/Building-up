import { describe, expect, it } from 'vitest';

import { createGameConfig, createStarterGameState } from '@/game/config/scenario';
import { relocateDriveway } from '@/game/commands/relocateDriveway';
import {
  canRelocateDriveway,
  getDrivewaySegmentTiles,
  validateDrivewayRelocation,
} from '@/game/domain/accessTiles';
import { buildingHasRoadAccess } from '@/game/domain/accessibility';
import { getBuildingDefinition } from '@/game/config/buildings';

describe('access tile relocation', () => {
  const config = createGameConfig();
  const starterState = createStarterGameState(undefined, undefined, config);

  it('allows relocating the Riverside starter driveway to another road-connected row', () => {
    expect(canRelocateDriveway(starterState.lot)).toBe(true);

    const preview = { origin: { x: 4, y: 10 }, rotation: 0 as const };
    const validation = validateDrivewayRelocation(starterState, config, preview);

    expect(validation.ok).toBe(true);
    if (!validation.ok) {
      return;
    }

    const result = relocateDriveway(starterState, config, { preview });
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.state.lot.drivewayTiles).toEqual([
      { x: 4, y: 10 },
      { x: 5, y: 10 },
    ]);
    expect(result.state.lot.accessParkingCapacity).toBe(2);

    const house = result.state.buildings.find(
      (building) => building.definitionId === 'existing_house',
    );
    expect(house).toBeDefined();
    if (!house) {
      return;
    }

    const definition = getBuildingDefinition(config.buildings, house.definitionId);
    expect(
      buildingHasRoadAccess(house, definition, result.state.lot, result.state.buildings, config),
    ).toBe(true);
  });

  it('rejects driveway segments that overlap buildings', () => {
    const preview = { origin: { x: 3, y: 6 }, rotation: 0 as const };
    const validation = validateDrivewayRelocation(starterState, config, preview);

    expect(validation.ok).toBe(false);
    if (validation.ok) {
      return;
    }

    expect(validation.reason).toBe('tile_occupied');
  });

  it('rejects driveway segments outside the lot', () => {
    const preview = { origin: { x: 11, y: 10 }, rotation: 0 as const };
    const validation = validateDrivewayRelocation(starterState, config, preview);

    expect(validation.ok).toBe(false);
    if (validation.ok) {
      return;
    }

    expect(validation.reason).toBe('out_of_bounds');
  });

  it('rejects interior driveways disconnected from South Road', () => {
    const preview = { origin: { x: 5, y: 5 }, rotation: 0 as const };
    const validation = validateDrivewayRelocation(starterState, config, preview);

    expect(validation.ok).toBe(false);
    if (validation.ok) {
      return;
    }

    expect(validation.reason).toBe('driveway_not_connected');
  });

  it('builds vertical driveway segments from origin and rotation', () => {
    const tiles = getDrivewaySegmentTiles({ x: 2, y: 8 }, 90, 2);
    expect(tiles).toEqual([
      { x: 2, y: 8 },
      { x: 2, y: 9 },
    ]);
  });
});
