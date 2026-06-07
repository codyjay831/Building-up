import { describe, expect, it } from 'vitest';

import {
  footprintOverlapsAny,
  footprintWithinLot,
  getEffectiveDimensions,
  getFootprintTiles,
  getOccupiedTileKeys,
} from '@/game/domain/grid';
import type { BuildingInstance, LotState, PlacedFootprint } from '@/game/domain/types';

const lot: LotState = {
  width: 12,
  height: 12,
  accessTiles: [{ x: 5, y: 10 }],
  accessParkingCapacity: 1,
};

const sampleBuilding = (
  id: string,
  origin: { x: number; y: number },
  width: number,
  height: number,
): BuildingInstance => ({
  id,
  definitionId: 'small_house',
  footprint: { origin, width, height, rotation: 0 },
  lifecycleState: 'operating',
  condition: 100,
  residentialOccupied: 1,
  retailOccupied: 0,
  rentPosture: 'market',
  renovated: false,
});

describe('grid footprint logic', () => {
  it('expands a footprint into tile coordinates', () => {
    const footprint: PlacedFootprint = {
      origin: { x: 3, y: 6 },
      width: 2,
      height: 3,
      rotation: 0,
    };

    expect(getFootprintTiles(footprint)).toEqual([
      { x: 3, y: 6 },
      { x: 4, y: 6 },
      { x: 3, y: 7 },
      { x: 4, y: 7 },
      { x: 3, y: 8 },
      { x: 4, y: 8 },
    ]);
  });

  it('swaps dimensions when rotated 90 degrees', () => {
    const footprint: PlacedFootprint = {
      origin: { x: 1, y: 1 },
      width: 2,
      height: 3,
      rotation: 90,
    };

    expect(getEffectiveDimensions(footprint)).toEqual({ width: 3, height: 2 });
    expect(getFootprintTiles(footprint)).toHaveLength(6);
  });

  it('detects overlap and lot bounds', () => {
    const left: PlacedFootprint = {
      origin: { x: 2, y: 2 },
      width: 2,
      height: 2,
      rotation: 0,
    };
    const overlapping: PlacedFootprint = {
      origin: { x: 3, y: 3 },
      width: 2,
      height: 2,
      rotation: 0,
    };
    const offLot: PlacedFootprint = {
      origin: { x: 11, y: 11 },
      width: 2,
      height: 2,
      rotation: 0,
    };

    expect(footprintOverlapsAny(left, [overlapping])).toBe(true);
    expect(footprintWithinLot(left, lot)).toBe(true);
    expect(footprintWithinLot(offLot, lot)).toBe(false);
  });

  it('tracks occupied tile keys from buildings and projects', () => {
    const occupied = getOccupiedTileKeys(
      [sampleBuilding('building-1', { x: 3, y: 6 }, 2, 3)],
      [{ footprint: { origin: { x: 8, y: 8 }, width: 1, height: 2, rotation: 0 } }],
    );

    expect(occupied.has('3,6')).toBe(true);
    expect(occupied.has('8,9')).toBe(true);
    expect(occupied.has('0,0')).toBe(false);
  });
});
