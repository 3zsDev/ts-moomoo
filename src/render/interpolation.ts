import { config } from "../config";
import type { Animal } from "../entities/Animal";
import type { Player } from "../entities/Player";
import { state } from "../game/state";
import { animals, players } from "../game/world";
import { lerpAngle } from "../utils/angles";

const deltaSpeed = 1000 / config.serverUpdateRate;

const MIN_SPAN = 30;
const MAX_SPAN = 400;

export function interpolateEntities(delta: number): void {
  const renderTime = state.now - deltaSpeed;

  interpolate(players, delta, renderTime);
  interpolate(animals, delta, renderTime);
}

function interpolate(
  entities: ReadonlyArray<Player | Animal>, delta: number, renderTime: number,
): void {
  for (const entity of entities) {
    if (!entity.visible) continue;

    if (entity.forcePos) {
      entity.x = entity.x2 ?? entity.x;
      entity.y = entity.y2 ?? entity.y;
      entity.dir = entity.d2 ?? entity.dir;
      continue;
    }

    const span = (entity.t2 ?? 0) - (entity.t1 ?? 0);
    const angleProgress = span > 0 ? (renderTime - (entity.t1 ?? 0)) / span : 1;
    const step = span > 0 ? Math.min(Math.max(span, MIN_SPAN), MAX_SPAN) : deltaSpeed;

    entity.dt += delta;
    const progress = Math.min(1.7, entity.dt / step);

    entity.x = (entity.x1 ?? entity.x) + ((entity.x2 ?? entity.x) - (entity.x1 ?? entity.x)) * progress;
    entity.y = (entity.y1 ?? entity.y) + ((entity.y2 ?? entity.y) - (entity.y1 ?? entity.y)) * progress;
    entity.dir = lerpAngle(
      entity.d2 ?? entity.dir,
      entity.d1 ?? entity.dir,
      Math.min(1.2, angleProgress),
    );
  }
}
