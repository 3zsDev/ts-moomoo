import { biomeColors, config, paletteColors } from "../../config";
import { state } from "../../game/state";
import { camera } from "../camera";
import { ctx, VIEW_HEIGHT, VIEW_WIDTH } from "../canvas";

export function renderBackground(): void {
  const snowBottom = config.snowBiomeTop - camera.top;
  const desertTop = config.mapScale - config.snowBiomeTop - camera.top;

  if (snowBottom <= 0 && desertTop >= VIEW_HEIGHT) {
    fillScreen(biomeColors.grass);
  } else if (desertTop <= 0) {
    fillScreen(biomeColors.desert);
  } else if (snowBottom >= VIEW_HEIGHT) {
    fillScreen(biomeColors.snow);
  } else if (snowBottom >= 0) {
    ctx.fillStyle = biomeColors.snow;
    ctx.fillRect(0, 0, VIEW_WIDTH, snowBottom);
    ctx.fillStyle = biomeColors.grass;
    ctx.fillRect(0, snowBottom, VIEW_WIDTH, VIEW_HEIGHT - snowBottom);
  } else {
    ctx.fillStyle = biomeColors.grass;
    ctx.fillRect(0, 0, VIEW_WIDTH, desertTop);
    ctx.fillStyle = biomeColors.desert;
    ctx.fillRect(0, desertTop, VIEW_WIDTH, VIEW_HEIGHT - desertTop);
  }
}

function fillScreen(color: string): void {
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
}

export function renderWaterBodies(delta: number): void {
  if (state.firstLoad) return;

  state.waterPhase += state.waterDirection * config.waveSpeed * delta;
  if (state.waterPhase >= config.waveMax) {
    state.waterPhase = config.waveMax;
    state.waterDirection = -1;
  } else if (state.waterPhase <= 1) {
    state.waterPhase = 1;
    state.waterDirection = 1;
  }

  ctx.globalAlpha = 1;
  ctx.fillStyle = biomeColors.riverBank;
  fillWaterBand(config.riverPadding);
  ctx.fillStyle = biomeColors.water;
  fillWaterBand((state.waterPhase - 1) * 250);
}

function fillWaterBand(padding: number): void {
  const height = config.riverWidth + padding;
  const top = config.mapScale / 2 - camera.top - height / 2;
  if (top < VIEW_HEIGHT && top + height > 0) ctx.fillRect(0, top, VIEW_WIDTH, height);
}

export function renderGrid(): void {
  const spacing = VIEW_HEIGHT / 18;

  ctx.lineWidth = 4;
  ctx.strokeStyle = "#000";
  ctx.globalAlpha = 0.06;
  ctx.beginPath();

  for (let x = -(state.cameraX % spacing); x < VIEW_WIDTH; x += spacing) {
    if (x <= 0) continue;
    ctx.moveTo(x, 0);
    ctx.lineTo(x, VIEW_HEIGHT);
  }
  for (let y = -(state.cameraY % spacing); y < VIEW_HEIGHT; y += spacing) {
    if (y <= 0) continue;
    ctx.moveTo(0, y);
    ctx.lineTo(VIEW_WIDTH, y);
  }

  ctx.stroke();
  ctx.globalAlpha = 1;
}

export function renderMapBorders(): void {
  ctx.fillStyle = "#000";
  ctx.globalAlpha = 0.09;

  if (camera.left <= 0) ctx.fillRect(0, 0, -camera.left, VIEW_HEIGHT);

  if (config.mapScale - camera.left <= VIEW_WIDTH) {
    const top = Math.max(0, -camera.top);
    ctx.fillRect(
      config.mapScale - camera.left, top,
      VIEW_WIDTH - (config.mapScale - camera.left), VIEW_HEIGHT - top,
    );
  }

  if (camera.top <= 0) ctx.fillRect(-camera.left, 0, VIEW_WIDTH + camera.left, -camera.top);

  if (config.mapScale - camera.top <= VIEW_HEIGHT) {
    const left = Math.max(0, -camera.left);
    const rightInset = config.mapScale - camera.left <= VIEW_WIDTH
      ? VIEW_WIDTH - (config.mapScale - camera.left)
      : 0;
    ctx.fillRect(
      left, config.mapScale - camera.top,
      VIEW_WIDTH - left - rightInset, VIEW_HEIGHT - (config.mapScale - camera.top),
    );
  }

  ctx.globalAlpha = 1;
  ctx.fillStyle = paletteColors.worldTint;
  ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
}
