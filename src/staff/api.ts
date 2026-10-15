import { restApiEnabled } from "../environment";
import { freshAccessToken } from "../net/api/auth";
import { apiGetJson, apiPost } from "../net/api/http";

export type StaffRole = "admin" | "mod";

const POST_TIMEOUT = 8000;

const ERRORS: Record<string, string> = {
  auth: "Sign in again",
  rank: "Your rank can't do that",
  "not found": "Not found (or no longer playing)",
  invalid: "That isn't a valid request",
  offline: "That server isn't answering",
  unavailable: "That server isn't answering",
  "slow down": "Too many requests - try again soon",
};

export class StaffError extends Error {
  public constructor(message: string, public readonly status = 0) {
    super(message);
  }
}

export async function staffPost<T = Record<string, unknown>>(path: string, body: object = {}): Promise<T> {
  if (!restApiEnabled()) throw new StaffError("Accounts are unavailable here", 503);
  const auth = await freshAccessToken();
  if (!auth) throw new StaffError(ERRORS.auth, 401);

  let response: Response;
  try {
    response = await apiPost(path, { ...body, auth }, POST_TIMEOUT);
  } catch {
    throw new StaffError("Couldn't reach the API", 0);
  }

  const data = (await response.json().catch(() => ({}))) as { error?: string };
  if (!response.ok) {
    const error = data.error ?? "";
    throw new StaffError(ERRORS[error] ?? (error || `Failed (${response.status})`), response.status);
  }
  return data as T;
}

export function errorText(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong";
}

export interface AccountReply {
  name?: string;
  role?: StaffRole | null;
}

export interface ServerPlayer {
  sid: number;
  name: string;
  account: string | null;
  score: number;
  anon: boolean;
  shadow: boolean;
}

export interface StaffServer {
  key: string;
  region: string;
  name: string;
  sandbox: boolean;
  playerCount: number;
  restartAt?: number;
  players: ServerPlayer[];
}

export interface PowerState {
  god: boolean;
  aura: boolean;
  boss: boolean;
  invisible: boolean;
  noclip: boolean;
  disguised: boolean;
  morph: number;
  dive: number;
  size: number;
  power: number;
  speed: number;
  health: number;
}

export interface WorldInfo {
  tribes: string[];
  mobs: { type: number; name: string }[];
  animalKinds: { id: number; name: string; src?: string }[];
}

export interface ModRecord {
  reports?: { session?: number; week?: number; lifetime?: number };
  flags?: { week: { total?: number }; lifetime: { total?: number; signals?: Record<string, number> } };
  verdict?: { level: string; reason?: string; until?: number };
  session?: { at: number; server?: string; ip?: string };
  recent?: { by: { name?: string; kind?: string }; at: number; reason?: string }[];
}

export interface KeptMessage {
  kind: "clan" | "whisper" | "game";
  text: string;
  at: number;
  clan?: string;
  to?: { name?: string };
  server?: string;
  shadow?: boolean;
}

export interface PublicProfile {
  id?: string;
  name?: string;
  role?: string;
  clan?: { name: string } | null;
  online?: { server?: string };
}

export interface FeedEntry {
  kind: "report" | "flags" | string;
  target: { id: string; name?: string };
  by?: { name?: string };
  reason?: string;
  reporters?: number;
  counts?: Record<string, number>;
  server?: string;
  at?: number;
}

export function fetchProfile(name: string): Promise<PublicProfile | null> {
  return apiGetJson<PublicProfile>(`/profile?name=${encodeURIComponent(name)}`, 5000);
}
