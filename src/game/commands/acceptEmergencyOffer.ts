import { appendTransactionLedgerEntry, createLedgerLine } from '@/game/domain/ledger';
import type { CommandResult, CommandRuleFailure, GameConfig, GameState } from '@/game/domain/types';

function commandFailure(reason: CommandRuleFailure['reason'], message: string): CommandRuleFailure {
  return { ok: false, reason, message };
}

export function acceptEmergencyOffer(
  state: Readonly<GameState>,
  config: Readonly<GameConfig>,
): CommandResult {
  if (state.status !== 'active') {
    return { ok: false, error: commandFailure('game_not_active', 'The run has already ended') };
  }

  if (state.counters.emergencyOfferUsed) {
    return {
      ok: false,
      error: commandFailure(
        'emergency_offer_unavailable',
        'The emergency investor offer has already been accepted',
      ),
    };
  }

  if (state.cash >= 0) {
    return {
      ok: false,
      error: commandFailure(
        'emergency_offer_unavailable',
        'Emergency recovery is only offered while cash is negative',
      ),
    };
  }

  const amount = config.balance.emergencyInvestorOfferAmount;
  const entryId = `ledger-${String(state.month)}-${String(state.ledger.length + 1)}`;
  const withProceeds = appendTransactionLedgerEntry(state, [
    createLedgerLine(entryId, 0, 'emergency_investor', 'Emergency investor bridge capital', amount),
  ]);

  return {
    ok: true,
    events: [],
    state: {
      ...withProceeds.state,
      counters: {
        ...withProceeds.state.counters,
        emergencyOfferUsed: true,
      },
    },
  };
}
