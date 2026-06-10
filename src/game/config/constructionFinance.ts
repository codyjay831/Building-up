import type { ConstructionFinanceEra } from '@/game/domain/types';

import constructionFinanceErasCsv from '@/game/config/data/construction-finance-eras.csv?raw';

function parseOptionalEndYear(raw: string): number | null {
  const trimmed = raw.trim();

  if (trimmed.length === 0) {
    return null;
  }

  const parsed = Number(trimmed);

  if (!Number.isInteger(parsed)) {
    throw new RangeError(`Construction finance era end_year is not an integer: ${raw}`);
  }

  return parsed;
}

export function parseConstructionFinanceEras(csvText: string): readonly ConstructionFinanceEra[] {
  const rows = csvText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (rows.length <= 1) {
    throw new Error('Construction finance eras CSV must include a header and at least one row');
  }

  const eras: ConstructionFinanceEra[] = [];

  for (const row of rows.slice(1)) {
    const columns = row.split(',');
    const id = columns[0]?.trim();
    const label = columns[1]?.trim();
    const startYear = Number(columns[2]?.trim());
    const endYear = parseOptionalEndYear(columns[3] ?? '');
    const minProjectCost = Number(columns[4]?.trim());
    const equityPercent = Number(columns[5]?.trim());
    const annualInterestRate = Number(columns[6]?.trim());

    if (!id || !label) {
      continue;
    }

    if (
      !Number.isInteger(startYear) ||
      !Number.isInteger(minProjectCost) ||
      !Number.isFinite(equityPercent) ||
      !Number.isFinite(annualInterestRate)
    ) {
      throw new RangeError(`Invalid construction finance era row: ${row}`);
    }

    eras.push({
      id,
      label,
      startYear,
      endYear,
      minProjectCost,
      equityPercent,
      annualInterestRate,
    });
  }

  if (eras.length === 0) {
    throw new Error('Construction finance eras CSV did not produce any eras');
  }

  return eras.sort((left, right) => left.startYear - right.startYear);
}

export function loadConstructionFinanceEras(
  csvText: string = constructionFinanceErasCsv,
): readonly ConstructionFinanceEra[] {
  return parseConstructionFinanceEras(csvText);
}

export function getConstructionFinanceEra(
  eras: readonly ConstructionFinanceEra[],
  calendarYear: number,
): ConstructionFinanceEra {
  const match = eras.find(
    (era) =>
      calendarYear >= era.startYear && (era.endYear === null || calendarYear <= era.endYear),
  );

  if (!match) {
    throw new RangeError(`No construction finance era configured for calendar year ${String(calendarYear)}`);
  }

  return match;
}
