import type { Painter } from "../painter";
import { config, outlineWidth } from "../../config";
import { findAccessory, findHat, type Cosmetic } from "../../data/cosmetics";
import { itemData } from "../../data/items";
import type { Player } from "../../entities/Player";
import { getItemSprite, sprites } from "../sprites";
import { renderProjectileSprite } from "./projectile";

export function renderPlayer(painter: Painter, player: Player): void {
  painter.lineWidth = outlineWidth;

  const weapon = itemData.weapons[player.weaponIndex];
  const holdingWeapon = player.buildIndex < 0;

  const armSpread = (Math.PI / 4) * (weapon.armS ?? 1);
  const offHandSpread = (holdingWeapon && weapon.hndS) || 1;
  const offHandDistance = (holdingWeapon && weapon.hndD) || 1;

  if (player.tailIndex > 0) renderAccessory(painter, player, player.tailIndex);
  if (holdingWeapon && !weapon.aboveHand) renderHeldWeapon(painter, player);

  painter.fillStyle = config.skinColors[player.skinColor];
  painter.circle(player.scale * Math.cos(armSpread), player.scale * Math.sin(armSpread), 14, true, true);
  painter.circle(
    player.scale * offHandDistance * Math.cos(-armSpread * offHandSpread),
    player.scale * offHandDistance * Math.sin(-armSpread * offHandSpread),
    14, true, true,
  );

  if (holdingWeapon && weapon.aboveHand) renderHeldWeapon(painter, player);

  if (player.buildIndex >= 0) {
    const item = itemData.list[player.buildIndex];
    const sprite = getItemSprite(item);
    painter.drawImage(sprite, player.scale - item.holdOffset, -sprite.width / 2);
  }

  painter.circle(0, 0, player.scale, true, true);

  if (player.skinIndex > 0) {
    painter.rotate(Math.PI / 2);
    renderHat(painter, player);
  }
}

function renderHeldWeapon(painter: Painter, player: Player): void {
  const weapon = itemData.weapons[player.weaponIndex];
  const variant = config.weaponVariants[player.weaponVariant] ?? config.weaponVariants[0];

  const image = sprites.weapon(weapon.src + variant.src);
  if (image.isLoaded) {
    painter.drawImage(
      image,
      player.scale + weapon.xOff - weapon.length / 2,
      weapon.yOff - weapon.width / 2,
      weapon.length,
      weapon.width,
    );
  }

  if (weapon.projectile != null && !weapon.hideProjectile) {
    renderProjectileSprite(painter, player.scale, 0, itemData.projectiles[weapon.projectile]);
  }
}

function renderHat(painter: Painter, player: Player): void {
  const definition = findHat(player.skinIndex);
  if (!definition) return;

  renderCosmetic(painter, sprites.hat(player.skinIndex), definition);

  if (definition.topSprite) {
    painter.save();
    painter.rotate(player.skinRot);
    renderCosmetic(painter, sprites.hat(`${player.skinIndex}_top`), definition);
    painter.restore();
  }
}

function renderAccessory(painter: Painter, player: Player, accessoryId: number): void {
  const definition = findAccessory(accessoryId);
  if (!definition) return;

  const image = sprites.accessory(accessoryId);
  if (!image.isLoaded) return;

  painter.save();
  painter.translate(-20 - (definition.xOff ?? 0), 0);
  if (definition.spin) painter.rotate(player.skinRot);
  renderCosmetic(painter, image, definition);
  painter.restore();
}

function renderCosmetic(
  painter: Painter,
  image: HTMLImageElement & { isLoaded?: boolean },
  definition: Cosmetic,
): void {
  if (!image.isLoaded) return;
  painter.drawImage(image, -definition.scale / 2, -definition.scale / 2, definition.scale, definition.scale);
}
