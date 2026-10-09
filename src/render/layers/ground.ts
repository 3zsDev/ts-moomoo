import { biomeColors, config, paletteColors } from "../../config";
import { state } from "../../game/state";
import { camera } from "../camera";
import { painter, view } from "../surface";
import { renderFalls, renderShallows } from "./falls";

export function renderBackground(): void {
  const snowBottom = config.snowBiomeTop - camera.top;
  const desertTop = config.mapScale - config.snowBiomeTop - camera.top;

  if (snowBottom <= 0 && desertTop >= view.height) {
    fillScreen(biomeColors.grass);
  } else if (desertTop <= 0) {
    fillScreen(biomeColors.desert);
  } else if (snowBottom >= view.height) {
    fillScreen(biomeColors.snow);
  } else if (snowBottom >= 0) {
    painter.fillStyle = biomeColors.snow;
    painter.fillRect(0, 0, view.width, snowBottom);
    painter.fillStyle = biomeColors.grass;
    painter.fillRect(0, snowBottom, view.width, view.height - snowBottom);
  } else {
    painter.fillStyle = biomeColors.grass;
    painter.fillRect(0, 0, view.width, desertTop);
    painter.fillStyle = biomeColors.desert;
    painter.fillRect(0, desertTop, view.width, view.height - desertTop);
  }
}

function fillScreen(color: string): void {
  painter.fillStyle = color;
  painter.fillRect(0, 0, view.width, view.height);
}

export function renderWaterBodies(delta: number): void {
  if (!state.firstLoad) {
    state.waterPhase += state.waterDirection * config.waveSpeed * delta;
    if (state.waterPhase >= config.waveMax) {
      state.waterPhase = config.waveMax;
      state.waterDirection = -1;
    } else if (state.waterPhase <= 1) {
      state.waterPhase = 1;
      state.waterDirection = 1;
    }

    painter.globalAlpha = 1;
    painter.fillStyle = biomeColors.riverBank;
    fillWaterBand(config.riverPadding);
    painter.fillStyle = biomeColors.water;
    fillWaterBand((state.waterPhase - 1) * 250);
  }

  const wave = (state.waterPhase - 1) * 250;
  const now = Date.now();
  renderFalls(painter, camera.left, camera.top, view.width, view.height, wave, now);
  renderShallows(painter, camera.left, camera.top, view.width, view.height, wave, now);
}

function fillWaterBand(padding: number): void {
  const height = config.riverWidth + padding;
  const top = config.mapScale / 2 - camera.top - height / 2;
  if (top < view.height && top + height > 0) painter.fillRect(0, top, view.width, height);
}

export const grid = { visible: true };

export function renderGrid(): void {
  if (!grid.visible) return;
  const spacing = config.maxScreenHeight / 18;

  painter.lineWidth = 4;
  painter.strokeStyle = "#000";
  painter.globalAlpha = 0.06;

  for (let x = ((-state.cameraX % spacing) + spacing) % spacing; x < view.width; x += spacing) {
    if (x > 0) painter.line(x, 0, x, view.height);
  }
  for (let y = ((-state.cameraY % spacing) + spacing) % spacing; y < view.height; y += spacing) {
    if (y > 0) painter.line(0, y, view.width, y);
  }

  painter.globalAlpha = 1;
}

export function renderMapBorders(): void {
  painter.fillStyle = "#000";
  painter.globalAlpha = 0.09;

  if (config.mapScale - camera.left <= view.width) {
    const top = Math.max(0, -camera.top);
    painter.fillRect(
      config.mapScale - camera.left, top,
      view.width - (config.mapScale - camera.left), view.height - top,
    );
  }

  if (camera.top <= 0) painter.fillRect(-camera.left, 0, view.width + camera.left, -camera.top);

  if (config.mapScale - camera.top <= view.height) {
    const left = Math.max(0, -camera.left);
    const rightInset = config.mapScale - camera.left <= view.width
      ? view.width - (config.mapScale - camera.left)
      : 0;
    painter.fillRect(
      left, config.mapScale - camera.top,
      view.width - left - rightInset, view.height - (config.mapScale - camera.top),
    );
  }

  painter.globalAlpha = 1;
  painter.fillStyle = paletteColors.worldTint;
  painter.fillRect(0, 0, view.width, view.height);
}
