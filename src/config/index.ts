import { combat } from "./combat";
import { hud } from "./hud";
import { network } from "./network";
import { animalTuning, player } from "./player";
import { skinColors } from "./colors";
import { upgrades } from "./upgrades";
import { world, worldGen } from "./world";
import { cowNames } from "../data/names";
import { isSandbox } from "../environment";
import { fetchVariant, weaponVariants } from "../data/weaponVariants";

export const resourceTypes = ["wood", "food", "stone", "points"] as const;
export type ResourceType = (typeof resourceTypes)[number];

export const config = {
  ...world,
  ...worldGen,
  ...network,
  ...combat,
  ...hud,
  ...animalTuning,
  ...upgrades,

  playerScale: player.scale,
  playerSpeed: player.speed,
  playerDecel: player.decel,
  maxAge: player.maxAge,
  maxNameLength: player.maxNameLength,

  get inSandbox(): boolean {
    return isSandbox();
  },

  weaponVariants,
  fetchVariant,
  resourceTypes,
  skinColors,
  cowNames,
};

export type GameConfig = typeof config;

export { endpoints } from "./network";
export * from "./colors";
