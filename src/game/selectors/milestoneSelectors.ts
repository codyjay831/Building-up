import type { DomainEvent, GameState } from '@/game/domain/types';

export function deriveMilestoneToasts(
  previousState: Readonly<GameState>,
  nextState: Readonly<GameState>,
  events: readonly DomainEvent[],
): readonly string[] {
  const toasts: string[] = [];
  const hadLedger = previousState.ledger.some((entry) => entry.kind === 'monthly');
  const latestMonthly = [...nextState.ledger].reverse().find((entry) => entry.kind === 'monthly');

  if (!hadLedger && latestMonthly && latestMonthly.grossRent > 0) {
    toasts.push('First rent collected');
  }

  if (nextState.approval.level > previousState.approval.level) {
    toasts.push(`Approval Level ${String(nextState.approval.level)} unlocked`);
  }

  for (const event of events) {
    if (event.type === 'ConstructionCompleted') {
      toasts.push('Construction complete — building now leasing');
    }
  }

  for (const event of events) {
    if (event.type !== 'OccupancyChanged') {
      continue;
    }

    const delta = event.residentialDelta + event.retailDelta;
    if (delta > 0) {
      toasts.push('New tenant move-in');
      break;
    }
  }

  return toasts;
}
