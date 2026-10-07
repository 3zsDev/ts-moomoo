import { TAU } from "../utils/math";
import { renderRoundRect } from "./shapes";

// Canvas2D versions of the helpers 1.9 added to its WebGL renderer
const FONT = "Hammersmith One";

export interface TextStyle {
  color: string;
  outline?: string;
  outlineWidth?: number;
}

export function disc(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number): void {
  if (radius <= 0) return;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, TAU);
  ctx.fill();
}

export const polyDisc = disc;

export function ring(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number): void {
  if (radius <= 0) return;
  ctx.save();
  ctx.lineWidth = (3 * radius) / 128;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, TAU);
  ctx.stroke();
  ctx.restore();
}

export function circle(
  ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, fill: boolean, stroke: boolean,
): void {
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, TAU);
  if (fill) ctx.fill();
  if (stroke) ctx.stroke();
}

export function line(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number): void {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}

export function fillRoundRect(
  ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number,
): void {
  if (width <= 0 || height <= 0) return;
  renderRoundRect(ctx, x, y, width, height, radius);
  ctx.fill();
}

export function glow(
  ctx: CanvasRenderingContext2D, x: number, y: number, outer: number, inner: number, color: string,
): void {
  const gradient = ctx.createRadialGradient(x, y, inner, x, y, outer);
  gradient.addColorStop(0, color);
  gradient.addColorStop(1, transparent(color));
  ctx.save();
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(x, y, outer, 0, TAU);
  ctx.fill();
  ctx.restore();
}

function transparent(color: string): string {
  if (color.startsWith("#") && (color.length === 7 || color.length === 4)) {
    const full = color.length === 4
      ? "#" + color[1] + color[1] + color[2] + color[2] + color[3] + color[3]
      : color;
    return `rgba(${parseInt(full.slice(1, 3), 16)},${parseInt(full.slice(3, 5), 16)},${parseInt(full.slice(5, 7), 16)},0)`;
  }
  return "rgba(255,255,255,0)";
}

const tintCache = new WeakMap<CanvasImageSource, Map<string, HTMLCanvasElement>>();

export function drawTinted(
  ctx: CanvasRenderingContext2D, image: HTMLImageElement | HTMLCanvasElement,
  x: number, y: number, color: string, width: number, height: number,
): void {
  if (!image.width || !image.height) return;
  let byColor = tintCache.get(image);
  if (!byColor) {
    byColor = new Map();
    tintCache.set(image, byColor);
  }

  let tinted = byColor.get(color);
  if (!tinted) {
    tinted = document.createElement("canvas");
    tinted.width = image.width;
    tinted.height = image.height;
    const tctx = tinted.getContext("2d")!;
    tctx.drawImage(image, 0, 0);
    tctx.globalCompositeOperation = "multiply";
    tctx.fillStyle = color;
    tctx.fillRect(0, 0, tinted.width, tinted.height);
    tctx.globalCompositeOperation = "destination-in";
    tctx.drawImage(image, 0, 0);
    byColor.set(color, tinted);
  }
  ctx.drawImage(tinted, x, y, width, height);
}

export function measureText(ctx: CanvasRenderingContext2D, text: string, size: number): number {
  ctx.font = `${size}px ${FONT}`;
  return ctx.measureText(text).width;
}

export function text(
  ctx: CanvasRenderingContext2D, value: string, x: number, y: number, size: number, style: TextStyle,
): number {
  ctx.font = `${size}px ${FONT}`;
  ctx.textBaseline = "middle";
  ctx.textAlign = "center";
  if (style.outline) {
    ctx.lineJoin = "round";
    ctx.lineWidth = style.outlineWidth ?? 8;
    ctx.strokeStyle = style.outline;
    ctx.strokeText(value, x, y);
  }
  ctx.fillStyle = style.color;
  ctx.fillText(value, x, y);
  return ctx.measureText(value).width;
}
