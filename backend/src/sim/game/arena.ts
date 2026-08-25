import { config, getDistance } from "../../shared";

const CENTER_X = 7200;
const CENTER_Y = 13200;

export const ARENA_STONE_SCALE = 85;

const CLEAR_RADIUS = 1150;

const WALL_STONES: Array<[number, number]> = [
  [6364.3, 13285], [6364.3, 13115], [6398.5, 12948.5], [6398.5, 13451.5],
  [6465.5, 12792.3], [6685.8, 12535.7], [6562.6, 12652.8], [6465.5, 13607.7],
  [6562.6, 13747.2], [6685.8, 13864.3], [6830.1, 13954.2], [6989.5, 14013.2],
  [7157.5, 14038.9], [7971.9, 12868.7], [8022.8, 13030.9], [8022.8, 13369.1],
  [7889.4, 13679.9], [7971.9, 13531.3], [7778.7, 13808.8], [7491.7, 13987.7],
  [7644.3, 13912.9], [7327.2, 14030.3], [6830.1, 12445.8], [6989.5, 12386.8],
  [7157.5, 12361.1], [7327.2, 12369.7], [7491.7, 12412.3], [7644.3, 12487.1],
  [7778.7, 12591.2], [7889.4, 12720.1],
];

const GATE_STONES: Array<[number, number]> = [
  [8208, 13200],
  [7872, 13200],
];

export const arenaStones: Array<[number, number]> = [...WALL_STONES, ...GATE_STONES];

export interface ArenaBoss {
  type: number;
  name: string;
  x: number;
  y: number;
  dir?: number;
}

export const UPRIGHT = Math.PI / 2;

function atAngle(degrees: number, radius: number): [number, number] {
  const radians = (degrees * Math.PI) / 180;
  return [CENTER_X + radius * Math.cos(radians), CENTER_Y + radius * Math.sin(radians)];
}
export const arenaBosses: ArenaBoss[] = [
  { type: 7, name: "Treasure", x: CENTER_X, y: CENTER_Y, dir: UPRIGHT },
  { type: 6, name: "MOOSTAFA", ...toPoint(atAngle(150, 450)) },
  { type: 8, name: "MOOFIE", ...toPoint(atAngle(210, 450)) },
];

function toPoint([x, y]: [number, number]): { x: number; y: number } {
  return { x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 };
}

export function inBossArena(x: number, y: number, margin = 0): boolean {
  return getDistance(x, y, CENTER_X, CENTER_Y) <= CLEAR_RADIUS + margin;
}

export const bossArena = {
  centerX: CENTER_X,
  centerY: CENTER_Y,
  wallRadius: 840,
  clearRadius: CLEAR_RADIUS,
  stoneScale: ARENA_STONE_SCALE,
  get inDesert(): boolean {
    return CENTER_Y - CLEAR_RADIUS >= config.mapScale - config.snowBiomeTop;
  },
};
