import type { GameState } from '@/game/domain/types';

import { migrateSaveEnvelopePayload } from '@/game/persistence/migrations';
import {
  MAX_IMPORT_BYTES,
  createSaveEnvelope,
  saveEnvelopeSchema,
  serializeSaveEnvelope,
  type LoadFailure,
  type LoadSuccess,
  type SaveEnvelope,
} from '@/game/persistence/saveSchema';

export type ImportResult = LoadSuccess | LoadFailure;

export function exportSaveJson(gameState: GameState): string {
  const envelope = createSaveEnvelope(gameState);
  return serializeSaveEnvelope(envelope);
}

export function importSaveJson(raw: string): ImportResult {
  if (raw.length > MAX_IMPORT_BYTES) {
    return { ok: false, error: 'Import exceeds the maximum allowed save size.' };
  }

  try {
    const parsedJson: unknown = JSON.parse(raw);
    const migrated = migrateSaveEnvelopePayload(parsedJson);
    const envelope = saveEnvelopeSchema.parse(migrated);
    return { ok: true, envelope };
  } catch {
    return { ok: false, error: 'Import is not valid save JSON.' };
  }
}

export function downloadSaveFile(
  gameState: GameState,
  filename = 'vertical-plot-manager-save.json',
): void {
  const payload = exportSaveJson(gameState);
  const blob = new Blob([payload], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function readImportFile(file: File): Promise<ImportResult> {
  if (file.size > MAX_IMPORT_BYTES) {
    return Promise.resolve({ ok: false, error: 'Import exceeds the maximum allowed save size.' });
  }

  return file.text().then((text) => importSaveJson(text));
}

export function isSaveEnvelope(value: unknown): value is SaveEnvelope {
  return saveEnvelopeSchema.safeParse(value).success;
}
