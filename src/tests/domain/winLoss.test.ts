import { describe, expect, it } from 'vitest';

import {
  createGameConfig,
  createStarterGameState,
  RIVERSIDE_STARTER_SCENARIO_ID,
} from '@/game/config/scenario';
import { checkWinConditionsMet } from '@/game/domain/winLoss';

describe('per-scenario win profiles', () => {
  const config = createGameConfig();

  it('requires mixed-use stabilization on riverside', () => {
    const state = createStarterGameState(RIVERSIDE_STARTER_SCENARIO_ID, 'win-riverside', config);

    expect(checkWinConditionsMet(state, config, config.balance, 15_000, 100)).toBe(false);
  });
});
