import { config } from "../config";
import { byId } from "../utils/dom";

export const canvas = byId<HTMLCanvasElement>("gameCanvas", "canvas");
export const ctx = canvas.getContext("2d")!;

export const VIEW_WIDTH = config.maxScreenWidth;
export const VIEW_HEIGHT = config.maxScreenHeight;

export const viewport = {
  width: window.innerWidth,
  height: window.innerHeight,

  pixelRatio: 1,
};

export function resizeCanvas(): void {
  viewport.width = window.innerWidth;
  viewport.height = window.innerHeight;

  const { width, height, pixelRatio } = viewport;

  const scale = Math.max(width / VIEW_WIDTH, height / VIEW_HEIGHT) * pixelRatio;

  canvas.width = width * pixelRatio;
  canvas.height = height * pixelRatio;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;

  ctx.setTransform(
    scale, 0, 0, scale,
    (width * pixelRatio - VIEW_WIDTH * scale) / 2,
    (height * pixelRatio - VIEW_HEIGHT * scale) / 2,
  );
}

export function setNativeResolution(enabled: boolean): void {
  viewport.pixelRatio = enabled ? window.devicePixelRatio || 1 : 1;
  resizeCanvas();
}

export function isOnScreen(x: number, y: number, radius: number): boolean {
  return x + radius >= 0 && x - radius <= VIEW_WIDTH && y + radius >= 0 && y - radius <= VIEW_HEIGHT;
}

window.addEventListener("resize", resizeCanvas);
resizeCanvas();
