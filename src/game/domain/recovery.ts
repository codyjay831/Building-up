import { getBuildingDefinition } from '@/game/config/buildings';
import {
  calculateCancellationRefund,
  canCancelBeforeFirstAdvancement,
} from '@/game/domain/construction';
import { calculateRefinanceCapacity } from '@/game/domain/debt';
import { canSellOrDemolishBuilding } from '@/game/domain/progression';
import { calculateBuildingSaleProceeds } from '@/game/domain/valuation';
import type { GameConfig, GameState } from '@/game/domain/types';

export function getMaximumRecoveryCash(
  state: Readonly<GameState>,
  config: Readonly<GameConfig>,
): number {
  const balance = config.balance;
  let maximum = 0;

  if (!state.counters.emergencyOfferUsed) {
    maximum = Math.max(maximum, balance.emergencyInvestorOfferAmount);
  }

  if (!state.counters.refinanceUsed) {
    maximum = Math.max(maximum, calculateRefinanceCapacity(state, config));
  }

  for (const building of state.buildings) {
    if (!canSellOrDemolishBuilding(state, config, building)) {
      continue;
    }

    const definition = getBuildingDefinition(config.buildings, building.definitionId);
    maximum = Math.max(maximum, calculateBuildingSaleProceeds(building, definition, balance));
  }

  for (const project of state.projects) {
    if (project.status !== 'under_construction') {
      continue;
    }

    if (canCancelBeforeFirstAdvancement(project) || project.amountSpent < project.totalCost) {
      maximum = Math.max(maximum, calculateCancellationRefund(project));
    }
  }

  return maximum;
}

export function hasValidRecoveryActions(
  state: Readonly<GameState>,
  config: Readonly<GameConfig>,
): boolean {
  if (state.cash >= 0) {
    return true;
  }

  return state.cash + getMaximumRecoveryCash(state, config) >= 0;
}

export function applyInsolvencyProgress(state: Readonly<GameState>): GameState {
  const consecutiveInsolventMonths =
    state.cash < 0 ? state.counters.consecutiveInsolventMonths + 1 : 0;

  return {
    ...state,
    counters: {
      ...state.counters,
      consecutiveInsolventMonths,
    },
  };
}

export function applyLossCondition(
  state: Readonly<GameState>,
  config: Readonly<GameConfig>,
): GameState {
  if (state.status !== 'active' || state.cash >= 0) {
    return state;
  }

  if (state.counters.consecutiveInsolventMonths < config.balance.insolvencyLossMonths) {
    return state;
  }

  if (hasValidRecoveryActions(state, config)) {
    return state;
  }

  return {
    ...state,
    status: 'lost',
  };
}
