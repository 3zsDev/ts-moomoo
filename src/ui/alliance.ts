import { state, type JoinRequest } from "../game/state";
import { clearHeldKeys } from "../input";
import { isClanNameReserved } from "../net/api";
import { connection } from "../net/Connection";
import { ClientPacket } from "../net/protocol";
import { createElement, removeAllChildren } from "../utils/dom";
import { ui } from "./elements";
import { closeGameMenu } from "./gameMenu";
import { closeChat } from "./hud/chat";
import { SOLO_TRIBE } from "./hud/leaderboard";
import { refreshNoteDots } from "./noteDots";
import { closeStore } from "./store";

const CLAN_COLOR = "#ffd34d";
let createError = "";

function clanOf(entry: unknown): string | undefined {
  return (entry as { clan?: string } | null)?.clan || undefined;
}

export function isAllianceOpen(): boolean {
  return ui.allianceMenu.style.display === "block";
}

export function toggleAlliance(): void {
  clearHeldKeys();
  if (isAllianceOpen()) closeAlliance();
  else refreshAlliance();
}

export function closeAlliance(): void {
  ui.allianceMenu.style.display = "none";
}

export function refreshAlliance(): void {
  if (!isAllianceOpen()) createError = "";
  const me = state.me;
  if (!me?.alive) return;

  closeChat();
  closeStore();
  closeGameMenu();
  ui.allianceMenu.style.display = "block";

  removeAllChildren(ui.allianceHolder);
  if (me.team) renderOwnTribe();
  else renderTribeList();

  if (createError && !me.team) {
    createElement({ class: "allianceItem allianceError", text: createError, parent: ui.allianceHolder });
  }

  removeAllChildren(ui.allianceManager);
  if (me.team) renderLeaveControls();
  else renderCreateControls();
}

function renderOwnTribe(): void {
  const me = state.me!;
  const members = state.allianceMembers;

  const count = members.length / 2;
  createElement({
    class: "allianceItem allianceTitle",
    text: `[${me.team}] � ${count} member${count === 1 ? "" : "s"}`,
    parent: ui.allianceHolder,
  });

  for (let i = 0; i < members.length; i += 2) {
    const sid = members[i] as number;
    const isMe = sid === me.sid;

    const row = createElement({
      class: "allianceItem",
      style: `color:${isMe ? "#fff" : "rgba(255,255,255,0.6)"}`,
      text: String(members[i + 1]),
      parent: ui.allianceHolder,
    });

    if (me.isOwner && !isMe) {
      createElement({
        class: "joinAlBtn",
        text: "Kick",
        onclick: () => kickMember(sid),
        hookTouch: true,
        parent: row,
      });
    }
  }
}

function renderTribeList(): void {
  if (state.alliances.length === 0) {
    createElement({ class: "allianceItem", text: "No Tribes Yet", parent: ui.allianceHolder });
    return;
  }

  const myClan = clanOf(state.me);
  for (const alliance of state.alliances) {
    const clan = clanOf(alliance);
    const row = createElement({
      class: "allianceItem",
      style: `color:${clan ? CLAN_COLOR : "rgba(255,255,255,0.6)"}`,
      text: alliance.sid + (clan ? " � clan" : ""),
      parent: ui.allianceHolder,
    });

    if (clan && alliance.sid !== myClan) continue;
    createElement({
      class: "joinAlBtn",
      text: "Join",
      onclick: () => requestJoin(alliance.sid),
      hookTouch: true,
      parent: row,
    });
  }
}

function renderLeaveControls(): void {
  createElement({
    class: "allianceButtonM",
    style: "width: 360px",
    text: state.me!.isOwner ? "Delete Tribe" : "Leave Tribe",
    onclick: leaveAlliance,
    hookTouch: true,
    parent: ui.allianceManager,
  });
}

function renderCreateControls(): void {
  createElement({
    tag: "input",
    type: "text",
    id: "allianceInput",
    maxLength: 7,
    placeholder: "unique name",
    onchange: (event: Event) => {
      const input = event.target as HTMLInputElement;
      input.value = (input.value || "").slice(0, 7);
    },
    onkeypress: (event: KeyboardEvent) => {
      if (event.key !== "Enter") return;
      event.preventDefault();
      createAlliance();
    },
    parent: ui.allianceManager,
  });

  createElement({
    class: "allianceButtonM",
    style: "width: 140px;",
    text: "Create",
    onclick: createAlliance,
    hookTouch: true,
    parent: ui.allianceManager,
  });
}

export function createAlliance(): void {
  const input = document.getElementById("allianceInput") as HTMLInputElement | null;
  const name = input?.value ?? "";
  if (!name.trim()) return;
  createError = "";

  void isClanNameReserved(name).then((reserved) => {
    if (!reserved) {
      connection.send(ClientPacket.CreateClan, name);
      return;
    }
    const solo = name.trim().toLowerCase() === SOLO_TRIBE;
    createError = `"${name}" is reserved${solo ? "" : ": it is a clan's name"}`;
    if (isAllianceOpen()) refreshAlliance();
  });
}

export function leaveAlliance(): void {
  state.joinRequests = [];
  refreshNotifications();
  connection.send(ClientPacket.LeaveClan);
}

export function kickMember(sid: number): void {
  connection.send(ClientPacket.KickFromClan, sid);
}

export function requestJoin(tribeSid: string): void {
  connection.send(ClientPacket.JoinClan, tribeSid);
}

export function addJoinRequest(request: JoinRequest): void {
  state.joinRequests.push(request);
  refreshNotifications();
}

export function answerJoinRequest(accepted: boolean): void {
  const request = state.joinRequests[0];
  if (!request) return;

  connection.send(ClientPacket.JoinRequest, request.sid, accepted ? 1 : 0);
  state.joinRequests.shift();
  refreshNotifications();
}

export function refreshNotifications(): void {
  refreshNoteDots();
  const request = state.joinRequests[0];
  if (!request) {
    ui.notificationDisplay.style.display = "none";
    return;
  }

  removeAllChildren(ui.notificationDisplay);
  ui.notificationDisplay.style.display = "block";

  createElement({ class: "notificationText", text: request.name, parent: ui.notificationDisplay });
  createElement({
    class: "notifButton",
    html: "<i class='material-icons' style='font-size:28px;color:#cc5151;'>&#xE14C;</i>",
    onclick: () => answerJoinRequest(false),
    hookTouch: true,
    parent: ui.notificationDisplay,
  });
  createElement({
    class: "notifButton",
    html: "<i class='material-icons' style='font-size:28px;color:#8ecc51;'>&#xE876;</i>",
    onclick: () => answerJoinRequest(true),
    hookTouch: true,
    parent: ui.notificationDisplay,
  });
}
