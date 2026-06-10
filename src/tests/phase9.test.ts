import { describe, expect, it } from 'vitest';

import {
  createGameConfig,
  createStarterGameState,
  RIVERSIDE_STARTER_SCENARIO_ID,
} from '@/game/config/scenario';
import {
  FIXED_SEED_PRESETS,
  applyFixedSeedMarketPreset,
  buildBalanceAdjustmentReport,
  collectTelemetryFromState,
  createGameStateFromFixedSeed,
  createTelemetryExportBundle,
  getFixedSeedPreset,
  runDefaultSmokeSuite,
  runSmokeSimulation,
  serializeTelemetryExport,
} from '@/game/telemetry';

describe('fixed seed presets', () => {
  it('includes the acceptance test seed suite', () => {
    const ids = FIXED_SEED_PRESETS.map((preset) => preset.id);

    expect(ids).toEqual([
      'starter-balanced',
      'strong-residential',
      'weak-retail',
      'construction-delay',
      'recovery-path',
      'approval-unlock',
      'win-path',
    ]);
  });

  it('creates deterministic starter states for each preset', () => {
    const config = createGameConfig();

    for (const preset of FIXED_SEED_PRESETS) {
      const first = createGameStateFromFixedSeed(preset.id, config);
      const second = createGameStateFromFixedSeed(preset.id, config);

      expect(first.seed).toBe(preset.seed);
      expect(first.runId).toBe(second.runId);
      expect(first.market.residentialDemand).toBe(second.market.residentialDemand);
      expect(first.market.retailDemand).toBe(second.market.retailDemand);
    }
  });

  it('applies market overrides without changing unrelated state', () => {
    const config = createGameConfig();
    const starter = createStarterGameState(
      RIVERSIDE_STARTER_SCENARIO_ID,
      'starter-balanced',
      config,
    );
    const preset = getFixedSeedPreset('strong-residential');

    expect(preset).toBeDefined();
    if (!preset) {
      return;
    }

    const patched = applyFixedSeedMarketPreset(starter, preset);

    expect(patched.market.residentialDemand).toBe(68);
    expect(patched.market.retailDemand).toBe(28);
    expect(patched.cash).toBe(starter.cash);
  });
});

describe('smoke simulation', () => {
  const config = createGameConfig();

  it('is deterministic for the same seed and strategy', () => {
    const first = runSmokeSimulation({
      strategy: 'retail_first',
      seed: 'starter-balanced',
      preset: getFixedSeedPreset('starter-balanced'),
      maxMonths: 18,
      config,
    });
    const second = runSmokeSimulation({
      strategy: 'retail_first',
      seed: 'starter-balanced',
      preset: getFixedSeedPreset('starter-balanced'),
      maxMonths: 18,
      config,
    });

    expect(first.monthsToApproval2).toBe(second.monthsToApproval2);
    expect(first.monthsToFirstMixedUseComplete).toBe(second.monthsToFirstMixedUseComplete);
    expect(first.finalStatus).toBe(second.finalStatus);
    expect(first.lowestCash).toBe(second.lowestCash);
  });

  it('records first-build choices for opening strategies', () => {
    const retail = runSmokeSimulation({
      strategy: 'retail_first',
      seed: 'approval-unlock',
      preset: getFixedSeedPreset('approval-unlock'),
      maxMonths: 6,
      config,
    });
    const residential = runSmokeSimulation({
      strategy: 'residential_first',
      seed: 'approval-unlock',
      preset: getFixedSeedPreset('approval-unlock'),
      maxMonths: 6,
      config,
    });

    expect(retail.firstBuildingChoice).toBe('corner_shop');
    expect(residential.firstBuildingChoice).toBe('small_house');
  });
});

describe('balance validation suite', () => {
  it('meets Phase 9 acceptance gates across representative smoke runs', () => {
    const config = createGameConfig();
    const runs = runDefaultSmokeSuite({
      config,
      maxMonths: 36,
      seeds: ['starter-balanced', 'approval-unlock', 'win-path'],
      strategies: ['retail_first', 'residential_first', 'amenity_first'],
    });
    const report = buildBalanceAdjustmentReport(runs);

    expect(runs.length).toBe(9);
    expect(report.findings.some((finding) => finding.id === 'viable_openings')).toBe(true);
    expect(report.findings.some((finding) => finding.id === 'idle_turn_streak')).toBe(true);

    const viableFinding = report.findings.find((finding) => finding.id === 'viable_openings');
    const idleFinding = report.findings.find((finding) => finding.id === 'idle_turn_streak');
    const approvalFinding = report.findings.find(
      (finding) => finding.id === 'approval_level_2_timing',
    );
    const mixedUseFinding = report.findings.find(
      (finding) => finding.id === 'mixed_use_completion_timing',
    );

    expect(viableFinding?.severity).toBe('pass');
    expect(idleFinding?.severity).not.toBe('fail');
    expect(approvalFinding?.severity).not.toBe('fail');
    expect(mixedUseFinding?.severity).not.toBe('fail');

    const openingRuns = runs.filter((run) =>
      ['retail_first', 'residential_first'].includes(run.strategy),
    );
    const distinctOpenings = new Set(
      openingRuns
        .map((run) => run.firstBuildingChoice)
        .filter((choice): choice is string => choice !== null),
    );

    expect(distinctOpenings.size).toBeGreaterThanOrEqual(2);

    const maxIdle = runs.reduce((worst, run) => Math.max(worst, run.maxConsecutiveIdleTurns), 0);
    expect(maxIdle).toBeLessThan(4);

    const approvalMonths = runs
      .map((run) => run.monthsToApproval2)
      .filter((month): month is number => month !== null);
    const mixedUseMonths = runs
      .map((run) => run.monthsToFirstMixedUseComplete)
      .filter((month): month is number => month !== null);

    expect(approvalMonths.length).toBeGreaterThan(0);
    expect(mixedUseMonths.length).toBeGreaterThan(0);
  }, 30_000);
});

describe('telemetry export', () => {
  it('serializes a downloadable debug bundle', () => {
    const config = createGameConfig();
    const state = createStarterGameState(RIVERSIDE_STARTER_SCENARIO_ID, 'starter-balanced', config);
    const bundle = createTelemetryExportBundle(state, config, [
      runSmokeSimulation({
        strategy: 'retail_first',
        seed: 'starter-balanced',
        preset: getFixedSeedPreset('starter-balanced'),
        maxMonths: 12,
        config,
      }),
    ]);

    const serialized = serializeTelemetryExport(bundle);
    const parsed = JSON.parse(serialized) as {
      version: number;
      currentRun: { seed: string };
      balanceReport: { findings: unknown[] };
    };

    expect(parsed.version).toBe(1);
    expect(parsed.currentRun.seed).toBe('starter-balanced');
    expect(parsed.balanceReport.findings.length).toBeGreaterThan(0);
  });

  it('collects live session telemetry from the current state', () => {
    const config = createGameConfig();
    const state = createStarterGameState(RIVERSIDE_STARTER_SCENARIO_ID, 'win-path', config);
    const telemetry = collectTelemetryFromState(state, config, state.seed);

    expect(telemetry.seed).toBe('win-path');
    expect(telemetry.monthlySnapshots).toHaveLength(1);
    expect(telemetry.lowestCash).toBe(state.cash);
  });
});
