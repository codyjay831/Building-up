import type { BalanceAssumptions } from '@/game/domain/types';

import balanceAssumptionsCsv from '@/game/config/data/balance-assumptions.csv?raw';

const CSV_KEY_MAP = {
  starting_cash: 'startingCash',
  base_appeal: 'baseAppeal',
  approval_2_positive_months: 'approval2PositiveMonths',
  approval_2_min_condition: 'approval2MinCondition',
  approval_2_cash_reserve: 'approval2CashReserve',
  approval_3_occupancy_months: 'approval3OccupancyMonths',
  approval_3_min_occupancy: 'approval3MinOccupancy',
  approval_3_min_appeal: 'approval3MinAppeal',
  approval_3_cash_reserve: 'approval3CashReserve',
  win_consecutive_months: 'winConsecutiveMonths',
  win_net_cash_flow: 'winNetCashFlow',
  win_occupancy: 'winOccupancy',
  win_appeal: 'winAppeal',
  win_cash_reserve: 'winCashReserve',
  discount_rent_multiplier: 'discountRentMultiplier',
  premium_rent_multiplier: 'premiumRentMultiplier',
  discount_leasing_modifier: 'discountLeasingModifier',
  premium_leasing_modifier: 'premiumLeasingModifier',
  condition_decay_per_month: 'conditionDecayPerMonth',
  low_condition_expense_surcharge_percent: 'lowConditionExpenseSurchargePercent',
  high_condition_appeal_threshold: 'highConditionAppealThreshold',
  low_condition_appeal_threshold: 'lowConditionAppealThreshold',
  vacancy_appeal_threshold_percent: 'vacancyAppealThresholdPercent',
  demand_drift_per_month: 'demandDriftPerMonth',
  demand_variation_range: 'demandVariationRange',
  local_customer_factor: 'localCustomerFactor',
  mixed_use_retail_synergy: 'mixedUseRetailSynergy',
  retail_frontage_bonus: 'retailFrontageBonus',
  retail_parking_shortfall_penalty: 'retailParkingShortfallPenalty',
  retail_parking_coverage_penalty: 'retailParkingCoveragePenalty',
  leasing_demand_weight: 'leasingDemandWeight',
  leasing_appeal_weight: 'leasingAppealWeight',
  leasing_condition_weight: 'leasingConditionWeight',
  leasing_parking_weight: 'leasingParkingWeight',
  leasing_move_in_threshold: 'leasingMoveInThreshold',
  leasing_move_out_threshold: 'leasingMoveOutThreshold',
  apartment_max_occupancy_changes: 'apartmentMaxOccupancyChanges',
  default_max_occupancy_changes: 'defaultMaxOccupancyChanges',
  suburb_demand_per_resident: 'suburbDemandPerResident',
  renovation_cost: 'renovationCost',
  renovation_condition_gain: 'renovationConditionGain',
  renovation_months: 'renovationMonths',
  demolition_cost_percent: 'demolitionCostPercent',
  min_demolition_cost: 'minDemolitionCost',
  existing_house_demolition_cost: 'existingHouseDemolitionCost',
  existing_house_sale_base: 'existingHouseSaleBase',
  sale_value_percent: 'saleValuePercent',
  land_base_value: 'landBaseValue',
  stabilized_income_cap_months: 'stabilizedIncomeCapMonths',
  appeal_premium_per_point: 'appealPremiumPerPoint',
  construction_risk_percent: 'constructionRiskPercent',
  construction_loan_min_project_cost: 'constructionLoanMinProjectCost',
  construction_loan_equity_percent: 'constructionLoanEquityPercent',
  construction_loan_term_months: 'constructionLoanTermMonths',
  refinance_max_ltv_percent: 'refinanceMaxLtvPercent',
  refinance_payment_per_1000_principal: 'refinancePaymentPer1000Principal',
  emergency_investor_offer_amount: 'emergencyInvestorOfferAmount',
  insolvency_loss_months: 'insolvencyLossMonths',
  warning_orange_reserve_months: 'warningOrangeReserveMonths',
  neighborhood_fill_win_net_cash_flow: 'neighborhoodFillWinNetCashFlow',
} as const satisfies Record<string, keyof BalanceAssumptions>;

function isBalanceCsvKey(key: string): key is keyof typeof CSV_KEY_MAP {
  return key in CSV_KEY_MAP;
}

function parseNumericValue(raw: string, key: string): number {
  const parsed = Number(raw);

  if (!Number.isFinite(parsed)) {
    throw new RangeError(`Balance assumption "${key}" is not numeric: ${raw}`);
  }

  return parsed;
}

export function parseBalanceAssumptions(csvText: string): BalanceAssumptions {
  const rows = csvText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (rows.length <= 1) {
    throw new Error('Balance assumptions CSV must include a header and at least one row');
  }

  const values = {} as Record<keyof BalanceAssumptions, number | undefined>;

  for (const row of rows.slice(1)) {
    const columns = row.split(',');
    const key = columns[0]?.trim();
    const initialValue = columns[1]?.trim();

    if (!key || !initialValue) {
      continue;
    }

    if (!isBalanceCsvKey(key)) {
      continue;
    }

    values[CSV_KEY_MAP[key]] = parseNumericValue(initialValue, key);
  }

  for (const mappedKey of Object.values(CSV_KEY_MAP)) {
    if (values[mappedKey] === undefined) {
      throw new Error(`Missing balance assumption for ${mappedKey}`);
    }
  }

  return values as BalanceAssumptions;
}

export function loadBalanceAssumptions(
  csvText: string = balanceAssumptionsCsv,
): BalanceAssumptions {
  return parseBalanceAssumptions(csvText);
}
