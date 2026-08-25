import { weaponVariants } from "./weaponVariants";
import { animalTypes } from "./animals";
import { accessories, hats } from "./cosmetics";
import { projectileTypes, weapons } from "./items";

export const ICON_NAMES = ["crown", "skull"];

export const RESOURCE_ICON_NAMES = ["food", "wood", "stone", "gold"];

export const PROMO_IMAGES = ["banner_4"];

export function listAssetPaths(): string[] {
  const paths = new Set<string>();

  for (const weapon of weapons) {
    for (const variant of weaponVariants) {
      paths.add(`img/weapons/${weapon.src}${variant.src}.png`);
    }
  }

  for (const projectile of projectileTypes) {
    if (projectile.src) paths.add(`img/weapons/${projectile.src}.png`);
  }

  for (const hat of hats) {
    paths.add(`img/hats/hat_${hat.id}.png`);

    if (hat.topSprite) {
      paths.add(`img/hats/hat_${hat.id}_top.png`);
      paths.add(`img/hats/hat_${hat.id}_p.png`);
    }
  }

  for (const accessory of accessories) {
    paths.add(`img/accessories/access_${accessory.id}.png`);
  }

  for (const animal of animalTypes) {
    paths.add(`img/animals/${animal.src}.png`);
  }

  for (const promo of PROMO_IMAGES) {
    paths.add(`img/promotion/${promo}.png`);
  }

  for (const icon of RESOURCE_ICON_NAMES) {
    paths.add(`img/resources/${icon}_ico.png`);
  }

  for (const icon of ICON_NAMES) {
    paths.add(`img/icons/${icon}.png`);
  }

  return [...paths];
}
