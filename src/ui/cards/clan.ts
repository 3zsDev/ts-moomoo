import {
  account, auth, authedPost, fetchClan, refreshAccount, setMyClan,
  type Clan, type ClanRole, type MyClanResponse,
} from "../../net/api";
import { byId, createElement, removeAllChildren } from "../../utils/dom";
import { kFormat } from "../../utils/math";
import { openAccountCard } from "../account/accountCard";
import { confirmAction } from "./confirm";
import { openProfileFromClan } from "./profile";

const MAX_MEMBERS = 80;
const RANK: Record<ClanRole, number> = { member: 0, officer: 1, owner: 2 };

const card = {
  root: byId("clanCard"),
  name: byId("clanName"),
  body: byId("clanBody"),
  status: byId("clanStatus"),
  close: byId("clanClose"),
};

const count = (value: number | undefined) => kFormat(Math.round(value || 0)) || "0";

export function isClanCardOpen(): boolean {
  return card.root.style.display === "block";
}

export function closeClanCard(): void {
  card.root.style.display = "none";
}

function showLoading(name: string): void {
  card.name.textContent = name;
  removeAllChildren(card.body);
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

function section(title: string): void {
  createElement({ class: "profileSectionTitle", text: title, parent: card.body });
}

function statGrid(cells: [label: string, value: string][], columns?: number): void {
  const grid = createElement({ class: "profileGrid", parent: card.body });
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
  const row = createElement({ class: "clanInputRow", parent: card.body });
  const input = createElement({ tag: "input", class: "profileSocialInput", parent: row }) as HTMLInputElement;
  input.placeholder = placeholder;
  input.maxLength = maxLength;

  const submit = () => {
    if (input.value.trim()) onSubmit(input.value.trim());
  };
  input.addEventListener("keydown", (event) => {
    if ((event.which || event.keyCode) === 13) submit();
    event.stopPropagation();
  });
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

function renderClan(data: { clan: Clan; role?: ClanRole; requests?: string[] }): void {
  const clan = data.clan;
  const myRank = data.role ? RANK[data.role] : undefined;
  const periods = clan.stats.periods ?? {};

  card.name.textContent = clan.name;
  removeAllChildren(card.body);
  card.status.textContent = "";

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

  if (myRank === undefined && auth.isVerified() && !account.clan) {
    const row = createElement({ class: "clanInputRow", parent: card.body });
    button(row, "Ask to join", () => reportResult(authedPost("/clan/request", { clan: clan.name }), "Asked to join"), "go");
  }

  if (data.requests?.length) {
    section("Asking to join");
    for (const name of data.requests) {
      const row = createElement({ class: "friendRow", parent: card.body });
      createElement({ tag: "span", class: "friendName", text: name, parent: row, onclick: () => openProfileFromClan(name) });
      createElement({ tag: "span", class: "friendNote", parent: row });
      button(row, "Accept", () => act(authedPost("/clan/decide", { name, accept: true })), "go");
      button(row, "Reject", () => act(authedPost("/clan/decide", { name, accept: false })));
    }
  }

  section(myRank === undefined ? "Members" : "Members - kills added: week / month / all");
  const list = createElement({ class: "clanList", parent: card.body });
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

  if (myRank === undefined) return;

  if (clan.past?.length) {
    section("Past members - kills added");
    const past = createElement({ class: "clanList past", parent: card.body });
    for (const member of clan.past) {
      const row = createElement({ class: "friendRow", parent: past });
      createElement({
        tag: "span", class: "friendName", text: `${member.name}-${member.stint}`, parent: row,
        onclick: () => openProfileFromClan(member.name),
      });
      createElement({
        tag: "span", class: "friendNote", parent: row,
        text: `${member.kicked ? "kicked " : "left "}${new Date(member.left).toLocaleDateString()} - ${count(member.stats.kills)}`,
      });
    }
  }

  if (myRank >= 1) {
    section("Invite a player");
    inputRow("Player name", 15, "Invite", (name) => reportResult(authedPost("/clan/invite", { name }), `Invited ${name}`));
  }

  const row = createElement({ class: "clanInputRow", parent: card.body });
  const lastOne = clan.members.length === 1;
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
}

export function openClanByName(name: string): void {
  showLoading(name);
  const request: Promise<{ clan: Clan | null; role?: ClanRole; requests?: string[] }> =
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
      if (mine.clan) renderClan({ ...mine, clan: mine.clan });
      else renderNoClan(mine);
    })
    .catch((error: Error) => {
      card.status.textContent = error.message;
    });
}

export function bindClanCard(): void {
  card.close.onclick = closeClanCard;
}
