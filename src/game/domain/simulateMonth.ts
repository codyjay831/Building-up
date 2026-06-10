import { getBuildingDefinition } from '@/game/config/buildings';
import { calculateAppeal } from '@/game/domain/appeal';
import { applyConditionDecay } from '@/game/domain/condition';
import { processConstructionDraws } from '@/game/domain/construction';
import { applyMarketDemandAdvance } from '@/game/domain/demand';
import { calculateMonthlyEconomy } from '@/game/domain/economy';
import { calculateCombinedOccupancyPercent, processMonthlyLeasing } from '@/game/domain/leasing';
import { applyApprovalUnlocks, completeRenovations } from '@/game/domain/progression';
import { processMonthlyDebtPayments } from '@/game/domain/debt';
import { applyInsolvencyProgress, applyLossCondition } from '@/game/domain/recovery';
import { calculatePropertyHealthSnapshot } from '@/game/domain/propertyHealth';
import { applyWinProgress } from '@/game/domain/winLoss';
import { appendMonthlyLedgerEntry, createLedgerLine } from '@/game/domain/ledger';
import { calculatePropertyParking } from '@/game/domain/parking';
import type {
  CommandResult,
  DomainEvent,
  GameConfig,
  GameState,
  LedgerLine,
  OccupancyLedgerChange,
} from '@/game/domain/types';

function createMonthlyEntryId(state: Readonly<GameState>, month: number): string {
  return `ledger-${String(month)}-${String(state.ledger.length + 1)}`;
}

export function simulateMonth(
  state: Readonly<GameState>,
  config: Readonly<GameConfig>,
): CommandResult {
  const openingCash = state.cash;
  const nextMonth = state.month + 1;
  const previousPropertyHealthSnapshot = (() => {
    const snapshot = calculatePropertyHealthSnapshot(state, config);
    return {
      score: snapshot.score,
      occupancyPercent: snapshot.occupancyPercent,
    };
  })();

  let workingState: GameState = {
    ...state,
    month: nextMonth,
  };

  const constructionResult = processConstructionDraws(workingState, config);
  workingState = constructionResult.state;
  const events: DomainEvent[] = [...constructionResult.events];

  const demandAdvance = applyMarketDemandAdvance(workingState, config.balance);
  workingState = demandAdvance.state;
  let rngCounter = demandAdvance.rngCounter;

  if (
    workingState.market.residentialDemand !== state.market.residentialDemand ||
    workingState.market.retailDemand !== state.market.retailDemand
  ) {
    events.push({
      type: 'MarketDemandChanged',
      residentialDemand: workingState.market.residentialDemand,
      retailDemand: workingState.market.retailDemand,
    });
  }

  const parking = calculatePropertyParking(workingState, config);
  const appealForLeasing = calculateAppeal(workingState, config, config.balance, parking);

  const leasingResult = processMonthlyLeasing(
    workingState,
    config,
    config.balance,
    appealForLeasing,
    parking,
    rngCounter,
  );
  workingState = leasingResult.state;
  rngCounter = leasingResult.rngCounter;

  for (const change of leasingResult.changes) {
    events.push({
      type: 'OccupancyChanged',
      buildingId: change.buildingId,
      residentialDelta: change.residentialDelta,
      retailDelta: change.retailDelta,
    });
  }

  const entryId = createMonthlyEntryId(state, nextMonth);
  let lineIndex = 0;
  const lines: LedgerLine[] = [];

  for (const advanceLine of constructionResult.advanceLines) {
    lines.push(
      createLedgerLine(
        entryId,
        lineIndex,
        advanceLine.category,
        advanceLine.label,
        advanceLine.amount,
        {
          projectId: advanceLine.projectId,
        },
      ),
    );
    lineIndex += 1;
  }

  const economy = calculateMonthlyEconomy(workingState, config, config.balance, entryId);

  for (const rentLine of economy.rentLines) {
    lines.push({ ...rentLine, id: `${entryId}-line-${String(lineIndex)}` });
    lineIndex += 1;
  }

  for (const expenseLine of economy.expenseLines) {
    lines.push({ ...expenseLine, id: `${entryId}-line-${String(lineIndex)}` });
    lineIndex += 1;
  }

  const debtPayments = processMonthlyDebtPayments(workingState, entryId, lineIndex);
  workingState = debtPayments.state;

  for (const debtLine of debtPayments.lines) {
    lines.push(debtLine);
    lineIndex += 1;
  }

  workingState = applyConditionDecay(workingState, config, config.balance);
  workingState = completeRenovations(workingState, config.balance);

  const finalParking = calculatePropertyParking(workingState, config);
  const appeal = calculateAppeal(workingState, config, config.balance, finalParking);

  const occupancyChanges: OccupancyLedgerChange[] = leasingResult.changes.map((change) => {
    const building = workingState.buildings.find((candidate) => candidate.id === change.buildingId);
    const definition = building
      ? getBuildingDefinition(config.buildings, building.definitionId)
      : null;

    return {
      buildingId: change.buildingId,
      buildingName: definition?.name ?? change.buildingId,
      residentialDelta: change.residentialDelta,
      retailDelta: change.retailDelta,
      residentialLeasingScore: change.residentialLeasingScore,
      retailLeasingScore: change.retailLeasingScore,
      residentialTopFactors: change.residentialTopFactors,
      retailTopFactors: change.retailTopFactors,
      moveOutThreshold: config.balance.leasingMoveOutThreshold,
      moveInThreshold: config.balance.leasingMoveInThreshold,
    };
  });

  const demandChange =
    workingState.market.residentialDemand !== state.market.residentialDemand ||
    workingState.market.retailDemand !== state.market.retailDemand
      ? {
          residentialDemand: workingState.market.residentialDemand,
          retailDemand: workingState.market.retailDemand,
          previousResidentialDemand: state.market.residentialDemand,
          previousRetailDemand: state.market.retailDemand,
        }
      : undefined;

  const withLedger = appendMonthlyLedgerEntry(workingState, nextMonth, openingCash, lines, {
    grossRent: economy.grossRent,
    operatingExpenses: economy.operatingExpenses,
    occupancyChanges,
    demandChange,
    previousPropertyHealthSnapshot,
  });

  const propertyHealthSnapshot = (() => {
    const snapshot = calculatePropertyHealthSnapshot({ ...withLedger.state, appeal }, config);
    return {
      score: snapshot.score,
      occupancyPercent: snapshot.occupancyPercent,
    };
  })();

  const finalLedgerEntry = {
    ...withLedger.entry,
    propertyHealthSnapshot,
  };

  const netCashFlow = finalLedgerEntry.netCashFlow;
  const consecutivePositiveCashFlowMonths =
    netCashFlow > 0 ? state.counters.consecutivePositiveCashFlowMonths + 1 : 0;
  const occupancyPercent = calculateCombinedOccupancyPercent(withLedger.state, config);
  const consecutiveHighOccupancyMonths =
    occupancyPercent >= config.balance.winOccupancy
      ? state.counters.consecutiveHighOccupancyMonths + 1
      : 0;
  const consecutiveApproval3OccupancyMonths =
    occupancyPercent >= config.balance.approval3MinOccupancy
      ? state.counters.consecutiveApproval3OccupancyMonths + 1
      : 0;

  events.push({
    type: 'MonthSimulated',
    month: nextMonth,
    netCashFlow,
  });

  let finalState: GameState = {
    ...withLedger.state,
    appeal,
    ledger: withLedger.state.ledger.map((entry) =>
      entry.id === withLedger.entry.id ? finalLedgerEntry : entry,
    ),
    counters: {
      ...withLedger.state.counters,
      consecutivePositiveCashFlowMonths,
      consecutiveHighOccupancyMonths,
      consecutiveApproval3OccupancyMonths,
      rngCounter,
    },
  };

  finalState = applyApprovalUnlocks(finalState, config, config.balance);
  finalState = applyWinProgress(finalState, config, config.balance, netCashFlow, occupancyPercent);
  finalState = applyInsolvencyProgress(finalState);
  finalState = applyLossCondition(finalState, config);

  return {
    ok: true,
    events,
    state: finalState,
  };
}
