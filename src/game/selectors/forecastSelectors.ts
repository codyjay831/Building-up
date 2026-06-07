import { buildProjectForecast } from '@/game/domain/construction';
import { formatMoney } from '@/game/domain/money';
import { getConstructionLoanForecastView } from '@/game/selectors/financeSelectors';
import type { GameConfig, GameState, ProjectForecast } from '@/game/domain/types';
import type { PlacementPreview } from '@/game/store/storeTypes';
import { buildPreviewFootprint } from '@/game/selectors/placementSelectors';
import { getBuildingDefinition } from '@/game/config/buildings';

export interface ProjectForecastView {
  readonly forecast: ProjectForecast;
  readonly totalCostLabel: string;
  readonly cashDueNowLabel: string;
  readonly monthlyDrawsLabel: string;
  readonly completionMonthLabel: string;
  readonly buildDurationLabel: string;
  readonly parkingLabel: string;
  readonly constructionLoan: ReturnType<typeof getConstructionLoanForecastView>;
}

export function getProjectForecastForPreview(
  state: Readonly<GameState>,
  config: Readonly<GameConfig>,
  preview: PlacementPreview,
): ProjectForecastView {
  const footprint = buildPreviewFootprint(preview, config);
  const forecast = buildProjectForecast(state, config, preview.definitionId, footprint);
  const definition = getBuildingDefinition(config.buildings, preview.definitionId);
  const constructionLoan = getConstructionLoanForecastView(state, config, definition);

  return {
    forecast,
    totalCostLabel: formatMoney(forecast.totalCost),
    cashDueNowLabel: formatMoney(forecast.cashDueNow),
    monthlyDrawsLabel: forecast.monthlyDraws.map((draw) => formatMoney(draw)).join(', '),
    completionMonthLabel: `Month ${String(forecast.completionMonth)}`,
    buildDurationLabel: `${String(forecast.buildDurationMonths)} months`,
    parkingLabel: `${String(forecast.parkingAfterBuild.capacity)} capacity / ${String(forecast.parkingAfterBuild.demand)} demand`,
    constructionLoan,
  };
}
