const available = (() => {
  try {
    return typeof localStorage !== "undefined";
  } catch {
    return false;
  }
})();

export function saveSetting(key: string, value: string): void {
  if (!available) return;
  try {
    localStorage.setItem(key, value);
  } catch {}
}

export function loadSetting(key: string): string | null {
  if (!available) return null;
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function loadBool(key: string, fallback = false): boolean {
  const value = loadSetting(key);
  return value == null ? fallback : value === "true";
}

export function saveBool(key: string, value: boolean): void {
  saveSetting(key, value ? "true" : "false");
}
