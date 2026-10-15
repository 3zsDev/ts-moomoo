import { regionInfo } from "../net/ServerBrowser";
import type { PowerState, StaffRole, StaffServer } from "./api";

export type TabName = "live" | "servers" | "admin" | "player" | "notices";

export interface AdminTarget {
  server: string;
  sid: number;
  name: string;
}

export interface PlayerLookup {
  id?: string;
  name?: string;
}

export const page = {
  tab: "live" as TabName,
  name: "",
  role: null as StaffRole | null,
  servers: [] as StaffServer[],
  serversAt: 0,
  target: null as AdminTarget | null,
  powers: null as PowerState | null,
  lookup: null as PlayerLookup | null,
};

export function isAdmin(): boolean {
  return page.role === "admin";
}

let tabOpener: (tab: TabName) => void = () => {};

export function setTabOpener(opener: (tab: TabName) => void): void {
  tabOpener = opener;
}

export function openTab(tab: TabName): void {
  tabOpener(tab);
}

export function targetPlayer(target: AdminTarget): void {
  if (page.target?.server !== target.server || page.target.sid !== target.sid) page.powers = null;
  page.target = target;
  openTab("admin");
}

export function lookUpPlayer(lookup: PlayerLookup): void {
  page.lookup = lookup;
  openTab("player");
}

export function findServer(key: string): StaffServer | undefined {
  return page.servers.find((server) => server.key === key);
}

export function serverLabel(key: string | undefined): string {
  if (!key) return "";
  const [region, name] = key.split(":");
  const known = page.servers.find((server) => server.key === key || key.startsWith(`${server.region}:${server.name}:`));
  const regionName = regionInfo[known?.region ?? region]?.name ?? known?.region ?? region;
  return `${regionName} ${known?.name ?? name ?? ""}`.trim();
}

export function timeAgo(at: number): string {
  const minutes = Math.max(0, Math.round((Date.now() - at) / 60000));
  if (minutes < 60) return `${minutes}m ago`;
  if (minutes < 1440) return `${Math.round(minutes / 60)}h ago`;
  return `${Math.round(minutes / 1440)}d ago`;
}

export function timeLeft(until: number): string {
  const seconds = Math.max(0, Math.round((until - Date.now()) / 1000));
  if (seconds < 120) return `${seconds}s`;
  if (seconds < 7200) return `${Math.round(seconds / 60)}m`;
  if (seconds < 172800) return `${Math.round(seconds / 3600)}h`;
  return `${Math.round(seconds / 86400)}d`;
}
