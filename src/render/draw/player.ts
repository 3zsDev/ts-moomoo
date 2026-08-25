import { config, outlineWidth } from "../../config";
import { findAccessory, findHat, type Cosmetic } from "../../data/cosmetics";
import { itemData } from "../../data/items";
import type { Player } from "../../entities/Player";
import { renderCircle } from "../shapes";
import { getItemSprite, sprites } from "../sprites";
import { renderProjectileSprite } from "./projectile";

export function renderPlayer(ctx: CanvasRenderingContext2D, player: Player): void {
  ctx.lineWidth = outlineWidth;
  ctx.lineJoin = "miter";

  const weapon = itemData.weapons[player.weaponIndex];
  const holdingWeapon = player.buildIndex < 0;

  const armSpread = (Math.PI / 4) * (weapon.armS ?? 1);
  const offHandSpread = (holdingWeapon && weapon.hndS) || 1;
  const offHandDistance = (holdingWeapon && weapon.hndD) || 1;

  if (player.tailIndex > 0) renderAccessory(ctx, player, player.tailIndex);
  if (holdingWeapon && !weapon.aboveHand) renderHeldWeapon(ctx, player);

  ctx.fillStyle = config.skinColors[player.skinColor];
  renderCircle(ctx, player.scale * Math.cos(armSpread), player.scale * Math.sin(armSpread), 14);
  renderCircle(
    ctx,
    player.scale * offHandDistance * Math.cos(-armSpread * offHandSpread),
    player.scale * offHandDistance * Math.sin(-armSpread * offHandSpread),
    14,
  );

  if (holdingWeapon && weapon.aboveHand) renderHeldWeapon(ctx, player);

  if (player.buildIndex >= 0) {
    const item = itemData.list[player.buildIndex];
    const sprite = getItemSprite(item);
    ctx.drawImage(sprite, player.scale - item.holdOffset, -sprite.width / 2);
  }

  renderCircle(ctx, 0, 0, player.scale);

  if (player.skinIndex > 0) {
    ctx.rotate(Math.PI / 2);
    renderHat(ctx, player);
  }
}

function renderHeldWeapon(ctx: CanvasRenderingContext2D, player: Player): void {
  const weapon = itemData.weapons[player.weaponIndex];
  const variant = config.weaponVariants[player.weaponVariant] ?? config.weaponVariants[0];

  const image = sprites.weapon(weapon.src + variant.src);
  if (image.isLoaded) {
    ctx.drawImage(
      image,
      player.scale + weapon.xOff - weapon.length / 2,
      weapon.yOff - weapon.width / 2,
      weapon.length,
      weapon.width,
    );
  }

  if (weapon.projectile != null && !weapon.hideProjectile) {
    renderProjectileSprite(ctx, player.scale, 0, itemData.projectiles[weapon.projectile]);
  }
}

function renderHat(ctx: CanvasRenderingContext2D, player: Player): void {
  const definition = findHat(player.skinIndex);
  if (!definition) return;

  renderCosmetic(ctx, sprites.hat(player.skinIndex), definition);

  if (definition.topSprite) {
    ctx.save();
    ctx.rotate(player.skinRot);
    renderCosmetic(ctx, sprites.hat(`${player.skinIndex}_top`), definition);
    ctx.restore();
  }
}

function renderAccessory(ctx: CanvasRenderingContext2D, player: Player, accessoryId: number): void {
  const definition = findAccessory(accessoryId);
  if (!definition) return;

  const image = sprites.accessory(accessoryId);
  if (!image.isLoaded) return;

  ctx.save();
  ctx.translate(-20 - (definition.xOff ?? 0), 0);
  if (definition.spin) ctx.rotate(player.skinRot);
  renderCosmetic(ctx, image, definition);
  ctx.restore();
}

function renderCosmetic(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement & { isLoaded?: boolean },
  definition: Cosmetic,
): void {
  if (!image.isLoaded) return;
  ctx.drawImage(image, -definition.scale / 2, -definition.scale / 2, definition.scale, definition.scale);
}
