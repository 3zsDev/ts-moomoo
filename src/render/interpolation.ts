import { config } from "../config";
import type { Animal } from "../entities/Animal";
import type { Player } from "../entities/Player";
import { animals, players } from "../game/world";
import { lerpAngle } from "../utils/angles";

const deltaSpeed = 1000 / config.serverUpdateRate;

// 1.9: positions ease over a fixed 170ms and may overshoot up to 1.7x, unless the entity stood still - in other words: GAY!
const MOVE_SPAN = 170;

export function interpolateEntities(delta: number): void {
  interpolate(players, delta);
  interpolate(animals, delta);
}

function interpolate(entities: ReadonlyArray<Player | Animal>, delta: number): void {
  for (const entity of entities) {
    if (!entity.visible) continue;

    if (entity.forcePos) {
      entity.x = entity.x2 ?? entity.x;
      entity.y = entity.y2 ?? entity.y;
      entity.dir = entity.d2 ?? entity.dir;
      continue;
    }

    entity.dt += delta;
    const progress = Math.min(entity.settle ? 1 : 1.7, entity.dt / MOVE_SPAN);

    const x1 = entity.x1 ?? entity.x;
    const y1 = entity.y1 ?? entity.y;
    entity.x = x1 + ((entity.x2 ?? x1) - x1) * progress;
    entity.y = y1 + ((entity.y2 ?? y1) - y1) * progress;
    entity.dir = lerpAngle(
      entity.d2 ?? entity.dir,
      entity.d1 ?? entity.dir,
      Math.min(1, entity.dt / deltaSpeed),
    );
  }
}
