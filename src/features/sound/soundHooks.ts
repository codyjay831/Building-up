export type SoundEvent =
  | 'month_advanced'
  | 'project_committed'
  | 'project_cancelled'
  | 'building_selected'
  | 'save_completed'
  | 'load_completed'
  | 'warning_triggered';

type SoundHandler = (event: SoundEvent) => void;

let handler: SoundHandler | null = null;

export function registerSoundHandler(nextHandler: SoundHandler | null): void {
  handler = nextHandler;
}

export function playSound(event: SoundEvent): void {
  handler?.(event);
}
