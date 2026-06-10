import { describe, expect, it } from 'vitest';

import { placeProject } from '@/game/commands/placeProject';
import {
  createGameConfig,
  createStarterGameState,
  RIVERSIDE_STARTER_SCENARIO_ID,
} from '@/game/config/scenario';
import type { GameState } from '@/game/domain/types';
import { gameStateSchema } from '@/game/persistence/saveSchema';

function createRichGameStateFixture(): GameState {
  const config = createGameConfig();
  let state = createStarterGameState(
    RIVERSIDE_STARTER_SCENARIO_ID,
    'schema-parity-fixture',
    config,
  );

  const placed = placeProject(state, config, {
    definitionId: 'small_park',
    footprint: {
      origin: { x: 0, y: 0 },
      width: 2,
      height: 2,
      rotation: 0,
    },
  });

  if (!placed.ok) {
    throw new Error('Expected placement to succeed for schema parity fixture');
  }

  state = placed.state;

  return {
    ...state,
    counters: {
      ...state.counters,
      rngCounter: 42,
    },
    ledger: [
      {
        id: 'ledger-1',
        month: 1,
        kind: 'monthly',
        openingCash: state.cash,
        closingCash: state.cash + 1_000,
        netCashFlow: 1_000,
        lines: [
          {
            id: 'line-1',
            category: 'rent_residential',
            label: 'Residential rent',
            amount: 2_000,
            buildingId: state.buildings[0]?.id,
          },
        ],
        grossRent: 2_000,
        operatingExpenses: 1_000,
        occupancyChanges: [
          {
            buildingId: state.buildings[0]?.id ?? 'building-1',
            buildingName: 'Existing House',
            residentialDelta: 0,
            retailDelta: 0,
            residentialLeasingScore: 62,
            residentialTopFactors: [{ key: 'demand', value: 4 }],
            moveOutThreshold: 45,
            moveInThreshold: 55,
          },
        ],
        demandChange: {
          residentialDemand: 55,
          retailDemand: 32,
          previousResidentialDemand: 54,
          previousRetailDemand: 31,
        },
        propertyHealthSnapshot: {
          score: 68,
          occupancyPercent: 100,
        },
        previousPropertyHealthSnapshot: {
          score: 66,
          occupancyPercent: 100,
        },
      },
    ],
    debt: [
      {
        id: 'debt-1',
        type: 'refinance',
        principal: 50_000,
        originalPrincipal: 50_000,
        monthlyPayment: 450,
        paymentsActive: true,
        disbursedPrincipal: 0,
        annualInterestRate: 0,
      },
    ],
    events: [
      {
        id: 'event-1',
        eventType: 'MarketDemandChanged',
        remainingMonths: 2,
      },
    ],
  };
}

describe('save schema parity', () => {
  it('parses a rich GameState fixture without drift', () => {
    const fixture = createRichGameStateFixture();

    expect(() => gameStateSchema.parse(fixture)).not.toThrow();

    const parsed = gameStateSchema.parse(fixture);
    const roundTripped = gameStateSchema.parse(JSON.parse(JSON.stringify(parsed)));

    expect(roundTripped).toEqual(parsed);
    expect(parsed.ledger).toHaveLength(1);
    expect(parsed.debt).toHaveLength(1);
    expect(parsed.events).toHaveLength(1);
    expect(parsed.projects.length).toBeGreaterThan(0);
  });
});
