import { combat } from "./combat";
import { hud } from "./hud";
import { network } from "./network";
import { animalTuning, player } from "./player";
import { skinColors } from "./colors";
import { protocol } from "./protocol";
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
  ...protocol,

  MAX_ATTACK: 0.6,
  MAX_SPAWN_DELAY: 1,
  MAX_SPEED: 0.3,
  MAX_TURN_SPEED: 0.3,
  DAY_INTERVAL: 1440000,

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
export { accessoryEffect, accessoryEffects, type AccessoryEffect } from "./effects";
export * from "./colors";
