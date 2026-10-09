import { config, paletteColors } from "../../config";
import type { Animal } from "../../entities/Animal";
import type { Player } from "../../entities/Player";
import { isFriendly } from "../../game/lookups";
import { state } from "../../game/state";
import { animals, players, textManager } from "../../game/world";
import { inFallsPool } from "../../utils/falls";
import { camera } from "../camera";
import { painter, textLayer, view } from "../surface";
import { icons } from "../sprites";
import { hidesOwnName } from "../../ui/anonMode";

const TAG_SCALE = 0.7;
const CLANMATE_COLOR = "#ff6b6b";
const CLAN_GOLD = "#ffd34d";

export interface NameTag {
  text: string;
  before: string;
  gold: string;
}

export function formatNameTag(team: string | null | undefined, clan: string | null | undefined): NameTag {
  if (!clan) return { text: team ? `[${team}]` : "", before: "", gold: "" };
  if (team === clan) return { text: `[${clan}]`, before: "", gold: `[${clan}]` };
  const before = `[${team || "solo"}:`;
  return { text: `${before}${clan}]`, before, gold: clan };
}

export function renderOverlays(delta: number): void {
  const me = state.me;
  let boss: Player | Animal | null = null;

  for (const entity of [...players, ...animals] as Array<Player | Animal>) {
    if (!entity.visible) continue;

    if ((entity as Animal).isBoss) {
      if ((entity as Animal).active && me && inFallsPool(me.x, me.y)) boss ??= entity;
      continue;
    }
    if ((entity as Player).bossMode && entity !== me) {
      boss ??= entity;
      continue;
    }
    if ((entity as Animal).isAI && (entity as Animal).state && (entity as Animal).diver) continue;
    if ((entity as Player).skinIndex === 10 && !isFriendly(entity)) continue;

    renderNameAndHealth(entity);
  }

  if (boss) renderBossBar(boss);

  textManager.update(delta, painter, camera.left, camera.top);
  renderChatBubbles(delta);
}

function renderNameAndHealth(entity: Player | Animal): void {
  const me = state.me;
  const player = entity as Player;
  const tag = formatNameTag(player.team, entity === me && hidesOwnName() ? null : player.clan);
  const name = entity.name ?? "";

  const screenX = entity.x - camera.left;
  const screenY = entity.y - camera.top;

  if (tag.text !== "" || name !== "") {
    const nameY = screenY - entity.scale - config.nameY;
    const size = (entity as Animal).nameScale || 30;
    const tagSize = size * TAG_SCALE;
    const outlineWidth = (entity as Animal).nameScale ? 11 : 8;

    const clanmate = entity !== me && !!player.clan && player.clan === me?.clan &&
      !(player.team && player.team === me?.team);
    const color = clanmate ? CLANMATE_COLOR : "#fff";

    const label = textLayer.painter;
    const tagWidth = tag.text ? label.measureText(`${tag.text} `, tagSize) : 0;
    const total = tagWidth + label.measureText(name, size);
    const left = screenX - total / 2;

    if (tag.text) {
      label.text(`${tag.text} `, left + tagWidth / 2, nameY, tagSize, {
        color, outline: paletteColors.hudDark, outlineWidth: outlineWidth * TAG_SCALE,
      });
    }
    label.text(name, left + tagWidth + (total - tagWidth) / 2, nameY, size, {
      color, outline: paletteColors.hudDark, outlineWidth,
    });
    if (tag.gold && !clanmate) {
      const goldX = left + label.measureText(tag.before, tagSize) + label.measureText(tag.gold, tagSize) / 2;
      label.text(tag.gold, goldX, nameY, tagSize, { color: CLAN_GOLD });
    }

    renderNameIcons(player, screenX, nameY, total / 2);
  }

  if (entity.health <= 0) return;

  const barY = screenY + entity.scale + config.nameY;
  const barWidth = config.healthBarWidth;
  const pad = config.healthBarPad;

  painter.fillStyle = paletteColors.hudDark;
  painter.fillRoundRect(screenX - barWidth - pad, barY, barWidth * 2 + pad * 2, 17, 8);

  painter.fillStyle = isFriendly(entity) ? paletteColors.friendly : paletteColors.hostile;
  const fraction = entity.maxHealth ? entity.health / entity.maxHealth : 0;
  painter.fillRoundRect(screenX - barWidth, barY + pad, barWidth * 2 * fraction, 17 - pad * 2, 7);
}

function renderNameIcons(player: Player, screenX: number, nameY: number, halfLabel: number): void {
  const size = config.crownIconScale;
  const iconY = nameY - size / 2 - 5;

  if (player.isLeader && icons.crown.isLoaded) {
    painter.drawImage(icons.crown, screenX - size / 2 - halfLabel - config.crownPad, iconY, size, size);
  }
  if (player.iconIndex === 1 && icons.skull.isLoaded) {
    painter.drawImage(icons.skull, screenX - size / 2 + halfLabel + config.crownPad, iconY, size, size);
  }
}

interface Box {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

let hudBoxes: { at: number; boxes: Box[] } = { at: 0, boxes: [] };

function getHudBoxes(): Box[] {
  const now = Date.now();
  if (now - hudBoxes.at < 500) return hudBoxes.boxes;

  const scale = view.width / window.innerWidth;
  const boxes: Box[] = [];
  const selector = "#gameUI .uiElement, #gameUI .resourceDisplay, #topInfoHolder, #mapDisplay";
  document.querySelectorAll(selector).forEach((element) => {
    const rect = element.getBoundingClientRect();
    if (!rect.width || !rect.height || rect.top > window.innerHeight * 0.6) return;
    boxes.push({
      left: rect.left * scale, right: rect.right * scale,
      top: rect.top * scale, bottom: rect.bottom * scale,
    });
  });
  hudBoxes = { at: now, boxes };
  return boxes;
}

function renderBossBar(boss: Player | Animal): void {
  const boxes = getHudBoxes();
  const centre = view.width / 2;

  const roomAt = (y: number): number => {
    let leftEdge = 0;
    let rightEdge = view.width;
    for (const box of boxes) {
      if (box.bottom < y - 50 || box.top > y + 30) continue;
      if (box.left <= centre && box.right >= centre) return 0;
      if (box.right < centre) leftEdge = Math.max(leftEdge, box.right);
      else rightEdge = Math.min(rightEdge, box.left);
    }
    return Math.min(310, centre - leftEdge - 20, rightEdge - centre - 20);
  };

  const wanted = Math.min(150, view.width * 0.3);
  const rows = [92, ...boxes.map((box) => box.bottom + 58).sort((a, b) => a - b)];
  let y = rows[0];
  let half = roomAt(y);
  for (let i = 1; i < rows.length && half < wanted; i++) {
    const room = roomAt(rows[i]);
    if (room > half) {
      y = rows[i];
      half = room;
    }
  }
  half = Math.max(80, half);

  const width = half * 2;
  const left = centre - half;
  const state = (boss as Animal).state;
  const submerged = state === 1 || state === 2 || state === 3;

  painter.globalAlpha = 1;
  painter.text(boss.name ?? "", centre, y - 26, 30, { color: "#fff", outline: paletteColors.hudDark, outlineWidth: 8 });
  painter.fillStyle = paletteColors.hudDark;
  painter.fillRoundRect(left - 5, y - 5, width + 10, 28, 12);
  painter.fillStyle = submerged ? "#5f87c4" : "#cc5151";
  painter.fillRoundRect(left, y, Math.max(0, width * (boss.health / (boss.maxHealth || 1))), 18, 9);
}

function renderChatBubbles(delta: number): void {

  for (const player of players) {
    if (!player.visible || player.chatCountdown <= 0 || !player.chatMessage) continue;

    player.chatCountdown = Math.max(0, player.chatCountdown - delta);

    const x = player.x - camera.left;
    const y = player.y - player.scale - camera.top - 90;
    const width = painter.measureText(player.chatMessage, 32) + 17;

    painter.fillStyle = "rgba(0,0,0,0.2)";
    painter.fillRoundRect(x - width / 2, y - 47 / 2, width, 47, 6);

    textLayer.painter.text(player.chatMessage, x, y, 32, { color: "#fff" });
  }
}
