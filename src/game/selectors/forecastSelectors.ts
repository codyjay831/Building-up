import { buildProjectForecast } from '@/game/domain/construction';
import { formatMoney } from '@/game/domain/money';
import type { GameConfig, GameState } from '@/game/domain/types';
import type { PlacementPreview } from '@/game/store/storeTypes';
import { buildPreviewFootprint } from '@/game/selectors/placementSelectors';

export interface ProjectForecastView {
  readonly forecast: ReturnType<typeof buildProjectForecast>;
  readonly totalCostLabel: string;
  readonly cashDueNowLabel: string;
  readonly cashBuildNoteLabel: string;
  readonly completionMonthLabel: string;
  readonly buildDurationLabel: string;
  readonly parkingLabel: string;
  readonly loanEquityRequiredLabel: string;
  readonly loanPrincipalLabel: string;
  readonly loanInterestRangeLabel: string;
  readonly loanPaymentAfterBuildLabel: string;
  readonly loanEligible: boolean;
}

export function getProjectForecastForPreview(
  state: Readonly<GameState>,
  config: Readonly<GameConfig>,
  preview: PlacementPreview,
): ProjectForecastView {
  const footprint = buildPreviewFootprint(preview, config);
  const forecast = buildProjectForecast(state, config, preview.definitionId, footprint);
  const loan = forecast.constructionLoan;

  return {
    forecast,
    totalCostLabel: formatMoney(forecast.totalCost),
    cashDueNowLabel: formatMoney(forecast.cashDueNow),
    cashBuildNoteLabel: 'No payments during construction',
    completionMonthLabel: `Month ${String(forecast.completionMonth)}`,
    buildDurationLabel: `${String(forecast.buildDurationMonths)} months`,
    parkingLabel: `${String(forecast.parkingAfterBuild.capacity)} capacity / ${String(forecast.parkingAfterBuild.demand)} demand`,
    loanEligible: loan.eligible,
    loanEquityRequiredLabel: formatMoney(loan.equityRequired),
    loanPrincipalLabel: formatMoney(loan.loanPrincipal),
    loanInterestRangeLabel: `${formatMoney(loan.estimatedFirstMonthInterest)} → ${formatMoney(loan.estimatedPeakMonthInterest)}/mo`,
    loanPaymentAfterBuildLabel: `${formatMoney(loan.monthlyPaymentAfterCompletion)}/mo`,
  };
}
