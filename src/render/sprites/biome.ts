import { config } from "../../config";

export const enum Biome {
  Grass = 0,
  Snow = 1,
  Desert = 2,
}

export function biomeAt(y: number): Biome {
  if (y >= config.mapScale - config.snowBiomeTop) return Biome.Desert;
  if (y <= config.snowBiomeTop) return Biome.Snow;
  return Biome.Grass;
}
