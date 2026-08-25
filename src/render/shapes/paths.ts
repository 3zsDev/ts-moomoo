import { randInt } from "../../utils/math";

export function renderStar(
  ctx: CanvasRenderingContext2D,
  points: number, outer: number, inner: number,
): void {
  let angle = (Math.PI / 2) * 3;
  const step = Math.PI / points;

  ctx.beginPath();
  for (let i = 0; i < points; i++) {
    ctx.lineTo(Math.cos(angle) * outer, Math.sin(angle) * outer);
    angle += step;
    ctx.lineTo(Math.cos(angle) * inner, Math.sin(angle) * inner);
    angle += step;
  }
  ctx.closePath();
}

export function renderBlob(
  ctx: CanvasRenderingContext2D,
  points: number, outer: number, inner: number,
): void {
  let angle = (Math.PI / 2) * 3;
  const step = Math.PI / points;

  ctx.beginPath();
  ctx.moveTo(0, -inner);
  for (let i = 0; i < points; i++) {
    const bulge = randInt(outer + 0.9, outer * 1.2);
    ctx.quadraticCurveTo(
      Math.cos(angle + step) * bulge, Math.sin(angle + step) * bulge,
      Math.cos(angle + step * 2) * inner, Math.sin(angle + step * 2) * inner,
    );
    angle += step * 2;
  }
  ctx.lineTo(0, -inner);
  ctx.closePath();
}

export function renderLeaf(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, size: number, angle: number,
): void {
  const tipX = x + size * Math.cos(angle);
  const tipY = y + size * Math.sin(angle);
  const bulge = size * 0.4;
  const perpendicular = angle + Math.PI / 2;

  ctx.moveTo(x, y);
  ctx.beginPath();
  ctx.quadraticCurveTo(
    (x + tipX) / 2 + bulge * Math.cos(perpendicular),
    (y + tipY) / 2 + bulge * Math.sin(perpendicular),
    tipX, tipY,
  );
  ctx.quadraticCurveTo(
    (x + tipX) / 2 - bulge * Math.cos(perpendicular),
    (y + tipY) / 2 - bulge * Math.sin(perpendicular),
    x, y,
  );
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}
