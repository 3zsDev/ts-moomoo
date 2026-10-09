import type { Painter } from "../painter";
import { itemData } from "../../data/items";
import type { Projectile } from "../../entities/Projectile";
import { sprites } from "../sprites";

export function renderProjectileSprite(
  painter: Painter,
  x: number, y: number,
  type: { indx: number; scale: number; src?: string },
): void {
  if (!type.src) {
    if (type.indx === 1) {
      painter.fillStyle = "#939393";
      painter.circle(x, y, type.scale, true, true);
    }
    return;
  }

  const image = sprites.weapon(type.src);
  if (image.isLoaded) {
    painter.drawImage(image, x - type.scale / 2, y - type.scale / 2, type.scale, type.scale);
  }
}

export function renderProjectile(painter: Painter, projectile: Projectile): void {
  renderProjectileSprite(painter, 0, 0, itemData.projectiles[projectile.indx]);
}
