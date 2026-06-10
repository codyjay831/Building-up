import { useEffect, useState } from 'react';

import styles from '@/app/App.module.css';
import { BuildCatalog } from '@/features/build-catalog/BuildCatalog';
import { BuildingInspector } from '@/features/building-inspector/BuildingInspector';
import { DebugBanner, DebugPanel } from '@/features/debug-panel/DebugPanel';
import { FinancePanel } from '@/features/finance-panel/FinancePanel';
import { MonthlyReportDrawer } from '@/features/monthly-report/MonthlyReport';
import { OnboardingGuide } from '@/features/onboarding/OnboardingGuide';
import { PropertyBoard } from '@/features/property-board/PropertyBoard';
import { ScenarioObjectiveStrip } from '@/features/scenario-objective/ScenarioObjectiveStrip';
import { SettingsPanel } from '@/features/settings-panel/SettingsPanel';
import { WinResultsModal } from '@/features/win-results/WinResultsModal';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { getScenarioObjectiveHudView } from '@/game/selectors/approvalSelectors';
import { getFinanceWarningView } from '@/game/selectors/financeSelectors';
import { getPropertySummary } from '@/game/selectors/propertySelectors';
import {
  getOccupancyWarningView,
  getLossRecapView,
} from '@/game/selectors/propertyHealthSelectors';
import { getMonthlyReportStripLabel } from '@/game/selectors/monthlyReportSelectors';
import { useGameStore } from '@/game/store/gameStore';
import { enableDebugModeFromQuery, isDebugModeEnabled } from '@/game/telemetry/debugMode';
import type { PropertyHealthTone } from '@/game/domain/propertyHealth';

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

function healthToneToStatTone(tone: PropertyHealthTone): 'neutral' | 'positive' | 'negative' {
  switch (tone) {
    case 'healthy':
      return 'positive';
    case 'critical':
    case 'declining':
      return 'negative';
    default:
      return 'neutral';
  }
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
  const cancelPlacement = useGameStore((store) => store.cancelPlacement);
  const dismissMilestoneToasts = useGameStore((store) => store.dismissMilestoneToasts);

  const summary = getPropertySummary(gameState, config);
  const objectiveHud = getScenarioObjectiveHudView(gameState, config);
  const financeWarning = getFinanceWarningView(gameState, config);
  const occupancyWarning = getOccupancyWarningView(gameState, config);
  const lossRecap = getLossRecapView(gameState, config);
  const eventStripLabel = getMonthlyReportStripLabel(gameState);

  useEffect(() => {
    enableDebugModeFromQuery();
    setDebugEnabled(isDebugModeEnabled());
  }, []);

  useEffect(() => {
    if (!persistence.bootstrapped) {
      bootstrapFromStorage();
    }
  }, [bootstrapFromStorage, persistence.bootstrapped]);

  useEffect(() => {
    if (ui.milestoneToasts.length === 0) {
      return;
    }

    const timer = window.setTimeout(() => {
      dismissMilestoneToasts();
    }, 6000);

    return () => {
      window.clearTimeout(timer);
    };
  }, [dismissMilestoneToasts, ui.milestoneToasts]);

  useEffect(() => {
    if (!ui.monthTickPulse) {
      return;
    }

    const timer = window.setTimeout(() => {
      useGameStore.setState((store) => ({
        ui: {
          ...store.ui,
          monthTickPulse: false,
        },
      }));
    }, 450);

    return () => {
      window.clearTimeout(timer);
    };
  }, [ui.monthTickPulse]);

  const isInspectorOpen =
    propertyOpen ||
    !!ui.selectedBuildingId ||
    !!ui.placementPreview ||
    !!ui.selectedAccessTile ||
    !!ui.drivewayPreview;

  useKeyboardShortcuts({
    buildOpen,
    setBuildOpen,
    financeOpen,
    setFinanceOpen,
  });

  const handleInspectorClose = () => {
    setPropertyOpen(false);
    cancelPlacement();
    clearSelection();
  };

  const openPropertyPanel = () => {
    setPropertyOpen(true);
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
          <Stat label="Time" value={summary.calendarLabel} />
          <Stat label="Cash" value={summary.cashLabel} />
          <Stat
            label="Monthly Net"
            value={summary.monthlyNetLabel}
            tone={summary.monthlyNetTone}
            monthTick={ui.monthTickPulse}
          />
          <StatButton
            label="Residents"
            value={summary.residentsLabel}
            onClick={openPropertyPanel}
            testId="hud-residents"
          />
          <StatButton
            label="Property Health"
            value={summary.propertyHealthLabel}
            tone={healthToneToStatTone(summary.propertyHealthTone)}
            onClick={openPropertyPanel}
            testId="hud-property-health"
          />
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

      <ScenarioObjectiveStrip onOpenProperty={openPropertyPanel} />

      <div className={styles.boardRegion}>
        <PropertyBoard />

        <div className={styles.toastStack}>
          {ui.milestoneToasts.map((message) => (
            <div
              key={message}
              className={styles.toastMilestone}
              data-testid="milestone-toast"
              role="status"
            >
              <strong>{message}</strong>
            </div>
          ))}

          {financeWarning && gameState.status === 'active' && (
            <div
              className={styles.toast}
              data-level={financeWarning.level}
              data-testid="finance-warning-banner"
              role="status"
            >
              <strong>{financeWarning.title}.</strong> {financeWarning.message}
              {financeWarning.level === 'insolvency' && (
                <>
                  {' '}
                  {String(financeWarning.insolvencyMonthsRemaining)} month(s) remain before loss.
                </>
              )}
            </div>
          )}

          {occupancyWarning && gameState.status === 'active' && (
            <div
              className={styles.toast}
              data-level={occupancyWarning.level === 'spiral' ? 'spiral' : occupancyWarning.level}
              data-testid="occupancy-warning-banner"
              role="status"
            >
              <strong>{occupancyWarning.title}.</strong> {occupancyWarning.message}
            </div>
          )}

          {gameState.status === 'won' && ui.winResultsDismissed && (
            <div className={styles.toastWin} data-testid="win-banner" role="status">
              <strong>{objectiveHud.winBannerLabel}</strong> Three consecutive healthy months
              achieved.
            </div>
          )}

          {gameState.status === 'lost' && (
            <div className={styles.toastLoss} data-testid="loss-banner" role="status">
              <strong>Property insolvent.</strong> No recovery path available.
              <span className={styles.lossDetail}>
                Occupancy {String(lossRecap.occupancyPercent)}% · Health{' '}
                {String(lossRecap.propertyHealthScore)} · Insolvent{' '}
                {String(lossRecap.insolventMonths)} month(s)
              </span>
              {lossRecap.topFactors.length > 0 && (
                <span className={styles.lossDetail}>
                  Likely causes: {lossRecap.topFactors.map((factor) => factor.label).join('; ')}
                </span>
              )}
            </div>
          )}
        </div>

        <button
          type="button"
          className={styles.eventStrip}
          data-testid="monthly-event-strip"
          onClick={toggleReportDrawer}
        >
          {eventStripLabel}
        </button>

        <OnboardingGuide />

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
          <BuildCatalog
            onItemSelected={() => {
              setBuildOpen(false);
            }}
          />
        </div>

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
        <WinResultsModal />
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
  tone?: 'neutral' | 'positive' | 'negative' | 'projected';
  monthTick?: boolean;
}

function Stat({ label, value, tone = 'neutral', monthTick = false }: StatProps) {
  return (
    <div className={styles.stat}>
      <dt className={styles.statLabel}>{label}</dt>
      <dd
        className={styles.statValue}
        data-tone={tone}
        data-month-tick={monthTick ? 'true' : 'false'}
      >
        {value}
      </dd>
    </div>
  );
}

interface StatButtonProps extends StatProps {
  onClick: () => void;
  testId: string;
}

function StatButton({ label, value, tone = 'neutral', onClick, testId }: StatButtonProps) {
  return (
    <button type="button" className={styles.statButton} onClick={onClick} data-testid={testId}>
      <span className={styles.statLabel}>{label}</span>
      <span className={styles.statValue} data-tone={tone}>
        {value}
      </span>
    </button>
  );
}
