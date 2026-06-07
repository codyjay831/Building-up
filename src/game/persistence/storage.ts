import type { GameState } from '@/game/domain/types';
import { calculatePropertyValue } from '@/game/domain/propertyValue';
import { createGameConfig } from '@/game/config/scenario';
import { getPropertySummary } from '@/game/selectors/propertySelectors';

import { migrateSaveEnvelopePayload } from '@/game/persistence/migrations';
import {
  createSaveEnvelope,
  saveEnvelopeSchema,
  serializeSaveEnvelope,
  type LoadResult,
  type ManualSaveSlot,
  type SaveEnvelope,
  type SaveResult,
  type SaveSlot,
  type SaveSlotSummary,
} from '@/game/persistence/saveSchema';

const STORAGE_PREFIX = 'vpm:save:';

function getStorageKey(slot: SaveSlot): string {
  return `${STORAGE_PREFIX}${String(slot)}`;
}

function readRawSlot(slot: SaveSlot): string | null {
  if (typeof localStorage === 'undefined') {
    return null;
  }

  return localStorage.getItem(getStorageKey(slot));
}

function writeRawSlot(slot: SaveSlot, payload: string): SaveResult {
  if (typeof localStorage === 'undefined') {
    return { ok: false, error: 'Local storage is unavailable in this environment.' };
  }

  try {
    localStorage.setItem(getStorageKey(slot), payload);
    return { ok: true, savedAt: new Date().toISOString() };
  } catch {
    return { ok: false, error: 'Unable to write save data. Storage may be full or blocked.' };
  }
}

function removeRawSlot(slot: SaveSlot): void {
  if (typeof localStorage === 'undefined') {
    return;
  }

  localStorage.removeItem(getStorageKey(slot));
}

export function parseStoredSave(raw: string): LoadResult {
  try {
    const parsedJson: unknown = JSON.parse(raw);
    const migrated = migrateSaveEnvelopePayload(parsedJson);
    const envelope = saveEnvelopeSchema.parse(migrated);
    return { ok: true, envelope };
  } catch {
    return { ok: false, error: 'Save data is corrupt or incompatible.' };
  }
}

export function loadSaveSlot(slot: SaveSlot): LoadResult {
  const raw = readRawSlot(slot);

  if (!raw) {
    return { ok: false, error: 'No save found in this slot.' };
  }

  return parseStoredSave(raw);
}

export function saveGameState(slot: SaveSlot, gameState: GameState): SaveResult {
  const envelope = createSaveEnvelope(gameState);
  const payload = serializeSaveEnvelope(envelope);
  return writeRawSlot(slot, payload);
}

export function autosaveGameState(gameState: GameState): SaveResult {
  return saveGameState('autosave', gameState);
}

export function clearSaveSlot(slot: SaveSlot): void {
  removeRawSlot(slot);
}

export function getSaveSlotSummary(slot: ManualSaveSlot): SaveSlotSummary {
  const loaded = loadSaveSlot(slot);

  if (!loaded.ok) {
    return {
      slot,
      occupied: false,
      month: null,
      cash: null,
      occupancyLabel: null,
      savedAt: null,
    };
  }

  const config = createGameConfig();
  const summary = getPropertySummary(loaded.envelope.gameState, config);
  const propertyValue = calculatePropertyValue(loaded.envelope.gameState, config, config.balance);

  return {
    slot,
    occupied: true,
    month: loaded.envelope.gameState.month,
    cash: loaded.envelope.gameState.cash,
    occupancyLabel: `${summary.occupancyLabel} · ${propertyValue.toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    })}`,
    savedAt: loaded.envelope.savedAt,
  };
}

export function getAutosaveEnvelope(): SaveEnvelope | null {
  const loaded = loadSaveSlot('autosave');
  return loaded.ok ? loaded.envelope : null;
}
