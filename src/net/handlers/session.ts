import { state } from "../../game/state";
import { animalKinds, gameObjects } from "../../game/world";
import type { Alliance } from "../../game/state";
import type { AnimalKind } from "../../data/animals";
import { warmAnimalSprites } from "../../render/sprites";

export interface HandlerHooks {
  onDisconnect(reason: string): void;
  onSetupGame(): void;
  onSpawn(): void;
  onDeath(): void;
}

let hooks: HandlerHooks;

export function setHooks(value: HandlerHooks): void {
  hooks = value;
}

export function setInitData(data: { teams: Alliance[]; animals?: AnimalKind[] }): void {
  state.alliances = data.teams ?? [];
  if (data.animals) {
    animalKinds.setKinds(data.animals);
    warmAnimalSprites(animalKinds.kinds);
  }
}

export function disconnect(reason: string): void {
  hooks.onDisconnect(reason);
}

export function setupGame(playerId: number): void {
  state.myPlayerId = playerId;
  state.inGame = true;

  if (state.firstLoad) {
    state.firstLoad = false;
    gameObjects.length = 0;
  }
  hooks.onSetupGame();
}

export function spawned(): void {
  hooks.onSpawn();
}

export function killPlayer(): void {
  hooks.onDeath();
}
