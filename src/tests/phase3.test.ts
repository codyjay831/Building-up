import { describe, expect, it } from 'vitest';

import { advanceMonth } from '@/game/commands/advanceMonth';
import { cancelProject } from '@/game/commands/cancelProject';
import { placeProject } from '@/game/commands/placeProject';
import {
  createGameConfig,
  createStarterGameState,
  RIVERSIDE_STARTER_SCENARIO_ID,
} from '@/game/config/scenario';
import {
  buildProjectForecast,
  getCashDueAtCommit,
  getCommitmentDeposit,
} from '@/game/domain/construction';
import { getProjectForecastForPreview } from '@/game/selectors/forecastSelectors';

const SMALL_PARK_FOOTPRINT = {
  origin: { x: 0, y: 0 },
  width: 2,
  height: 2,
  rotation: 0,
} as const;

const SMALL_HOUSE_FOOTPRINT = {
  origin: { x: 6, y: 6 },
  width: 2,
  height: 3,
  rotation: 0,
} as const;

describe('construction payment at commit', () => {
  it('requires the full construction cost upfront for cash builds', () => {
    expect(getCashDueAtCommit(95_000)).toBe(95_000);
    expect(getCashDueAtCommit(12_000)).toBe(12_000);
  });

  it('uses full cost for placement cash checks', () => {
    const config = createGameConfig();
    const definition = config.buildings.get('small_house');
    expect(definition).toBeDefined();
    expect(getCommitmentDeposit(definition as NonNullable<typeof definition>)).toBe(95_000);
  });
});

describe('project forecast', () => {
  const config = createGameConfig();
  const state = createStarterGameState(RIVERSIDE_STARTER_SCENARIO_ID);

  it('shows full cash due at start and loan terms for eligible projects', () => {
    const forecast = buildProjectForecast(state, config, 'small_house', SMALL_HOUSE_FOOTPRINT);

    expect(forecast.totalCost).toBe(95_000);
    expect(forecast.cashDueNow).toBe(95_000);
    expect(forecast.completionMonth).toBe(state.month + 3);
    expect(forecast.constructionLoan.eligible).toBe(true);
    expect(forecast.constructionLoan.equityRequired).toBe(38_000);
  });

  it('reuses domain formulas in the preview selector', () => {
    const view = getProjectForecastForPreview(state, config, {
      definitionId: 'small_park',
      origin: { x: 0, y: 0 },
      rotation: 0,
    });

    expect(view.forecast.cashDueNow).toBe(18_000);
    expect(view.cashBuildNoteLabel).toBe('No payments during construction');
  });
});

describe('placeProject command', () => {
  const config = createGameConfig();
  const starterState = createStarterGameState(RIVERSIDE_STARTER_SCENARIO_ID);

  it('commits a valid project, deducts full payment, and records ledger', () => {
    const result = placeProject(starterState, config, {
      definitionId: 'small_park',
      footprint: SMALL_PARK_FOOTPRINT,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.state.cash).toBe(starterState.cash - 18_000);
    expect(result.state.projects).toHaveLength(1);
    expect(result.state.buildings).toHaveLength(3);
    expect(result.state.buildings[2]?.lifecycleState).toBe('under_construction');
    expect(result.state.ledger).toHaveLength(1);
    expect(result.state.ledger[0]?.netCashFlow).toBe(-18_000);
    expect(result.events[0]).toEqual({
      type: 'ProjectCommitted',
      projectId: 'project-1',
      deposit: 18_000,
    });
  });

  it('rejects commitment when full payment exceeds cash', () => {
    const poorState = { ...starterState, cash: 1_000 };
    const result = placeProject(poorState, config, {
      definitionId: 'small_house',
      footprint: SMALL_HOUSE_FOOTPRINT,
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }

    expect(result.error.reason).toBe('insufficient_cash');
  });
});

describe('construction lifecycle', () => {
  const config = createGameConfig();

  it('advances months without additional cash draws and completes on schedule', () => {
    let state = createStarterGameState(RIVERSIDE_STARTER_SCENARIO_ID);
    const commit = placeProject(state, config, {
      definitionId: 'small_house',
      footprint: SMALL_HOUSE_FOOTPRINT,
    });

    expect(commit.ok).toBe(true);
    if (!commit.ok) {
      return;
    }

    state = commit.state;
    const cashAfterCommit = state.cash;

    for (let monthIndex = 0; monthIndex < 3; monthIndex += 1) {
      const advanced = advanceMonth(state, config);
      expect(advanced.ok).toBe(true);
      if (!advanced.ok) {
        return;
      }

      state = advanced.state;
      expect(state.projects[0]?.monthsRemaining).toBe(2 - monthIndex);
    }

    expect(state.cash).toBeGreaterThan(cashAfterCommit);
    expect(state.projects[0]?.status).toBe('completed');
    expect(state.buildings[2]?.lifecycleState).toBe('leasing');
    expect(state.month).toBe(4);
  });

  it('does not charge additional construction cash during the build', () => {
    let state = createStarterGameState(RIVERSIDE_STARTER_SCENARIO_ID);
    const commit = placeProject(state, config, {
      definitionId: 'small_house',
      footprint: SMALL_HOUSE_FOOTPRINT,
    });

    expect(commit.ok).toBe(true);
    if (!commit.ok) {
      return;
    }

    state = {
      ...commit.state,
      cash: 20_000,
    };

    const beforeCash = state.cash;
    const advanced = advanceMonth(state, config);

    expect(advanced.ok).toBe(true);
    if (!advanced.ok) {
      return;
    }

    expect(advanced.state.cash).toBeGreaterThanOrEqual(0);
    expect(advanced.state.cash).toBe(beforeCash + 1_550);
    expect(advanced.state.projects[0]?.monthsRemaining).toBe(2);
  });
});

describe('cancelProject command', () => {
  const config = createGameConfig();
  const starterState = createStarterGameState(RIVERSIDE_STARTER_SCENARIO_ID);

  it('cancels before first monthly advancement with 80% payment refund', () => {
    const commit = placeProject(starterState, config, {
      definitionId: 'small_park',
      footprint: SMALL_PARK_FOOTPRINT,
    });

    expect(commit.ok).toBe(true);
    if (!commit.ok) {
      return;
    }

    const cancelled = cancelProject(commit.state, config, { projectId: 'project-1' });

    expect(cancelled.ok).toBe(true);
    if (!cancelled.ok) {
      return;
    }

    expect(cancelled.state.projects[0]?.status).toBe('cancelled');
    expect(cancelled.state.buildings).toHaveLength(2);
    expect(cancelled.state.cash).toBe(starterState.cash - 18_000 + 14_400);
    expect(cancelled.events[0]).toEqual({
      type: 'ProjectCancelled',
      projectId: 'project-1',
      refund: 14_400,
    });
  });

  it('rejects cancellation after the first construction month', () => {
    let state = createStarterGameState(RIVERSIDE_STARTER_SCENARIO_ID);
    const commit = placeProject(state, config, {
      definitionId: 'small_park',
      footprint: SMALL_PARK_FOOTPRINT,
    });

    expect(commit.ok).toBe(true);
    if (!commit.ok) {
      return;
    }

    state = commit.state;
    const advanced = advanceMonth(state, config);
    expect(advanced.ok).toBe(true);
    if (!advanced.ok) {
      return;
    }

    const cancelled = cancelProject(advanced.state, config, { projectId: 'project-1' });
    expect(cancelled.ok).toBe(false);
    if (cancelled.ok) {
      return;
    }

    expect(cancelled.error.reason).toBe('project_not_cancellable');
  });
});
