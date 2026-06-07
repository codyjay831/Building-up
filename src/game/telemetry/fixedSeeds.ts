import { createGameConfig, createStarterGameState, RIVERSIDE_STARTER_SCENARIO_ID } from '@/game/config/scenario';
import type { GameConfig, GameState, MarketState } from '@/game/domain/types';

export interface FixedSeedPreset {
  readonly id: string;
  readonly seed: string;
  readonly label: string;
  readonly description: string;
  readonly marketOverride?: Partial<Pick<MarketState, 'residentialDemand' | 'retailDemand'>>;
}

export const FIXED_SEED_PRESETS: readonly FixedSeedPreset[] = [
  {
    id: 'starter-balanced',
    seed: 'starter-balanced',
    label: 'Starter Balanced',
    description: 'Default market drift for baseline balance checks.',
  },
  {
    id: 'strong-residential',
    seed: 'strong-residential',
    label: 'Strong Residential',
    description: 'Elevated residential demand for housing-first openings.',
    marketOverride: { residentialDemand: 68, retailDemand: 28 },
  },
  {
    id: 'weak-retail',
    seed: 'weak-retail',
    label: 'Weak Retail',
    description: 'Soft retail demand to stress-test shop-first risk.',
    marketOverride: { residentialDemand: 52, retailDemand: 22 },
  },
  {
    id: 'construction-delay',
    seed: 'construction-delay',
    label: 'Construction Delay',
    description: 'Moderate demand while construction schedules stretch reserves.',
    marketOverride: { residentialDemand: 50, retailDemand: 30 },
  },
  {
    id: 'recovery-path',
    seed: 'recovery-path',
    label: 'Recovery Path',
    description: 'Tighter margins that still allow insolvency recovery tools.',
    marketOverride: { residentialDemand: 48, retailDemand: 34 },
  },
  {
    id: 'approval-unlock',
    seed: 'approval-unlock',
    label: 'Approval Unlock',
    description: 'Conditions tuned for Approval Level 2 progression checks.',
    marketOverride: { residentialDemand: 58, retailDemand: 36 },
  },
  {
    id: 'win-path',
    seed: 'win-path',
    label: 'Win Path',
    description: 'Favorable drift for mixed-use completion and win validation.',
    marketOverride: { residentialDemand: 62, retailDemand: 40 },
  },
] as const;

export function getFixedSeedPreset(id: string): FixedSeedPreset | undefined {
  return FIXED_SEED_PRESETS.find((preset) => preset.id === id);
}

export function getFixedSeedPresetIds(): readonly string[] {
  return FIXED_SEED_PRESETS.map((preset) => preset.id);
}

export function applyFixedSeedMarketPreset(
  state: GameState,
  preset: FixedSeedPreset,
): GameState {
  if (!preset.marketOverride) {
    return state;
  }

  const residentialDemand = preset.marketOverride.residentialDemand ?? state.market.residentialDemand;
  const retailDemand = preset.marketOverride.retailDemand ?? state.market.retailDemand;

  return {
    ...state,
    market: {
      ...state.market,
      residentialDemand,
      retailDemand,
      residentialBaseline: residentialDemand,
      retailBaseline: retailDemand,
    },
  };
}

export function createGameStateFromFixedSeed(
  presetId: string,
  config: GameConfig = createGameConfig(),
): GameState {
  const preset = getFixedSeedPreset(presetId);

  if (!preset) {
    throw new RangeError(`Unknown fixed seed preset: ${presetId}`);
  }

  const state = createStarterGameState(RIVERSIDE_STARTER_SCENARIO_ID, preset.seed, config);
  return applyFixedSeedMarketPreset(state, preset);
}
