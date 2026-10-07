import { outlineWidth, paletteColors } from "../config";
import { ctx } from "./canvas";
import { camera, updateCamera } from "./camera";
import { interpolateEntities } from "./interpolation";
import { renderGrid, renderBackground, renderMapBorders, renderWaterBodies } from "./layers/ground";
import { collectGameObjects, renderGameObjects, renderProjectiles } from "./layers/objects";
import { renderAI, renderPlayers } from "./layers/entities";
import { renderOverlays } from "./layers/overlays";
import { renderTelegraphs } from "./layers/telegraphs";
import { renderMinimap } from "./minimap";

// frame order follows 1.9: animals are drawn after the z0 players, telegraphs right above layer -1
export function updateGame(delta: number): void {
  updateCamera(delta);
  interpolateEntities(delta);

  renderBackground();
  renderWaterBodies(delta);
  renderGrid();

  ctx.globalAlpha = 1;
  ctx.strokeStyle = paletteColors.outline;

  collectGameObjects();
  renderGameObjects(-1);
  renderTelegraphs(ctx, camera.left, camera.top);
  ctx.globalAlpha = 1;
  ctx.lineWidth = outlineWidth;
  ctx.strokeStyle = paletteColors.outline;
  renderProjectiles(0);
  renderPlayers(delta, 0);
  renderAI(delta);

  ctx.globalAlpha = 1;
  renderGameObjects(0);
  renderProjectiles(1);
  renderGameObjects(1);
  renderPlayers(delta, 1);
  renderGameObjects(2);
  renderGameObjects(3);

  renderMapBorders();
  renderOverlays(delta);

  renderMinimap(delta);
}
