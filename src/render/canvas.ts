import { config } from "../config";
import { byId } from "../utils/dom";

export const canvas = byId<HTMLCanvasElement>("gameCanvas", "canvas");
export const ctx = canvas.getContext("2d")!;

export const view = {
  width: config.maxScreenWidth,
  height: config.maxScreenHeight,
};

export const viewport = {
  width: window.innerWidth,
  height: window.innerHeight,

  pixelRatio: 1,
};

const TALL_HEIGHT = config.maxScreenHeight * 1.15;

export function resizeCanvas(): void {
  viewport.width = window.innerWidth;
  viewport.height = window.innerHeight;

  const { width, height, pixelRatio } = viewport;

  const zoom = Math.max(
    width / config.maxScreenWidth,
    height / TALL_HEIGHT,
    Math.sqrt((width * height) / (config.maxScreenWidth * config.maxScreenHeight)),
  );
  view.width = width / zoom;
  view.height = height / zoom;

  canvas.width = width * pixelRatio;
  canvas.height = height * pixelRatio;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;

  ctx.setTransform(zoom * pixelRatio, 0, 0, zoom * pixelRatio, 0, 0);
}

export function setNativeResolution(enabled: boolean): void {
  viewport.pixelRatio = enabled ? Math.min(2, window.devicePixelRatio || 1) : 1;
  resizeCanvas();
}

export function isOnScreen(x: number, y: number, radius: number): boolean {
  return x + radius >= 0 && x - radius <= view.width && y + radius >= 0 && y - radius <= view.height;
}

window.addEventListener("resize", resizeCanvas);
resizeCanvas();
