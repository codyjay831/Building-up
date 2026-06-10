import type { RentPosture } from '@/game/domain/types';

export const LEASING_FACTOR_KEYS = [
  'demand',
  'appeal',
  'condition',
  'rentPosture',
  'parking',
  'buildingPreference',
  'total',
] as const;

export const RETAIL_DEMAND_KEYS = [
  'baseDemand',
  'residentCustomerBoost',
  'mixedUseSynergy',
  'frontageBonus',
  'parkingPenalty',
] as const;

export const RENT_POSTURES: readonly RentPosture[] = ['discount', 'market', 'premium'];

export function formatPostureLabel(posture: RentPosture): string {
  switch (posture) {
    case 'discount':
      return 'Discount';
    case 'premium':
      return 'Premium';
    default:
      return 'Market';
  }
}

export function formatSignedScore(value: number): string {
  if (value > 0) {
    return `+${String(value)}`;
  }

  return String(value);
}
