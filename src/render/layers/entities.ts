import { animals, players } from "../../game/world";
import { state } from "../../game/state";
import { getAimAngle } from "../../input";
import { camera } from "../camera";
import { ctx } from "../canvas";
import { renderAnimal, renderPlayer } from "../draw";

export function renderAI(delta: number): void {
  ctx.globalAlpha = 1;

  for (const animal of animals) {
    if (!animal.active || !animal.visible) continue;

    animal.animate(delta);

    ctx.save();
    ctx.translate(animal.x - camera.left, animal.y - camera.top);

    ctx.rotate(animal.dir + animal.dirPlus - Math.PI / 2);
    renderAnimal(ctx, animal);
    ctx.restore();
  }
}

export function renderPlayers(delta: number, zIndex: number): void {
  ctx.globalAlpha = 1;

  for (const player of players) {
    if (player.zIndex !== zIndex) continue;

    player.animate(delta);
    if (!player.visible) continue;

    player.skinRot += 0.002 * delta;

    const facing = (player === state.me ? getAimAngle() : player.dir) + player.dirPlus;

    ctx.save();
    ctx.translate(player.x - camera.left, player.y - camera.top);
    ctx.rotate(facing);
    renderPlayer(ctx, player);
    ctx.restore();
  }
}
