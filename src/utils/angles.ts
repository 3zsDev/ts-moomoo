import { TAU } from "./math";

export function getAngleDist(a: number, b: number): number {
  const diff = Math.abs(b - a) % TAU;
  return diff > Math.PI ? TAU - diff : diff;
}

export function lerpAngle(from: number, to: number, t: number): number {
  if (Math.abs(to - from) > Math.PI) {
    if (from > to) to += TAU;
    else from += TAU;
  }
  const result = to + (from - to) * t;
  return result >= 0 && result <= TAU ? result : result % TAU;
}

export function turnToward(current: number, target: number, maxStep: number): number {
  let dir = current % TAU;
  const gap = (dir - target + TAU) % TAU;
  const step = Math.min(Math.abs(gap - TAU), gap, maxStep);
  const sign = gap - Math.PI >= 0 ? 1 : -1;
  return (dir + sign * step + TAU) % TAU;
}
