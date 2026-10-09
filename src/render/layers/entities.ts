import { config } from "../../config";
import type { Player } from "../../entities/Player";
import { animals, players } from "../../game/world";
import { state } from "../../game/state";
import { getAimAngle } from "../../input";
import { camera } from "../camera";
import { painter } from "../surface";
import { renderAnimal, renderPlayer } from "../draw";

export function renderAI(delta: number): void {
  painter.globalAlpha = 1;

  for (const animal of animals) {
    if (!animal.active || !animal.visible) continue;

    animal.animate(delta);

    painter.save();
    painter.translate(animal.x - camera.left, animal.y - camera.top);

    painter.rotate(animal.dir + animal.dirPlus - Math.PI / 2);
    renderAnimal(painter, animal);
    painter.restore();
  }
}

export function renderPlayers(delta: number, zIndex: number): void {
  painter.globalAlpha = 1;

  for (const player of players) {
    if (player.zIndex !== zIndex) continue;

    player.animate(delta);
    if (!player.visible) continue;

    player.skinRot += 0.002 * delta;

    const facing = (player === state.me ? getAimAngle() : player.dir) + player.dirPlus;

    painter.save();
    painter.translate(player.x - camera.left, player.y - camera.top);
    const ratio = player.scale / config.playerScale;
    const drawn = ratio === 1 ? player : (Object.create(player, { scale: { value: config.playerScale } }) as Player);
    if (ratio !== 1) painter.scale(ratio, ratio);
    if (player.aura) renderAura(drawn);
    painter.rotate(facing);
    renderPlayer(painter, drawn);
    painter.restore();
  }
}

// admins have weird render thing, joshy wants to look like pretty princess
function renderAura(player: Player): void {
  const time = Date.now() / 1000;
  const radius = player.scale * 1.55;

  painter.save();
  painter.globalAlpha = 0.55 + 0.15 * Math.sin(time * 3);
  painter.glow(0, 0, radius * 1.25, player.scale * 0.6, "#ffdd66");

  for (let i = 0; i < 10; i++) {
    const angle = time * (0.9 + (i % 3) * 0.35) + i * ((Math.PI * 2) / 10);
    const distance = radius * (0.85 + 0.2 * Math.sin(time * 2 + i * 1.7));
    const size = player.scale * (0.08 + 0.02 * ((i + Math.floor(time * 2)) % 4));
    painter.globalAlpha = 0.55 + 0.4 * Math.sin(time * 3 + i * 2.1);
    painter.fillStyle = i % 2 ? "#fff6c2" : "#ffd24a";
    painter.circle(Math.cos(angle) * distance, Math.sin(angle) * distance, size, true, false);
  }
  painter.restore();
}
