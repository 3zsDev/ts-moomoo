import { state } from "../../game/state";
import { gameObjects } from "../../game/world";
import type { Alliance } from "../../game/state";

export interface HandlerHooks {
  onDisconnect(reason: string): void;
  onSetupGame(): void;
  onDeath(): void;
}

let hooks: HandlerHooks;

export function setHooks(value: HandlerHooks): void {
  hooks = value;
}

export function setInitData(data: { teams: Alliance[] }): void {
  state.alliances = data.teams ?? [];
}

export function disconnect(reason: string): void {
  hooks.onDisconnect(reason);
}

export function setupGame(playerId: string): void {
  state.myPlayerId = playerId;
  state.inGame = true;

  if (state.firstLoad) {
    state.firstLoad = false;
    gameObjects.length = 0;
  }
  hooks.onSetupGame();
}

export function killPlayer(): void {
  hooks.onDeath();
}
