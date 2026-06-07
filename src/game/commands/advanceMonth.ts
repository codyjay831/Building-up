import { simulateMonth } from '@/game/domain/simulateMonth';
import type { CommandResult, GameConfig, GameState } from '@/game/domain/types';

export function advanceMonth(
  state: Readonly<GameState>,
  config: Readonly<GameConfig>,
): CommandResult {
  if (state.status !== 'active') {
    return {
      ok: false,
      error: {
        ok: false,
        reason: 'game_not_active',
        message: 'The run has already ended',
      },
    };
  }

  return simulateMonth(state, config);
}
