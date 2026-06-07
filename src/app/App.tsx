import { useEffect, useState } from 'react';

import styles from '@/app/App.module.css';
import { BuildCatalog } from '@/features/build-catalog/BuildCatalog';
import { BuildingInspector } from '@/features/building-inspector/BuildingInspector';
import { DebugBanner, DebugPanel } from '@/features/debug-panel/DebugPanel';
import { FinancePanel } from '@/features/finance-panel/FinancePanel';
import { MonthlyReportDrawer } from '@/features/monthly-report/MonthlyReport';
import { OnboardingGuide } from '@/features/onboarding/OnboardingGuide';
import { PropertyBoard } from '@/features/property-board/PropertyBoard';
import { SettingsPanel } from '@/features/settings-panel/SettingsPanel';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { getFinanceWarningView } from '@/game/selectors/financeSelectors';
import { getPropertySummary } from '@/game/selectors/propertySelectors';
import { useGameStore } from '@/game/store/gameStore';
import { enableDebugModeFromQuery, isDebugModeEnabled } from '@/game/telemetry/debugMode';

function formatSaveStatus(
  saveStatus: 'idle' | 'saving' | 'saved' | 'error',
  lastSavedAt: string | null,
  lastSaveError: string | null,
): string {
  if (saveStatus === 'error' && lastSaveError) {
    return lastSaveError;
  }
  if (lastSavedAt) {
    return `Saved ${new Date(lastSavedAt).toLocaleTimeString()}`;
  }
  return 'Autosave on';
}

export function App() {
  const [buildOpen, setBuildOpen] = useState(false);
  const [financeOpen, setFinanceOpen] = useState(false);
  const [propertyOpen, setPropertyOpen] = useState(false);
  const [debugOpen, setDebugOpen] = useState(false);
  const [debugEnabled, setDebugEnabled] = useState(isDebugModeEnabled);

  const gameState = useGameStore((store) => store.gameState);
  const config = useGameStore((store) => store.config);
  const ui = useGameStore((store) => store.ui);
  const persistence = useGameStore((store) => store.persistence);
  const advanceMonth = useGameStore((store) => store.advanceMonth);
  const toggleReportDrawer = useGameStore((store) => store.toggleReportDrawer);
  const toggleSettings = useGameStore((store) => store.toggleSettings);
  const bootstrapFromStorage = useGameStore((store) => store.bootstrapFromStorage);
  const clearSelection = useGameStore((store) => store.clearSelection);

  const summary = getPropertySummary(gameState, config);
  const warning = getFinanceWarningView(gameState, config);

  useEffect(() => {
    enableDebugModeFromQuery();
    setDebugEnabled(isDebugModeEnabled());
  }, []);

  useEffect(() => {
    if (!persistence.bootstrapped) {
      bootstrapFromStorage();
    }
  }, [bootstrapFromStorage, persistence.bootstrapped]);

  const isInspectorOpen = propertyOpen || !!ui.selectedBuildingId || !!ui.placementPreview;

  useKeyboardShortcuts({
    buildOpen,
    setBuildOpen,
    financeOpen,
    setFinanceOpen,
  });

  const handleInspectorClose = () => {
    setPropertyOpen(false);
    clearSelection();
  };

  return (
    <div className={styles.shell} data-testid="app-shell">
      {debugEnabled && (
        <DebugBanner
          onOpen={() => {
            setDebugOpen(true);
          }}
        />
      )}

      <header className={styles.topBar}>
        <div className={styles.brand}>
          <p className={styles.eyebrow}>Vertical Plot Manager</p>
          <h1 className={styles.title}>{summary.scenarioName}</h1>
        </div>

        <div className={styles.statsRow} aria-label="Run summary">
          <Stat label="Month" value={String(summary.month)} />
          <Stat label="Cash" value={summary.cashLabel} />
          <Stat label="Monthly Net" value={summary.monthlyNetLabel} tone={summary.monthlyNetTone} />
        </div>

        <div className={styles.toolbar}>
          <span className={styles.saveStatus} data-testid="autosave-status">
            {formatSaveStatus(
              persistence.saveStatus,
              persistence.lastSavedAt,
              persistence.lastSaveError,
            )}
          </span>

          <button
            type="button"
            className={styles.toolbarButton}
            data-active={buildOpen ? 'true' : 'false'}
            onClick={() => {
              setBuildOpen((o) => !o);
            }}
          >
            Build
          </button>

          <button
            type="button"
            className={styles.toolbarButton}
            data-active={financeOpen ? 'true' : 'false'}
            onClick={() => {
              setFinanceOpen((o) => !o);
            }}
          >
            Finance
          </button>

          <button
            type="button"
            className={styles.toolbarButton}
            data-active={propertyOpen ? 'true' : 'false'}
            onClick={() => {
              setPropertyOpen((o) => !o);
            }}
          >
            Property
          </button>

          <button
            type="button"
            className={styles.toolbarButton}
            data-testid="toggle-monthly-report"
            aria-expanded={ui.reportDrawerOpen}
            onClick={toggleReportDrawer}
          >
            Reports
          </button>

          <button
            type="button"
            className={styles.toolbarButton}
            data-testid="settings-button"
            aria-haspopup="dialog"
            onClick={toggleSettings}
          >
            Settings
          </button>

          <button
            type="button"
            className={styles.primaryButton}
            data-testid="advance-month-button"
            disabled={gameState.status !== 'active'}
            onClick={advanceMonth}
          >
            Next Month
          </button>
        </div>
      </header>

      <div className={styles.boardRegion}>
        <PropertyBoard />

        {/* Toast banners */}
        {warning && gameState.status === 'active' && (
          <div
            className={styles.toast}
            data-level={warning.level}
            data-testid="finance-warning-banner"
            role="status"
          >
            <strong>{warning.title}.</strong> {warning.message}
            {warning.level === 'insolvency' && (
              <> {String(warning.insolvencyMonthsRemaining)} month(s) remain before loss.</>
            )}
          </div>
        )}

        {gameState.status === 'won' && (
          <div className={styles.toastWin} data-testid="win-banner" role="status">
            <strong>Mixed-use stabilized.</strong> Three consecutive healthy months achieved.
          </div>
        )}

        {gameState.status === 'lost' && (
          <div className={styles.toastLoss} data-testid="loss-banner" role="status">
            <strong>Property insolvent.</strong> No recovery path available.
          </div>
        )}

        {/* Floating onboarding widget */}
        <OnboardingGuide />

        {/* Left slide-in: Build catalog */}
        <div
          className={styles.buildDrawer}
          data-open={buildOpen ? 'true' : 'false'}
          aria-label="Build catalog"
          aria-hidden={!buildOpen}
        >
          <div className={styles.drawerTopBar}>
            <button
              type="button"
              className={styles.drawerClose}
              onClick={() => {
                setBuildOpen(false);
              }}
            >
              Close
            </button>
          </div>
          <BuildCatalog />
        </div>

        {/* Centered modal: Finance */}
        {financeOpen && (
          <div
            className={styles.modalBackdrop}
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setFinanceOpen(false);
              }
            }}
          >
            <div className={styles.financeModal} role="dialog" aria-label="Finance panel">
              <div className={styles.modalHeader}>
                <h2 className={styles.modalTitle}>Finance</h2>
                <button
                  type="button"
                  className={styles.drawerClose}
                  onClick={() => {
                    setFinanceOpen(false);
                  }}
                >
                  Close
                </button>
              </div>
              <FinancePanel />
            </div>
          </div>
        )}

        {/* Right slide-in: Building inspector */}
        <div
          className={styles.inspectorPanel}
          data-open={isInspectorOpen ? 'true' : 'false'}
          aria-hidden={!isInspectorOpen}
        >
          <div className={styles.inspectorCloseBar}>
            <button
              type="button"
              className={styles.drawerClose}
              data-testid="inspector-close"
              onClick={handleInspectorClose}
            >
              Close
            </button>
          </div>
          <BuildingInspector />
        </div>

        <MonthlyReportDrawer />
        <SettingsPanel />
      </div>

      {debugEnabled && (
        <DebugPanel
          open={debugOpen}
          onClose={() => {
            setDebugOpen(false);
          }}
        />
      )}
    </div>
  );
}

interface StatProps {
  label: string;
  value: string;
  tone?: 'neutral' | 'positive' | 'negative';
}

function Stat({ label, value, tone = 'neutral' }: StatProps) {
  return (
    <div className={styles.stat}>
      <dt className={styles.statLabel}>{label}</dt>
      <dd className={styles.statValue} data-tone={tone}>
        {value}
      </dd>
    </div>
  );
}
