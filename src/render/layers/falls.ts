import type { Painter } from "../painter";
import { config } from "../../config";
import { fallsDistance } from "../../utils/falls";
// crab boss stuff
const falls = config.secretPool;
const riverY = config.mapScale / 2;
const riverHalf = config.riverWidth / 2;

const ROCK_BG = "#7d776c";
const ROCK_SHADOW = "#5a554c";
const ROCK_MID = "#8f897d";
const ROCK_LIGHT = "#a39d90";
const FLOOR = "#a9a291";
const SAND = "#dbc666";
const WATER = "#91b2db";
const DEEP = "#7b9fd0";
const FOAM = "#cfe2f5";
const ROCK_BORDER = 80;
const BEACH = 34;
const FOAM_WIDTH = 330;

const SHALLOW_FADE_OUT = 150;
const SHALLOW_FADE_IN = 380;
const STONE_COLORS = ["#8f9aa0", "#9a9686", "#7f8b92"];

function seeded(seed: number): () => number {
  return () => {
    seed = (seed + 1831565813) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rocks: Array<[number, number, number]> = [];
{
  const random = seeded(1337);
  for (let i = 0; i < 4000 && rocks.length < 450; i++) {
    const x = -5600 + random() * 5560;
    const y = -700 + random() * (config.mapScale + 1400);
    const radius = 40 + random() * 95;
    if (fallsDistance(x, y) >= radius + ROCK_BORDER + 20) rocks.push([x, y, radius]);
  }
}

const shallows = falls.shallows;
const stones: Array<[number, number, number, number]> = [];
{
  const random = seeded(4242);
  const length = shallows.end - shallows.start;
  for (let i = 0; i < 500 && stones.length < 150; i++) {
    const radius = 10 + random() * 20;
    const x = shallows.start + radius + random() * (length - radius * 2);
    if (random() > Math.min(1, (shallows.end - x) / (SHALLOW_FADE_OUT * 1.6))) continue;
    const y = riverY + (random() * 2 - 1) * (riverHalf - radius - 6);
    const inPool = falls.pool.some(([px, py, pr]) => Math.hypot(x - px, y - py) < pr + radius);
    if (!inPool) stones.push([x, y, radius, Math.floor(random() * 3)]);
  }
}

function foamEdge(side: number, y: number): number {
  return (side > 0 ? shallows.end : shallows.start) + Math.sin((y - riverY) / 70 + side) * 18;
}

function renderFoamLine(
  painter: Painter, side: number, offsetX: number, offsetY: number, now: number,
): void {
  painter.strokeStyle = "#ffffff";
  painter.lineWidth = 8;
  const span = side > 0 ? 260 : 220;

  for (let i = 0; i < 16; i++) {
    const y = riverY - riverHalf + 18 + i * ((riverHalf * 2 - 36) / 15);
    const edge = foamEdge(side, y);
    const length = 60 + ((i * 47) % 70);
    const travel = (now * (0.5 + (i % 3) * 0.1) + i * 89 + side * 50) % span;
    const start = edge - 30 + travel;
    const end = Math.min(edge - 30 + span, start + length);
    painter.globalAlpha = 0.75 * (1 - travel / span);
    painter.line(start + offsetX, y + offsetY, end + offsetX, y + offsetY);
  }

  painter.fillStyle = "#ffffff";
  for (let i = 0; i < 10; i++) {
    const y = riverY - riverHalf + 30 + i * ((riverHalf * 2 - 60) / 9);
    const bob = Math.sin(now * 0.007 + i * 1.9 + side);
    painter.globalAlpha = 0.7;
    painter.disc(foamEdge(side, y) + 10 + bob * 10 + offsetX, y + offsetY, 24 + bob * 6 + (i % 3) * 5);
  }
}

export function renderShallows(
  painter: Painter, left: number, top: number,
  width: number, height: number, wave: number, now: number,
): void {
  if (left > shallows.end + 320 || left + width < shallows.start - 320) return;
  const offsetX = -left;
  const offsetY = -top;
  if (riverY + riverHalf + offsetY < 0 || riverY - riverHalf + offsetY > height) return;

  painter.save();
  const half = riverHalf + wave / 2;

  const fillBand = (alpha: number) => {
    painter.globalAlpha = alpha;
    painter.fillRect(
      shallows.start + SHALLOW_FADE_IN + offsetX, riverY - half + offsetY,
      shallows.end - shallows.start - SHALLOW_FADE_IN - SHALLOW_FADE_OUT, half * 2,
    );
    for (let i = 0; i < 6; i++) {
      painter.globalAlpha = (alpha * (i + 1)) / 7;
      painter.fillRect(
        shallows.start + i * (SHALLOW_FADE_IN / 6) + offsetX, riverY - half + offsetY,
        SHALLOW_FADE_IN / 6 + 1, half * 2,
      );
      painter.fillRect(
        shallows.end - (i + 1) * (SHALLOW_FADE_OUT / 6) + offsetX, riverY - half + offsetY,
        SHALLOW_FADE_OUT / 6 + 1, half * 2,
      );
    }
  };

  painter.fillStyle = "#9cbcd8";
  fillBand(1);

  for (const [sx, sy, radius, color] of stones) {
    const x = sx + offsetX;
    const y = sy + offsetY;
    if (x + radius < 0 || x - radius > width || y + radius < 0 || y - radius > height) continue;
    painter.globalAlpha = 0.35;
    painter.fillStyle = "#5d6d78";
    painter.disc(x + radius * 0.15, y + radius * 0.18, radius);
    painter.globalAlpha = 0.7;
    painter.fillStyle = STONE_COLORS[color];
    painter.disc(x, y, radius);
    painter.globalAlpha = 0.5;
    painter.fillStyle = "#c3cbc9";
    painter.disc(x - radius * 0.25, y - radius * 0.28, radius * 0.4);
  }

  painter.fillStyle = "#b8d6ee";
  fillBand(0.3);

  painter.strokeStyle = "#ffffff";
  painter.lineWidth = 5;
  for (let i = 0; i < 9; i++) {
    const y = riverY - riverHalf + 40 + i * ((riverHalf * 2 - 80) / 8);
    const start = shallows.start;
    const edge = foamEdge(1, y);
    const travel = ((now * 0.08 + i * 211) % (edge - start + 120)) - 120;
    const from = start + Math.max(0, travel);
    const to = start + Math.min(edge - start, travel + 120);
    painter.globalAlpha = 0.28;
    if (to > from) painter.line(from + offsetX, y + offsetY, to + offsetX, y + offsetY);
  }

  renderFoamLine(painter, 1, offsetX, offsetY, now);
  painter.restore();
}

export function renderFalls(
  painter: Painter, left: number, top: number,
  width: number, height: number, wave: number, now: number,
): void {
  if (left >= 0) return;

  painter.save();
  const offsetX = -left;
  const offsetY = -top;
  const fall = falls.waterfall;
  const foamX = fall.x - FOAM_WIDTH;

  painter.globalAlpha = 1;
  painter.fillStyle = ROCK_BG;
  painter.fillRect(0, 0, Math.min(offsetX, width), height);

  for (const [rx, ry, radius] of rocks) {
    const x = rx + offsetX;
    const y = ry + offsetY;
    if (x + radius < 0 || x - radius > width || y + radius < 0 || y - radius > height) continue;
    painter.fillStyle = ROCK_SHADOW;
    painter.disc(x + radius * 0.12, y + radius * 0.16, radius);
    painter.fillStyle = ROCK_MID;
    painter.disc(x, y, radius);
    painter.fillStyle = ROCK_LIGHT;
    painter.disc(x - radius * 0.2, y - radius * 0.22, radius * 0.55);
  }

  painter.fillStyle = ROCK_SHADOW;
  painter.fillRect(offsetX - 7000, fall.y - fall.half - 40 + offsetY, foamX + 7000, (fall.half + 40) * 2);
  painter.fillRect(offsetX - ROCK_BORDER, 0, ROCK_BORDER, height);
  painter.fillRect(
    falls.gorgeX0 + offsetX, riverY - falls.gorgeHalf - ROCK_BORDER + offsetY,
    -falls.gorgeX0, (falls.gorgeHalf + ROCK_BORDER) * 2,
  );
  for (const [px, py, radius] of falls.pool) painter.polyDisc(px + offsetX, py + offsetY, radius + ROCK_BORDER);

  painter.fillStyle = FLOOR;
  painter.fillRect(falls.gorgeX0 + offsetX, riverY - falls.gorgeHalf + offsetY, -falls.gorgeX0 + 2, falls.gorgeHalf * 2);
  for (const [px, py, radius] of falls.pool) painter.polyDisc(px + offsetX, py + offsetY, radius + BEACH);

  const waterWidth = config.riverWidth + wave;
  painter.fillStyle = SAND;
  painter.fillRect(
    falls.gorgeX0 + offsetX, riverY - (config.riverWidth + config.riverPadding) / 2 + offsetY,
    -falls.gorgeX0 + 2, config.riverWidth + config.riverPadding,
  );
  painter.fillStyle = WATER;
  painter.fillRect(falls.gorgeX0 + offsetX, riverY - waterWidth / 2 + offsetY, -falls.gorgeX0 + 2, waterWidth);
  for (const [px, py, radius] of falls.pool) painter.polyDisc(px + offsetX, py + offsetY, radius);

  const [lairX, lairY, lairRadius] = falls.pool[0];
  painter.globalAlpha = 0.4;
  painter.fillStyle = DEEP;
  painter.polyDisc(lairX + offsetX, lairY + offsetY, lairRadius * 0.62);

  painter.globalAlpha = 1;
  painter.fillStyle = WATER;
  painter.fillRect(offsetX - 7000, fall.y - fall.half + offsetY, foamX + 7000, fall.half * 2);
  painter.fillStyle = FOAM;
  painter.fillRect(foamX + offsetX, fall.y - fall.half + offsetY, FOAM_WIDTH + 20, fall.half * 2);
  painter.globalAlpha = 0.5;
  painter.fillStyle = WATER;
  painter.fillRect(foamX + offsetX, fall.y - fall.half + offsetY, FOAM_WIDTH + 20, 26);
  painter.fillRect(foamX + offsetX, fall.y + fall.half - 26 + offsetY, FOAM_WIDTH + 20, 26);

  painter.globalAlpha = 1;
  painter.strokeStyle = "#ffffff";
  painter.lineWidth = 12;
  painter.line(foamX + offsetX, fall.y - fall.half + offsetY, foamX + offsetX, fall.y + fall.half + offsetY);

  painter.lineWidth = 7;
  for (let i = 0; i < 14; i++) {
    const y = fall.y - fall.half + 18 + i * ((fall.half * 2 - 36) / 13) + offsetY;
    const length = 120 + ((i * 53) % 110);
    const span = FOAM_WIDTH + 20 + length;
    const travel = ((now * (0.7 + (i % 3) * 0.12) + i * 97) % span) - length;
    const from = foamX + Math.max(0, travel) + offsetX;
    const to = foamX + Math.min(FOAM_WIDTH + 20, travel + length) + offsetX;
    painter.globalAlpha = 0.55 + (i % 2) * 0.25;
    if (to > from) painter.line(from, y, to, y);
  }

  painter.globalAlpha = 1;
  painter.fillStyle = "#ffffff";
  for (let i = 0; i < 9; i++) {
    const y = fall.y - fall.half + 10 + i * ((fall.half * 2 - 20) / 8);
    const bob = Math.sin(now * 0.006 + i * 1.7);
    painter.globalAlpha = 0.75;
    painter.disc(fall.x + 30 + bob * 14 + offsetX, y + offsetY, 38 + bob * 8 + (i % 3) * 8);
  }

  const pulse = 0.5 + 0.5 * Math.sin(now * 0.004);
  painter.globalAlpha = 0.45 + pulse * 0.15;
  painter.glow(fall.x + 40 + offsetX, fall.y + offsetY, 300, 60, "#ffffff");

  for (let i = 0; i < 3; i++) {
    const phase = (now / 2400 + i / 3) % 1;
    painter.globalAlpha = 0.4 * (1 - phase);
    painter.ring(fall.x + 40 + offsetX, fall.y + offsetY, 260 + phase * 420);
  }
  painter.restore();
}
