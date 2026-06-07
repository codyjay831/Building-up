import { getBuildingDefinition } from '@/game/config/buildings';
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
  });

  if (validation.ok) {
    return {
      footprint,
      isValid: true,
      failures: [],
      primaryMessage: null,
    };
  }

  return {
    footprint,
    isValid: false,
    failures: [validation],
    primaryMessage: validation.message,
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
