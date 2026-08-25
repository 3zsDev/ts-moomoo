import { config } from "../config";
import { accessories, hats } from "../data/cosmetics";
import { itemData } from "../data/items";
import { Animal } from "../entities/Animal";
import { GameObject } from "../entities/GameObject";
import { Player } from "../entities/Player";
import { Projectile } from "../entities/Projectile";
import type { Damageable } from "../entities/types";
import { AnimalManager } from "../systems/AnimalManager";
import { ObjectManager } from "../systems/ObjectManager";
import { ProjectileManager } from "../systems/ProjectileManager";
import { TextManager } from "../render/TextManager";

export const players: Player[] = [];
export const animals: Animal[] = [];
export const gameObjects: GameObject[] = [];
export const projectiles: Projectile[] = [];

export const objectManager = new ObjectManager(gameObjects, config, players as unknown as Damageable[], null);

export const projectileManager = new ProjectileManager(
  projectiles, players as unknown as Damageable[], animals, objectManager, itemData, config, null,
);

export const animalManager = new AnimalManager(
  animals, players as unknown as Damageable[], objectManager, config, null, null,
);

export const textManager = new TextManager();

export function getOrCreatePlayer(id: string, sid: number): Player {
  const existing = players.find((player) => player.id === id);
  if (existing) return existing;

  const player = new Player(
    id, sid, config, projectileManager, objectManager,
    players, animals, itemData, hats, accessories,
  );
  players.push(player);
  return player;
}

export function removePlayerById(id: string): void {
  const index = players.findIndex((player) => player.id === id);
  if (index >= 0) players.splice(index, 1);
}
