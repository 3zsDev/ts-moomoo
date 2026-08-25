import { config, paletteColors } from "../../config";
import type { Animal } from "../../entities/Animal";
import type { Player } from "../../entities/Player";
import { isFriendly } from "../../game/lookups";
import { animals, players, textManager } from "../../game/world";
import { camera } from "../camera";
import { ctx } from "../canvas";
import { renderRoundRect } from "../shapes";
import { icons } from "../sprites";

export function renderOverlays(delta: number): void {
  ctx.strokeStyle = paletteColors.hudDark;

  for (const entity of [...players, ...animals] as Array<Player | Animal>) {
    if (!entity.visible) continue;
    if ((entity as Player).skinIndex === 10 && !isFriendly(entity)) continue;

    renderNameAndHealth(entity);
  }

  textManager.update(delta, ctx, camera.left, camera.top);
  renderChatBubbles(delta);
}

function renderNameAndHealth(entity: Player | Animal): void {
  const team = (entity as Player).team;
  const label = (team ? `[${team}] ` : "") + (entity.name ?? "");

  const screenX = entity.x - camera.left;
  const screenY = entity.y - camera.top;

  if (label !== "") {
    const nameScale = (entity as Animal).nameScale ?? 30;
    ctx.font = `${nameScale}px Hammersmith One`;
    ctx.fillStyle = "#fff";
    ctx.textBaseline = "middle";
    ctx.textAlign = "center";
    ctx.lineWidth = (entity as Animal).nameScale ? 11 : 8;
    ctx.lineJoin = "round";

    const nameY = screenY - entity.scale - config.nameY;
    ctx.strokeText(label, screenX, nameY);
    ctx.fillText(label, screenX, nameY);

    renderNameIcons(entity as Player, screenX, nameY, ctx.measureText(label).width / 2);
  }

  if (entity.health <= 0) return;

  const barY = screenY + entity.scale + config.nameY;
  const barWidth = config.healthBarWidth;
  const pad = config.healthBarPad;

  ctx.fillStyle = paletteColors.hudDark;
  renderRoundRect(ctx, screenX - barWidth - pad, barY, barWidth * 2 + pad * 2, 17, 8);
  ctx.fill();

  ctx.fillStyle = isFriendly(entity) ? paletteColors.friendly : paletteColors.hostile;
  const fraction = entity.maxHealth ? entity.health / entity.maxHealth : 0;
  renderRoundRect(
    ctx, screenX - barWidth, barY + pad,
    barWidth * 2 * fraction, 17 - pad * 2, 7,
  );
  ctx.fill();
}

function renderNameIcons(player: Player, screenX: number, nameY: number, halfLabel: number): void {
  const size = config.crownIconScale;
  const iconY = nameY - size / 2 - 5;

  if (player.isLeader && icons.crown.isLoaded) {
    ctx.drawImage(icons.crown, screenX - size / 2 - halfLabel - config.crownPad, iconY, size, size);
  }
  if (player.iconIndex === 1 && icons.skull.isLoaded) {
    ctx.drawImage(icons.skull, screenX - size / 2 + halfLabel + config.crownPad, iconY, size, size);
  }
}

function renderChatBubbles(delta: number): void {
  ctx.font = "32px Hammersmith One";
  ctx.textBaseline = "middle";
  ctx.textAlign = "center";

  for (const player of players) {
    if (!player.visible || player.chatCountdown <= 0 || !player.chatMessage) continue;

    player.chatCountdown = Math.max(0, player.chatCountdown - delta);

    const x = player.x - camera.left;
    const y = player.y - player.scale - camera.top - 90;
    const width = ctx.measureText(player.chatMessage).width + 17;

    ctx.fillStyle = "rgba(0,0,0,0.2)";
    renderRoundRect(ctx, x - width / 2, y - 47 / 2, width, 47, 6);
    ctx.fill();

    ctx.fillStyle = "#fff";
    ctx.fillText(player.chatMessage, x, y);
  }
}
