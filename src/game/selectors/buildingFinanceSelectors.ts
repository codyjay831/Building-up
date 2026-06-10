import { getBuildingEconomyPreview } from '@/game/domain/economy';
import { formatMoney } from '@/game/domain/money';
import { getBuildingDefinitionForInstance } from '@/game/selectors/buildingSelectors';
import type { BuildingInstance, GameConfig, GameState } from '@/game/domain/types';

export interface BuildingFinanceView {
  readonly showFinance: boolean;
  readonly grossRentLabel: string;
  readonly grossRentTone: 'positive' | 'neutral';
  readonly residentialRentLabel?: string;
  readonly retailRentLabel?: string;
  readonly operatingExpensesLabel: string;
  readonly netOperatingIncomeLabel: string;
  readonly netOperatingIncomeTone: 'positive' | 'negative' | 'neutral';
}

function formatMonthlyAmount(amount: number): string {
  return `${formatMoney(amount)}/mo`;
}

function getNetOperatingIncomeTone(
  netOperatingIncome: number,
): BuildingFinanceView['netOperatingIncomeTone'] {
  if (netOperatingIncome > 0) {
    return 'positive';
  }

  if (netOperatingIncome < 0) {
    return 'negative';
  }

  return 'neutral';
}

export function getBuildingFinanceView(
  _state: Readonly<GameState>,
  config: Readonly<GameConfig>,
  building: Readonly<BuildingInstance>,
): BuildingFinanceView | null {
  const definition = getBuildingDefinitionForInstance(config, building);
  const preview = getBuildingEconomyPreview(building, definition, config.balance);

  if (!preview) {
    return null;
  }

  const { rent, expense } = preview;
  const netOperatingIncome = rent.totalRent - expense.totalExpense;
  const isMixedUse = definition.residentialUnits > 0 && definition.retailUnits > 0;

  return {
    showFinance: true,
    grossRentLabel: formatMonthlyAmount(rent.totalRent),
    grossRentTone: rent.totalRent > 0 ? 'positive' : 'neutral',
    residentialRentLabel: isMixedUse ? formatMonthlyAmount(rent.residentialRent) : undefined,
    retailRentLabel: isMixedUse ? formatMonthlyAmount(rent.retailRent) : undefined,
    operatingExpensesLabel: formatMonthlyAmount(expense.totalExpense),
    netOperatingIncomeLabel: formatMonthlyAmount(netOperatingIncome),
    netOperatingIncomeTone: getNetOperatingIncomeTone(netOperatingIncome),
  };
}
