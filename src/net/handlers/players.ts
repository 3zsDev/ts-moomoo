import type { PlayerInitData } from "../../entities/Player";
import { findPlayerBySid } from "../../game/lookups";
import { state } from "../../game/state";
import { getOrCreatePlayer, removePlayerById } from "../../game/world";
import { refreshActionBar } from "../../ui/actionBar";
import { rememberOwnName } from "../../ui/anonMode";
import { ui } from "../../ui/elements";
import { refreshAge } from "../../ui/hud/ageBar";
import { refreshResources } from "../../ui/hud/resources";
import { refreshUpgrades } from "../../ui/upgrades";
import { spawned } from "./session";

export function addPlayer(data: PlayerInitData, isYou: boolean): void {
  const player = getOrCreatePlayer(data[0], data[1]);

  player.spawn(isYou);
  player.visible = false;
  player.x2 = undefined;
  player.y2 = undefined;
  player.setData(data);

  if (!isYou) return;

  state.me = player;
  rememberOwnName(player.name);
  state.cameraX = player.x;
  state.cameraY = player.y;
  state.deathTextSize = 99999;

  refreshActionBar();
  refreshResources();
  refreshAge();
  refreshUpgrades(0);
  spawned();
  ui.gameUI.style.display = "block";
}

export function removePlayer(id: string): void {
  removePlayerById(id);
}

export function updatePlayers(
  positions: number[] = [], attributes: (number | string | null)[] = [], hidden: number[] = [],
): void {
  for (let i = 0; i < positions.length; i += 4) {
    const player = findPlayerBySid(positions[i]);
    if (!player) continue;

    const x = positions[i + 1];
    const y = positions[i + 2];
    player.forcePos = !player.visible;
    player.x1 = player.x;
    player.y1 = player.y;
    player.settle = player.x2 === x && player.y2 === y;
    player.x2 = x;
    player.y2 = y;
    player.d2 = positions[i + 3] / 100;
    player.d1 = player.forcePos ? player.d2 : player.dir;
    player.dt = 0;
    player.visible = true;
  }

  for (let i = 0; i < attributes.length; i += 10) {
    const player = findPlayerBySid(attributes[i] as number);
    if (!player) continue;

    player.buildIndex = attributes[i + 1] as number;
    player.weaponIndex = attributes[i + 2] as number;
    player.weaponVariant = attributes[i + 3] as number;
    player.team = attributes[i + 4] as string | null;
    player.isLeader = !!attributes[i + 5];
    player.skinIndex = attributes[i + 6] as number;
    player.tailIndex = attributes[i + 7] as number;
    player.iconIndex = attributes[i + 8] as number;
    player.zIndex = attributes[i + 9] as number;
  }

  for (const sid of hidden) {
    const player = findPlayerBySid(sid);
    if (player) player.visible = false;
  }
}

export function updateHealth(sid: number, health: number): void {
  const player = findPlayerBySid(sid);
  if (player) player.health = health;
}

export function gatherAnimation(sid: number, didHit: number, weaponIndex: number, speedMult?: number): void {
  findPlayerBySid(sid)?.startAnim(!!didHit, weaponIndex, speedMult);
}

export function updatePlayerValue(name: string, value: number, updateHud: number): void {
  const me = state.me;
  if (!me) return;

  (me as unknown as Record<string, number>)[name] = value;
  if (updateHud) refreshResources();
}

export function updateItemCounts(groupId: number, count: number): void {
  if (state.me) state.me.itemCounts[groupId] = count;
}

export function updateItems(list: number[], isWeapons: number): void {
  refreshActionBar(list, !!isWeapons);
}

export function updateAge(xp?: number, maxXp?: number, age?: number): void {
  refreshAge(xp, maxXp, age);
}

export function updateUpgrades(points: number, age: number): void {
  refreshUpgrades(points, age);
}
