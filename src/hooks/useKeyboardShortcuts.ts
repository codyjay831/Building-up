import { type Dispatch, type SetStateAction, useEffect } from 'react';

import { useGameStore } from '@/game/store/gameStore';

interface UseKeyboardShortcutsOptions {
  buildOpen: boolean;
  setBuildOpen: Dispatch<SetStateAction<boolean>>;
  financeOpen: boolean;
  setFinanceOpen: Dispatch<SetStateAction<boolean>>;
}

export function useKeyboardShortcuts({
  buildOpen,
  setBuildOpen,
  financeOpen,
  setFinanceOpen,
}: UseKeyboardShortcutsOptions) {
  const advanceMonth = useGameStore((store) => store.advanceMonth);
  const toggleReportDrawer = useGameStore((store) => store.toggleReportDrawer);
  const toggleSettings = useGameStore((store) => store.toggleSettings);
  const closeSettings = useGameStore((store) => store.closeSettings);
  const cancelPlacement = useGameStore((store) => store.cancelPlacement);
  const rotatePlacementPreview = useGameStore((store) => store.rotatePlacementPreview);
  const gameStatus = useGameStore((store) => store.gameState.status);
  const settingsOpen = useGameStore((store) => store.ui.settingsOpen);
  const reportDrawerOpen = useGameStore((store) => store.ui.reportDrawerOpen);
  const placementActive = useGameStore((store) => store.ui.placementPreview !== null);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target;

      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement
      ) {
        return;
      }

      const key = event.key.toLowerCase();

      if (key === 'escape') {
        if (settingsOpen) {
          closeSettings();
          event.preventDefault();
          return;
        }

        if (reportDrawerOpen) {
          toggleReportDrawer();
          event.preventDefault();
          return;
        }

        if (buildOpen) {
          setBuildOpen(false);
          event.preventDefault();
          return;
        }

        if (financeOpen) {
          setFinanceOpen(false);
          event.preventDefault();
          return;
        }

        if (placementActive) {
          cancelPlacement();
          event.preventDefault();
        }

        return;
      }

      if (key === 'n' && gameStatus === 'active') {
        advanceMonth();
        event.preventDefault();
        return;
      }

      if (key === ',') {
        toggleSettings();
        event.preventDefault();
        return;
      }

      if (key === '1') {
        setBuildOpen((o) => !o);
        event.preventDefault();
        return;
      }

      if (key === '3') {
        setFinanceOpen((o) => !o);
        event.preventDefault();
        return;
      }

      if (key === '4') {
        toggleReportDrawer();
        event.preventDefault();
        return;
      }

      if (key === 'r' && placementActive) {
        rotatePlacementPreview();
        event.preventDefault();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [
    advanceMonth,
    buildOpen,
    cancelPlacement,
    closeSettings,
    financeOpen,
    gameStatus,
    placementActive,
    reportDrawerOpen,
    rotatePlacementPreview,
    setBuildOpen,
    setFinanceOpen,
    settingsOpen,
    toggleReportDrawer,
    toggleSettings,
  ]);
}
