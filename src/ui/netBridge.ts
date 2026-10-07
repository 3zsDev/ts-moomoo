import { state } from "../game/state";
import { leaveSession } from "../game/session";
import { connection } from "../net/Connection";
import {
  onPlayerStats as onStatsPacket, reportPlayer, requestPlayerStats as requestStatsPacket,
  sendAdminCommand as sendAdminPacket, type PlayerStats,
} from "../net/handlers";
import type { MsgPackValue } from "../net/msgpack";
import { ui } from "./elements";

export function isAlive(): boolean {
  return Boolean(state.me?.alive);
}

export function isConnected(): boolean {
  return connection.isReady();
}

export function mySid(): number | null {
  const sid = state.me?.sid ?? (state.myPlayerId != null ? Number(state.myPlayerId) : NaN);
  return Number.isFinite(sid) ? sid : null;
}

export function sendReport(sid: number, level?: 1 | 2): void {
  reportPlayer(sid, level ?? 0);
}

export function sendAdminCommand(command: string, ...args: MsgPackValue[]): void {
  sendAdminPacket(command, ...args);
}

export function requestPlayerStats(sid: number): void {
  requestStatsPacket(sid);
}

export function onPlayerStats(listener: (stats: PlayerStats) => void): void {
  onStatsPacket(listener);
}

export function leaveGame(): void {
  leaveSession();
}
