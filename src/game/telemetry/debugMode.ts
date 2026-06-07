const DEBUG_QUERY_KEY = 'debug';
const DEBUG_STORAGE_KEY = 'vpm-debug-mode';

export function readDebugModeFromQuery(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  const params = new URLSearchParams(window.location.search);
  return params.get(DEBUG_QUERY_KEY) === '1';
}

export function readDebugModeFromStorage(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  return window.localStorage.getItem(DEBUG_STORAGE_KEY) === '1';
}

export function persistDebugMode(enabled: boolean): void {
  if (typeof window === 'undefined') {
    return;
  }

  if (enabled) {
    window.localStorage.setItem(DEBUG_STORAGE_KEY, '1');
    return;
  }

  window.localStorage.removeItem(DEBUG_STORAGE_KEY);
}

export function isDebugModeEnabled(): boolean {
  return readDebugModeFromQuery() || readDebugModeFromStorage();
}

export function enableDebugModeFromQuery(): void {
  if (readDebugModeFromQuery()) {
    persistDebugMode(true);
  }
}

export const DEBUG_MODE_MUTATION_WARNING =
  'Debug tools mutate the active run and bypass normal save safeguards. Export a backup before experimenting.';
