import { config } from "../config";
import { render, type RendererKind } from "../config/render";
import { isLocal, queryParam } from "../environment";
import { byId } from "../utils/dom";
import { createCanvasPainter } from "./canvas/painter";
import type { Painter } from "./painter";
import { createWebGLPainter } from "./webgl/painter";

export const canvas = byId<HTMLCanvasElement>("gameCanvas", "canvas");

const NO_WEBGL = "MooMoo needs WebGL, which this browser has turned off.";

function webglUnavailable(overlay: boolean): void {
  if (render.disableFallback) {
    byId("loadingText").textContent = NO_WEBGL;
    throw new Error("WebGL unavailable");
  }
  console.warn("[render] WebGL is unavailable here; drawing with the 2D canvas instead");
  if (!overlay) {
    window.alert(
      `WebGL is turned off in this browser.\n\nThe original game stops here with an error ("${NO_WEBGL}"). ` +
      "This client carries on with the 2D canvas instead.",
    );
  }
}

function createPainter(target: HTMLCanvasElement, kind: RendererKind, overlay: boolean): Painter {
  if (kind === "webgl") {
    const webgl = createWebGLPainter(target, { overlay });
    if (webgl) return webgl;
    webglUnavailable(overlay);
  }
  return createCanvasPainter(target);
}
// local server stuff
function chosenRenderer(): RendererKind {
  const override = isLocal() ? queryParam("renderer") : null;
  return override === "canvas" || override === "webgl" ? override : render.renderer;
}

export const painter: Painter = createPainter(canvas, chosenRenderer(), false);
if (isLocal()) (window as unknown as { __painter: Painter }).__painter = painter;

const TEXT_MAX_RATIO = 4;
const textCanvas = byId<HTMLCanvasElement>("textCanvas", "canvas");
const overlayPainter: Painter = createPainter(textCanvas, painter.kind, true);

export const textLayer = {
  painter,
  overlay: false,
};

export function clearTextLayer(): void {
  if (textLayer.overlay) overlayPainter.clear();
}

export function endFrame(): void {
  painter.endFrame();
  if (textLayer.overlay) overlayPainter.endFrame();
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

  painter.setTransform(zoom * pixelRatio, 0, 0, zoom * pixelRatio, 0, 0);
  painter.resize(zoom * pixelRatio);

  const textRatio = Math.min(TEXT_MAX_RATIO, window.devicePixelRatio || 1);
  textLayer.overlay = textRatio > pixelRatio;
  textLayer.painter = textLayer.overlay ? overlayPainter : painter;
  textCanvas.style.display = textLayer.overlay ? "block" : "none";
  if (textLayer.overlay) {
    textCanvas.width = Math.round(width * textRatio);
    textCanvas.height = Math.round(height * textRatio);
    textCanvas.style.width = `${width}px`;
    textCanvas.style.height = `${height}px`;
    overlayPainter.setTransform(zoom * textRatio, 0, 0, zoom * textRatio, 0, 0);
    overlayPainter.resize(zoom * textRatio);
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
