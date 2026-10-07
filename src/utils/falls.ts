import { world } from "../config/world";

const falls = world.secretPool;
const riverY = world.mapScale / 2;
const riverHalf = world.riverWidth / 2;

export function fallsDistance(x: number, y: number): number {
  let distance = -x;
  const fromGorge = Math.abs(y - riverY) - falls.gorgeHalf;
  if (x >= falls.gorgeX0) distance = Math.min(distance, Math.max(fromGorge, 0));

  for (const [px, py, radius] of falls.pool) {
    distance = Math.min(distance, Math.hypot(x - px, y - py) - radius);
  }

  const fall = falls.waterfall;
  if (Math.abs(y - fall.y) < fall.half + 60 && x < fall.x) {
    distance = Math.min(distance, Math.abs(y - fall.y) - fall.half);
  }
  return distance;
}
// bossbar range
export function inFallsPool(x: number, y: number): boolean {
  return falls.pool.some(([px, py, radius]) => Math.hypot(x - px, y - py) <= radius * 0.9);
}

export function inFallsWater(x: number, y: number): boolean {
  if (x < 0 && x >= falls.gorgeX0 && Math.abs(y - riverY) <= riverHalf) return true;
  return falls.pool.some(([px, py, radius]) => Math.hypot(x - px, y - py) <= radius);
}

export function inShallows(x: number, y: number): boolean {
  return x >= falls.shallows.start && x <= falls.shallows.end && Math.abs(y - riverY) <= riverHalf;
}

interface Body {
  x: number;
  y: number;
  scale: number;
  xVel: number;
  yVel: number;
}

export function confineToWorld(body: Body, mapScale: number, waterOnly = false): void {
  const r = body.scale;

  if (!waterOnly && body.x - r >= 0) {
    clampToMap(body, mapScale);
    return;
  }

  const gorgeHalf = waterOnly ? riverHalf : falls.gorgeHalf;
  let bestDepth = -Infinity;
  let project: (() => void) | null = null;

  if (!waterOnly) {
    bestDepth = body.x;
    project = () => {
      body.x = r;
      body.xVel = 0;
    };
  }

  if (body.x >= falls.gorgeX0) {
    let depth = gorgeHalf - Math.abs(body.y - riverY);
    if (waterOnly) depth = Math.min(depth, -body.x);
    if (depth > bestDepth) {
      bestDepth = depth;
      project = () => {
        const limit = Math.max(0, gorgeHalf - r);
        body.y = riverY + Math.max(-limit, Math.min(limit, body.y - riverY));
        body.yVel = 0;
        if (waterOnly && body.x > -r) {
          body.x = -r;
          body.xVel = 0;
        }
      };
    }
  }

  for (const [px, py, radius] of falls.pool) {
    const distance = Math.hypot(body.x - px, body.y - py);
    const depth = radius - distance;
    if (depth > bestDepth) {
      bestDepth = depth;
      project = () => {
        const reach = Math.max(0, radius - r);
        const angle = Math.atan2(body.y - py, body.x - px);
        body.x = px + Math.cos(angle) * reach;
        body.y = py + Math.sin(angle) * reach;
        body.xVel *= 0.5;
        body.yVel *= 0.5;
      };
    }
  }

  if (bestDepth < r) project?.();
  clampToMap(body, mapScale, true);
}

function clampToMap(body: Body, mapScale: number, allowWest = false): void {
  const r = body.scale;
  if (!allowWest && body.x - r < 0) {
    body.x = r;
    body.xVel = 0;
  } else if (body.x + r > mapScale) {
    body.x = mapScale - r;
    body.xVel = 0;
  }
  if (body.y - r < 0) {
    body.y = r;
    body.yVel = 0;
  } else if (body.y + r > mapScale) {
    body.y = mapScale - r;
    body.yVel = 0;
  }
}
