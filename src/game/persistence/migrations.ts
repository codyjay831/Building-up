import { SCHEMA_VERSION } from '@/game/domain/types';

export type SaveMigration = (input: unknown) => unknown;

/** Sequential migrations keyed by source schema version (v1 -> v2 uses MIGRATIONS[1]). */
const MIGRATIONS: Partial<Record<number, SaveMigration>> = {};

function readSchemaVersion(raw: unknown): number | null {
  if (typeof raw !== 'object' || raw === null || !('schemaVersion' in raw)) {
    return null;
  }

  const version = raw.schemaVersion;

  if (typeof version !== 'number' || !Number.isInteger(version)) {
    return null;
  }

  return version;
}

export function getCurrentSchemaVersion(): number {
  return SCHEMA_VERSION;
}

export function migrateGameStatePayload(raw: unknown): unknown {
  const version = readSchemaVersion(raw);

  if (version === null) {
    return raw;
  }

  if (version < 1) {
    throw new Error('Save payload is missing a valid schema version.');
  }

  if (version > SCHEMA_VERSION) {
    throw new Error(
      `Save was created with a newer schema version (${String(version)}) than this build supports (${String(SCHEMA_VERSION)}).`,
    );
  }

  let current: unknown = raw;

  for (let step = version; step < SCHEMA_VERSION; step += 1) {
    const migration = MIGRATIONS[step];

    if (!migration) {
      throw new Error(`Missing save migration for schema version ${String(step)}`);
    }

    current = migration(current);
  }

  return current;
}

export function migrateSaveEnvelopePayload(raw: unknown): unknown {
  if (typeof raw !== 'object' || raw === null || !('gameState' in raw)) {
    return raw;
  }

  const envelope = raw as Record<string, unknown>;

  return {
    ...envelope,
    gameState: migrateGameStatePayload(envelope.gameState),
  };
}
