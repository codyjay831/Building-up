import { describe, expect, it } from 'vitest';

import { advanceMonth } from '@/game/commands/advanceMonth';
import { cancelProject } from '@/game/commands/cancelProject';
import { placeProject } from '@/game/commands/placeProject';
import { createGameConfig, createStarterGameState, RIVERSIDE_STARTER_SCENARIO_ID } from '@/game/config/scenario';
import {
  buildProjectForecast,
  calculateProjectPaymentSchedule,
  getNextDrawAmount,
} from '@/game/domain/construction';
import { getProjectForecastForPreview } from '@/game/selectors/forecastSelectors';

const SMALL_PARK_FOOTPRINT = {
  origin: { x: 0, y: 0 },
  width: 2,
  height: 2,
  rotation: 0,
} as const;

const SMALL_HOUSE_FOOTPRINT = {
  origin: { x: 7, y: 6 },
  width: 2,
  height: 3,
  rotation: 0,
} as const;

describe('construction payment schedule', () => {
  it('splits 25% deposit and remaining draws with final rounding', () => {
    const schedule = calculateProjectPaymentSchedule(95_000, 3);

    expect(schedule.deposit).toBe(23_750);
    expect(schedule.monthlyDraws).toEqual([23_750, 23_750, 23_750]);
    expect(schedule.deposit + schedule.monthlyDraws.reduce((sum, draw) => sum + draw, 0)).toBe(
      95_000,
    );
  });

  it('handles single-month projects', () => {
    const schedule = calculateProjectPaymentSchedule(12_000, 1);

    expect(schedule.deposit).toBe(3_000);
    expect(schedule.monthlyDraws).toEqual([9_000]);
  });
});

describe('project forecast', () => {
  const config = createGameConfig();
  const state = createStarterGameState(RIVERSIDE_STARTER_SCENARIO_ID);

  it('matches the locked payment schedule', () => {
    const forecast = buildProjectForecast(state, config, 'small_house', SMALL_HOUSE_FOOTPRINT);
    const schedule = calculateProjectPaymentSchedule(95_000, 3);

    expect(forecast.totalCost).toBe(95_000);
    expect(forecast.cashDueNow).toBe(schedule.deposit);
    expect(forecast.monthlyDraws).toEqual(schedule.monthlyDraws);
    expect(forecast.completionMonth).toBe(state.month + 3);
  });

  it('reuses domain formulas in the preview selector', () => {
    const view = getProjectForecastForPreview(state, config, {
      definitionId: 'small_park',
      origin: { x: 0, y: 0 },
      rotation: 0,
    });

    expect(view.forecast.cashDueNow).toBe(4_500);
    expect(view.forecast.monthlyDraws).toEqual([13_500]);
  });
});

describe('placeProject command', () => {
  const config = createGameConfig();
  const starterState = createStarterGameState(RIVERSIDE_STARTER_SCENARIO_ID);

  it('commits a valid project, deducts deposit, and records ledger', () => {
    const result = placeProject(starterState, config, {
      definitionId: 'small_park',
      footprint: SMALL_PARK_FOOTPRINT,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.state.cash).toBe(starterState.cash - 4_500);
    expect(result.state.projects).toHaveLength(1);
    expect(result.state.buildings).toHaveLength(2);
    expect(result.state.buildings[1]?.lifecycleState).toBe('under_construction');
    expect(result.state.ledger).toHaveLength(1);
    expect(result.state.ledger[0]?.netCashFlow).toBe(-4_500);
    expect(result.events[0]).toEqual({
      type: 'ProjectCommitted',
      projectId: 'project-1',
      deposit: 4_500,
    });
  });

  it('rejects commitment when deposit exceeds cash', () => {
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

  it('executes forecast draws and completes after configured months', () => {
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
    let project = state.projects[0];
    expect(project.id).toBe('project-1');

    const forecast = buildProjectForecast(state, config, 'small_house', SMALL_HOUSE_FOOTPRINT);
    const executedDraws: number[] = [];

    for (let monthIndex = 0; monthIndex < 3; monthIndex += 1) {
      const nextDraw = getNextDrawAmount(project);
      executedDraws.push(nextDraw);

      const advanced = advanceMonth(state, config);
      expect(advanced.ok).toBe(true);
      if (!advanced.ok) {
        return;
      }

      state = advanced.state;
      const nextProject = state.projects.find((activeProject) => activeProject.id === 'project-1');
      if (nextProject) {
        project = nextProject;
      }
    }

    expect(executedDraws).toEqual([...forecast.monthlyDraws]);
    expect(state.projects[0]?.status).toBe('completed');
    expect(state.buildings[1]?.lifecycleState).toBe('leasing');
    expect(state.month).toBe(4);
    expect(
      state.buildings.filter((building) => building.definitionId === 'small_house'),
    ).toHaveLength(1);
  });

  it('does not overspend cash on scheduled draws', () => {
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
    expect(advanced.state.projects[0]?.monthsRemaining).toBe(3);
  });
});

describe('cancelProject command', () => {
  const config = createGameConfig();
  const starterState = createStarterGameState(RIVERSIDE_STARTER_SCENARIO_ID);

  it('cancels before first monthly advancement with 80% deposit refund', () => {
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
    expect(cancelled.state.buildings).toHaveLength(1);
    expect(cancelled.state.cash).toBe(starterState.cash - 4_500 + 3_600);
    expect(cancelled.events[0]).toEqual({
      type: 'ProjectCancelled',
      projectId: 'project-1',
      refund: 3_600,
    });
  });

  it('rejects cancellation after the first draw', () => {
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
