import { useMemo, useState } from 'react';

import { formatMoney } from '@/game/domain/money';
import { FIXED_SEED_PRESETS } from '@/game/telemetry/fixedSeeds';
import { DEBUG_MODE_MUTATION_WARNING } from '@/game/telemetry/debugMode';
import { useGameStore } from '@/game/store/gameStore';

import styles from '@/features/debug-panel/DebugPanel.module.css';

interface DebugPanelProps {
  readonly open: boolean;
  readonly onClose: () => void;
}

export function DebugBanner({ onOpen }: { readonly onOpen: () => void }) {
  return (
    <div className={styles.debugBanner} data-testid="debug-mode-banner">
      <span>
        <strong>Debug mode active.</strong> Tools can mutate the live run without a separate sandbox.
      </span>
      <button type="button" className={styles.debugToggle} onClick={onOpen}>
        Open debug panel
      </button>
    </div>
  );
}

export function DebugPanel({ open, onClose }: DebugPanelProps) {
  const gameState = useGameStore((store) => store.gameState);
  const debugAddCash = useGameStore((store) => store.debugAddCash);
  const debugAdvanceMonths = useGameStore((store) => store.debugAdvanceMonths);
  const debugLoadFixedSeed = useGameStore((store) => store.debugLoadFixedSeed);
  const debugExportTelemetry = useGameStore((store) => store.debugExportTelemetry);
  const debugRunBalanceValidation = useGameStore((store) => store.debugRunBalanceValidation);
  const [selectedSeed, setSelectedSeed] = useState(FIXED_SEED_PRESETS[0]?.id ?? 'starter-balanced');
  const [balanceReport, setBalanceReport] = useState<string | null>(null);

  const rawStatePreview = useMemo(
    () =>
      JSON.stringify(
        {
          seed: gameState.seed,
          runId: gameState.runId,
          month: gameState.month,
          cash: gameState.cash,
          approval: gameState.approval,
          status: gameState.status,
          buildings: gameState.buildings.length,
          projects: gameState.projects.length,
        },
        null,
        2,
      ),
    [gameState],
  );

  if (!open) {
    return null;
  }

  return (
    <div className={styles.overlay} data-testid="debug-panel">
      <section className={styles.panel} aria-label="Debug tools">
        <header className={styles.header}>
          <div>
            <p className={styles.eyebrow}>Developer tools</p>
            <h2 className={styles.title}>Balance validation & debug</h2>
          </div>
          <button type="button" className={styles.closeButton} onClick={onClose}>
            Close
          </button>
        </header>

        <p className={styles.warning}>{DEBUG_MODE_MUTATION_WARNING}</p>

        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>Current run</h3>
          <div className={styles.metaGrid}>
            <article className={styles.metaCard}>
              <p className={styles.metaLabel}>Seed</p>
              <p className={styles.metaValue}>{gameState.seed}</p>
            </article>
            <article className={styles.metaCard}>
              <p className={styles.metaLabel}>Run ID</p>
              <p className={styles.metaValue}>{gameState.runId}</p>
            </article>
            <article className={styles.metaCard}>
              <p className={styles.metaLabel}>Month</p>
              <p className={styles.metaValue}>{String(gameState.month)}</p>
            </article>
            <article className={styles.metaCard}>
              <p className={styles.metaLabel}>Cash</p>
              <p className={styles.metaValue}>{formatMoney(gameState.cash)}</p>
            </article>
          </div>
        </section>

        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>Mutations</h3>
          <div className={styles.actionRow}>
            <button
              type="button"
              className={styles.secondaryButton}
              data-testid="debug-add-cash-button"
              onClick={() => {
                debugAddCash(25_000);
              }}
            >
              Add $25,000
            </button>
            <button
              type="button"
              className={styles.secondaryButton}
              data-testid="debug-advance-12-button"
              onClick={() => {
                debugAdvanceMonths(12);
              }}
            >
              Advance 12 months
            </button>
          </div>
        </section>

        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>Fixed seeds</h3>
          <div className={styles.actionRow}>
            <select
              className={styles.seedSelect}
              value={selectedSeed}
              data-testid="debug-seed-select"
              onChange={(event) => {
                setSelectedSeed(event.target.value);
              }}
            >
              {FIXED_SEED_PRESETS.map((preset) => (
                <option key={preset.id} value={preset.id}>
                  {preset.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              className={styles.secondaryButton}
              data-testid="debug-load-seed-button"
              onClick={() => {
                if (
                  window.confirm(
                    'Load the selected fixed seed? This replaces the current run after confirmation.',
                  )
                ) {
                  debugLoadFixedSeed(selectedSeed);
                }
              }}
            >
              Load seed
            </button>
          </div>
        </section>

        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>Telemetry</h3>
          <div className={styles.actionRow}>
            <button
              type="button"
              className={styles.primaryButton}
              data-testid="debug-export-telemetry-button"
              onClick={debugExportTelemetry}
            >
              Export telemetry JSON
            </button>
            <button
              type="button"
              className={styles.secondaryButton}
              data-testid="debug-run-balance-button"
              onClick={() => {
                setBalanceReport(debugRunBalanceValidation());
              }}
            >
              Run balance smoke suite
            </button>
          </div>
          {balanceReport && (
            <pre className={styles.reportBox} data-testid="debug-balance-report">
              {balanceReport}
            </pre>
          )}
        </section>

        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>Raw state preview</h3>
          <pre className={styles.reportBox}>{rawStatePreview}</pre>
        </section>
      </section>
    </div>
  );
}
