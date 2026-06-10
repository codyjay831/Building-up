import { calculateCombinedOccupancyPercent } from '@/game/domain/leasing';
import type { GameConfig, GameState } from '@/game/domain/types';

export interface CombinedOccupancyView {
  readonly occupiedUnits: number;
  readonly totalUnits: number;
  readonly percent: number;
  readonly label: string;
}

export function getCombinedOccupancyView(
  state: Readonly<GameState>,
  config: Readonly<GameConfig>,
): CombinedOccupancyView {
  let totalUnits = 0;
  let occupiedUnits = 0;

  for (const building of state.buildings) {
    const definition = config.buildings.get(building.definitionId);
    if (!definition) {
      continue;
    }

    const buildingUnits = definition.residentialUnits + definition.retailUnits;
    if (buildingUnits === 0) {
      continue;
    }

    totalUnits += buildingUnits;
    occupiedUnits += building.residentialOccupied + building.retailOccupied;
  }

  const percent = calculateCombinedOccupancyPercent(state, config);

  return {
    occupiedUnits,
    totalUnits,
    percent,
    label: totalUnits > 0 ? `${String(occupiedUnits)}/${String(totalUnits)}` : '—',
  };
}
