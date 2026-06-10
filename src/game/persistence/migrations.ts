import { CURRENT_SAVE_FORMAT_VERSION } from '@/game/persistence/saveSchema';
import { SCHEMA_VERSION } from '@/game/domain/types';

export type SaveMigration = (input: unknown) => unknown;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function migrateDebtRecord(debt: Record<string, unknown>): Record<string, unknown> {
  return {
    ...debt,
    disbursedPrincipal:
      typeof debt.disbursedPrincipal === 'number' ? debt.disbursedPrincipal : 0,
    annualInterestRate:
      typeof debt.annualInterestRate === 'number' ? debt.annualInterestRate : 0,
  };
}

function migrateProjectRecord(project: Record<string, unknown>): Record<string, unknown> {
  const monthlyDraws = Array.isArray(project.monthlyDraws)
    ? project.monthlyDraws.filter((draw): draw is number => typeof draw === 'number')
    : undefined;
  const buildDurationMonths =
    typeof project.buildDurationMonths === 'number'
      ? project.buildDurationMonths
      : monthlyDraws?.length ??
        (typeof project.monthsRemaining === 'number' ? project.monthsRemaining : 0);

  const { monthlyDraws: _removed, ...rest } = project;

  return {
    ...rest,
    buildDurationMonths,
  };
}

/** Sequential migrations keyed by source schema version (v1 -> v2 uses MIGRATIONS[1]). */
const MIGRATIONS: Partial<Record<number, SaveMigration>> = {
  1: (input) => {
    if (!isRecord(input)) {
      return input;
    }

    const projects = Array.isArray(input.projects)
      ? input.projects
          .filter(isRecord)
          .map((project) => migrateProjectRecord(project))
      : input.projects;
    const debt = Array.isArray(input.debt)
      ? input.debt.filter(isRecord).map((instrument) => migrateDebtRecord(instrument))
      : input.debt;

    return {
      ...input,
      schemaVersion: 2,
      projects,
      debt,
    };
  },
  2: (input) => {
    if (!isRecord(input)) {
      return input;
    }

    const lot = isRecord(input.lot) ? input.lot : {};
    const { accessTiles, ...lotRest } = lot;
    const drivewayTiles = Array.isArray(lot.drivewayTiles)
      ? lot.drivewayTiles
      : Array.isArray(accessTiles)
        ? accessTiles
        : [];

    return {
      ...input,
      schemaVersion: 3,
      lot: {
        ...lotRest,
        drivewayTiles,
      },
    };
  },
};

/** Sequential envelope migrations keyed by source format version. */
const ENVELOPE_MIGRATIONS: Partial<Record<number, SaveMigration>> = {
  1: (input) => {
    if (!isRecord(input)) {
      return input;
    }

    return {
      ...input,
      formatVersion: 2,
    };
  },
  2: (input) => {
    if (!isRecord(input)) {
      return input;
    }

    return {
      ...input,
      formatVersion: CURRENT_SAVE_FORMAT_VERSION,
    };
  },
};

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

function readFormatVersion(raw: unknown): number {
  if (typeof raw !== 'object' || raw === null || !('formatVersion' in raw)) {
    return 1;
  }

  const version = raw.formatVersion;

  if (typeof version !== 'number' || !Number.isInteger(version)) {
    return 1;
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

  let current = raw as Record<string, unknown>;
  const formatVersion = readFormatVersion(current);

  if (formatVersion > CURRENT_SAVE_FORMAT_VERSION) {
    throw new Error(
      `Save was created with a newer format version (${String(formatVersion)}) than this build supports (${String(CURRENT_SAVE_FORMAT_VERSION)}).`,
    );
  }

  for (let step = formatVersion; step < CURRENT_SAVE_FORMAT_VERSION; step += 1) {
    const migration = ENVELOPE_MIGRATIONS[step];

    if (!migration) {
      throw new Error(`Missing envelope migration for format version ${String(step)}`);
    }

    current = migration(current) as Record<string, unknown>;
  }

  return {
    ...current,
    gameState: migrateGameStatePayload(current.gameState),
  };
}
