import type { Animal } from "../entities/Animal";
import type { GameObject } from "../entities/GameObject";
import type { Player } from "../entities/Player";
import { state } from "./state";
import { animals, gameObjects, players } from "./world";

export function findPlayerBySid(sid: number): Player | null {
  return players.find((player) => player.sid === sid) ?? null;
}

export function findAnimalBySid(sid: number): Animal | null {
  return animals.find((animal) => animal.sid === sid) ?? null;
}

export function findObjectBySid(sid: number): GameObject | null {
  return gameObjects.find((obj) => obj.sid === sid) ?? null;
}

export function isFriendly(other: { sid: number; team?: string | null }): boolean {
  const me = state.me;
  if (!me) return false;
  return other.sid === me.sid || (!!other.team && other.team === me.team);
}
