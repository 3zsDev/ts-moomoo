import { config } from "../../config";
import type { Animal } from "../../entities/Animal";
import { findAnimalBySid } from "../../game/lookups";
import { animalManager } from "../../game/world";

export function loadAI(data?: number[], hidden?: number[]): void {
  const now = Date.now();

  for (let i = 0; data && i < data.length; i += 8) {
    let animal: Animal | null = findAnimalBySid(data[i]);
    const index = data[i + 1];
    const state = data[i + 7] || 0;

    if (animal && animal.index !== index) {
      animal.active = false;
      animal = null;
    }

    if (animal) {
      animal.forcePos = !animal.visible;
      animal.x1 = animal.x;
      animal.y1 = animal.y;
      animal.settle = animal.x2 === data[i + 2] && animal.y2 === data[i + 3];
      animal.x2 = data[i + 2];
      animal.y2 = data[i + 3];
      animal.d2 = data[i + 4] / 100;
      animal.d1 = animal.forcePos ? animal.d2 : animal.dir;
      animal.health = data[i + 5];
      if (state !== animal.state) animal.stateAt = now;
      animal.state = state;
      animal.dt = 0;
    } else {
      animal = animalManager.spawn(data[i + 2], data[i + 3], data[i + 4] / 100, index);
      animal.x2 = animal.x;
      animal.y2 = animal.y;
      animal.d2 = animal.dir;
      animal.health = data[i + 5];
      animal.state = state;
      animal.stateAt = now;
      animal.forcePos = true;

      if (!animalManager.animalTypes[index].name) {
        animal.name = config.cowNames[data[i + 6]];
      }
      (animal as { sid: number }).sid = data[i];
    }

    animal.isBoss = !!animalManager.animalTypes[index].boss;
    animal.visible = true;
  }

  for (let i = 0; hidden && i < hidden.length; i++) {
    const animal = findAnimalBySid(hidden[i]);
    if (animal) animal.visible = false;
  }
}

export function animateAI(sid: number): void {
  findAnimalBySid(sid)?.startAnim();
}
