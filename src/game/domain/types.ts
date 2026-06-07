/** Serializable domain truth for Vertical Plot Manager. */

export const LOT_WIDTH = 12;
export const LOT_HEIGHT = 12;
export const SCHEMA_VERSION = 1;

export type TileCoord = {
  readonly x: number;
  readonly y: number;
};

export type Rotation = 0 | 90;

export interface PlacedFootprint {
  readonly origin: TileCoord;
  readonly width: number;
  readonly height: number;
  readonly rotation: Rotation;
}

export type BuildingCategory = 'residential' | 'retail' | 'mixed' | 'parking' | 'amenity';

export type BuildingLifecycleState =
  | 'existing'
  | 'planned'
  | 'under_construction'
  | 'leasing'
  | 'operating'
  | 'renovating'
  | 'for_sale'
  | 'demolishing';

export type RentPosture = 'discount' | 'market' | 'premium';

export interface BuildingDefinition {
  readonly id: string;
  readonly name: string;
  readonly category: BuildingCategory;
  readonly footprint: {
    readonly width: number;
    readonly height: number;
  };
  readonly floors: number;
  readonly approvalRequired: number;
  readonly constructionCost: number;
  readonly constructionMonths: number;
  readonly operatingExpense: number;
  readonly residentialUnits: number;
  readonly retailUnits: number;
  readonly parkingCapacity: number;
  readonly parkingDemand: number;
  readonly appealModifier: number;
  readonly roadAccessRequired: boolean;
  readonly enabledInMvp: boolean;
  readonly baseRentPerUnit?: number;
  readonly baseResidentialRentPerUnit?: number;
  readonly baseRetailRentPerUnit?: number;
}

export interface BuildingInstance {
  readonly id: string;
  readonly definitionId: string;
  readonly footprint: PlacedFootprint;
  readonly lifecycleState: BuildingLifecycleState;
  readonly condition: number;
  readonly residentialOccupied: number;
  readonly retailOccupied: number;
  readonly rentPosture: RentPosture;
  readonly renovated: boolean;
}

export interface LotState {
  readonly width: number;
  readonly height: number;
  /** Walkable driveway or access tiles that provide parking; not buildable. */
  readonly accessTiles: readonly TileCoord[];
  readonly accessParkingCapacity: number;
}

export interface MarketState {
  readonly residentialDemand: number;
  readonly retailDemand: number;
  readonly residentialBaseline: number;
  readonly retailBaseline: number;
}

export interface ApprovalState {
  readonly level: number;
  readonly unlockedLevels: readonly number[];
}

export interface DebtState {
  readonly id: string;
  readonly type: 'construction_loan' | 'refinance';
  readonly principal: number;
  readonly originalPrincipal: number;
  readonly monthlyPayment: number;
  readonly projectId?: string;
  /** When false, principal is committed but monthly payments have not started. */
  readonly paymentsActive: boolean;
}

export type ConstructionProjectStatus =
  | 'committed'
  | 'under_construction'
  | 'cancelled'
  | 'completed';

export interface ConstructionProject {
  readonly id: string;
  readonly buildingId: string;
  readonly definitionId: string;
  readonly footprint: PlacedFootprint;
  readonly status: ConstructionProjectStatus;
  readonly committedMonth: number;
  readonly monthsRemaining: number;
  readonly totalCost: number;
  readonly depositPaid: number;
  /** Locked draw schedule; remaining draws are the first `monthsRemaining` entries. */
  readonly monthlyDraws: readonly number[];
  readonly amountSpent: number;
  readonly financedWithLoan: boolean;
  readonly loanDebtId?: string;
}

export type ForecastRiskCode = 'insufficient_reserve' | 'parking_shortage';

export interface ForecastRisk {
  readonly code: ForecastRiskCode;
  readonly message: string;
}

export interface ProjectForecast {
  readonly definitionId: string;
  readonly footprint: PlacedFootprint;
  readonly totalCost: number;
  readonly cashDueNow: number;
  readonly monthlyDraws: readonly number[];
  readonly completionMonth: number;
  readonly buildDurationMonths: number;
  readonly parkingAfterBuild: { readonly capacity: number; readonly demand: number };
  readonly risks: readonly ForecastRisk[];
}

export type DomainEvent =
  | { readonly type: 'ProjectCommitted'; readonly projectId: string; readonly deposit: number }
  | {
      readonly type: 'ConstructionAdvanced';
      readonly projectId: string;
      readonly draw: number;
      readonly monthsRemaining: number;
    }
  | {
      readonly type: 'ConstructionCompleted';
      readonly projectId: string;
      readonly buildingId: string;
    }
  | { readonly type: 'ProjectCancelled'; readonly projectId: string; readonly refund: number }
  | { readonly type: 'MonthSimulated'; readonly month: number; readonly netCashFlow: number }
  | {
      readonly type: 'OccupancyChanged';
      readonly buildingId: string;
      readonly residentialDelta: number;
      readonly retailDelta: number;
    }
  | {
      readonly type: 'MarketDemandChanged';
      readonly residentialDemand: number;
      readonly retailDemand: number;
    };

export interface CommandSuccess {
  readonly ok: true;
  readonly state: GameState;
  readonly events: readonly DomainEvent[];
}

export interface CommandFailure {
  readonly ok: false;
  readonly error: GameRuleError;
}

export type CommandResult = CommandSuccess | CommandFailure;

export interface ActiveEvent {
  readonly id: string;
  readonly eventType: string;
  readonly remainingMonths: number;
}

export type LedgerEntryKind = 'transaction' | 'monthly';

export type LedgerLineCategory =
  | 'rent_residential'
  | 'rent_retail'
  | 'operating_expense'
  | 'construction_draw'
  | 'project_deposit'
  | 'project_refund'
  | 'renovation_cost'
  | 'demolition_cost'
  | 'sale_proceeds'
  | 'debt_payment'
  | 'refinance_proceeds'
  | 'emergency_investor';

export interface LedgerLine {
  readonly id: string;
  readonly category: LedgerLineCategory;
  readonly label: string;
  readonly amount: number;
  readonly buildingId?: string;
  readonly projectId?: string;
}

export interface MonthlyLedgerEntry {
  readonly id: string;
  readonly month: number;
  readonly kind: LedgerEntryKind;
  readonly openingCash: number;
  readonly closingCash: number;
  readonly netCashFlow: number;
  readonly lines: readonly LedgerLine[];
  readonly grossRent: number;
  readonly operatingExpenses: number;
  readonly occupancyChanges?: readonly OccupancyLedgerChange[];
}

export interface OccupancyLedgerChange {
  readonly buildingId: string;
  readonly buildingName: string;
  readonly residentialDelta: number;
  readonly retailDelta: number;
}

export interface ParkingSnapshot {
  readonly capacity: number;
  readonly demand: number;
  readonly shortfall: number;
  readonly coverage: number;
}

export interface ProgressCounters {
  readonly consecutivePositiveCashFlowMonths: number;
  readonly consecutiveHighOccupancyMonths: number;
  readonly consecutiveApproval3OccupancyMonths: number;
  readonly consecutiveInsolventMonths: number;
  readonly consecutiveWinConditionMonths: number;
  readonly refinanceUsed: boolean;
  readonly emergencyOfferUsed: boolean;
  readonly nextBuildingSequence: number;
  readonly nextProjectSequence: number;
  readonly nextDebtSequence: number;
  readonly rngCounter: number;
}

export type GameStatus = 'active' | 'won' | 'lost';

export interface GameState {
  readonly schemaVersion: number;
  readonly runId: string;
  readonly seed: string;
  readonly scenarioId: string;
  readonly month: number;
  readonly cash: number;
  readonly debt: readonly DebtState[];
  readonly lot: LotState;
  readonly buildings: readonly BuildingInstance[];
  readonly projects: readonly ConstructionProject[];
  readonly market: MarketState;
  readonly approval: ApprovalState;
  readonly appeal: number;
  readonly events: readonly ActiveEvent[];
  readonly ledger: readonly MonthlyLedgerEntry[];
  readonly counters: ProgressCounters;
  readonly status: GameStatus;
}

export type PlacementFailureReason =
  | 'out_of_bounds'
  | 'tile_occupied'
  | 'access_tile_blocked'
  | 'insufficient_approval'
  | 'insufficient_cash'
  | 'no_road_access'
  | 'building_locked'
  | 'construction_overlap';

export type CommandFailureReason =
  | PlacementFailureReason
  | 'project_not_found'
  | 'project_not_cancellable'
  | 'building_not_found'
  | 'invalid_rent_posture'
  | 'building_not_renovatable'
  | 'already_renovated'
  | 'building_not_redevelopable'
  | 'building_has_active_project'
  | 'game_not_active'
  | 'loan_not_eligible'
  | 'refinance_unavailable'
  | 'emergency_offer_unavailable'
  | 'insufficient_equity';

export interface PlacementFailure {
  readonly ok: false;
  readonly reason: PlacementFailureReason;
  readonly message: string;
}

export interface CommandRuleFailure {
  readonly ok: false;
  readonly reason: CommandFailureReason;
  readonly message: string;
}

export interface PlacementSuccess {
  readonly ok: true;
  readonly state: GameState;
  readonly buildingId: string;
}

export type PlaceStructureResult = PlacementSuccess | PlacementFailure;

export type GameRuleError = PlacementFailure | CommandRuleFailure;

export interface BalanceAssumptions {
  readonly startingCash: number;
  readonly baseAppeal: number;
  readonly approval2PositiveMonths: number;
  readonly approval2MinCondition: number;
  readonly approval2CashReserve: number;
  readonly approval3OccupancyMonths: number;
  readonly approval3MinOccupancy: number;
  readonly approval3MinAppeal: number;
  readonly approval3CashReserve: number;
  readonly winConsecutiveMonths: number;
  readonly winNetCashFlow: number;
  readonly winOccupancy: number;
  readonly winAppeal: number;
  readonly winCashReserve: number;
  readonly discountRentMultiplier: number;
  readonly premiumRentMultiplier: number;
  readonly discountLeasingModifier: number;
  readonly premiumLeasingModifier: number;
  readonly conditionDecayPerMonth: number;
  readonly lowConditionExpenseSurchargePercent: number;
  readonly highConditionAppealThreshold: number;
  readonly lowConditionAppealThreshold: number;
  readonly vacancyAppealThresholdPercent: number;
  readonly demandDriftPerMonth: number;
  readonly demandVariationRange: number;
  readonly localCustomerFactor: number;
  readonly mixedUseRetailSynergy: number;
  readonly retailFrontageBonus: number;
  readonly retailParkingShortfallPenalty: number;
  readonly retailParkingCoveragePenalty: number;
  readonly leasingDemandWeight: number;
  readonly leasingAppealWeight: number;
  readonly leasingConditionWeight: number;
  readonly leasingParkingWeight: number;
  readonly leasingMoveInThreshold: number;
  readonly leasingMoveOutThreshold: number;
  readonly apartmentMaxOccupancyChanges: number;
  readonly defaultMaxOccupancyChanges: number;
  readonly suburbDemandPerResident: number;
  readonly renovationCost: number;
  readonly renovationConditionGain: number;
  readonly renovationMonths: number;
  readonly demolitionCostPercent: number;
  readonly minDemolitionCost: number;
  readonly existingHouseDemolitionCost: number;
  readonly existingHouseSaleBase: number;
  readonly saleValuePercent: number;
  readonly landBaseValue: number;
  readonly stabilizedIncomeCapMonths: number;
  readonly appealPremiumPerPoint: number;
  readonly constructionRiskPercent: number;
  readonly constructionLoanMinProjectCost: number;
  readonly constructionLoanEquityPercent: number;
  readonly constructionLoanTermMonths: number;
  readonly refinanceMaxLtvPercent: number;
  readonly refinancePaymentPer1000Principal: number;
  readonly emergencyInvestorOfferAmount: number;
  readonly insolvencyLossMonths: number;
  readonly warningOrangeReserveMonths: number;
}

export interface ScenarioDefinition {
  readonly id: string;
  readonly name: string;
  readonly theme?: 'urban' | 'suburb';
  readonly residentialDemand: number;
  readonly retailDemand: number;
  readonly lockedBuildingIds: readonly string[];
  readonly lot: {
    readonly width: number;
    readonly height: number;
  };
  readonly starterBuildings: readonly StarterBuildingSpec[];
  readonly driveway: {
    readonly tiles: readonly TileCoord[];
    readonly parkingCapacity: number;
  };
  readonly startingCashOverride?: number;
  readonly appealRules?: {
    readonly vacancyPenaltyEnabled?: boolean;
  };
}

export interface StarterBuildingSpec {
  readonly definitionId: string;
  readonly footprint: PlacedFootprint;
  readonly condition: number;
  readonly residentialOccupied: number;
  readonly lifecycleState?: BuildingLifecycleState;
}

export interface GameConfig {
  readonly buildings: ReadonlyMap<string, BuildingDefinition>;
  readonly buildingList: readonly BuildingDefinition[];
  readonly balance: BalanceAssumptions;
  readonly scenarios: ReadonlyMap<string, ScenarioDefinition>;
}
