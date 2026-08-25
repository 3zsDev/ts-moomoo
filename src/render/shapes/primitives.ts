import { TAU } from "../../utils/math";

export function renderCircle(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, radius: number,
  skipStroke = false, skipFill = false,
): void {
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, TAU);
  if (!skipFill) ctx.fill();
  if (!skipStroke) ctx.stroke();
}

export function renderRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, width: number, height: number,
  skipStroke = false,
): void {
  ctx.fillRect(x - width / 2, y - height / 2, width, height);
  if (!skipStroke) ctx.strokeRect(x - width / 2, y - height / 2, width, height);
}

export function renderRectCircle(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, radius: number, thickness: number, count: number,
  skipStroke = false,
): void {
  ctx.save();
  ctx.translate(x, y);

  const halfCount = Math.ceil(count / 2);
  for (let i = 0; i < halfCount; i++) {
    renderRect(ctx, 0, 0, radius * 2, thickness, skipStroke);
    ctx.rotate(Math.PI / halfCount);
  }
  ctx.restore();
}

export function renderTriangle(ctx: CanvasRenderingContext2D, size: number): void {
  const height = size * (Math.sqrt(3) / 2);
  ctx.beginPath();
  ctx.moveTo(0, -height / 2);
  ctx.lineTo(-size / 2, height / 2);
  ctx.lineTo(size / 2, height / 2);
  ctx.lineTo(0, -height / 2);
  ctx.fill();
  ctx.closePath();
}

export function renderRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, width: number, height: number, radius: number,
): void {
  let r = radius;
  if (width < 2 * r) r = width / 2;
  if (height < 2 * r) r = height / 2;
  if (r < 0) r = 0;

  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}
