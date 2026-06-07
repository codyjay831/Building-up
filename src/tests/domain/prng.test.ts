import { describe, expect, it } from 'vitest';

import { createRng, deriveRunId, nextInt, nextRandom } from '@/game/domain/prng';

function collectRandomValues(seed: string, count: number): number[] {
  let rng = createRng(seed);
  const values: number[] = [];

  for (let index = 0; index < count; index += 1) {
    const [value, nextRng] = nextRandom(rng);
    values.push(value);
    rng = nextRng;
  }

  return values;
}

describe('seeded PRNG', () => {
  it('returns the same sequence for the same seed', () => {
    expect(collectRandomValues('starter-balanced', 5)).toEqual(
      collectRandomValues('starter-balanced', 5),
    );
  });

  it('returns different sequences for different seeds', () => {
    expect(collectRandomValues('seed-a', 3)).not.toEqual(collectRandomValues('seed-b', 3));
  });

  it('derives deterministic run ids from seeds', () => {
    expect(deriveRunId('riverside-starter-default')).toBe(deriveRunId('riverside-starter-default'));
    expect(deriveRunId('seed-a')).not.toBe(deriveRunId('seed-b'));
  });

  it('generates bounded integers deterministically', () => {
    const [firstValue, rngAfterFirst] = nextInt(createRng('bounded'), 1, 6);
    const [secondValue] = nextInt(rngAfterFirst, 1, 6);

    expect(firstValue).toBeGreaterThanOrEqual(1);
    expect(firstValue).toBeLessThanOrEqual(6);
    expect(secondValue).toBeGreaterThanOrEqual(1);
    expect(secondValue).toBeLessThanOrEqual(6);
  });
});
