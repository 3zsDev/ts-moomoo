import { Game } from "./game/Game";

export type Simulation = Game;
export type { SimClient } from "./client";
export type { SimHost, SimPlugin, SimPluginFactory } from "./plugin";

export function createSimulation(): Simulation {
  return new Game();
}
