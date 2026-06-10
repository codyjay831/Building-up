import { getBuildingDefinition } from '@/game/config/buildings';
import { getConstructionFinanceEra } from '@/game/config/constructionFinance';
import { buildProjectForecast } from '@/game/domain/construction';
import { getCalendarYear } from '@/game/domain/calendar';
import {
  calculateConstructionLoanTerms,
  canOfferConstructionLoan,
  createConstructionLoanDebt,
} from '@/game/domain/debt';
import { appendTransactionLedgerEntry, createLedgerLine } from '@/game/domain/ledger';
import { hasSufficientCash } from '@/game/domain/money';
import { validatePlacement } from '@/game/domain/placement';
import type {
  CommandResult,
  CommandRuleFailure,
  DomainEvent,
  GameConfig,
  GameState,
  PlacedFootprint,
} from '@/game/domain/types';

export interface PlaceProjectCommand {
  readonly definitionId: string;
  readonly footprint: PlacedFootprint;
  readonly useConstructionLoan?: boolean;
}

function commandFailure(reason: CommandRuleFailure['reason'], message: string): CommandRuleFailure {
  return { ok: false, reason, message };
}

export function placeProject(
  state: Readonly<GameState>,
  config: Readonly<GameConfig>,
  command: PlaceProjectCommand,
): CommandResult {
  const definition = getBuildingDefinition(config.buildings, command.definitionId);
  const calendarYear = getCalendarYear(state, config);
  const era = getConstructionFinanceEra(config.constructionFinanceEras, calendarYear);
  const useConstructionLoan = command.useConstructionLoan === true;
  const loanTerms = calculateConstructionLoanTerms(
    definition.constructionCost,
    era,
    config.balance,
    definition.constructionMonths,
  );
  const forecast = buildProjectForecast(state, config, command.definitionId, command.footprint);
  const cashDueNow = useConstructionLoan ? loanTerms.equityRequired : forecast.cashDueNow;

  if (useConstructionLoan) {
    if (!canOfferConstructionLoan(definition, state, era)) {
      return {
        ok: false,
        error: commandFailure(
          'loan_not_eligible',
          'This project is not eligible for a construction loan',
        ),
      };
    }

    if (!hasSufficientCash(state.cash, loanTerms.equityRequired)) {
      return {
        ok: false,
        error: commandFailure(
          'insufficient_equity',
          `Insufficient cash for required equity. Required ${String(loanTerms.equityRequired)}, available ${String(state.cash)}`,
        ),
      };
    }
  } else if (!hasSufficientCash(state.cash, forecast.cashDueNow)) {
    return {
      ok: false,
      error: commandFailure(
        'insufficient_cash',
        `Insufficient cash for project payment. Required ${String(forecast.cashDueNow)}, available ${String(state.cash)}`,
      ),
    };
  }

  const validation = validatePlacement({
    state,
    config,
    definition,
    footprint: command.footprint,
    minimumCashRequired: cashDueNow,
  });

  if (!validation.ok) {
    return { ok: false, error: validation };
  }

  const projectId = `project-${state.counters.nextProjectSequence.toString()}`;
  const buildingId = `building-${state.counters.nextBuildingSequence.toString()}`;
  const entryId = `ledger-${String(state.month)}-${String(state.ledger.length + 1)}`;
  const withDeposit = appendTransactionLedgerEntry(state, [
    createLedgerLine(
      entryId,
      0,
      'project_deposit',
      useConstructionLoan
        ? `${definition.name} — project equity contribution`
        : `${definition.name} — project payment`,
      -cashDueNow,
      { projectId },
    ),
  ]);
  const events: DomainEvent[] = [
    {
      type: 'ProjectCommitted',
      projectId,
      deposit: cashDueNow,
    },
  ];

  const loanDebtId = useConstructionLoan
    ? `debt-${String(state.counters.nextDebtSequence)}`
    : undefined;

  return {
    ok: true,
    events,
    state: {
      ...withDeposit.state,
      buildings: [
        ...withDeposit.state.buildings,
        {
          id: buildingId,
          definitionId: definition.id,
          footprint: command.footprint,
          lifecycleState: 'under_construction',
          condition: 100,
          residentialOccupied: 0,
          retailOccupied: 0,
          rentPosture: 'market',
          renovated: false,
        },
      ],
      projects: [
        ...withDeposit.state.projects,
        {
          id: projectId,
          buildingId,
          definitionId: definition.id,
          footprint: command.footprint,
          status: 'under_construction',
          committedMonth: state.month,
          monthsRemaining: definition.constructionMonths,
          totalCost: definition.constructionCost,
          depositPaid: cashDueNow,
          buildDurationMonths: definition.constructionMonths,
          amountSpent: cashDueNow,
          financedWithLoan: useConstructionLoan,
          loanDebtId,
        },
      ],
      debt: useConstructionLoan
        ? [
            ...withDeposit.state.debt,
            createConstructionLoanDebt(loanDebtId as string, projectId, loanTerms),
          ]
        : withDeposit.state.debt,
      counters: {
        ...withDeposit.state.counters,
        nextBuildingSequence: withDeposit.state.counters.nextBuildingSequence + 1,
        nextProjectSequence: withDeposit.state.counters.nextProjectSequence + 1,
        nextDebtSequence: useConstructionLoan
          ? withDeposit.state.counters.nextDebtSequence + 1
          : withDeposit.state.counters.nextDebtSequence,
      },
    },
  };
}
