const RELOADED_KEY = "moo_reloaded";
const RELOAD_GAP = 5 * 60 * 1000;

function lastReload(): number {
  try {
    return Number(sessionStorage.getItem(RELOADED_KEY)) || 0;
  } catch {
    return 0;
  }
}

export function canAutoReload(): boolean {
  return Date.now() - lastReload() >= RELOAD_GAP;
}

export function autoReload(): void {
  if (!canAutoReload()) return;
  try {
    sessionStorage.setItem(RELOADED_KEY, String(Date.now()));
  } catch {
    return;
  }
  location.reload();
}
