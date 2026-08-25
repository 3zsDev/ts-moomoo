import type { GameObject } from "../../entities/GameObject";
import { state } from "../../game/state";
import { gameObjects, projectiles } from "../../game/world";
import { camera } from "../camera";
import { ctx, isOnScreen } from "../canvas";
import { renderProjectile } from "../draw";
import { renderCircle } from "../shapes";
import { getItemSprite, getGameObjectSprite } from "../sprites";

export function renderGameObjects(layer: number): void {
  for (const obj of gameObjects) {
    if (!obj.active) continue;

    const screenX = obj.x + obj.xWiggle - camera.left;
    const screenY = obj.y + obj.yWiggle - camera.top;

    if (layer === 0) obj.update(state.delta);

    if (obj.layer !== layer) continue;
    if (!isOnScreen(screenX, screenY, obj.scale + (obj.blocker ?? 0))) continue;

    ctx.globalAlpha = obj.hideFromEnemy ? 0.6 : 1;

    if (obj.isItem) renderPlacedItem(obj, screenX, screenY);
    else renderNaturalObject(obj, screenX, screenY);
  }
}

function renderPlacedItem(obj: GameObject, screenX: number, screenY: number): void {
  const sprite = getItemSprite(obj);

  ctx.save();
  ctx.translate(screenX, screenY);
  ctx.rotate(obj.dir);
  ctx.drawImage(sprite, -sprite.width / 2, -sprite.height / 2);

  if (obj.blocker) {
    ctx.strokeStyle = "#db6e6e";
    ctx.globalAlpha = 0.3;
    ctx.lineWidth = 6;
    renderCircle(ctx, 0, 0, obj.blocker, false, true);
  }
  ctx.restore();
}

function renderNaturalObject(obj: GameObject, screenX: number, screenY: number): void {
  const sprite = getGameObjectSprite(obj);
  ctx.drawImage(sprite, screenX - sprite.width / 2, screenY - sprite.height / 2);
}

export function renderProjectiles(layer: number): void {
  for (const projectile of projectiles) {
    if (!projectile.active || projectile.layer !== layer) continue;

    projectile.update(state.delta);
    if (!projectile.active) continue;

    const screenX = projectile.x - camera.left;
    const screenY = projectile.y - camera.top;
    if (!isOnScreen(screenX, screenY, projectile.scale)) continue;

    ctx.save();
    ctx.translate(screenX, screenY);
    ctx.rotate(projectile.dir);
    renderProjectile(ctx, projectile);
    ctx.restore();
  }
}
