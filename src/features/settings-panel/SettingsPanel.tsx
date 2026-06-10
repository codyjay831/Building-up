import { useRef } from 'react';

import { formatMoney } from '@/game/domain/money';
import { getSaveSlotSummary } from '@/game/persistence/storage';
import type { ManualSaveSlot } from '@/game/persistence/saveSchema';
import { useGameStore } from '@/game/store/gameStore';

import styles from '@/features/settings-panel/SettingsPanel.module.css';

const MANUAL_SLOTS: readonly ManualSaveSlot[] = [1, 2, 3];

export function SettingsPanel() {
  const settingsOpen = useGameStore((store) => store.ui.settingsOpen);
  const closeSettings = useGameStore((store) => store.closeSettings);
  const saveToSlot = useGameStore((store) => store.saveToSlot);
  const loadFromSlot = useGameStore((store) => store.loadFromSlot);
  const clearSlot = useGameStore((store) => store.clearSlot);
  const exportCurrentSave = useGameStore((store) => store.exportCurrentSave);
  const importSaveFile = useGameStore((store) => store.importSaveFile);
  const newGame = useGameStore((store) => store.newGame);
  const resetOnboarding = useGameStore((store) => store.resetOnboarding);
  const setGuideEnabled = useGameStore((store) => store.setGuideEnabled);
  const guideDisabled = useGameStore((store) => store.onboarding.guideDisabled);
  const persistence = useGameStore((store) => store.persistence);
  const importInputRef = useRef<HTMLInputElement>(null);

  if (!settingsOpen) {
    return null;
  }

  const slotSummaries = MANUAL_SLOTS.map((slot) => getSaveSlotSummary(slot));

  return (
    <div className={styles.overlay} data-testid="settings-panel">
      <section className={styles.panel} aria-label="Settings and saves">
        <header className={styles.header}>
          <div>
            <p className={styles.eyebrow}>Settings</p>
            <h2 className={styles.title}>Save & recovery</h2>
          </div>
          <button type="button" className={styles.closeButton} onClick={closeSettings}>
            Close
          </button>
        </header>

        <p className={styles.statusLine} data-testid="save-status-line">
          {persistence.saveStatus === 'error' && persistence.lastSaveError
            ? persistence.lastSaveError
            : persistence.lastSavedAt
              ? `Last saved ${new Date(persistence.lastSavedAt).toLocaleString()}`
              : 'Autosave runs after major actions and monthly advancement.'}
        </p>

        <div className={styles.slotGrid}>
          {slotSummaries.map((summary) => (
            <article
              key={summary.slot}
              className={styles.slotCard}
              data-testid={`save-slot-${String(summary.slot)}`}
            >
              <h3 className={styles.slotTitle}>Manual slot {String(summary.slot)}</h3>
              {summary.occupied ? (
                <>
                  <p className={styles.slotMeta}>
                    Month {String(summary.month)} · {formatMoney(summary.cash ?? 0)}
                  </p>
                  {summary.occupancyLabel && (
                    <p className={styles.slotMeta}>{summary.occupancyLabel}</p>
                  )}
                  {summary.savedAt && (
                    <p className={styles.slotTimestamp}>
                      Saved {new Date(summary.savedAt).toLocaleString()}
                    </p>
                  )}
                </>
              ) : (
                <p className={styles.slotEmpty}>Empty slot</p>
              )}
              <div className={styles.slotActions}>
                <button
                  type="button"
                  className={styles.primaryButton}
                  data-testid={`save-slot-${String(summary.slot)}-save`}
                  onClick={() => {
                    saveToSlot(summary.slot);
                  }}
                >
                  Save
                </button>
                <button
                  type="button"
                  className={styles.secondaryButton}
                  disabled={!summary.occupied}
                  data-testid={`save-slot-${String(summary.slot)}-load`}
                  onClick={() => {
                    loadFromSlot(summary.slot);
                    closeSettings();
                  }}
                >
                  Load
                </button>
                <button
                  type="button"
                  className={styles.secondaryButton}
                  disabled={!summary.occupied}
                  data-testid={`save-slot-${String(summary.slot)}-clear`}
                  onClick={() => {
                    clearSlot(summary.slot);
                  }}
                >
                  Clear
                </button>
              </div>
            </article>
          ))}
        </div>

        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>Import / export</h3>
          <div className={styles.actionRow}>
            <button
              type="button"
              className={styles.secondaryButton}
              data-testid="export-save-button"
              onClick={exportCurrentSave}
            >
              Export JSON
            </button>
            <button
              type="button"
              className={styles.secondaryButton}
              data-testid="import-save-button"
              onClick={() => {
                importInputRef.current?.click();
              }}
            >
              Import JSON
            </button>
            <input
              ref={importInputRef}
              type="file"
              accept="application/json,.json"
              className={styles.hiddenInput}
              data-testid="import-save-input"
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = '';

                if (!file) {
                  return;
                }

                void importSaveFile(file).then(() => {
                  closeSettings();
                });
              }}
            />
          </div>
        </section>

        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>Run controls</h3>
          <div className={styles.actionRow}>
            <button
              type="button"
              className={styles.dangerButton}
              data-testid="new-game-button"
              onClick={() => {
                if (window.confirm('Start a new run? Unsaved progress in manual slots is kept.')) {
                  newGame();
                  closeSettings();
                }
              }}
            >
              New game
            </button>
            <button type="button" className={styles.secondaryButton} onClick={resetOnboarding}>
              Reset tutorial
            </button>
          </div>
          <label className={styles.checkboxLabel} data-testid="guide-enabled-toggle">
            <input
              type="checkbox"
              checked={!guideDisabled}
              onChange={(event) => {
                setGuideEnabled(event.target.checked);
              }}
            />
            Show guided objectives
          </label>
        </section>

        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>Keyboard shortcuts</h3>
          <ul className={styles.shortcutList}>
            <li>
              <kbd>N</kbd> Next month
            </li>
            <li>
              <kbd>1</kbd>–<kbd>4</kbd> Left rail tabs
            </li>
            <li>
              <kbd>Esc</kbd> Close panels / cancel placement
            </li>
            <li>
              <kbd>Arrow keys</kbd> Move tile focus on the board
            </li>
          </ul>
        </section>
      </section>
    </div>
  );
}
