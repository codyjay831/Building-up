import { formatMoney } from '@/game/domain/money';
import { calculateMonthlyEconomy } from '@/game/domain/economy';
import { calculatePropertyParking } from '@/game/domain/parking';
import { getPropertyDemandView } from '@/game/selectors/leasingSelectors';
import { getCombinedOccupancyView } from '@/game/selectors/occupancySelectors';
import { getPropertyHealthView } from '@/game/selectors/propertyHealthSelectors';
import { getScenarioDefinition } from '@/game/config/scenario';
import { formatCalendarLabel } from '@/game/domain/calendar';
import type { GameConfig, GameState, MonthlyLedgerEntry } from '@/game/domain/types';

export interface PropertySummary {
  readonly scenarioName: string;
  readonly calendarLabel: string;
  readonly month: number;
  readonly cashLabel: string;
  readonly monthlyNetLabel: string;
  readonly monthlyNetTone: 'neutral' | 'positive' | 'negative' | 'projected';
  readonly monthlyNetIsProjected: boolean;
  readonly occupancyLabel: string;
  readonly occupancyPercent: number;
  readonly residentsLabel: string;
  readonly propertyHealthLabel: string;
  readonly propertyHealthTone: 'healthy' | 'at_risk' | 'declining' | 'critical';
  readonly parkingLabel: string;
  readonly parkingShortfallLabel: string | null;
  readonly appealLabel: string;
  readonly approvalLabel: string;
  readonly residentialDemandLabel: string;
  readonly retailDemandLabel: string;
  readonly effectiveRetailDemandLabel: string;
}

export function getLatestMonthlyLedgerEntry(
  state: Readonly<GameState>,
): MonthlyLedgerEntry | undefined {
  for (let index = state.ledger.length - 1; index >= 0; index -= 1) {
    const entry = state.ledger[index];
    if (entry.kind === 'monthly') {
      return entry;
    }
  }

  return undefined;
}

export function getPropertySummary(
  state: Readonly<GameState>,
  config: Readonly<GameConfig>,
): PropertySummary {
  const scenario = getScenarioDefinition(config.scenarios, state.scenarioId);
  const combinedOccupancy = getCombinedOccupancyView(state, config);
  const propertyHealth = getPropertyHealthView(state, config);
  const parking = calculatePropertyParking(state, config);
  const demandView = getPropertyDemandView(state, config);
  const latestMonthly = getLatestMonthlyLedgerEntry(state);
  const monthlyNet = latestMonthly?.netCashFlow;
  const projectedEconomy =
    monthlyNet === undefined
      ? calculateMonthlyEconomy(state, config, config.balance, 'projected-hud')
      : null;
  const projectedNet =
    projectedEconomy !== null
      ? projectedEconomy.grossRent - projectedEconomy.operatingExpenses
      : undefined;
  const monthlyNetIsProjected = monthlyNet === undefined && projectedNet !== undefined;
  const displayNet = monthlyNet ?? projectedNet;
  const monthlyNetTone =
    displayNet === undefined
      ? 'neutral'
      : monthlyNetIsProjected
        ? 'projected'
        : displayNet >= 0
          ? 'positive'
          : 'negative';

  return {
    scenarioName: scenario.name,
    calendarLabel: formatCalendarLabel(state, config),
    month: state.month,
    cashLabel: formatMoney(state.cash),
    monthlyNetLabel:
      displayNet === undefined
        ? '—'
        : monthlyNetIsProjected
          ? `~${formatMoney(displayNet)} projected`
          : formatMoney(displayNet),
    monthlyNetTone,
    monthlyNetIsProjected,
    occupancyLabel: combinedOccupancy.label,
    occupancyPercent: combinedOccupancy.percent,
    residentsLabel: combinedOccupancy.label,
    propertyHealthLabel: String(propertyHealth.score),
    propertyHealthTone: propertyHealth.tone,
    parkingLabel: `${String(parking.capacity)} capacity / ${String(parking.demand)} demand`,
    parkingShortfallLabel: demandView.parkingShortfallLabel,
    appealLabel: String(state.appeal),
    approvalLabel: `Level ${String(state.approval.level)}`,
    residentialDemandLabel: demandView.residentialDemandLabel,
    retailDemandLabel: demandView.retailDemandLabel,
    effectiveRetailDemandLabel: `${String(demandView.effectiveRetailDemand.effective)} / 100`,
  };
}
