import { getBuildingDefinition } from '@/game/config/buildings';
import { buildProjectForecast } from '@/game/domain/construction';
import { validatePlacement } from '@/game/domain/placement';
import type { GameConfig, GameState, PlacedFootprint, PlacementFailure } from '@/game/domain/types';
import type { PlacementPreview } from '@/game/store/storeTypes';

export interface PlacementPreviewResult {
  readonly footprint: PlacedFootprint;
  readonly isValid: boolean;
  readonly failures: readonly PlacementFailure[];
  readonly primaryMessage: string | null;
}

export function buildPreviewFootprint(
  preview: PlacementPreview,
  config: Readonly<GameConfig>,
): PlacedFootprint {
  const definition = getBuildingDefinition(config.buildings, preview.definitionId);

  return {
    origin: preview.origin,
    width: definition.footprint.width,
    height: definition.footprint.height,
    rotation: preview.rotation,
  };
}

export function evaluatePlacementPreview(
  state: Readonly<GameState>,
  config: Readonly<GameConfig>,
  preview: PlacementPreview,
): PlacementPreviewResult {
  const definition = getBuildingDefinition(config.buildings, preview.definitionId);
  const footprint = buildPreviewFootprint(preview, config);
  const validation = validatePlacement({
    state,
    config,
    definition,
    footprint,
    ignoreBuildingId: preview.relocateBuildingId,
    purpose: preview.relocateBuildingId ? 'relocate' : 'place',
    skipCashCheck: true,
  });

  if (!validation.ok) {
    return {
      footprint,
      isValid: false,
      failures: [validation],
      primaryMessage: validation.message,
    };
  }

  if (preview.relocateBuildingId) {
    return {
      footprint,
      isValid: true,
      failures: [],
      primaryMessage: null,
    };
  }

  const forecast = buildProjectForecast(state, config, preview.definitionId, footprint);
  const canPayCash = state.cash >= forecast.cashDueNow;
  const canPayWithLoan =
    forecast.constructionLoan.eligible && state.cash >= forecast.constructionLoan.equityRequired;

  if (!canPayCash && !canPayWithLoan) {
    const required = forecast.constructionLoan.eligible
      ? forecast.constructionLoan.equityRequired
      : forecast.cashDueNow;

    return {
      footprint,
      isValid: false,
      failures: [
        {
          ok: false,
          reason: 'insufficient_cash',
          message: `Insufficient cash for ${definition.name}. Required ${String(required)}, available ${String(state.cash)}`,
        },
      ],
      primaryMessage: `Insufficient cash for ${definition.name}. Required ${String(required)}, available ${String(state.cash)}`,
    };
  }

  return {
    footprint,
    isValid: true,
    failures: [],
    primaryMessage: null,
  };
}

export function tileInFootprint(
  coord: { readonly x: number; readonly y: number },
  footprint: PlacedFootprint,
): boolean {
  const effectiveWidth = footprint.rotation === 90 ? footprint.height : footprint.width;
  const effectiveHeight = footprint.rotation === 90 ? footprint.width : footprint.height;

  return (
    coord.x >= footprint.origin.x &&
    coord.x < footprint.origin.x + effectiveWidth &&
    coord.y >= footprint.origin.y &&
    coord.y < footprint.origin.y + effectiveHeight
  );
}
