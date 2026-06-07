import type { CommandResult, GameConfig, GameState, RentPosture } from '@/game/domain/types';

const VALID_POSTURES = new Set<RentPosture>(['discount', 'market', 'premium']);

export interface SetRentPostureInput {
  readonly buildingId: string;
  readonly posture: RentPosture;
}

export function setRentPosture(
  state: Readonly<GameState>,
  _config: Readonly<GameConfig>,
  input: SetRentPostureInput,
): CommandResult {
  if (!VALID_POSTURES.has(input.posture)) {
    return {
      ok: false,
      error: {
        ok: false,
        reason: 'invalid_rent_posture',
        message: `Unknown rent posture: ${input.posture}`,
      },
    };
  }

  const buildingIndex = state.buildings.findIndex((building) => building.id === input.buildingId);
  if (buildingIndex === -1) {
    return {
      ok: false,
      error: {
        ok: false,
        reason: 'building_not_found',
        message: `Building not found: ${input.buildingId}`,
      },
    };
  }

  const building = state.buildings[buildingIndex];
  if (building.rentPosture === input.posture) {
    return {
      ok: true,
      events: [],
      state,
    };
  }

  const buildings = state.buildings.map((candidate, index) =>
    index === buildingIndex ? { ...candidate, rentPosture: input.posture } : candidate,
  );

  return {
    ok: true,
    events: [],
    state: {
      ...state,
      buildings,
    },
  };
}
