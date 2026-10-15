import { createElement, removeAllChildren } from "../../utils/dom";
import { fetchProfile, staffPost, type KeptMessage, type ModRecord, type PublicProfile } from "../api";
import { isAdmin, page, type PlayerLookup, serverLabel, targetPlayer, timeAgo, timeLeft } from "../state";
import { armedButton, button, card, checkbox, empty, input, line, type Option, row, select, status, type Status, title } from "../ui";
import { refreshServers } from "./servers";

const REASONS = ["Cheating / hacks", "Botting / scripts", "Teaming / griefing", "Harassment / chat", "Offensive name", "Other"];
const DURATIONS: [string | number, string][] = [["", "Permanent"], [1, "1 day"], [3, "3 days"], [7, "7 days"], [30, "30 days"], [365, "1 year"]];
const ACCOUNT_ID = /^[udg]:/;

const form = { reason: REASONS[0], days: "" as string | number };

function who(lookup: PlayerLookup): { id: string } | { name: string } {
  return lookup.id ? { id: lookup.id } : { name: lookup.name ?? "" };
}

function fillRecord(info: HTMLElement, record: ModRecord): void {
  const reports = record.reports ?? {};
  line(info, "Reports", `${reports.session || 0} this session · ${reports.week || 0} this week · ${reports.lifetime || 0} total`);

  const flags = record.flags ?? { week: {}, lifetime: {} };
  const signals = Object.entries(flags.lifetime.signals ?? {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([name, count]) => `${name.replace(/_/g, " ")} ${count}`)
    .join(", ");
  line(info, "Flags", `${flags.week.total || 0} this week · ${flags.lifetime.total || 0} total${signals ? ` (${signals})` : ""}`);

  if (record.verdict) {
    const until = record.verdict.until ? ` (${timeLeft(record.verdict.until)} left)` : "";
    line(info, "Status", record.verdict.level + (record.verdict.reason ? `: ${record.verdict.reason}` : "") + until);
  } else {
    line(info, "Status", "clear");
  }
  if (record.session) {
    const server = record.session.server ? ` on ${serverLabel(record.session.server)}` : "";
    line(info, "Last played", timeAgo(record.session.at) + server);
    if (record.session.ip) line(info, "Last IP (hashed)", record.session.ip);
  }
  const recent = record.recent ?? [];
  if (recent.length) title(info, "Recent reports");
  for (const report of recent) {
    const guest = report.by.kind === "guest" ? " (guest)" : "";
    const reason = report.reason ? ` for ${report.reason}` : "";
    line(info, timeAgo(report.at), `by ${report.by.name || "unnamed"}${guest}${reason}`);
  }
}

function loadMessages(lookup: PlayerLookup, holder: HTMLElement): void {
  removeAllChildren(holder);
  empty(holder, "Loading messages...");
  staffPost<{ messages?: KeptMessage[] }>("/mod/messages", { from: lookup.id || lookup.name }).then(
    (data) => {
      removeAllChildren(holder);
      const messages = data.messages ?? [];
      if (!messages.length) empty(holder, "Nothing kept of what they have said");
      for (const message of messages) {
        const where = message.kind === "clan" ? `clan [${message.clan || ""}]`
          : message.kind === "whisper" ? `to ${message.to?.name || "?"}`
          : `in ${message.server ? serverLabel(message.server) : "game"}`;
        createElement({
          class: "staffLine said",
          parent: holder,
          children: [
            createElement({ tag: "label", text: `${timeAgo(message.at)} · ${where}${message.shadow ? " · shadowed" : ""}` }),
            createElement({ tag: "span", text: message.text }),
          ],
        });
      }
    },
    (error) => {
      removeAllChildren(holder);
      status(holder).fail(error);
    },
  );
}

function accountId(lookup: PlayerLookup, profile: PublicProfile | null): string | null {
  if (lookup.id?.startsWith("u:")) return lookup.id.slice(2);
  if (lookup.id && !ACCOUNT_ID.test(lookup.id)) return lookup.id;
  return profile?.id ?? null;
}

function onlineRow(parent: HTMLElement, id: string | null, profile: PublicProfile | null): void {
  if (!id && !profile?.online) return;
  const where = row(parent, "Online");
  const note = createElement({ tag: "span", class: "friendNote", text: profile?.online?.server ? serverLabel(profile.online.server) : "Looking...", parent: where });
  if (!id) return;
  refreshServers().then(() => {
    for (const server of page.servers) {
      const player = server.players.find((entry) => entry.account === id);
      if (!player) continue;
      note.textContent = `${serverLabel(server.key)} as ${player.name} (#${player.sid})`;
      button(where, "Admin", () => targetPlayer({ server: server.key, sid: player.sid, name: player.name }), "go");
      return;
    }
    note.textContent = "Not playing right now";
  }, () => {
    note.textContent = profile?.online?.server ? serverLabel(profile.online.server) : "Unknown";
  });
}

function actionsSection(parent: HTMLElement, lookup: PlayerLookup, profile: PublicProfile | null): void {
  const box = card(parent);
  title(box, "Actions");

  const reasonRow = row(box, "Reason");
  select(reasonRow, null, REASONS.map((reason): Option => [reason, reason]), (value) => {
    form.reason = value;
  }, form.reason);
  const details = input(reasonRow, "Details (optional)", "", "staffWide");
  details.maxLength = 60;

  const lengthRow = row(box, "Length");
  select(lengthRow, null, DURATIONS, (value) => {
    form.days = value;
  }, form.days);
  const withIp = checkbox(lengthRow, "Include their IP");

  const shown: Status = status(box);
  const reason = () => {
    const extra = details.value.trim();
    return form.reason === "Other" ? extra || "Other" : form.reason + (extra ? `: ${extra}` : "");
  };
  const run = (label: string, path: string, body: () => object) => () =>
    staffPost(path, { ...who(lookup), ...body() }).then(
      () => shown.ok(`${label}: done`),
      (error) => {
        shown.fail(error);
        throw error;
      },
    );
  const verdict = (level: string) => () => ({
    level, reason: reason(), ip: withIp.checked, days: form.days === "" ? undefined : Number(form.days),
  });
  const reload = () => lookUp(lookup);

  const buttons = createElement({ class: "staffButtons", parent: box });
  armedButton(buttons, "Kick", run("Kick", "/mod/kick", () => ({ reason: reason() })));
  armedButton(buttons, "Ban", run("Ban", "/mod/verdict", verdict("ban")), reload);
  armedButton(buttons, "Shadow", run("Shadow", "/mod/verdict", verdict("shadow")), reload);
  armedButton(buttons, "Clear", run("Clear", "/mod/verdict", verdict("clear")), reload);

  const name = profile?.name;
  if (isAdmin() && name) {
    if (profile.role === "mod") armedButton(buttons, "Remove mod", run("Remove mod", "/mod/role", () => ({ name, role: "none" })), reload);
    else if (!profile.role) armedButton(buttons, "Make mod", run("Make mod", "/mod/role", () => ({ name, role: "mod" })), reload);
  }

  const said = createElement({ class: "staffInfo staffSaid", parent: box });
  createElement({ class: "staffAction friendly", text: "Messages", parent: buttons, onclick: () => loadMessages(lookup, said) });
}

let results: HTMLElement | null = null;
let generation = 0;

function lookUp(lookup: PlayerLookup): void {
  page.lookup = lookup;
  const holder = results;
  if (!holder?.isConnected) return;
  const mine = ++generation;
  removeAllChildren(holder);
  const box = card(holder, lookup.name || lookup.id);
  const info = createElement({ class: "staffInfo", text: "Loading record...", parent: box });

  const named = lookup.name && !lookup.id?.startsWith("d:") ? fetchProfile(lookup.name) : Promise.resolve(null);
  Promise.all([staffPost<ModRecord>("/mod/player", who(lookup)), named]).then(
    ([record, profile]) => {
      if (mine !== generation) return;
      info.textContent = "";
      if (profile?.role) line(info, "Role", profile.role);
      if (profile?.clan?.name) line(info, "Clan", profile.clan.name);
      fillRecord(info, record);
      onlineRow(box, accountId(lookup, profile), profile);
      if (profile?.name) {
        const links = createElement({ class: "adminRow", parent: box });
        createElement({
          tag: "a", class: "staffLink", text: "Open profile", parent: links,
          href: `/?profile=${encodeURIComponent(profile.name)}`, target: "_blank", rel: "noopener",
        });
      }
      actionsSection(holder, lookup, profile);
    },
    (error) => {
      if (mine !== generation) return;
      removeAllChildren(info);
      status(info).fail(error);
    },
  );
}

export function renderPlayer(parent: HTMLElement): void {
  const box = card(parent, "Player");
  const search = row(box, "Look up");
  const field = input(search, "Name or id", page.lookup?.name || page.lookup?.id || "", "staffWide");
  const go = () => {
    const value = field.value.trim();
    if (value) lookUp(ACCOUNT_ID.test(value) ? { id: value } : { name: value });
  };
  field.onkeydown = (event) => {
    if (event.key === "Enter") go();
  };
  button(search, "Look up", go, "go");

  results = createElement({ class: "staffResults", parent });
  if (page.lookup) lookUp(page.lookup);
}
