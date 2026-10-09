import { outlineWidth, paletteColors } from "../config";
import { clearTextLayer, endFrame, painter } from "./surface";
import { camera, lockCameraToPlayer, updateCamera } from "./camera";
import { interpolateEntities } from "./interpolation";
import { renderGrid, renderBackground, renderMapBorders, renderWaterBodies } from "./layers/ground";
import { collectGameObjects, renderGameObjects, renderProjectiles } from "./layers/objects";
import { renderAI, renderPlayers } from "./layers/entities";
import { renderOverlays } from "./layers/overlays";
import { renderTelegraphs } from "./layers/telegraphs";
import { renderMinimap } from "./minimap";

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
