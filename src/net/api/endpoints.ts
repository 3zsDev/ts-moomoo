import { isStaff, postWithAuth, type ClanRole, type StaffRole } from "./account";
import { apiGet, apiGetJson } from "./http";

export interface PeriodStats {
  kills?: number;
  bestScore?: number;
}

export interface Profile {
  id?: string;
  name: string;
  role?: StaffRole | string;
  clan?: { name: string } | null;
  guest?: boolean;
  kills?: number;
  deaths?: number;
  damage?: number;
  healing?: number;
  wood?: number;
  food?: number;
  stone?: number;
  gold?: number;
  animalKills?: Record<string, number>;
  animalDamage?: number;
  bestScore?: number;
  maxKills?: number;
  lives?: number;
  playtime?: number;
  periods?: { day?: PeriodStats; week?: PeriodStats; month?: PeriodStats };
  socials?: Socials;
}

export interface Socials {
  youtube?: string;
  twitch?: string;
  tiktok?: string;
  x?: string;
  discord?: string;
}

export interface ClanMember {
  name: string;
  role: ClanRole;
  stint: number;
  stats?: { kills?: number; periods: { week?: PeriodStats; month?: PeriodStats } };
}

export interface PastClanMember {
  name: string;
  stint: number;
  kicked?: boolean;
  left: number;
  stats: { kills?: number };
}

export interface Clan {
  name: string;
  stats: { kills?: number; raidKills?: number; periods?: { week?: PeriodStats; month?: PeriodStats } };
  members: ClanMember[];
  past?: PastClanMember[];
}

export interface MyClanResponse {
  clan?: Clan;
  role?: ClanRole;
  invites: { clan: string; by: string }[];
  requests?: string[];
}

export interface TopPlayer {
  name: string;
  clan?: string;
  kills: number;
  shadowed?: boolean;
}

export interface TopClan {
  name: string;
  kills: number;
  members: number;
  shadowed?: boolean;
}

export interface TopBoard {
  players: TopPlayer[];
  clans: TopClan[];
}

export type TopSpan = "week" | "month" | "all";

export function fetchProfile(name: string): Promise<Profile | null> {
  return apiGet(`/profile?name=${encodeURIComponent(name)}`).then((response) =>
    response.ok ? (response.json() as Promise<Profile>) : null,
  );
}

export function fetchClan(name: string): Promise<Clan | null> {
  return apiGetJson<Clan>(`/clan?name=${encodeURIComponent(name)}`);
}

export function isClanNameReserved(name: string): Promise<boolean> {
  return apiGet(`/clan-check?name=${encodeURIComponent(name)}`, 4000)
    .then((response) => (response.ok ? response.json() : {}), () => ({}))
    .then((data: { reserved?: boolean }) => Boolean(data.reserved));
}

const TOP_CACHE_TIME = 60000;
const topCache: Record<string, { at: number; board: Promise<TopBoard | null> }> = {};

export function fetchTop(span: TopSpan): Promise<TopBoard | null> {
  const key = span + (isStaff() ? ":staff" : "");
  const cached = topCache[key];
  if (cached && Date.now() - cached.at < TOP_CACHE_TIME) return cached.board;

  const board = (isStaff() ? postWithAuth("/top", { span }) : apiGet(`/top?span=${span}`)).then((response) =>
    response.ok ? (response.json() as Promise<TopBoard>) : null,
  );

  topCache[key] = { at: Date.now(), board };
  board.then(
    (value) => {
      if (!value) delete topCache[key];
    },
    () => delete topCache[key],
  );
  return board;
}

export function clearTopCache(): void {
  for (const key of Object.keys(topCache)) delete topCache[key];
}
