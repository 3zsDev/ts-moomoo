import { state } from "../../game/state";
import { socialEnabled } from "../../environment";
import { freshAccessToken, isVerified, onAuthChange } from "./auth";
import { apiGet, apiPost, ApiError, withTimeout } from "./http";

export type StaffRole = "admin" | "mod" | null;
export type ClanRole = "member" | "officer" | "owner";

export interface MyClan {
  name: string;
  role: ClanRole;
}

// What POST /account told us about the signed-in player
export const account = {
  // permanent name - really gay
  name: null as string | null,
  role: null as StaffRole,
  clan: null as MyClan | null,
  clanNotes: 0,
};

const ACCOUNT_REFRESH_INTERVAL = 120000;

const listeners: (() => void)[] = [];

export function onAccountChange(listener: () => void): void {
  listeners.push(listener);
}

function emitChange(): void {
  state.staff = isStaff();
  for (const listener of listeners) {
    try {
      listener();
    } catch (error) {
      console.error(error);
    }
  }
}

export function isStaff(): boolean {
  return account.role !== null;
}

export function isAdmin(): boolean {
  return account.role === "admin";
}

export function setMyClan(clan: MyClan | null): void {
  account.clan = clan;
}

interface AccountResponse {
  name?: string;
  role?: StaffRole;
  clan?: MyClan;
  clanNotes?: number;
}

export function refreshAccount(): Promise<void> {
  if (!isVerified()) {
    account.name = null;
    account.role = null;
    account.clan = null;
    account.clanNotes = 0;
    emitChange();
    return Promise.resolve();
  }

  return freshAccessToken()
    .then((auth) => (auth ? apiPost("/account", { auth }) : null))
    .then((response) => (response?.ok ? (response.json() as Promise<AccountResponse>) : null))
    .then((data) => {
      const social = socialEnabled();
      account.name = data?.name || null;
      account.role = data?.role || null;
      account.clan = (social && data?.clan) || null;
      account.clanNotes = (social && data?.clanNotes) || 0;
      emitChange();
    })
    .catch(() => emitChange());
}

export function initAccount(): void {
  onAuthChange(() => void refreshAccount());
  setInterval(() => {
    if (socialEnabled() && isVerified() && !document.hidden) void refreshAccount();
  }, ACCOUNT_REFRESH_INTERVAL);
}

export function isNameReserved(name: string): Promise<boolean> {
  return apiGet(`/name-check?name=${encodeURIComponent(name)}`, 4000)
    .then((response) => (response.ok ? response.json() : {}), () => ({}))
    .then((data: { reserved?: boolean }) => Boolean(data.reserved));
}

export function claimName(name: string): Promise<string | null> {
  return withTimeout(freshAccessToken(), 5000)
    .then((auth) => apiPost("/name", { auth, name }))
    .then(
      (response) => {
        if (response.status === 400) throw new ApiError("Pick a different name", 400);
        if (response.status === 409) throw new ApiError("That name is taken", 409);
        return response.ok ? (response.json() as Promise<{ name?: string }>) : null;
      },
      () => null,
    )
    .then((data) => {
      if (data?.name) {
        account.name = data.name;
        emitChange();
      }
      return account.name;
    });
}

const AUTHED_ERRORS: Record<string, string> = {
  taken: "That clan name is taken",
  invalid: "Pick a name of 3-4 letters and numbers",
  "in a clan": "Already in a clan",
  full: "That clan is full",
  "no player": "No player by that name",
  "no member": "No member by that name",
  "not found": "No clan by that name",
  rank: "Your rank can't do that",
  owner: "Hand the clan over to someone first",
  "no name": "Play once to pick your player name first",
  "slow down": "Too many requests - try again soon",
};

export function authedPost<T = Record<string, unknown>>(path: string, body: object = {}): Promise<T> {
  return freshAccessToken()
    .then((auth) => apiPost(path, { auth, ...body }))
    .then((response) =>
      response
        .json()
        .catch(() => ({}))
        .then((data: { error?: string }) => {
          if (!response.ok) {
            throw new ApiError(AUTHED_ERRORS[data.error ?? ""] ?? "Something went wrong", response.status);
          }
          return data as T;
        }),
    );
}

export function postWithAuth(path: string, body: object = {}): Promise<Response> {
  return freshAccessToken().then((auth) => apiPost(path, { ...body, auth }));
}
