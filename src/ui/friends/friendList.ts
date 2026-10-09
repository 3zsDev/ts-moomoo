import { SITE_ENV_NAMES, siteEnv, siteEnvUrl, type SiteEnv } from "../../environment";
import { serverBrowser } from "../../game/session";
import { account, fetchProfile, friends, type FriendsState } from "../../net/api";
import { myId as myFriendId } from "../../net/api/social";
import type { ServerEntry } from "../../net/ServerBrowser";
import { byId, createElement, removeAllChildren } from "../../utils/dom";
import { confirmAction } from "../cards/confirm";
import { openProfile } from "../cards/profile";
import { appendPlayerCount } from "../menu/serverPicker";
import { isAlive, isConnected, leaveGame } from "../netBridge";
import { connectedServerKey, startPlay } from "../menu/playButtons";

const status = byId("friendStatus");
const requestsHolder = byId("friendRequests");
const listHolder = byId("friendList");

type FriendAction = [label: string, run: () => void, kind?: string, icon?: string];

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
    const online = (state.online[a] ? 0 : 1) - (state.online[b] ? 0 : 1);
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
    const presence = state.online[id];
    const note = presence ? (presence.server ? serverLabel(presence.server, presence.env) : "on the menu") : "";
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
      actions.push(["Invite", () => {
        status.textContent = friends.invite(id, serverBrowser.key()) ? "Invite sent" : "Couldn't send the invite";
      }]);
    }
    actions.push(["Remove friend", () => {
      confirmAction(`Remove ${state.names[id]} from your friends?`, "Remove", () => track(friends.remove(id), "Removed"));
    }, "quiet", "&#xE872;"]);

    friendRow(listHolder, state.names[id], note, actions, Boolean(presence), server);
  }
}

function renderOnlineCount(state: FriendsState): void {
  const online = state.friends.filter((id) => state.online[id] && state.names[id]).length;
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

  byId("friendAddButton").onclick = addFriend;
  byId<HTMLInputElement>("friendName", "input").addEventListener("keydown", (event) => {
    if ((event.which || event.keyCode) === 13) addFriend();
    event.stopPropagation();
  });
  byId("myProfileLink").onclick = () => {
    if (account.name) openProfile(account.name);
  };
}
