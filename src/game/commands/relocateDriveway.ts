import { validateDrivewayRelocation } from '@/game/domain/accessTiles';
import type { CommandResult, GameConfig, GameState } from '@/game/domain/types';
import type { DrivewayPreview } from '@/game/domain/accessTiles';

export interface RelocateDrivewayCommand {
  readonly preview: DrivewayPreview;
}

export function relocateDriveway(
  state: Readonly<GameState>,
  config: Readonly<GameConfig>,
  command: RelocateDrivewayCommand,
): CommandResult {
  const validation = validateDrivewayRelocation(state, config, command.preview);

  if (!validation.ok) {
    return { ok: false, error: validation };
  }

  return {
    ok: true,
    events: [],
    state: {
      ...state,
      lot: {
        ...state.lot,
        drivewayTiles: validation.tiles,
      },
    },
  };
}
