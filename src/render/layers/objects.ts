import type { GameObject } from "../../entities/GameObject";
import { state } from "../../game/state";
import { gameObjects, projectiles } from "../../game/world";
import { camera } from "../camera";
import { painter, isOnScreen } from "../surface";
import { renderProjectile } from "../draw";
import { getItemSprite, getGameObjectSprite } from "../sprites";

const layers = new Map<number, GameObject[]>();

// updates every active object once per frame and sorts the visible ones into their layers - idk what joshy was thinking, only spinner objects need this
export function collectGameObjects(): void {
  for (const bucket of layers.values()) bucket.length = 0;

  for (const obj of gameObjects) {
    if (!obj.active) continue;
    obj.update(state.delta);

    const screenX = obj.x + obj.xWiggle - camera.left;
    const screenY = obj.y + obj.yWiggle - camera.top;
    if (!isOnScreen(screenX, screenY, obj.scale + (obj.blocker ?? 0))) continue;

    let bucket = layers.get(obj.layer);
    if (!bucket) {
      bucket = [];
      layers.set(obj.layer, bucket);
    }
    bucket.push(obj);
  }
}

export function renderGameObjects(layer: number): void {
  const bucket = layers.get(layer);
  if (!bucket) return;

  for (const obj of bucket) {
    const screenX = obj.x + obj.xWiggle - camera.left;
    const screenY = obj.y + obj.yWiggle - camera.top;

    painter.globalAlpha = obj.hideFromEnemy ? 0.6 : 1;

    if (obj.isItem) renderPlacedItem(obj, screenX, screenY);
    else renderNaturalObject(obj, screenX, screenY);
  }
}

function renderPlacedItem(obj: GameObject, screenX: number, screenY: number): void {
  const sprite = getItemSprite(obj);

  painter.save();
  painter.translate(screenX, screenY);
  painter.rotate(obj.dir);
  painter.drawImage(sprite, -sprite.width / 2, -sprite.height / 2);

  if (obj.blocker) {
    painter.strokeStyle = "#db6e6e";
    painter.globalAlpha = 0.3;
    painter.lineWidth = 6;
    painter.circle(0, 0, obj.blocker, false, true);
  }
  painter.restore();
}

function renderNaturalObject(obj: GameObject, screenX: number, screenY: number): void {
  const sprite = getGameObjectSprite(obj);
  painter.drawImage(sprite, screenX - sprite.width / 2, screenY - sprite.height / 2);
}

export function renderProjectiles(layer: number): void {
  for (const projectile of projectiles) {
    if (!projectile.active || projectile.layer !== layer) continue;

    projectile.update(state.delta);
    if (!projectile.active) continue;

    const screenX = projectile.x - camera.left;
    const screenY = projectile.y - camera.top;
    if (!isOnScreen(screenX, screenY, projectile.scale)) continue;

    painter.save();
    painter.translate(screenX, screenY);
    painter.rotate(projectile.dir);
    renderProjectile(painter, projectile);
    painter.restore();
  }
}
