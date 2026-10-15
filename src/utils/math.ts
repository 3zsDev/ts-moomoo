export const TAU = Math.PI * 2;

export function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// for normal the range is [min, max + 1), not [min, max)
export function randFloat(min: number, max: number): number {
  return Math.random() * (max - min + 1) + min;
}

export function lerp(from: number, to: number, t: number): number {
  return from + (to - from) * t;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function fixTo(value: number, decimals: number): number {
  return value ? parseFloat(value.toFixed(decimals)) : 0;
}

export function kFormat(value: number): string {
  return value > 999 ? (value / 1000).toFixed(1) + "k" : String(value);
}

export function capitalizeFirst(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export interface SeededRandom {
  int(min: number, max: number): number;
  float(min: number, max: number): number;
}

const pageSeed = (Math.random() * 4294967296) >>> 0;

export function seededRandom(key: string): SeededRandom {
  let state = 2166136261 ^ pageSeed;
  for (let i = 0; i < key.length; i++) state = Math.imul(state ^ key.charCodeAt(i), 16777619);

  const next = (): number => {
    state = (state + 1831565813) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  return {
    int: (min, max) => Math.floor(next() * (max - min + 1)) + min,
    float: (min, max) => next() * (max - min + 1) + min,
  };
}
