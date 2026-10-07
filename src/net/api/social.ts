import { apiBase, restApiEnabled } from "../../environment";
import { frvrAuth } from "./auth";

const WATCH_INTERVAL = 5000;
const BACKGROUND_INTERVAL = 20000;
const OFFLINE_DEBOUNCE = 8000;
const DEFAULT_SOCIAL_URL = "https://crucible.frvr.com/v1/social";

interface LiveEvent<T> {
  data?: T;
}

interface PresenceUpdate {
  userId?: string;
  presence?: string;
  gameId?: string;
  metadata?: { server?: unknown };
}

interface FrvrLive {
  on(event: string, handler: (event: LiveEvent<any>) => void): void;
  connect(): void;
  updateStatus(status: Presence): void;
  getFriendsStatus?(): PresenceUpdate[];
  sendGameInvite(userId: string, lobbyId: string, extra: object): void;
}

interface FrvrSocial {
  live?: FrvrLive;
  gameId?: string;
  webClient?: { baseUrl?: string };
}

interface Presence {
  server: string;
  playing: boolean;
}

export interface FriendRequest {
  id: string;
  user: string;
}

export interface FriendsState {
  friends: string[];
  incoming: FriendRequest[];
  outgoing: FriendRequest[];
  names: Record<string, string | null>;
  online: Record<string, { server: string }>;
  loaded: boolean;
}

export interface FriendInvite {
  from: string;
  name: string;
  server: string;
}

export interface IncomingRequest {
  id: string;
  user: string;
  name: string;
}

export type PresenceKind = "online" | "offline" | "joined";

export interface PresenceNote {
  id: string;
  name: string;
  kind: PresenceKind;
  server: string;
}

export interface SocialHooks {
  onInvite?(invite: FriendInvite): void;
  onRequest?(request: IncomingRequest): void;
  onPresence?(note: PresenceNote): void;
}

export class SocialError extends Error {
  public constructor(message: string, public readonly status = 0) {
    super(message);
  }
}

function emptyState(): FriendsState {
  return { friends: [], incoming: [], outgoing: [], names: {}, online: {}, loaded: false };
}

let state = emptyState();
const listeners: ((state: FriendsState) => void)[] = [];
let hooks: SocialHooks = {};
let watchTimer: ReturnType<typeof setInterval> | null = null;
let liveHooked = false;
let presenceSettled = false;
let myPresence: Presence | null = null;
const offlineTimers: Record<string, ReturnType<typeof setTimeout>> = {};
const announcedRequests: Record<string, true> = {};

function social(): FrvrSocial | null {
  return (window as unknown as { FRVR?: { social?: FrvrSocial } }).FRVR?.social ?? null;
}

export function myId(): string | null {
  try {
    const auth = frvrAuth();
    return auth?.isLoggedIn() && auth.isVerified() ? auth.getFRVRID?.() ?? null : null;
  } catch {
    return null;
  }
}

function baseUrl(): string {
  return social()?.webClient?.baseUrl || DEFAULT_SOCIAL_URL;
}

function gameId(): string | null {
  return social()?.gameId ?? null;
}

function request<T>(method: string, path: string, body?: object): Promise<T | null> {
  const auth = frvrAuth();
  if (!auth?.authenticatedFetch || !myId()) return Promise.reject(new SocialError("signed out"));

  return auth
    .authenticatedFetch(baseUrl() + path, {
      method,
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    })
    .then((response) => {
      if (!response.ok) throw new SocialError(`social ${response.status}`, response.status);
      return response.status === 204 ? null : (response.json().catch(() => null) as Promise<T | null>);
    });
}

function emit(): void {
  for (const listener of listeners) {
    try {
      listener(state);
    } catch (error) {
      console.error(error);
    }
  }
}

function fetchNames(ids: string[]): Promise<void> {
  const missing = ids.filter((id) => !(id in state.names));
  if (!missing.length || !restApiEnabled()) return Promise.resolve();

  return fetch(`${apiBase()}/names-for`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ids: missing }),
  })
    .then((response) => (response.ok ? response.json() : { names: {} }))
    .then((data: { names?: Record<string, string> }) => {
      for (const id of missing) state.names[id] = data.names?.[id] ?? null;
    })
    .catch(() => {});
}

function applyPresence(update: PresenceUpdate | undefined): void {
  if (!update?.userId) return;
  const previous = state.online[update.userId];

  if (update.presence === "online" && (!gameId() || update.gameId === gameId())) {
    const server = update.metadata?.server;
    state.online[update.userId] = { server: typeof server === "string" ? server : "" };
  } else {
    delete state.online[update.userId];
  }

  if (state.loaded && presenceSettled) notePresence(update.userId, previous);
}

function announce(id: string, kind: PresenceKind): void {
  void fetchNames([id]).then(() => {
    const name = state.names[id];
    if (name) hooks.onPresence?.({ id, name, kind, server: state.online[id]?.server ?? "" });
  });
}

function notePresence(id: string, previous: { server: string } | undefined): void {
  if (!state.friends.includes(id)) return;
  const now = state.online[id];

  if (previous && !now) {
    offlineTimers[id] = setTimeout(() => {
      delete offlineTimers[id];
      announce(id, "offline");
    }, OFFLINE_DEBOUNCE);
  } else if (!previous && now) {
    if (offlineTimers[id]) {
      clearTimeout(offlineTimers[id]);
      delete offlineTimers[id];
    } else {
      announce(id, "online");
    }
  } else if (previous && now && now.server && now.server !== previous.server) {
    announce(id, "joined");
  }
}

function hookLive(): void {
  const live = social()?.live;
  if (liveHooked || !live) return;
  liveHooked = true;

  try {
    live.on("ON_CONNECT", (event: LiveEvent<{ friends?: PresenceUpdate[] }>) => {
      presenceSettled = false;
      (event.data?.friends ?? []).forEach(applyPresence);
      presenceSettled = true;
      emit();
      if (myPresence) live.updateStatus(myPresence);
    });
    live.on("FRIEND_STATUS_UPDATED", (event: LiveEvent<PresenceUpdate>) => {
      applyPresence(event.data);
      emit();
    });
    live.on("RECEIVE_GAME_INVITE", (event: LiveEvent<{ gameId?: string; senderId: string; lobbyId: string }>) => {
      const invite = event.data;
      if (!invite || (gameId() && invite.gameId && invite.gameId !== gameId())) return;
      void fetchNames([invite.senderId]).then(() => {
        hooks.onInvite?.({
          from: invite.senderId,
          name: state.names[invite.senderId] || "A friend",
          server: invite.lobbyId,
        });
      });
    });
  } catch {}
}

function connectLive(): void {
  const live = social()?.live;
  if (!live || !myId()) return;
  hookLive();
  try {
    live.connect();
  } catch {}
}

export function refreshFriends(): Promise<FriendsState> {
  const me = myId();
  if (!me) {
    const wasLoaded = state.loaded;
    state = emptyState();
    if (wasLoaded) emit();
    return Promise.resolve(state);
  }

  connectLive();
  return Promise.all([
    request<{ id: string }[]>("GET", `/friends/${me}`).catch(() => null),
    request<{ id: string; senderId: string }[]>("GET", `/friends/${me}/requests`).catch(() => null),
    request<{ id: string; recipientId: string }[]>("GET", `/friends/${me}/outgoing-requests`).catch(() => null),
  ])
    .then(([friends, incoming, outgoing]) => {
      if (friends) state.friends = friends.map((friend) => friend.id);
      if (incoming) state.incoming = incoming.map((entry) => ({ id: entry.id, user: entry.senderId }));
      if (outgoing) state.outgoing = outgoing.map((entry) => ({ id: entry.id, user: entry.recipientId }));

      try {
        social()?.live?.getFriendsStatus?.().forEach(applyPresence);
      } catch {}

      state.loaded = true;
      return fetchNames([
        ...state.friends,
        ...state.incoming.map((entry) => entry.user),
        ...state.outgoing.map((entry) => entry.user),
      ]);
    })
    .then(() => {
      emit();
      for (const entry of state.incoming) {
        if (announcedRequests[entry.id]) continue;
        announcedRequests[entry.id] = true;
        hooks.onRequest?.({ id: entry.id, user: entry.user, name: state.names[entry.user] || "Someone" });
      }
      return state;
    });
}

function allowRequest(): Promise<{ silent?: boolean }> {
  let auth: string | null = null;
  try {
    auth = frvrAuth()?.getAccessToken() ?? null;
  } catch {}

  return fetch(`${apiBase()}/friends/allow`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ auth }),
  }).then((response) => {
    if (response.ok) return response.json();
    throw new SocialError(`allow ${response.status}`, response.status);
  });
}

export const friends = {
  init(value: SocialHooks): void {
    hooks = value;
    setInterval(() => {
      if (myId() && !watchTimer) void refreshFriends();
    }, BACKGROUND_INTERVAL);
  },

  onChange(listener: (state: FriendsState) => void): void {
    listeners.push(listener);
  },

  available(): boolean {
    return Boolean(myId() && social());
  },

  state(): FriendsState {
    return state;
  },

  refresh: refreshFriends,

  watch(on: boolean): void {
    if (watchTimer) clearInterval(watchTimer);
    watchTimer = on ? setInterval(() => void refreshFriends(), WATCH_INTERVAL) : null;
    if (on) void refreshFriends();
  },

  request(userId: string): Promise<FriendsState> {
    const me = myId();
    if (!me || userId === me) return Promise.reject(new SocialError("self"));
    return allowRequest().then((result) => {
      if (result.silent) {
        state.outgoing.push({ id: `local-${userId}`, user: userId });
        emit();
        return state;
      }
      return request("POST", `/friends/${me}/requests`, { recipientId: userId }).then(refreshFriends);
    });
  },

  answer(requestId: string, accept: boolean): Promise<FriendsState> {
    return request("POST", `/friends/${myId()}/requests/${encodeURIComponent(requestId)}`, { accept }).then(
      refreshFriends,
    );
  },

  cancel(requestId: string): Promise<FriendsState> {
    if (requestId.startsWith("local-")) {
      state.outgoing = state.outgoing.filter((entry) => entry.id !== requestId);
      emit();
      return Promise.resolve(state);
    }
    return request("DELETE", `/friends/${myId()}/outgoing-requests/${encodeURIComponent(requestId)}`).then(
      refreshFriends,
    );
  },

  remove(friendId: string): Promise<FriendsState> {
    return request("DELETE", `/friends/${myId()}`, { friendId }).then(refreshFriends);
  },

  setPresence(server: string, playing: boolean): void {
    myPresence = { server: server || "", playing };
    const live = social()?.live;
    if (!live || !myId()) return;
    try {
      live.updateStatus(myPresence);
    } catch {}
  },

  invite(userId: string, server: string): boolean {
    const live = social()?.live;
    if (!live || !server) return false;
    try {
      live.sendGameInvite(userId, server, {});
      return true;
    } catch {
      return false;
    }
  },
};
