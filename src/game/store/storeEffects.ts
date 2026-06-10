import type { SoundEvent } from '@/features/sound/soundHooks';
import { playSound } from '@/features/sound/soundHooks';

export type StoreSoundEffect = Extract<
  SoundEvent,
  | 'building_selected'
  | 'project_committed'
  | 'project_cancelled'
  | 'month_advanced'
  | 'save_completed'
  | 'load_completed'
>;

export function runStoreSoundEffect(effect: StoreSoundEffect): void {
  playSound(effect);
}
