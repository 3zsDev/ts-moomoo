import { serverConfig } from "../config";

export type StaffRole = "admin" | "mod" | null;

export interface Account {
  id: string;
  name: string | null;
  role: StaffRole;
  clan: string | null;
}

export interface Session {
  account: Account | null;
  did: string | null;
  shadow: boolean;
}

export type Admission = { ok: true; session: Session } | { ok: false; reason: string };

export interface LifeReport {
  account: string;
  died: boolean;
  kills: number;
  score: number;
  damage: number;
  healing: number;
  wood: number;
  food: number;
  stone: number;
  gold: number;
  animalDamage: number;
  animalKills: Record<string, number>;
  playtime: number;
  owned: { hats: number[]; accs: number[]; weapons: Record<number, number> };
  look: { hat: number; acc: number; weapon: number; variant: number; color: number };
}

export interface ReportTarget {
  account: string | null;
  did: string | null;
  name: string;
}

export const serverKey = `${serverConfig.region}:${serverConfig.name}`;

const GUEST: Session = { account: null, did: null, shadow: false };

export function internalHeaders(): Record<string, string> {
  return serverConfig.internalKey
    ? { "Content-Type": "application/json", "x-internal-key": serverConfig.internalKey }
    : { "Content-Type": "application/json" };
}

async function call<T>(method: "GET" | "POST", route: string, body?: unknown): Promise<T | null> {
  if (!serverConfig.apiEnabled) return null;
  try {
    const response = await fetch(`${serverConfig.apiUrl}${route}`, {
      method,
      headers: internalHeaders(),
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(4000),
    });
    return response.ok ? ((await response.json()) as T) : null;
  } catch {
    return null;
  }
}

export async function admit(token: string | null, ip: string): Promise<Admission> {
  if (serverConfig.requireTicket && !token) return { ok: false, reason: "Invalid Connection" };
  if (!serverConfig.apiEnabled) return { ok: true, session: { ...GUEST } };

  const result = await call<{ ok: boolean; reason?: string; did?: string; shadow?: boolean; account?: Account | null }>(
    "POST", "/internal/ticket", { token, ip, server: serverKey },
  );

  if (!result) {
    return serverConfig.requireTicket ? { ok: false, reason: "Invalid Connection" } : { ok: true, session: { ...GUEST } };
  }
  if (!result.ok) {
    return { ok: false, reason: result.reason === "banned" ? "You are banned" : "Invalid Connection" };
  }
  return {
    ok: true,
    session: { account: result.account ?? null, did: result.did ?? null, shadow: Boolean(result.shadow) },
  };
}

export function reportLife(life: LifeReport): void {
  void call("POST", "/internal/stats", life);
}

export async function reportPlayer(
  reporter: ReportTarget, target: ReportTarget, action: number, reason = 0,
): Promise<"ban" | "shadow" | null> {
  const result = await call<{ verdict?: "ban" | "shadow" }>(
    "POST", "/internal/report", { reporter, target, action, reason: reason || undefined, server: serverKey },
  );
  return result?.verdict ?? null;
}

export function reportChat(line: ReportTarget & { text: string; shadow?: boolean }): void {
  void call("POST", "/internal/chat", {
    server: serverKey, account: line.account, did: line.did, name: line.name, text: line.text, shadow: Boolean(line.shadow),
  });
}

export type GameEvent = { kind: "boss"; by: string } | { kind: "clan_top"; clan: string };

export function reportEvent(event: GameEvent): void {
  void call("POST", "/internal/event", { ...event, server: serverKey });
}

export function reportFlags(target: ReportTarget, counts: Record<string, number>): void {
  void call("POST", "/internal/flags", { target, counts, server: serverKey });
}

export async function fetchProfile(name: string): Promise<Record<string, unknown> | null> {
  return call("GET", `/profile?name=${encodeURIComponent(name)}`);
}

export async function fetchReserved(): Promise<{ names: string[]; clans: string[] } | null> {
  return call("GET", "/internal/reserved");
}
