import { calculateAppealBreakdown } from '@/game/domain/appeal';
import { calculatePropertyParking } from '@/game/domain/parking';
import { getBuildingById } from '@/game/selectors/buildingSelectors';
import {
  getDemandNarrativeView,
  getPropertyHealthView,
} from '@/game/selectors/propertyHealthSelectors';
import { getPropertyDemandView } from '@/game/selectors/leasingSelectors';
import { getPropertySummary } from '@/game/selectors/propertySelectors';
import type { GameConfig, GameState } from '@/game/domain/types';
import type { UiState } from '@/game/store/storeTypes';

export function useInspectorView(gameState: GameState, config: GameConfig, ui: UiState) {
  const parking = calculatePropertyParking(gameState, config);

  return {
    summary: getPropertySummary(gameState, config),
    demandView: getPropertyDemandView(gameState, config),
    propertyHealth: getPropertyHealthView(gameState, config),
    demandNarrative: getDemandNarrativeView(gameState, config),
    appealBreakdown: calculateAppealBreakdown(gameState, config, config.balance, parking),
    selectedBuilding: ui.selectedBuildingId
      ? getBuildingById(gameState, ui.selectedBuildingId)
      : undefined,
  };
}
