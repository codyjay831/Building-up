import type { CommandResult, GameState } from '@/game/domain/types';

export interface DebugAddCashInput {
  readonly amount: number;
}

export function debugAddCash(state: Readonly<GameState>, input: DebugAddCashInput): CommandResult {
  if (input.amount <= 0) {
    return {
      ok: false,
      error: {
        ok: false,
        reason: 'invalid_debug_amount',
        message: 'Amount must be positive.',
      },
    };
  }

  return {
    ok: true,
    events: [],
    state: {
      ...state,
      cash: state.cash + input.amount,
    },
  };
}
