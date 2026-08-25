import { state, type JoinRequest } from "../game/state";
import { connection } from "../net/Connection";
import { ClientPacket } from "../net/protocol";
import { createElement, removeAllChildren } from "../utils/dom";
import { ui } from "./elements";
import { closeStore } from "./store";

export function isAllianceOpen(): boolean {
  return ui.allianceMenu.style.display === "block";
}

export function toggleAlliance(): void {
  if (isAllianceOpen()) closeAlliance();
  else refreshAlliance();
}

export function closeAlliance(): void {
  ui.allianceMenu.style.display = "none";
}

export function refreshAlliance(): void {
  const me = state.me;
  if (!me?.alive) return;

  closeStore();
  ui.allianceMenu.style.display = "block";

  removeAllChildren(ui.allianceHolder);
  if (me.team) renderOwnTribe();
  else renderTribeList();

  removeAllChildren(ui.allianceManager);
  if (me.team) renderLeaveControls();
  else renderCreateControls();
}

function renderOwnTribe(): void {
  const me = state.me!;
  const members = state.allianceMembers;

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

  for (const alliance of state.alliances) {
    const row = createElement({
      class: "allianceItem",
      style: "color:rgba(255,255,255,0.6)",
      text: alliance.sid,
      parent: ui.allianceHolder,
    });
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
  if (input) connection.send(ClientPacket.CreateClan, input.value);
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
