import type {
  BuildingDefinition,
  GameConfig,
  GameState,
  ParkingSnapshot,
} from '@/game/domain/types';

function sumParkingFromBuildings(
  state: Readonly<GameState>,
  config: Readonly<GameConfig>,
  pick: 'capacity' | 'demand',
): number {
  return state.buildings.reduce((total, building) => {
    const definition = config.buildings.get(building.definitionId);
    if (!definition) {
      return total;
    }

    return total + (pick === 'capacity' ? definition.parkingCapacity : definition.parkingDemand);
  }, 0);
}

export function calculatePropertyParking(
  state: Readonly<GameState>,
  config: Readonly<GameConfig>,
): ParkingSnapshot {
  const capacity =
    state.lot.accessParkingCapacity + sumParkingFromBuildings(state, config, 'capacity');
  const demand = sumParkingFromBuildings(state, config, 'demand');
  const shortfall = Math.max(0, demand - capacity);
  const coverage = demand === 0 ? 1 : Math.min(1, capacity / demand);

  return { capacity, demand, shortfall, coverage };
}

export function calculateParkingWithAddition(
  state: Readonly<GameState>,
  config: Readonly<GameConfig>,
  definition: Readonly<BuildingDefinition>,
): ParkingSnapshot {
  const current = calculatePropertyParking(state, config);

  return {
    capacity: current.capacity + definition.parkingCapacity,
    demand: current.demand + definition.parkingDemand,
    shortfall: Math.max(
      0,
      current.demand + definition.parkingDemand - (current.capacity + definition.parkingCapacity),
    ),
    coverage:
      current.demand + definition.parkingDemand === 0
        ? 1
        : Math.min(
            1,
            (current.capacity + definition.parkingCapacity) /
              (current.demand + definition.parkingDemand),
          ),
  };
}

export function calculateParkingAfterBuild(
  state: Readonly<GameState>,
  config: Readonly<GameConfig>,
  definition: Readonly<BuildingDefinition>,
): { capacity: number; demand: number } {
  const snapshot = calculateParkingWithAddition(state, config, definition);
  return { capacity: snapshot.capacity, demand: snapshot.demand };
}
