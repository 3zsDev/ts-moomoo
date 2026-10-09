import { connection } from "../Connection";
import type { MsgPackValue } from "../msgpack";
import { ClientPacket } from "../protocol";

// 1.9 socket features

export interface PlayerStats {
  sid: number;
  kills: number;
  wood: number;
  food: number;
  stone: number;
  gold: number;
  damage: number;
  animalDamage: number;
  healing: number;
  animals: number;
  bosses: number;
  accountId: number | string;
  score: number;
}

type StatsListener = (stats: PlayerStats) => void;

const listeners = new Set<StatsListener>();
let requestedSid = -1;

export function onPlayerStats(listener: StatsListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function requestPlayerStats(sid: number): void {
  if (sid === requestedSid) return;
  requestedSid = sid;
  if (sid !== -1) connection.send(ClientPacket.RequestPlayerStats, sid);
}

export function playerStats(
  sid: number, kills: number, wood: number, food: number, stone: number, gold: number,
  damage: number, animalDamage: number, healing: number, animals: number, bosses: number,
  accountId: number | string, score = 0,
): void {
  const stats: PlayerStats = {
    sid, kills, wood, food, stone, gold, damage, animalDamage, healing, animals, bosses,
    accountId, score: score || 0,
  };
  for (const listener of listeners) listener(stats);
}

let pendingProfile: { sid: number; resolve: (profile: unknown) => void } | null = null;
const PROFILE_WAIT = 3000;

export function awaitPlayerProfile<T>(sid: number, fallback: () => Promise<T | null>): Promise<T | null> {
  return new Promise((resolve) => {
    const request = (pendingProfile = { sid, resolve: resolve as (profile: unknown) => void });
    setTimeout(() => {
      if (pendingProfile !== request) return;
      pendingProfile = null;
      fallback().then(resolve, () => resolve(null));
    }, PROFILE_WAIT);
  });
}

export function playerProfile(sid: number, json: string): void {
  if (!pendingProfile || pendingProfile.sid !== sid) return;
  const request = pendingProfile;
  pendingProfile = null;
  let profile: unknown = null;
  try {
    profile = JSON.parse(json);
  } catch {}
  request.resolve(profile);
}

export type ReportAction = 0 | 1 | 2;

export function reportPlayer(sid: number, action: ReportAction = 0, reason = 0): void {
  if (reason) connection.send(ClientPacket.ReportPlayer, sid, 0, reason);
  else if (action) connection.send(ClientPacket.ReportPlayer, sid, action);
  else connection.send(ClientPacket.ReportPlayer, sid);
}

export function sendAdminCommand(command: string, ...args: MsgPackValue[]): void {
  connection.send(ClientPacket.AdminCommand, command, ...args);
}
