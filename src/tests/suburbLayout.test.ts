import { describe, expect, it } from 'vitest';

import { getBuildingDefinition } from '@/game/config/buildings';
import {
  createGameConfig,
  createStarterGameState,
  RIVERSIDE_STARTER_SCENARIO_ID,
  SUBURB_STARTER_SCENARIO_ID,
} from '@/game/config/scenario';
import { relocateBuilding } from '@/game/commands/relocateBuilding';
import { buildingHasRoadAccess } from '@/game/domain/accessibility';
import { getFootprintTiles, tileKey } from '@/game/domain/grid';
import { validatePlacement } from '@/game/domain/placement';
import { canRelocateBuilding } from '@/game/domain/progression';

describe('suburb starter layout', () => {
  const config = createGameConfig();
  const state = createStarterGameState(SUBURB_STARTER_SCENARIO_ID, 'suburb-layout-test', config);

  it('places 18 residential units across suburb houses', () => {
    expect(state.buildings).toHaveLength(18);

    const totalUnits = state.buildings.reduce((total, building) => {
      const definition = getBuildingDefinition(config.buildings, building.definitionId);
      return total + definition.residentialUnits;
    }, 0);

    expect(totalUnits).toBe(18);
  });

  it('starts with eighteen vacant leasing homes', () => {
    const occupied = state.buildings.reduce(
      (total, building) => total + building.residentialOccupied,
      0,
    );
    const leasingHomes = state.buildings.filter(
      (building) => building.lifecycleState === 'leasing',
    ).length;

    expect(occupied).toBe(0);
    expect(leasingHomes).toBe(18);
  });

  it('includes horizontal street access rows plus the south road edge', () => {
    expect(state.lot.accessTiles).toHaveLength(96);
  });

  it('keeps all footprints in bounds without overlap', () => {
    const occupiedTiles = new Set<string>();

    for (const building of state.buildings) {
      for (const tile of getFootprintTiles(building.footprint)) {
        expect(tile.x).toBeGreaterThanOrEqual(0);
        expect(tile.y).toBeGreaterThanOrEqual(0);
        expect(tile.x).toBeLessThan(state.lot.width);
        expect(tile.y).toBeLessThan(state.lot.height);

        const key = tileKey(tile);
        expect(occupiedTiles.has(key)).toBe(false);
        occupiedTiles.add(key);
      }
    }
  });

  it('gives every starter home road access', () => {
    for (const building of state.buildings) {
      const definition = getBuildingDefinition(config.buildings, building.definitionId);
      expect(
        buildingHasRoadAccess(building, definition, state.lot, state.buildings, state.projects),
      ).toBe(true);
    }
  });
});

describe('relocateBuilding command', () => {
  const config = createGameConfig();
  const state = createStarterGameState(RIVERSIDE_STARTER_SCENARIO_ID, 'relocate-test', config);
  const building = state.buildings[0];

  it('moves a building while preserving occupancy and lifecycle', () => {
    if (!building) {
      throw new Error('Expected starter building');
    }

    const nextFootprint = {
      origin: { x: 7, y: 6 },
      width: building.footprint.width,
      height: building.footprint.height,
      rotation: 0 as const,
    };

    const result = relocateBuilding(state, config, {
      buildingId: building.id,
      footprint: nextFootprint,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      const moved = result.state.buildings.find((candidate) => candidate.id === building.id);
      expect(moved?.footprint.origin).toEqual(nextFootprint.origin);
      expect(moved?.residentialOccupied).toBe(building.residentialOccupied);
      expect(moved?.lifecycleState).toBe(building.lifecycleState);
    }
  });

  it('rejects overlap with another structure', () => {
    const suburb = createStarterGameState(SUBURB_STARTER_SCENARIO_ID, 'relocate-overlap', config);
    const first = suburb.buildings[0];
    const second = suburb.buildings[1];

    if (!first || !second) {
      throw new Error('Expected starter buildings');
    }

    const overlap = relocateBuilding(suburb, config, {
      buildingId: first.id,
      footprint: {
        ...first.footprint,
        origin: second.footprint.origin,
      },
    });

    expect(overlap.ok).toBe(false);
  });

  it('blocks buildings under construction or renovation', () => {
    if (!building) {
      throw new Error('Expected starter building');
    }

    const renovating = {
      ...building,
      lifecycleState: 'renovating' as const,
    };

    expect(canRelocateBuilding(state, renovating)).toBe(false);
  });

  it('allows validation to ignore the building being moved', () => {
    if (!building) {
      throw new Error('Expected starter building');
    }

    const definition = getBuildingDefinition(config.buildings, building.definitionId);
    const sameSpot = validatePlacement({
      state,
      config,
      definition,
      footprint: building.footprint,
      ignoreBuildingId: building.id,
      purpose: 'relocate',
    });

    expect(sameSpot.ok).toBe(true);
  });
});
