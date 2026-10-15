import { SITE_ENV_NAMES, serverListUrl, siteEnv, siteEnvUrl, type SiteEnv } from "../../environment";
import { serverBrowser } from "../../game/session";
import { account, fetchProfile, friends, socialPost, TOO_FAST, type FriendsState } from "../../net/api";
import { myId as myFriendId, type FriendPresence } from "../../net/api/social";
import type { ServerEntry } from "../../net/ServerBrowser";
import { byId, createElement, removeAllChildren } from "../../utils/dom";
import { confirmAction } from "../cards/confirm";
import { openProfile } from "../cards/profile";
import { appendPlayerCount } from "../menu/serverPicker";
import { isAlive, isConnected, leaveGame } from "../netBridge";
import { connectedServerKey, startPlay } from "../menu/playButtons";
import { refreshNoteDots } from "../noteDots";
import { openWhisper, unreadWhispers } from "../social/messages";
import { showGameInvite } from "./notices";

const status = byId("friendStatus");
const requestsHolder = byId("friendRequests");
const listHolder = byId("friendList");

type FriendAction = [label: string, run: () => void, kind?: string, icon?: string];

const PRESENCE_RECHECK = 60000;
const PRESENCE_MIN_GAP = 5000;
const PRESENCE_BACKOFF = 115000;
const INVITE_COOLDOWN = 30000;

interface ServerPresence {
  name: string;
  server: string;
}

let serverPresence: Record<string, ServerPresence> = {};
let polledFriends: string | null = null;
let polledAt = 0;

export function pollFriendPresence(state: FriendsState, force = false): void {
  if (!state.loaded || !account.name || !friends.available()) return;
  const list = state.friends.slice().sort().join(",");
  if (list === polledFriends && (!force || Date.now() - polledAt < PRESENCE_RECHECK)) return;
  if (list !== polledFriends && Date.now() - polledAt < PRESENCE_MIN_GAP) return;

  polledFriends = list;
  polledAt = Date.now();
  socialPost<{ online?: { id: string; name: string; server: string }[] }>("/page/friends", { friends: state.friends })
    .then((data) => {
      serverPresence = {};
      for (const entry of data.online ?? []) serverPresence[entry.id] = { name: entry.name, server: entry.server };
      refreshFriendsView();
    })
    .catch(() => {
      polledFriends = null;
      polledAt = Date.now() + PRESENCE_BACKOFF;
    });
}

export function onFriendEvent(event: { id?: string; name?: string; server?: string } | null): void {
  if (!event?.id) return;
  if (event.server) serverPresence[event.id] = { name: event.name ?? "", server: event.server };
  else delete serverPresence[event.id];
  refreshFriendsView();
}

export function presenceOf(state: FriendsState, id: string): FriendPresence | undefined {
  const known = serverPresence[id];
  if (known) {
    const key = serverBrowser.keyOf(known.server);
    if (key || !state.online[id]) return { server: key, env: siteEnv(), playing: true };
  }
  return state.online[id];
}

export function refreshFriendsView(): void {
  const state = friends.state();
  renderFriends(state);
  renderOnlineCount(state);
  refreshNoteDots();
}

const lastInvite: Record<string, number> = {};

function inviteFriend(id: string, name: string | null | undefined): void {
  const viaFrvr = () => {
    if (Date.now() - (lastInvite[id] || 0) < INVITE_COOLDOWN) {
      status.textContent = TOO_FAST;
      return;
    }
    lastInvite[id] = Date.now();
    status.textContent = friends.invite(id, serverBrowser.key()) ? "Invite sent" : "Couldn't send the invite";
  };
  if (!name || !isAlive()) {
    viaFrvr();
    return;
  }

  socialPost("/invite", { to: name })
    .then(() => {
      lastInvite[id] = Date.now();
      status.textContent = "Invite sent";
    })
    .catch((error: Error) => {
      if (error.message === TOO_FAST) status.textContent = error.message;
      else viaFrvr();
    });
}

export function onInviteEvent(event: { from?: { name: string }; server?: string; as?: string } | null): void {
  if (!event?.from || !event.server) return;
  const from = event.from;
  const server = event.server;
  const show = () => {
    const key = serverBrowser.keyOf(server);
    if (key) showGameInvite({ from: "", name: from.name, server: key, env: siteEnv(), as: event.as });
    return Boolean(key);
  };
  if (!show()) void serverBrowser.load(serverListUrl()).then(show, () => {});
}

function regionLabel(key: string): string {
  const [region, name] = String(key || "").split(":");
  if (!region) return "";
  return serverBrowser.regionName(region) + (name ? ` ${name}` : "");
}

export function friendElsewhere(key: string, env: string): boolean {
  return otherEnv(key, env) !== null;
}

function otherEnv(key: string, env: string): string | null {
  if (env) return env !== siteEnv() ? env : null;
  const [region, name] = String(key || "").split(":");
  const here = serverBrowser.serversIn(region).some((entry) => entry.name == name);
  return region && serverBrowser.regions().length && !here ? "other" : null;
}

export function serverLabel(key: string, env = ""): string {
  const other = otherEnv(key, env);
  return other ? SITE_ENV_NAMES[other as SiteEnv] || "another server" : regionLabel(key);
}

export function canJoinFriend(key: string, env = ""): boolean {
  const other = otherEnv(key, env);
  return Boolean(key) && (!other || Boolean(siteEnvUrl(other)));
}

export function joinFriend(key: string, env = ""): void {
  const other = otherEnv(key, env);
  if (!other) {
    joinFriendServer(key);
    return;
  }
  const url = siteEnvUrl(other);
  if (url) window.open(`${url}/#${key}`, "_blank");
}

export function joinFriendServer(key: string, confirmed = false): void {
  const [region, name] = String(key || "").split(":");
  if (!region) return;
  const alive = isAlive();

  if (alive && !confirmed) {
    confirmAction(`Leave this game to join ${regionLabel(key)}?`, "Leave", () => joinFriendServer(key, true));
    return;
  }

  if (alive) leaveGame();
  serverBrowser.choose(region, name);
  if (alive) {
    startPlay();
    return;
  }
  status.textContent = `Selected ${regionLabel(key)}: press play to join`;
}

function track(request: Promise<unknown>, done?: string): void {
  request
    .then(() => {
      status.textContent = done || "";
    })
    .catch((error: { status?: number }) => {
      status.textContent =
        error?.status === 409 ? "Already sent"
        : error?.status === 403 ? "That player isn't taking friend requests"
        : "Something went wrong";
    });
}

function friendRow(
  parent: HTMLElement, name: string | null | undefined, note: string, actions: FriendAction[],
  online: boolean, server?: ServerEntry,
): void {
  if (!name) return;
  const row = createElement({ class: "friendRow", parent });
  createElement({ class: "friendDot" + (online ? " online" : ""), parent: row });
  const who = createElement({ class: "friendWho", parent: row });
  createElement({ tag: "span", class: "friendName", text: name, parent: who, onclick: () => openProfile(name) });
  if (note) createElement({ tag: "span", class: "friendNote", text: note, parent: who });
  if (server) appendPlayerCount(row, server, true);

  for (const [label, run, kind, icon] of actions) {
    const el = createElement({
      class: "friendAction" + (kind ? ` ${kind}` : ""),
      text: icon ? "" : label,
      parent: row,
      onclick: run,
    });
    if (icon) {
      el.title = label;
      createElement({ tag: "i", class: "material-icons", html: icon, parent: el });
    }
  }
}

export function renderFriends(state: FriendsState): void {
  removeAllChildren(requestsHolder);
  removeAllChildren(listHolder);

  for (const request of state.incoming) {
    friendRow(requestsHolder, state.names[request.user], "wants to be friends", [
      ["Accept", () => track(friends.answer(request.id, true), "Friend added"), "go"],
      ["Decline", () => track(friends.answer(request.id, false))],
    ], false);
  }
  for (const request of state.outgoing) {
    friendRow(requestsHolder, state.names[request.user], "pending", [
      ["Cancel", () => track(friends.cancel(request.id))],
    ], false);
  }

  const sorted = state.friends.slice().sort((a, b) => {
    const online = (presenceOf(state, a) ? 0 : 1) - (presenceOf(state, b) ? 0 : 1);
    return online || String(state.names[a] || "").localeCompare(String(state.names[b] || ""));
  });

  if (!sorted.length && !state.incoming.length && !state.outgoing.length) {
    createElement({
      class: "friendEmpty",
      text: state.loaded ? "No friends yet: add someone by their player name." : "Loading...",
      parent: listHolder,
    });
  }

  for (const id of sorted) {
    const presence = presenceOf(state, id);
    const note = presence
      ? presence.server ? serverLabel(presence.server, presence.env) : presence.playing ? "in a game" : "on the menu"
      : "";
    const [region, name] = String(presence?.server || "").split(":");
    const elsewhere = presence ? otherEnv(presence.server, presence.env) : null;
    const server = presence && !elsewhere ? serverBrowser.serversIn(region).find((entry) => entry.name == name) : undefined;

    const actions: FriendAction[] = [];
    if (
      presence && canJoinFriend(presence.server, presence.env) &&
      !(isAlive() && presence.server === connectedServerKey() && !elsewhere)
    ) {
      actions.push(["Join", () => joinFriend(presence.server, presence.env), "go"]);
    }
    if (presence && isConnected() && serverBrowser.key()) {
      actions.push(["Invite", () => inviteFriend(id, state.names[id])]);
    }
    const friendName = state.names[id];
    if (friendName && account.name) {
      actions.push(["Message", () => openWhisper(friendName), unreadWhispers[friendName] ? "go" : "quiet", "chat"]);
    }
    actions.push(["Remove friend", () => {
      confirmAction(`Remove ${state.names[id]} from your friends?`, "Remove", () => track(friends.remove(id), "Removed"));
    }, "quiet", "&#xE872;"]);

    friendRow(listHolder, state.names[id], note, actions, Boolean(presence), server);
  }
}

function renderOnlineCount(state: FriendsState): void {
  const online = state.friends.filter((id) => presenceOf(state, id) && state.names[id]).length;
  for (const badge of document.querySelectorAll<HTMLElement>(".friendsOnline")) {
    if (badge.lastChild) badge.lastChild.textContent = String(online);
    badge.style.display = online ? "" : "none";
  }
}

function addFriend(): void {
  const input = byId<HTMLInputElement>("friendName", "input");
  const name = input.value.trim();
  if (!name) return;
  status.textContent = "";

  fetchProfile(name)
    .then((profile) => {
      if (!profile?.id) {
        status.textContent = `No player called ${name}`;
        return;
      }
      if (profile.id === myFriendId()) {
        status.textContent = "That's you";
        return;
      }
      input.value = "";
      track(friends.request(profile.id), `Request sent to ${profile.name}`);
    })
    .catch(() => {
      status.textContent = "Something went wrong";
    });
}

export function bindFriendList(): void {
  friends.onChange(renderFriends);
  friends.onChange(renderOnlineCount);
  friends.onChange((state) => pollFriendPresence(state));

  byId("friendAddButton").onclick = addFriend;
  byId<HTMLInputElement>("friendName", "input").addEventListener("keydown", (event) => {
    if ((event.which || event.keyCode) === 13) addFriend();
    event.stopPropagation();
  });
  byId("myProfileLink").onclick = () => {
    if (account.name) openProfile(account.name);
  };
}
