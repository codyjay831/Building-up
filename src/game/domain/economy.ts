import { getBuildingDefinition } from '@/game/config/buildings';
import { isActiveEconomyBuilding } from '@/game/domain/condition';
import { assertWholeDollars, sumMoney } from '@/game/domain/money';
import type {
  BalanceAssumptions,
  BuildingDefinition,
  BuildingInstance,
  GameConfig,
  GameState,
  LedgerLine,
  RentPosture,
} from '@/game/domain/types';

export interface BuildingRentBreakdown {
  readonly buildingId: string;
  readonly buildingName: string;
  readonly residentialRent: number;
  readonly retailRent: number;
  readonly totalRent: number;
}

export interface BuildingExpenseBreakdown {
  readonly buildingId: string;
  readonly buildingName: string;
  readonly baseExpense: number;
  readonly totalExpense: number;
}

export interface MonthlyEconomyBreakdown {
  readonly grossRent: number;
  readonly operatingExpenses: number;
  readonly rentLines: readonly LedgerLine[];
  readonly expenseLines: readonly LedgerLine[];
}

function getRentMultiplier(posture: RentPosture, balance: Readonly<BalanceAssumptions>): number {
  switch (posture) {
    case 'discount':
      return balance.discountRentMultiplier;
    case 'premium':
      return balance.premiumRentMultiplier;
    default:
      return 1;
  }
}

function calculateBuildingRent(
  building: Readonly<BuildingInstance>,
  definition: Readonly<BuildingDefinition>,
  balance: Readonly<BalanceAssumptions>,
): BuildingRentBreakdown {
  const multiplier = getRentMultiplier(building.rentPosture, balance);
  const residentialBase = definition.baseResidentialRentPerUnit ?? definition.baseRentPerUnit ?? 0;
  const retailBase = definition.baseRetailRentPerUnit ?? definition.baseRentPerUnit ?? 0;

  const residentialRent = assertWholeDollars(
    Math.round(residentialBase * building.residentialOccupied * multiplier),
    'residentialRent',
  );
  const retailRent = assertWholeDollars(
    Math.round(retailBase * building.retailOccupied * multiplier),
    'retailRent',
  );

  return {
    buildingId: building.id,
    buildingName: definition.name,
    residentialRent,
    retailRent,
    totalRent: sumMoney([residentialRent, retailRent]),
  };
}

function calculateBuildingOperatingExpense(
  building: Readonly<BuildingInstance>,
  definition: Readonly<BuildingDefinition>,
  balance: Readonly<BalanceAssumptions>,
): BuildingExpenseBreakdown {
  let totalExpense = definition.operatingExpense;

  if (building.condition < balance.lowConditionAppealThreshold) {
    totalExpense = assertWholeDollars(
      Math.round(totalExpense * (1 + balance.lowConditionExpenseSurchargePercent / 100)),
      'conditionSurchargeExpense',
    );
  }

  const totalUnits = definition.residentialUnits + definition.retailUnits;
  if (totalUnits > 0) {
    const occupiedUnits = building.residentialOccupied + building.retailOccupied;
    const vacancyRatio = (totalUnits - occupiedUnits) / totalUnits;
    totalExpense = assertWholeDollars(
      Math.round(totalExpense * (1 - vacancyRatio * 0.2)),
      'vacancyAdjustedExpense',
    );
  }

  return {
    buildingId: building.id,
    buildingName: definition.name,
    baseExpense: definition.operatingExpense,
    totalExpense,
  };
}

export function calculateMonthlyEconomy(
  state: Readonly<GameState>,
  config: Readonly<GameConfig>,
  balance: Readonly<BalanceAssumptions>,
  entryId: string,
): MonthlyEconomyBreakdown {
  const rentLines: LedgerLine[] = [];
  const expenseLines: LedgerLine[] = [];
  let lineIndex = 0;

  for (const building of state.buildings) {
    if (!isActiveEconomyBuilding(building)) {
      continue;
    }

    const definition = getBuildingDefinition(config.buildings, building.definitionId);
    const rent = calculateBuildingRent(building, definition, balance);

    if (rent.residentialRent > 0) {
      rentLines.push({
        id: `${entryId}-line-${String(lineIndex)}`,
        category: 'rent_residential',
        label: `${definition.name} — residential rent`,
        amount: rent.residentialRent,
        buildingId: building.id,
      });
      lineIndex += 1;
    }

    if (rent.retailRent > 0) {
      rentLines.push({
        id: `${entryId}-line-${String(lineIndex)}`,
        category: 'rent_retail',
        label: `${definition.name} — retail rent`,
        amount: rent.retailRent,
        buildingId: building.id,
      });
      lineIndex += 1;
    }

    const expense = calculateBuildingOperatingExpense(building, definition, balance);
    if (expense.totalExpense > 0) {
      expenseLines.push({
        id: `${entryId}-line-${String(lineIndex)}`,
        category: 'operating_expense',
        label: `${definition.name} — operating expense`,
        amount: -expense.totalExpense,
        buildingId: building.id,
      });
      lineIndex += 1;
    }
  }

  const grossRent = sumMoney(rentLines.map((line) => line.amount));
  const operatingExpenses = sumMoney(expenseLines.map((line) => -line.amount));

  return {
    grossRent,
    operatingExpenses,
    rentLines,
    expenseLines,
  };
}

export function getRentMultiplierForPosture(
  posture: RentPosture,
  balance: Readonly<BalanceAssumptions>,
): number {
  return getRentMultiplier(posture, balance);
}
