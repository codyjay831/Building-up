import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { advanceMonth } from '@/game/commands/advanceMonth';
import { placeProject } from '@/game/commands/placeProject';
import { createGameConfig, createStarterGameState, RIVERSIDE_STARTER_SCENARIO_ID } from '@/game/config/scenario';
import {
  deriveCompletedObjectiveIds,
  getActiveObjectiveId,
  isTutorialComplete,
  type OnboardingContext,
} from '@/game/onboarding/objectives';
import { exportSaveJson, importSaveJson } from '@/game/persistence/exportImport';
import {
  autosaveGameState,
  clearSaveSlot,
  loadSaveSlot,
  saveGameState,
} from '@/game/persistence/storage';
import { saveEnvelopeSchema } from '@/game/persistence/saveSchema';
import type { GameState } from '@/game/domain/types';

class MemoryStorage {
  private readonly store = new Map<string, string>();

  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }
}

describe('save persistence', () => {
  const config = createGameConfig();
  let starter = createStarterGameState(RIVERSIDE_STARTER_SCENARIO_ID, 'phase8-save');

  beforeEach(() => {
    starter = createStarterGameState(RIVERSIDE_STARTER_SCENARIO_ID, 'phase8-save');
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: new MemoryStorage(),
    });
  });

  afterEach(() => {
    Reflect.deleteProperty(globalThis, 'localStorage');
  });

  it('round trips all domain state through autosave and manual slots', () => {
    const placed = placeProject(starter, config, {
      definitionId: 'small_park',
      footprint: {
        origin: { x: 0, y: 0 },
        width: 2,
        height: 2,
        rotation: 0,
      },
    });
    expect(placed.ok).toBe(true);
    if (!placed.ok) {
      return;
    }

    const advanced = advanceMonth(placed.state, config);
    expect(advanced.ok).toBe(true);
    if (!advanced.ok) {
      return;
    }

    const sourceState = advanced.state;
    const autosaveResult = autosaveGameState(sourceState);
    expect(autosaveResult.ok).toBe(true);

    const autosaveLoaded = loadSaveSlot('autosave');
    expect(autosaveLoaded.ok).toBe(true);
    if (!autosaveLoaded.ok) {
      return;
    }

    expect(autosaveLoaded.envelope.gameState).toEqual(sourceState);

    const manualSaveResult = saveGameState(2, sourceState);
    expect(manualSaveResult.ok).toBe(true);

    const manualLoaded = loadSaveSlot(2);
    expect(manualLoaded.ok).toBe(true);
    if (!manualLoaded.ok) {
      return;
    }

    expect(manualLoaded.envelope.gameState).toEqual(sourceState);
  });

  it('exports and imports JSON with Zod validation', () => {
    const payload = exportSaveJson(starter);
    const imported = importSaveJson(payload);

    expect(imported.ok).toBe(true);
    if (!imported.ok) {
      return;
    }

    expect(imported.envelope.gameState).toEqual(starter);
    expect(saveEnvelopeSchema.safeParse(JSON.parse(payload)).success).toBe(true);
  });

  it('rejects invalid imports safely', () => {
    expect(importSaveJson('{ not valid json')).toEqual({
      ok: false,
      error: 'Import is not valid save JSON.',
    });

    expect(
      importSaveJson(
        JSON.stringify({
          formatVersion: 1,
          savedAt: new Date().toISOString(),
          gameState: { schemaVersion: 1, cash: 'not-a-number' },
        }),
      ),
    ).toEqual({
      ok: false,
      error: 'Import is not valid save JSON.',
    });

    expect(importSaveJson('x'.repeat(2 * 1024 * 1024 + 1))).toEqual({
      ok: false,
      error: 'Import exceeds the maximum allowed save size.',
    });
  });

  it('clears manual slots', () => {
    saveGameState(1, starter);
    clearSaveSlot(1);

    const loaded = loadSaveSlot(1);
    expect(loaded.ok).toBe(false);
  });

  it('preserves counters, ledger, and debt through serialization', () => {
    const mutated: GameState = {
      ...starter,
      counters: {
        ...starter.counters,
        rngCounter: 42,
      },
      ledger: [
        {
          id: 'ledger-1',
          month: 1,
          kind: 'monthly',
          openingCash: 100_000,
          closingCash: 101_000,
          netCashFlow: 1_000,
          lines: [],
          grossRent: 2_000,
          operatingExpenses: 1_000,
        },
      ],
      debt: [
        {
          id: 'debt-1',
          type: 'refinance',
          principal: 50_000,
          originalPrincipal: 50_000,
          monthlyPayment: 450,
          paymentsActive: true,
        },
      ],
    };

    const imported = importSaveJson(exportSaveJson(mutated));
    expect(imported.ok).toBe(true);
    if (!imported.ok) {
      return;
    }

    expect(imported.envelope.gameState.counters.rngCounter).toBe(42);
    expect(imported.envelope.gameState.ledger).toHaveLength(1);
    expect(imported.envelope.gameState.debt).toHaveLength(1);
  });
});

describe('guided onboarding objectives', () => {
  it('tracks the first five objectives in order', () => {
    const baseContext: OnboardingContext = {
      selectedBuildingId: null,
      selectedBuildingDefinitionId: null,
      month: 1,
      hasMonthlyReport: false,
      reportDrawerOpen: false,
      keepDecisionMade: false,
      reportReadAfterFirstMonth: false,
      starterHouseRenovated: false,
    };

    expect(getActiveObjectiveId(deriveCompletedObjectiveIds(baseContext))).toBe('select_house');

    const selectedHouse: OnboardingContext = {
      ...baseContext,
      selectedBuildingId: 'building-1',
      selectedBuildingDefinitionId: 'existing_house',
    };
    let completed = deriveCompletedObjectiveIds(selectedHouse);
    expect(completed).toEqual(['select_house', 'review_condition']);
    expect(getActiveObjectiveId(completed)).toBe('keep_or_renovate');

    const keepDecision: OnboardingContext = {
      ...selectedHouse,
      keepDecisionMade: true,
    };
    completed = deriveCompletedObjectiveIds(keepDecision);
    expect(completed).toContain('keep_or_renovate');

    const afterMonth: OnboardingContext = {
      ...keepDecision,
      month: 2,
      hasMonthlyReport: true,
    };
    completed = deriveCompletedObjectiveIds(afterMonth);
    expect(completed).toContain('advance_month');
    expect(getActiveObjectiveId(completed)).toBe('read_report');

    const finished: OnboardingContext = {
      ...afterMonth,
      reportDrawerOpen: true,
      reportReadAfterFirstMonth: true,
    };
    completed = deriveCompletedObjectiveIds(finished);
    expect(isTutorialComplete(completed)).toBe(true);
  });

  it('treats renovation as satisfying the keep-or-renovate objective', () => {
    const context: OnboardingContext = {
      selectedBuildingId: 'building-1',
      selectedBuildingDefinitionId: 'existing_house',
      month: 1,
      hasMonthlyReport: false,
      reportDrawerOpen: false,
      keepDecisionMade: false,
      reportReadAfterFirstMonth: false,
      starterHouseRenovated: true,
    };

    expect(deriveCompletedObjectiveIds(context)).toContain('keep_or_renovate');
  });
});
