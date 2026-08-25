import { config } from "../../config";
import type { Animal } from "../../entities/Animal";
import { findAnimalBySid } from "../../game/lookups";
import { animalManager, animals } from "../../game/world";

export function loadAI(data?: number[]): void {
  for (const animal of animals) {
    animal.forcePos = !animal.visible;
    animal.visible = false;
  }
  if (!data) return;

  const now = Date.now();

  for (let i = 0; i < data.length; i += 7) {
    let animal: Animal | null = findAnimalBySid(data[i]);

    if (animal) {
      animal.index = data[i + 1];
      animal.t1 = animal.t2 === undefined ? now : animal.t2;
      animal.t2 = now;
      animal.x1 = animal.x;
      animal.y1 = animal.y;
      animal.d1 = animal.d2 === undefined ? data[i + 4] : animal.d2;
      animal.x2 = data[i + 2];
      animal.y2 = data[i + 3];
      animal.d2 = data[i + 4];
      animal.health = data[i + 5];
      animal.dt = 0;
    } else {
      animal = animalManager.spawn(data[i + 2], data[i + 3], data[i + 4], data[i + 1]);
      animal.x2 = animal.x;
      animal.y2 = animal.y;
      animal.d2 = animal.dir;
      animal.health = data[i + 5];
      animal.forcePos = true;

      if (!animalManager.animalTypes[data[i + 1]].name) {
        animal.name = config.cowNames[data[i + 6]];
      }
      (animal as { sid: number }).sid = data[i];
    }

    animal.visible = true;
  }
}

export function animateAI(sid: number): void {
  findAnimalBySid(sid)?.startAnim();
}
