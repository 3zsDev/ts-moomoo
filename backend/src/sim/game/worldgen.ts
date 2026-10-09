import { config, getDistance, type Item, type ObjectManager, randInt } from "../../shared";
import { ARENA_STONE_SCALE, arenaStones, inBossArena } from "./arena";

const TREE = 0;
const BUSH = 1;
const ROCK = 2;
const GOLD = 3;

const RIVER_TOP = config.mapScale / 2 - config.riverWidth / 2 - config.riverPadding;
const RIVER_BOTTOM = config.mapScale / 2 + config.riverWidth / 2 + config.riverPadding;

const DESERT_TOP = config.mapScale - config.snowBiomeTop;

const CACTUS_DAMAGE = 35;

function isCactus(type: number, y: number): boolean {
  return type === BUSH && y >= DESERT_TOP;
}

function naturalTraits(type: number, y: number): Partial<Item> | null {
  if (isCactus(type, y)) return { dmg: CACTUS_DAMAGE };
  return null;
}

function pick(values: number[]): number {
  return values[randInt(0, values.length - 1)];
}

interface Placed {
  x: number;
  y: number;
  scale: number;
}

interface Rect {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

function inRiver(y: number, scale: number): boolean {
  return y + scale >= RIVER_TOP && y - scale <= RIVER_BOTTOM;
}

function overlaps(placed: Placed[], x: number, y: number, scale: number): boolean {
  for (const other of placed) {
    if (getDistance(x, y, other.x, other.y) < scale + other.scale) return true;
  }
  return false;
}

function scatter(
  placed: Placed[],
  scaleFor: (y: number) => number,
  rect: Rect,
  attempts = 60,
): Placed | null {
  if (rect.bottom <= rect.top || rect.right <= rect.left) return null;

  for (let i = 0; i < attempts; i++) {
    const y = randInt(Math.max(rect.top, 0), Math.min(rect.bottom, config.mapScale));
    const scale = scaleFor(y);
    if (y < scale || y > config.mapScale - scale) continue;

    const left = Math.max(rect.left, scale);
    const right = Math.min(rect.right, config.mapScale - scale);
    if (left > right) continue;
    const x = randInt(left, right);

    if (inRiver(y, scale)) continue;
    if (inBossArena(x, y, scale)) continue;
    if (overlaps(placed, x, y, scale)) continue;

    const entry = { x, y, scale };
    placed.push(entry);
    return entry;
  }
  return null;
}

export function generateWorld(objectManager: ObjectManager): void {
  const placed: Placed[] = [];
  let sid = 0;

  const add = (entry: Placed, type: number) => {
    const dir = (randInt(0, 628) / 100) % (Math.PI * 2);
    const traits = naturalTraits(type, entry.y);
    objectManager.add(sid++, entry.x, entry.y, dir, entry.scale, type, traits, true, null);
  };

  for (const [x, y] of arenaStones) {
    const entry = { x, y, scale: ARENA_STONE_SCALE };
    placed.push(entry);
    add(entry, ROCK);
  }

  const areaSize = config.mapScale / config.areaCount;
  const whole: Rect = { left: 0, top: 0, right: config.mapScale, bottom: config.mapScale };

  for (let column = 0; column < config.areaCount; column++) {
    for (let row = 0; row < config.areaCount; row++) {
      const area: Rect = {
        left: column * areaSize,
        top: row * areaSize,
        right: (column + 1) * areaSize,
        bottom: (row + 1) * areaSize,
      };

      const treeArea: Rect = { ...area, bottom: Math.min(area.bottom, DESERT_TOP) };
      for (let i = 0; i < config.treesPerArea; i++) {
        const entry = scatter(placed, () => pick(config.treeScales), treeArea);
        if (entry) add(entry, TREE);
      }

      for (let i = 0; i < config.bushesPerArea; i++) {
        const entry = scatter(placed, (y) => (isCactus(BUSH, y) ? Math.max(...config.bushScales) : pick(config.bushScales)), area);
        if (entry) add(entry, BUSH);
      }
    }
  }

  for (let i = 0; i < config.totalRocks; i++) {
    const entry = scatter(placed, () => pick(config.rockScales), whole, 200);
    if (entry) add(entry, ROCK);
  }

  for (let i = 0; i < config.goldOres; i++) {
    const entry = scatter(placed, () => pick(config.rockScales), whole, 200);
    if (entry) add(entry, GOLD);
  }
}

export function findSpawnPoint(objectManager: ObjectManager, scale: number): [number, number] {
  for (let i = 0; i < 200; i++) {
    const x = randInt(scale, config.mapScale - scale);
    const y = randInt(scale, config.mapScale - scale);

    if (inRiver(y, scale)) continue;
    if (inBossArena(x, y, scale)) continue;
    if (!objectManager.checkItemLocation(x, y, scale, 0.6, 0, true)) continue;
    return [x, y];
  }
  return [config.mapScale / 2, config.mapScale / 4];
}
