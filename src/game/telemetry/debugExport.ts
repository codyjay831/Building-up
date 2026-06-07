import { createGameConfig } from '@/game/config/scenario';
import { FIXED_SEED_PRESETS } from '@/game/telemetry/fixedSeeds';
import {
  buildBalanceAdjustmentReportAt,
} from '@/game/telemetry/balanceReport';
import type { BalanceAdjustmentReport } from '@/game/telemetry/telemetryTypes';
import {
  collectTelemetryFromState,
  runSmokeSimulation,
  type OpeningStrategy,
} from '@/game/telemetry/runTelemetry';
import type { RunTelemetry, TelemetryExportBundle } from '@/game/telemetry/telemetryTypes';
import type { GameConfig, GameState } from '@/game/domain/types';

const DEFAULT_STRATEGIES: readonly OpeningStrategy[] = [
  'retail_first',
  'residential_first',
  'amenity_first',
];

export interface SmokeSuiteOptions {
  readonly strategies?: readonly OpeningStrategy[];
  readonly seeds?: readonly string[];
  readonly maxMonths?: number;
  readonly config?: GameConfig;
}

export function runDefaultSmokeSuite(options: SmokeSuiteOptions = {}): readonly RunTelemetry[] {
  const config = options.config ?? createGameConfig();
  const strategies = options.strategies ?? DEFAULT_STRATEGIES;
  const seedPresets = options.seeds
    ? FIXED_SEED_PRESETS.filter((preset) => options.seeds?.includes(preset.id))
    : FIXED_SEED_PRESETS;
  const runs: RunTelemetry[] = [];

  for (const preset of seedPresets) {
    for (const strategy of strategies) {
      runs.push(
        runSmokeSimulation({
          strategy,
          seed: preset.seed,
          preset,
          maxMonths: options.maxMonths,
          config,
        }),
      );
    }
  }

  return runs;
}

export function runBalanceValidationSuite(
  options: SmokeSuiteOptions = {},
): BalanceAdjustmentReport {
  const runs = runDefaultSmokeSuite(options);
  return buildBalanceAdjustmentReportAt(runs, new Date().toISOString());
}

export function createTelemetryExportBundle(
  state: Readonly<GameState>,
  config: Readonly<GameConfig> = createGameConfig(),
  smokeRuns?: readonly RunTelemetry[],
): TelemetryExportBundle {
  const currentRun = collectTelemetryFromState(state, config, state.seed, 'current_session');
  const runs = smokeRuns ?? runDefaultSmokeSuite({ config, maxMonths: 30 });

  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    currentRun,
    balanceReport: buildBalanceAdjustmentReportAt(runs, new Date().toISOString()),
  };
}

export function serializeTelemetryExport(bundle: TelemetryExportBundle): string {
  return JSON.stringify(bundle, null, 2);
}

export function downloadTelemetryExport(bundle: TelemetryExportBundle, filename?: string): void {
  const blob = new Blob([serializeTelemetryExport(bundle)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download =
    filename ?? `vertical-plot-telemetry-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}
