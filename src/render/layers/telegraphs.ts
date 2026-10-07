import { config } from "../../config";
import { circle, disc, drawTinted, ring } from "../context";

// packet w gives some cool info
export const TelegraphKind = {
  Splash: 0,
  Ring: 1,
  DiveSplash: 2,
  Slam: 3,
  Dash: 4,
} as const;

interface Telegraph {
  kind: number;
  x: number;
  y: number;
  x2: number;
  y2: number;
  r: number;
  start: number;
  end: number;
  seed: number;
  inner: number;
}

const TICK = 1000 / config.serverUpdateRate;
const FADE_TIME = 450;
const BLINK_TIME = 350;
const DASH_INNER = 280 * 1.2 * 0.8;

const telegraphs: Telegraph[] = [];

export function addTelegraph(
  kind: number, x: number, y: number, r: number, durationMs: number, x2?: number, y2?: number,
): void {
  const now = performance.now();
  telegraphs.push({
    kind, x, y, r,
    x2: x2 ?? x,
    y2: y2 ?? y,
    start: now,
    end: now + durationMs + TICK,
    seed: Math.random() * 1000,
    inner: kind === TelegraphKind.Dash ? DASH_INNER : 0,
  });
}

export function clearTelegraphs(): void {
  telegraphs.length = 0;
}

function kindColor(kind: number): string {
  if (kind === TelegraphKind.Slam) return "#ff8a4d";
  if (kind === TelegraphKind.Dash) return "#ff3b2f";
  if (kind === TelegraphKind.Ring) return "#2f5fae";
  return "#e8f5ff";
}

function hash(a: number, b: number): number {
  const n = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453;
  return n - Math.floor(n);
}

let chevron: HTMLCanvasElement | null = null;

function chevronSprite(): HTMLCanvasElement {
  if (chevron) return chevron;
  chevron = document.createElement("canvas");
  chevron.width = 96;
  chevron.height = 160;
  const cctx = chevron.getContext("2d")!;
  cctx.strokeStyle = "#fff";
  cctx.lineWidth = 26;
  cctx.lineCap = "round";
  cctx.lineJoin = "round";
  cctx.beginPath();
  cctx.moveTo(18, 18);
  cctx.lineTo(78, 80);
  cctx.lineTo(18, 142);
  cctx.stroke();
  return chevron;
}

function renderDashLane(
  ctx: CanvasRenderingContext2D, effect: Telegraph, x: number, y: number,
  length: number, progress: number, blink: number, now: number,
): void {
  const size = effect.r * 0.85;
  const scroll = (now * 0.35) % 150;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(Math.atan2(effect.y2 - effect.y, effect.x2 - effect.x));

  const sprite = chevronSprite();
  const color = kindColor(TelegraphKind.Dash);
  const filled = length * progress;
  const width = size * 1.2;
  for (let d = effect.inner + scroll; d < length; d += 150) {
    ctx.globalAlpha = d <= filled ? 0.85 + blink * 0.15 : 0.25;
    drawTinted(ctx, sprite, d - width, -size, color, width, size * 2);
  }
  ctx.restore();
}

function renderSplash(
  ctx: CanvasRenderingContext2D, effect: Telegraph, x: number, y: number,
  progress: number, blink: number, now: number,
): void {
  ctx.globalAlpha = 0.12 + progress * 0.25;
  ctx.fillStyle = "#2d5d9c";
  disc(ctx, x, y, effect.r * (0.55 + progress * 0.45));

  ctx.strokeStyle = "#ffffff";
  for (let i = 0; i < 3; i++) {
    const phase = (now / 650 + i / 3) % 1;
    ctx.globalAlpha = (1 - phase) * (0.2 + progress * 0.4);
    ring(ctx, x, y, effect.r * (0.15 + phase * 0.85));
  }

  ctx.fillStyle = blink > 0.5 ? "#ffffff" : "#dff1ff";
  const dots = Math.max(10, Math.round((Math.PI * 2 * effect.r) / 46));
  const spin = now / 1400;
  ctx.globalAlpha = 0.55 + blink * 0.4;
  for (let i = 0; i < dots; i++) {
    const angle = spin + (i / dots) * Math.PI * 2;
    disc(ctx, x + Math.cos(angle) * effect.r, y + Math.sin(angle) * effect.r, 7 + blink * 3);
  }

  const bubbles = 3 + Math.round(progress * 12);
  for (let i = 0; i < bubbles; i++) {
    const phase = (now / 500 + hash(effect.seed, i)) % 1;
    const angle = hash(effect.seed, i + 50) * Math.PI * 2;
    const distance = hash(effect.seed, i + 99) * effect.r * 0.8;
    ctx.globalAlpha = 0.7 * (1 - phase);
    disc(ctx, x + Math.cos(angle) * distance, y + Math.sin(angle) * distance, 4 + phase * 9);
  }
}

export function renderTelegraphs(ctx: CanvasRenderingContext2D, left: number, top: number): void {
  const now = performance.now();
  ctx.save();

  for (let i = telegraphs.length - 1; i >= 0; i--) {
    const effect = telegraphs[i];
    const x = effect.x - left;
    const y = effect.y - top;
    const color = kindColor(effect.kind);
    const remaining = effect.end - now;
    const length = Math.hypot(effect.x2 - effect.x, effect.y2 - effect.y);

    if (remaining > 0) {
      const progress = 1 - remaining / (effect.end - effect.start);
      const blink = remaining < BLINK_TIME ? 0.5 + 0.5 * Math.sin(now / 35) : 0;

      if (effect.kind === TelegraphKind.Dash) {
        renderDashLane(ctx, effect, x, y, length, progress, blink, now);
      } else if (effect.kind === TelegraphKind.Slam || effect.kind === TelegraphKind.Ring) {
        ctx.globalAlpha = 0.18 + progress * 0.17 + blink * 0.2;
        ctx.fillStyle = color;
        disc(ctx, x, y, effect.r * progress);
        ctx.globalAlpha = 0.85;
        ctx.strokeStyle = blink > 0.5 ? "#ffffff" : color;
        ctx.lineWidth = effect.kind === TelegraphKind.Ring ? 10 : 6;
        circle(ctx, x, y, Math.round(effect.r), false, true);
      } else {
        renderSplash(ctx, effect, x, y, progress, blink, now);
      }
      continue;
    }

    const fade = -remaining / FADE_TIME;
    if (fade >= 1) {
      telegraphs.splice(i, 1);
      continue;
    }

    if (effect.kind === TelegraphKind.Dash) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(Math.atan2(effect.y2 - effect.y, effect.x2 - effect.x));
      ctx.globalAlpha = 0.9 * (1 - fade);
      const size = effect.r * 0.85;
      for (let d = effect.inner + fade * 150; d < length; d += 110) {
        drawTinted(ctx, chevronSprite(), d - size * 1.2, -size, color, size * 1.2, size * 2);
      }
      ctx.restore();
      continue;
    }

    ctx.globalAlpha = 0.6 * (1 - fade);
    ctx.fillStyle = effect.kind === TelegraphKind.Slam ? color : "#ffffff";
    disc(ctx, x, y, effect.r * (1 + fade * 0.25));
    if (effect.kind !== TelegraphKind.Slam) {
      ctx.fillStyle = "#ffffff";
      for (let j = 0; j < 10; j++) {
        const angle = (j / 10) * Math.PI * 2 + effect.seed;
        const distance = effect.r * (0.4 + fade * 0.9);
        disc(ctx, x + Math.cos(angle) * distance, y + Math.sin(angle) * distance, 16 * (1 - fade) + 4);
      }
    }
  }
  ctx.restore();
}
