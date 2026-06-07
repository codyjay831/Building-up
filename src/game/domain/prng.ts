/** Deterministic pseudo-random number generator for domain simulation. */

export interface SeededRng {
  readonly state: number;
  readonly counter: number;
}

export function hashSeed(seed: string): number {
  let hash = 1779033703 ^ seed.length;

  for (let index = 0; index < seed.length; index += 1) {
    hash = Math.imul(hash ^ seed.charCodeAt(index), 3432918353);
    hash = (hash << 13) | (hash >>> 19);
  }

  return hash >>> 0 || 1;
}

export function createRng(seed: string, counter = 0): SeededRng {
  return {
    state: hashSeed(seed),
    counter,
  };
}

function mulberry32(state: number): [number, number] {
  const nextState = (state + 0x6d2b79f5) >>> 0;
  let t = nextState;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  const value = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  return [value, nextState];
}

export function nextRandom(rng: SeededRng): [number, SeededRng] {
  const [value, nextState] = mulberry32(rng.state ^ rng.counter);
  return [value, { state: nextState, counter: rng.counter + 1 }];
}

export function nextInt(
  rng: SeededRng,
  minInclusive: number,
  maxInclusive: number,
): [number, SeededRng] {
  if (
    !Number.isInteger(minInclusive) ||
    !Number.isInteger(maxInclusive) ||
    maxInclusive < minInclusive
  ) {
    throw new RangeError('nextInt requires integer bounds where max >= min');
  }

  const span = maxInclusive - minInclusive + 1;
  const [unit, nextRng] = nextRandom(rng);
  return [minInclusive + Math.floor(unit * span), nextRng];
}

export function deriveRunId(seed: string): string {
  const [first, rngA] = nextRandom(createRng(seed));
  const [second, rngB] = nextInt(rngA, 0, 999_999);
  void first;
  void second;
  const [third] = nextInt(rngB, 0, 999_999);
  return `run-${third.toString(16).padStart(6, '0')}`;
}
