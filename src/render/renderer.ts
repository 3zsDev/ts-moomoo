import { outlineWidth, paletteColors } from "../config";
import { clearTextLayer, endFrame, painter, rebuildPainters } from "./surface";
import { camera, lockCameraToPlayer, updateCamera } from "./camera";
import { interpolateEntities } from "./interpolation";
import { renderGrid, renderBackground, renderMapBorders, renderWaterBodies } from "./layers/ground";
import { collectGameObjects, renderGameObjects, renderProjectiles } from "./layers/objects";
import { renderAI, renderPlayers } from "./layers/entities";
import { renderOverlays } from "./layers/overlays";
import { renderTelegraphs } from "./layers/telegraphs";
import { renderMinimap } from "./minimap";
import { clearSpriteCaches } from "./sprites";

const REBUILD_AFTER_HIDDEN = 1000;
let hiddenSince = document.hidden ? Date.now() : 0;

function rebuildGraphics(): void {
  clearSpriteCaches();
  rebuildPainters();
}

document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    hiddenSince ||= Date.now();
    return;
  }
  const hiddenFor = hiddenSince ? Date.now() - hiddenSince : 0;
  hiddenSince = 0;
  if (hiddenFor >= REBUILD_AFTER_HIDDEN) rebuildGraphics();
});
window.addEventListener("pageshow", (event) => {
  if (event.persisted) rebuildGraphics();
});

export function updateGame(delta: number): void {
  clearTextLayer();
  updateCamera(delta);
  interpolateEntities(delta);
  lockCameraToPlayer();

  renderBackground();
  renderWaterBodies(delta);
  renderGrid();

  painter.globalAlpha = 1;
  painter.strokeStyle = paletteColors.outline;

  collectGameObjects();
  renderGameObjects(-1);
  renderTelegraphs(painter, camera.left, camera.top);
  painter.globalAlpha = 1;
  painter.lineWidth = outlineWidth;
  painter.strokeStyle = paletteColors.outline;
  renderProjectiles(0);
  renderPlayers(delta, 0);
  renderAI(delta);

  painter.globalAlpha = 1;
  renderGameObjects(0);
  renderProjectiles(1);
  renderGameObjects(1);
  renderPlayers(delta, 1);
  renderGameObjects(2);
  renderGameObjects(3);

  renderMapBorders();
  renderOverlays(delta);

  endFrame();
  renderMinimap(delta);
}
