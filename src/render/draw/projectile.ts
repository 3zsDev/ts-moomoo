import { itemData } from "../../data/items";
import type { Projectile } from "../../entities/Projectile";
import { renderCircle } from "../shapes";
import { sprites } from "../sprites";

export function renderProjectileSprite(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  type: { indx: number; scale: number; src?: string },
): void {
  if (!type.src) {
    if (type.indx === 1) {
      ctx.fillStyle = "#939393";
      renderCircle(ctx, x, y, type.scale);
    }
    return;
  }

  const image = sprites.weapon(type.src);
  if (image.isLoaded) {
    ctx.drawImage(image, x - type.scale / 2, y - type.scale / 2, type.scale, type.scale);
  }
}

export function renderProjectile(ctx: CanvasRenderingContext2D, projectile: Projectile): void {
  renderProjectileSprite(ctx, 0, 0, itemData.projectiles[projectile.indx]);
}
