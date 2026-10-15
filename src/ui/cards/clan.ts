import { serverBrowser } from "../../game/session";
import {
  account, auth, authedPost, fetchClan, refreshAccount, setMyClan, socialPost,
  type Clan, type ClanRole, type MyClanResponse,
} from "../../net/api";
import { trusted } from "../../security/trusted";
import { byId, createElement, removeAllChildren } from "../../utils/dom";
import { kFormat } from "../../utils/math";
import { openAccountCard } from "../account/accountCard";
import { joinFriendServer, serverLabel } from "../friends/friendList";
import { connectedServerKey } from "../menu/playButtons";
import { isAlive } from "../netBridge";
import { createChatLog } from "../social/chatLog";
import { noteClanChange, sendMessage, setClanChatLog } from "../social/messages";
import { confirmAction } from "./confirm";
import { openProfileFromClan } from "./profile";
import { copyLinkButton } from "./shareLink";

const MAX_MEMBERS = 80;
const RANK: Record<ClanRole, number> = { member: 0, officer: 1, owner: 2 };

type ClanTab = "clan" | "members" | "manage";
const TABS: [tab: ClanTab, label: string][] = [["clan", "Clan"], ["members", "Members"], ["manage", "Manage"]];
let currentTab: ClanTab = "clan";

const card = {
  root: byId("clanCard"),
  name: byId("clanName"),
  body: byId("clanBody"),
  status: byId("clanStatus"),
  close: byId("clanClose"),
};

const count = (value: number | undefined) => kFormat(Math.round(value || 0)) || "0";

let pane: HTMLElement = card.body;

let onlineHolder: HTMLElement | null = null;
let onlineList: HTMLElement | null = null;
let onlineMembers: Record<string, string> = {};

function dropLiveParts(): void {
  setClanChatLog(null);
  onlineHolder = null;
  onlineList = null;
}

export function isClanCardOpen(): boolean {
  return card.root.style.display === "block";
}

export function closeClanCard(): void {
  card.root.style.display = "none";
  dropLiveParts();
  currentTab = "clan";
}

function showLoading(name: string): void {
  card.name.textContent = name;
  removeAllChildren(card.body);
  pane = card.body;
  dropLiveParts();
  card.status.textContent = "Loading...";
  card.root.style.display = "block";
}

function act(request: Promise<unknown>, done?: string): void {
  card.status.textContent = "";
  request
    .then(() => {
      void refreshAccount();
      openMyClan();
      if (done) setTimeout(() => (card.status.textContent = done), 600);
    })
    .catch((error: Error) => {
      card.status.textContent = error.message;
    });
}

function button(parent: HTMLElement, label: string, onclick: () => void, kind?: string): HTMLElement {
  return createElement({ class: "friendAction" + (kind ? ` ${kind}` : ""), text: label, parent, onclick });
}

function section(title: string, parent: HTMLElement = pane): HTMLElement {
  return createElement({ class: "profileSectionTitle", text: title, parent });
}

function statGrid(cells: [label: string, value: string][], columns?: number): void {
  const grid = createElement({ class: "profileGrid", parent: pane });
  if (columns) grid.style.gridTemplateColumns = `repeat(${columns}, 1fr)`;
  for (const [label, value] of cells) {
    createElement({
      class: "profileStat",
      parent: grid,
      children: [createElement({ tag: "span", text: value }), createElement({ tag: "label", text: label })],
    });
  }
}

function inputRow(placeholder: string, maxLength: number, label: string, onSubmit: (value: string) => void): void {
  const row = createElement({ class: "clanInputRow", parent: pane });
  const input = createElement({ tag: "input", class: "profileSocialInput", parent: row }) as HTMLInputElement;
  input.placeholder = placeholder;
  input.maxLength = maxLength;

  const submit = () => {
    if (input.value.trim()) onSubmit(input.value.trim());
  };
  input.addEventListener("keydown", trusted((event: KeyboardEvent) => {
    if ((event.which || event.keyCode) === 13) submit();
    event.stopPropagation();
  }));
  button(row, label, submit, "go");
}

function reportResult(request: Promise<unknown>, done: string): void {
  request
    .then(() => {
      card.status.textContent = done;
    })
    .catch((error: Error) => {
      card.status.textContent = error.message;
    });
}

function renderNoClan(mine: MyClanResponse): void {
  card.status.textContent = "";

  if (mine.invites.length) {
    section("Invitations");
    for (const invite of mine.invites) {
      const row = createElement({ class: "friendRow", parent: card.body });
      createElement({
        tag: "span", class: "friendName", text: invite.clan, parent: row,
        onclick: () => openClanByName(invite.clan),
      });
      createElement({ tag: "span", class: "friendNote", text: `from ${invite.by}`, parent: row });
      button(row, "Join", () => {
        act(authedPost("/clan/answer", { clan: invite.clan, accept: true }),
          "Joined - it shows in game from your next join");
      }, "go");
      button(row, "Decline", () => act(authedPost("/clan/answer", { clan: invite.clan, accept: false })));
    }
  }

  section("Start a clan");
  inputRow("3-4 letters (can't be changed)", 4, "Create", (name) => {
    act(authedPost("/clan/create", { name }), "Clan created");
  });

  section("Ask to join one");
  inputRow("Clan name", 4, "Ask", (clan) => reportResult(authedPost("/clan/request", { clan }), `Asked to join ${clan}`));
}

function setDot(el: HTMLElement, on: boolean): void {
  if (on) createElement({ tag: "span", class: "noteDot", parent: el });
}

function renderOnline(): void {
  if (!onlineList) return;
  removeAllChildren(onlineList);
  const names = Object.keys(onlineMembers).sort();
  if (onlineHolder) onlineHolder.style.display = names.length ? "" : "none";

  for (const name of names) {
    const key = serverBrowser.keyOf(onlineMembers[name]);
    const sameServer = Boolean(key) && key === connectedServerKey();
    const row = createElement({ class: "friendRow", parent: onlineList });
    createElement({ class: "friendDot online", parent: row });
    createElement({ tag: "span", class: "friendName", text: name, parent: row, onclick: () => openProfileFromClan(name) });
    createElement({ tag: "span", class: "friendNote", text: key ? serverLabel(key) : "in a game", parent: row });
    if (key && name !== account.name && !(isAlive() && sameServer)) {
      button(row, "Join", () => {
        closeClanCard();
        joinFriendServer(key);
      }, "go");
    }
    if (isAlive() && name !== account.name && !sameServer) {
      button(row, "Invite", () => {
        socialPost("/invite", { to: name })
          .then(() => {
            card.status.textContent = `Invited ${name} to your server`;
          })
          .catch((error: Error) => {
            card.status.textContent = error.message;
          });
      });
    }
  }
}

export function onClanOnlineEvent(event: { name?: string; server?: string } | null): void {
  if (!event?.name) return;
  if (event.server) onlineMembers[event.name] = event.server;
  else delete onlineMembers[event.name];
  renderOnline();
}

function renderLiveParts(): void {
  onlineHolder = createElement({ parent: pane });
  section("In a game now", onlineHolder);
  onlineList = createElement({ class: "clanList online", parent: onlineHolder });
  onlineMembers = {};
  renderOnline();
  socialPost<{ online?: { name: string; server: string }[] }>("/clan/online")
    .then((data) => {
      for (const entry of data.online ?? []) onlineMembers[entry.name] = entry.server;
      renderOnline();
    })
    .catch(() => {});

  section("Chat");
  if (!account.prefs.clanChat) {
    createElement({ class: "menuText", text: "Clan chat is off (Settings, Social).", parent: pane });
    return;
  }
  setClanChatLog(createChatLog(pane, {
    placeholder: "Say something to the clan",
    load: () => socialPost("/chat/history", { kind: "clan" }),
    send: (text) => sendMessage("clan", text),
  }));
}

function renderClan(data: { clan: Clan; role?: ClanRole; requests?: string[]; invited?: string[] }): void {
  const clan = data.clan;
  const myRank = data.role ? RANK[data.role] : undefined;
  const officer = myRank !== undefined && myRank >= 1;
  const periods = clan.stats.periods ?? {};

  card.name.textContent = clan.name;
  removeAllChildren(card.body);
  pane = card.body;
  card.status.textContent = "";

  const panes = {} as Record<ClanTab, HTMLElement>;
  if (officer) {
    const tabs = createElement({ class: "segTabs clanTabs", parent: card.body });
    const links = {} as Record<ClanTab, HTMLElement>;
    const show = (tab: ClanTab) => {
      currentTab = tab;
      for (const [id] of TABS) {
        links[id].className = id === tab ? "active" : "";
        panes[id].style.display = id === tab ? "block" : "none";
      }
    };
    for (const [id, label] of TABS) {
      links[id] = createElement({
        tag: "a", parent: tabs, onclick: () => show(id),
        text: id === "members" ? `${label} (${clan.members.length})` : label,
      });
      panes[id] = createElement({ class: "clanPane", parent: card.body });
    }
    setDot(links.manage, Boolean(data.requests?.length));
    show(currentTab);
  }
  const fill = (tab: ClanTab) => {
    pane = officer ? panes[tab] : card.body;
  };

  fill("clan");
  section("Clan");
  statGrid([
    ["Kills", count(clan.stats.kills)],
    ["Raid boss kills", count(clan.stats.raidKills)],
    ["Members", `${clan.members.length}/${MAX_MEMBERS}`],
  ]);
  section("Recent");
  statGrid([
    ["Kills this week", count(periods.week?.kills)],
    ["Kills this month", count(periods.month?.kills)],
  ], 2);

  dropLiveParts();
  if (myRank !== undefined) renderLiveParts();

  const shareLink = (parent: HTMLElement) => copyLinkButton(parent, `/clan/${encodeURIComponent(clan.name)}`, card.status);

  if (myRank === undefined && auth.isVerified() && !account.clan && clan.closed) {
    createElement({ class: "menuText", text: "Not taking requests to join.", parent: pane });
  } else if (myRank === undefined && auth.isVerified() && !account.clan) {
    const row = createElement({ class: "clanInputRow", parent: pane });
    button(row, "Ask to join", () => reportResult(authedPost("/clan/request", { clan: clan.name }), "Asked to join"), "go");
  }

  fill("members");
  section(
    myRank === undefined ? "Members"
    : officer ? "Kills added: week / month / all"
    : "Members - kills added: week / month / all",
  );
  const list = createElement({ class: "clanList" + (officer ? " all" : ""), parent: pane });
  for (const member of clan.members) {
    const row = createElement({ class: "friendRow", parent: list });
    createElement({
      tag: "span", class: "friendName", parent: row,
      text: member.name + (member.stint > 1 ? `-${member.stint}` : ""),
      onclick: () => openProfileFromClan(member.name),
    });

    const stats = member.stats
      ? ` - ${count(member.stats.periods.week?.kills)} / ${count(member.stats.periods.month?.kills)} / ${count(member.stats.kills)}`
      : "";
    const title = member.role === "member" ? "" : member.role === "owner" ? "Owner" : "Officer";
    createElement({ tag: "span", class: "friendNote", parent: row, text: title + stats });

    const isMe = member.name === account.name;
    if (myRank === 2 && !isMe) {
      const promote = member.role !== "officer";
      button(row, promote ? "Promote" : "Demote", () => {
        act(authedPost("/clan/role", { name: member.name, role: promote ? "officer" : "member" }));
      });
      button(row, "Owner", () => {
        confirmAction(`Hand ${clan.name} over to ${member.name}? You become an officer.`, "Hand over", () => {
          act(authedPost("/clan/role", { name: member.name, role: "owner" }));
        });
      });
    }
    if (myRank !== undefined && !isMe && myRank > RANK[member.role] && myRank >= 1) {
      const kick = button(row, "Kick", () => {
        confirmAction(`Kick ${member.name} from ${clan.name}?`, "Kick", () => {
          act(authedPost("/clan/kick", { name: member.name }));
        });
      }, "quiet");
      kick.title = "Kick from the clan";
    }
  }

  if (myRank === undefined) {
    shareLink(createElement({ class: "clanInputRow", parent: pane }));
    pane = card.body;
    return;
  }

  if (officer) {
    fill("manage");
    section("Asking to join");
    if (data.requests?.length) {
      for (const name of data.requests) {
        const row = createElement({ class: "friendRow", parent: pane });
        createElement({ tag: "span", class: "friendName", text: name, parent: row, onclick: () => openProfileFromClan(name) });
        createElement({ tag: "span", class: "friendNote", parent: row });
        button(row, "Accept", () => act(authedPost("/clan/decide", { name, accept: true })), "go");
        button(row, "Reject", () => act(authedPost("/clan/decide", { name, accept: false })));
      }
    } else {
      createElement({
        class: "friendEmpty", parent: pane,
        text: clan.closed ? "Nobody - requests to join are stopped" : "Nobody just now",
      });
    }

    section("Invite a player");
    inputRow("Player name", 15, "Invite", (name) => act(authedPost("/clan/invite", { name }), `Invited ${name}`));

    if (data.invited?.length) {
      section("Invited");
      for (const name of data.invited) {
        const row = createElement({ class: "friendRow", parent: pane });
        createElement({ tag: "span", class: "friendName", text: name, parent: row, onclick: () => openProfileFromClan(name) });
        createElement({ tag: "span", class: "friendNote", text: "hasn't answered", parent: row });
        button(row, "Cancel", () => act(authedPost("/clan/uninvite", { name }), "Invitation cancelled"), "quiet");
      }
    }
    section("More");
  } else {
    fill("clan");
  }

  const row = createElement({ class: "clanInputRow clanActions", parent: pane });
  const lastOne = clan.members.length === 1;
  if (myRank === 2) {
    button(row, clan.closed ? "Allow requests to join" : "Stop requests to join", () => {
      act(authedPost("/clan/requests", { open: Boolean(clan.closed) }), clan.closed ? "Open to requests" : "Closed to requests");
    });
  }
  if (myRank < 2 || lastOne) {
    button(row, "Leave clan", () => {
      const message = lastOne
        ? `Leave ${clan.name}? You're the last member, so the clan will be gone.`
        : `Leave ${clan.name}?`;
      confirmAction(message, "Leave", () => act(authedPost("/clan/leave"), "You left the clan"));
    });
  } else {
    button(row, "Disband clan", () => {
      confirmAction(`Disband ${clan.name}? Every member is removed and its stats are gone.`, "Disband", () => {
        act(authedPost("/clan/disband"), "Clan disbanded");
      });
    }, "quiet");
  }
  shareLink(row);
  pane = card.body;
}

export function openClanByName(name: string): void {
  showLoading(name);
  const request: Promise<{ clan: Clan | null; role?: ClanRole; requests?: string[]; invited?: string[] }> =
    account.clan?.name === name
      ? authedPost<MyClanResponse>("/clan/mine").then((mine) => ({ ...mine, clan: mine.clan ?? null }))
      : fetchClan(name).then((clan) => ({ clan }));

  request
    .then((data) => {
      if (data.clan) renderClan({ ...data, clan: data.clan });
      else card.status.textContent = "No clan by that name";
    })
    .catch((error: Error) => {
      card.status.textContent = error.message || "Couldn't load this clan";
    });
}

export function openMyClan(): void {
  if (!auth.isVerified()) {
    openAccountCard("Sign in or sign up to join a clan.", openMyClan);
    return;
  }

  showLoading("Clan");
  authedPost<MyClanResponse>("/clan/mine")
    .then((mine) => {
      setMyClan(mine.clan && mine.role ? { name: mine.clan.name, role: mine.role } : null);
      noteClanChange();
      if (mine.clan) renderClan({ ...mine, clan: mine.clan });
      else renderNoClan(mine);
    })
    .catch((error: Error) => {
      card.status.textContent = error.message;
    });
}

export function bindClanCard(): void {
  card.close.onclick = trusted(closeClanCard);
}
