import { createRng, nextInt } from '@/game/domain/prng';
import type { BalanceAssumptions, GameConfig, GameState, MarketState } from '@/game/domain/types';

function clampDemand(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function countOccupiedResidentialUnits(state: Readonly<GameState>): number {
  return state.buildings.reduce((total, building) => total + building.residentialOccupied, 0);
}

export function calculateEffectiveResidentialDemand(
  state: Readonly<GameState>,
  config: Readonly<GameConfig>,
  balance: Readonly<BalanceAssumptions>,
): number {
  const scenario = config.scenarios.get(state.scenarioId);
  if (scenario?.theme !== 'suburb' || balance.suburbDemandPerResident === 0) {
    return state.market.residentialDemand;
  }

  const occupiedUnits = countOccupiedResidentialUnits(state);
  return clampDemand(
    state.market.residentialDemand + occupiedUnits * balance.suburbDemandPerResident,
  );
}

function driftTowardBaseline(current: number, baseline: number, driftPerMonth: number): number {
  if (current === baseline) {
    return current;
  }

  if (current < baseline) {
    return Math.min(baseline, current + driftPerMonth);
  }

  return Math.max(baseline, current - driftPerMonth);
}

export function advanceMarketDemand(
  market: Readonly<MarketState>,
  balance: Readonly<BalanceAssumptions>,
  seed: string,
  rngCounter: number,
): { readonly market: MarketState; readonly rngCounter: number } {
  const rng = createRng(seed, rngCounter);
  const [residentialVariation, rngAfterResidential] = nextInt(
    rng,
    -balance.demandVariationRange,
    balance.demandVariationRange,
  );
  const [retailVariation, rngAfterRetail] = nextInt(
    rngAfterResidential,
    -balance.demandVariationRange,
    balance.demandVariationRange,
  );

  const residentialDemand = clampDemand(
    driftTowardBaseline(
      market.residentialDemand,
      market.residentialBaseline,
      balance.demandDriftPerMonth,
    ) + residentialVariation,
  );
  const retailDemand = clampDemand(
    driftTowardBaseline(market.retailDemand, market.retailBaseline, balance.demandDriftPerMonth) +
      retailVariation,
  );

  return {
    market: {
      ...market,
      residentialDemand,
      retailDemand,
    },
    rngCounter: rngAfterRetail.counter,
  };
}

export function applyMarketDemandAdvance(
  state: Readonly<GameState>,
  balance: Readonly<BalanceAssumptions>,
): { readonly state: GameState; readonly rngCounter: number } {
  const { market, rngCounter } = advanceMarketDemand(
    state.market,
    balance,
    state.seed,
    state.counters.rngCounter,
  );

  return {
    state: {
      ...state,
      market,
    },
    rngCounter,
  };
}
