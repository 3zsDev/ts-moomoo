import { outlineWidth, paletteColors } from "../config";
import { ctx } from "./canvas";
import { updateCamera } from "./camera";
import { interpolateEntities } from "./interpolation";
import { renderGrid, renderBackground, renderMapBorders, renderWaterBodies } from "./layers/ground";
import { renderGameObjects, renderProjectiles } from "./layers/objects";
import { renderAI, renderPlayers } from "./layers/entities";
import { renderOverlays } from "./layers/overlays";
import { renderMinimap } from "./minimap";

export function updateGame(delta: number): void {
  updateCamera(delta);
  interpolateEntities(delta);

  renderBackground();
  renderWaterBodies(delta);
  renderGrid();

  ctx.globalAlpha = 1;
  ctx.strokeStyle = paletteColors.outline;

  renderGameObjects(-1);
  ctx.globalAlpha = 1;
  ctx.lineWidth = outlineWidth;
  renderProjectiles(0);
  renderAI(delta);
  renderPlayers(delta, 0);

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
