import { getScenarioDefinition } from '@/game/config/scenario';
import type { GameConfig, GameState } from '@/game/domain/types';

export function getCalendarYear(
  state: Readonly<GameState>,
  config: Readonly<GameConfig>,
): number {
  const scenario = getScenarioDefinition(config.scenarios, state.scenarioId);
  const startYear = scenario.startYear ?? 1946;

  return startYear + Math.floor((state.month - 1) / 12);
}

export function formatCalendarLabel(state: Readonly<GameState>, config: Readonly<GameConfig>): string {
  const year = getCalendarYear(state, config);

  return `${String(year)} · Month ${String(state.month)}`;
}
