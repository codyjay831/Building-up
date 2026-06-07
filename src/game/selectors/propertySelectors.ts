import { formatMoney } from '@/game/domain/money';
import { calculatePropertyParking } from '@/game/domain/parking';
import { getPropertyDemandView } from '@/game/selectors/leasingSelectors';
import { getScenarioDefinition } from '@/game/config/scenario';
import type { GameConfig, GameState, MonthlyLedgerEntry } from '@/game/domain/types';

export interface PropertySummary {
  readonly scenarioName: string;
  readonly month: number;
  readonly cashLabel: string;
  readonly monthlyNetLabel: string;
  readonly monthlyNetTone: 'neutral' | 'positive' | 'negative';
  readonly occupancyLabel: string;
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
  const totalResidentialUnits = state.buildings.reduce((total, building) => {
    const definition = config.buildings.get(building.definitionId);
    return total + (definition?.residentialUnits ?? 0);
  }, 0);
  const totalResidentialOccupied = state.buildings.reduce(
    (total, building) => total + building.residentialOccupied,
    0,
  );
  const parking = calculatePropertyParking(state, config);
  const demandView = getPropertyDemandView(state, config);
  const latestMonthly = getLatestMonthlyLedgerEntry(state);
  const monthlyNet = latestMonthly?.netCashFlow;
  const monthlyNetTone =
    monthlyNet === undefined ? 'neutral' : monthlyNet >= 0 ? 'positive' : 'negative';

  return {
    scenarioName: scenario.name,
    month: state.month,
    cashLabel: formatMoney(state.cash),
    monthlyNetLabel: monthlyNet === undefined ? '—' : formatMoney(monthlyNet),
    monthlyNetTone,
    occupancyLabel:
      totalResidentialUnits > 0
        ? `${String(totalResidentialOccupied)}/${String(totalResidentialUnits)} units`
        : '—',
    parkingLabel: `${String(parking.capacity)} capacity / ${String(parking.demand)} demand`,
    parkingShortfallLabel: demandView.parkingShortfallLabel,
    appealLabel: String(state.appeal),
    approvalLabel: `Level ${String(state.approval.level)}`,
    residentialDemandLabel: demandView.residentialDemandLabel,
    retailDemandLabel: demandView.retailDemandLabel,
    effectiveRetailDemandLabel: `${String(demandView.effectiveRetailDemand.effective)} / 100`,
  };
}
