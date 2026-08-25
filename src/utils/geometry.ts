export function getDistance(x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
}

export function getDirection(x1: number, y1: number, x2: number, y2: number): number {
  return Math.atan2(y1 - y2, x1 - x2);
}

export function lineInRect(
  left: number, top: number, right: number, bottom: number,
  x1: number, y1: number, x2: number, y2: number,
): boolean {
  let minX = x1;
  let maxX = x2;
  if (x1 > x2) {
    minX = x2;
    maxX = x1;
  }
  if (maxX > right) maxX = right;
  if (minX < left) minX = left;
  if (minX > maxX) return false;

  let minY = y1;
  let maxY = y2;
  const dx = x2 - x1;
  if (Math.abs(dx) > 0.0000001) {
    const slope = (y2 - y1) / dx;
    const intercept = y1 - slope * x1;
    minY = slope * minX + intercept;
    maxY = slope * maxX + intercept;
  }
  if (minY > maxY) {
    const swap = maxY;
    maxY = minY;
    minY = swap;
  }
  if (maxY > bottom) maxY = bottom;
  if (minY < top) minY = top;
  return minY <= maxY;
}
