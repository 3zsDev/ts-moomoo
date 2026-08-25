import { accessories } from "./accessories";
import { hats } from "./hats";
import type { Cosmetic } from "./types";

export * from "./types";
export { hats } from "./hats";
export { accessories } from "./accessories";

const hatById = new Map(hats.map((hat) => [hat.id, hat]));
const accessoryById = new Map(accessories.map((item) => [item.id, item]));

export function findHat(id: number): Cosmetic | undefined {
  return hatById.get(id);
}

export function findAccessory(id: number): Cosmetic | undefined {
  return accessoryById.get(id);
}
