import {
  calculateRefinanceCapacity,
  calculateRefinanceTerms,
  createRefinanceDebt,
} from '@/game/domain/debt';
import { appendTransactionLedgerEntry, createLedgerLine } from '@/game/domain/ledger';
import type { CommandResult, CommandRuleFailure, GameConfig, GameState } from '@/game/domain/types';

function commandFailure(reason: CommandRuleFailure['reason'], message: string): CommandRuleFailure {
  return { ok: false, reason, message };
}

export function refinanceProperty(
  state: Readonly<GameState>,
  config: Readonly<GameConfig>,
): CommandResult {
  if (state.status !== 'active') {
    return { ok: false, error: commandFailure('game_not_active', 'The run has already ended') };
  }

  if (state.counters.refinanceUsed) {
    return {
      ok: false,
      error: commandFailure('refinance_unavailable', 'Refinance is only available once per run'),
    };
  }

  const capacity = calculateRefinanceCapacity(state, config);

  if (capacity <= 0) {
    return {
      ok: false,
      error: commandFailure(
        'refinance_unavailable',
        'No refinance capacity remains under the property value cap',
      ),
    };
  }

  const terms = calculateRefinanceTerms(state, config, capacity);
  const debtId = `debt-${String(state.counters.nextDebtSequence)}`;
  const entryId = `ledger-${String(state.month)}-${String(state.ledger.length + 1)}`;
  const withProceeds = appendTransactionLedgerEntry(state, [
    createLedgerLine(entryId, 0, 'refinance_proceeds', 'Refinance proceeds', terms.maxProceeds),
  ]);

  return {
    ok: true,
    events: [],
    state: {
      ...withProceeds.state,
      debt: [
        ...withProceeds.state.debt,
        createRefinanceDebt(debtId, terms.maxProceeds, terms.monthlyPayment),
      ],
      counters: {
        ...withProceeds.state.counters,
        refinanceUsed: true,
        nextDebtSequence: withProceeds.state.counters.nextDebtSequence + 1,
      },
    },
  };
}
