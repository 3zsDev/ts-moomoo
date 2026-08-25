export const TAU = Math.PI * 2;

export function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function randFloat(min: number, max: number): number {
  return Math.random() * (max - min) + min;
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
