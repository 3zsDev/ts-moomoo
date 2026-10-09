import { config } from "../config";
import { byId } from "../utils/dom";

export const canvas = byId<HTMLCanvasElement>("gameCanvas", "canvas");
export const ctx = canvas.getContext("2d")!;

const TEXT_MAX_RATIO = 4;
const textCanvas = byId<HTMLCanvasElement>("textCanvas", "canvas");
const overlayCtx = textCanvas.getContext("2d")!;

export const textLayer = {
  ctx,
  overlay: false,
};

export function clearTextLayer(): void {
  if (!textLayer.overlay) return;
  overlayCtx.save();
  overlayCtx.setTransform(1, 0, 0, 1, 0, 0);
  overlayCtx.clearRect(0, 0, textCanvas.width, textCanvas.height);
  overlayCtx.restore();
}

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

  const textRatio = Math.min(TEXT_MAX_RATIO, window.devicePixelRatio || 1);
  textLayer.overlay = textRatio > pixelRatio;
  textLayer.ctx = textLayer.overlay ? overlayCtx : ctx;
  textCanvas.style.display = textLayer.overlay ? "block" : "none";
  if (textLayer.overlay) {
    textCanvas.width = Math.round(width * textRatio);
    textCanvas.height = Math.round(height * textRatio);
    textCanvas.style.width = `${width}px`;
    textCanvas.style.height = `${height}px`;
    overlayCtx.setTransform(zoom * textRatio, 0, 0, zoom * textRatio, 0, 0);
  }
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
