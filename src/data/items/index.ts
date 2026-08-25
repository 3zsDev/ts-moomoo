import { itemGroups } from "./groups";
import { projectileTypes } from "./projectiles";
import { weapons } from "./weapons";
import { items } from "./placeables";

export * from "./groups";
export * from "./projectiles";
export * from "./weapons";
export * from "./placeables";

export const itemData = {
  groups: itemGroups,
  projectiles: projectileTypes,
  weapons,
  list: items,
};

export type ItemData = typeof itemData;
