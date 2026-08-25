import type { PlayerInitData } from "../../entities/Player";
import { findPlayerBySid } from "../../game/lookups";
import { state } from "../../game/state";
import { getOrCreatePlayer, players, removePlayerById } from "../../game/world";
import { refreshActionBar } from "../../ui/actionBar";
import { ui } from "../../ui/elements";
import { refreshAge } from "../../ui/hud/ageBar";
import { refreshResources } from "../../ui/hud/resources";
import { refreshUpgrades } from "../../ui/upgrades";

export function addPlayer(data: PlayerInitData, isYou: boolean): void {
  const player = getOrCreatePlayer(data[0], data[1]);

  player.spawn(isYou);
  player.visible = false;
  player.x2 = undefined;
  player.y2 = undefined;
  player.setData(data);

  if (!isYou) return;

  state.me = player;
  state.cameraX = player.x;
  state.cameraY = player.y;
  state.deathTextSize = 99999;

  refreshActionBar();
  refreshResources();
  refreshAge();
  refreshUpgrades(0);
  ui.gameUI.style.display = "block";
}

export function removePlayer(id: string): void {
  removePlayerById(id);
}

export function updatePlayers(data: (number | string | null)[]): void {
  const now = Date.now();

  for (const player of players) {
    player.forcePos = !player.visible;
    player.visible = false;
  }

  for (let i = 0; i < data.length; i += 13) {
    const player = findPlayerBySid(data[i] as number);
    if (!player) continue;

    player.t1 = player.t2 === undefined ? now : player.t2;
    player.t2 = now;
    player.x1 = player.x;
    player.y1 = player.y;
    player.d1 = player.d2 === undefined ? (data[i + 3] as number) : player.d2;

    player.x2 = data[i + 1] as number;
    player.y2 = data[i + 2] as number;
    player.d2 = data[i + 3] as number;
    player.dt = 0;

    player.buildIndex = data[i + 4] as number;
    player.weaponIndex = data[i + 5] as number;
    player.weaponVariant = data[i + 6] as number;
    player.team = data[i + 7] as string | null;
    player.isLeader = !!data[i + 8];
    player.skinIndex = data[i + 9] as number;
    player.tailIndex = data[i + 10] as number;
    player.iconIndex = data[i + 11] as number;
    player.zIndex = data[i + 12] as number;
    player.visible = true;
  }
}

export function updateHealth(sid: number, health: number): void {
  const player = findPlayerBySid(sid);
  if (player) player.health = health;
}

export function gatherAnimation(sid: number, didHit: number, weaponIndex: number): void {
  findPlayerBySid(sid)?.startAnim(!!didHit, weaponIndex);
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
