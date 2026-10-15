import { leaderboardsEnabled } from "../../environment";
import { serverBrowser } from "../../game/session";
import {
  apiGet, clearTopCache, fetchTop, isStaff, postWithAuth,
  type TopBoard, type TopClan, type TopPlayer, type TopSpan,
} from "../../net/api";
import { byId, createElement, hookTouchEvents, removeAllChildren } from "../../utils/dom";
import { kFormat } from "../../utils/math";
import { confirmAction } from "../cards/confirm";
import { openClanByName } from "../cards/clan";
import { openProfile } from "../cards/profile";
import { ui } from "../elements";
import { serverLabel } from "../friends/friendList";
import { onViewShown, showView } from "./views";

type BoardSpan = TopSpan | "now";

interface NowPlayer {
  name: string;
  score: number;
  server?: string;
}

const SPANS: [BoardSpan, string][] = [["week", "This week"], ["month", "This month"], ["all", "All time"], ["now", "Right now"]];
const ROWS = 10;

let span: BoardSpan = "week";

function row(
  column: HTMLElement, rank: number, entry: TopPlayer | TopClan, onOpen: () => void,
  onShadow: ((shadow: boolean) => void) | null, note = "",
): HTMLElement {
  const el = createElement({ class: "topPlayer" + (entry.shadowed ? " shadowed" : ""), parent: column, onclick: onOpen });
  const name = createElement({ tag: "span", class: "topName", text: `${rank}. `, parent: el });

  const clan = (entry as TopPlayer).clan;
  if (clan) {
    createElement({
      tag: "span", class: "topClan", text: `[${clan}] `, parent: name,
      onclick: (event: MouseEvent) => {
        event.stopPropagation();
        openClanByName(clan);
      },
    });
  }
  createElement({ tag: "span", class: "topPlayerName", text: entry.name, parent: name });
  if (note) createElement({ tag: "span", class: "topNote", text: note, parent: name });
  createElement({ tag: "span", class: "topKills", text: kFormat(entry.kills) || "0", parent: el });

  if (onShadow) {
    const toggle = createElement({
      class: "friendAction quiet",
      parent: el,
      onclick: (event: MouseEvent) => {
        event.stopPropagation();
        onShadow(!entry.shadowed);
      },
    });
    toggle.title = entry.shadowed ? "Clear the shadow" : "Shadow (leave off the boards)";
    createElement({ tag: "i", class: "material-icons", text: entry.shadowed ? "undo" : "gavel", parent: toggle });
  }
  return el;
}

function confirmShadow(path: string, body: object, clearing: boolean, message: string): void {
  const run = () => {
    postWithAuth(path, body)
      .catch(() => {})
      .then(() => {
        clearTopCache();
        loadTopBoard(span);
      });
  };
  confirmAction(message, clearing ? "Clear" : "Shadow", clearing ? run : () => {
    setTimeout(() => confirmAction(`Are you sure? ${message}`, "Yes, shadow", run), 0);
  });
}

function render(board: TopBoard | null): void {
  const holder = byId("topBoard");
  removeAllChildren(holder);
  const staff = isStaff();

  const column = <T extends TopPlayer | TopClan>(
    title: string, entries: T[] | undefined, fill: (column: HTMLElement, entry: T, index: number) => void,
  ) => {
    const el = createElement({ class: "topColumn", parent: holder });
    createElement({ class: "topTitle", text: title, parent: el });
    for (let i = 0; i < ROWS; i++) {
      if (entries?.[i]) {
        fill(el, entries[i], i);
        continue;
      }
      createElement({
        class: `topPlayer ${entries ? "blank" : "ghost"}`,
        parent: el,
        children: [createElement({ tag: "span", class: "topName", text: entries ? `${i + 1}.` : "" })],
      });
    }
  };

  column("Players - kills", board?.players, (el, player, index) => {
    row(el, index + 1, player, () => openProfile(player.name), staff
      ? (shadow) => confirmShadow(
          "/mod/verdict", { name: player.name, level: shadow ? "shadow" : "clear", reason: "leaderboard" }, !shadow,
          `${shadow ? "Shadow " : "Clear the shadow on "}${player.name}?`,
        )
      : null);
  });

  column("Clans - kills", board?.clans, (el, clan, index) => {
    const entry = row(el, index + 1, clan, () => openClanByName(clan.name), staff
      ? (shadow) => confirmShadow(
          "/mod/clan", { clan: clan.name, shadow }, !shadow,
          `${shadow ? "Shadow clan " : "Clear the shadow on clan "}${clan.name}? ${shadow ? "It is left off the leaderboards." : ""}`,
        )
      : null);
    entry.title = `${clan.members} ${clan.members === 1 ? "member" : "members"}`;
  });
}

function renderNow(players: NowPlayer[]): void {
  const holder = byId("topBoard");
  removeAllChildren(holder);
  const column = createElement({ class: "topColumn", parent: holder });
  createElement({ class: "topTitle", text: "In a game now - score", parent: column });
  for (let i = 0; i < ROWS; i++) {
    const player = Array.isArray(players) ? players[i] : undefined;
    if (!player) {
      createElement({
        class: "topPlayer blank",
        parent: column,
        children: [createElement({ tag: "span", class: "topName", text: `${i + 1}.` })],
      });
      continue;
    }
    const key = player.server ? serverBrowser.keyOf(player.server) : "";
    row(column, i + 1, { name: player.name, kills: player.score }, () => openProfile(player.name), null,
      key ? ` - ${serverLabel(key)}` : "");
  }
}

function fetchBoard(next: BoardSpan): void {
  if (next === "now") {
    apiGet("/top-now")
      .then((response) => (response.ok ? (response.json() as Promise<NowPlayer[]>) : []))
      .catch((): NowPlayer[] => [])
      .then((players) => {
        if (span === next) renderNow(players);
      });
    return;
  }

  fetchTop(next)
    .then((board) => {
      if (span === next) render(board ?? { players: [], clans: [] });
    })
    .catch(() => {
      if (span === next) render({ players: [], clans: [] });
    });
}

export function loadTopBoard(next: BoardSpan): void {
  span = next;
  const tabs = byId("topTabs");
  removeAllChildren(tabs);
  for (const [value, label] of SPANS) {
    createElement({
      tag: "a", class: value === next ? "active" : "", text: label, parent: tabs,
      onclick: () => loadTopBoard(value),
    });
  }

  render(null);
  fetchBoard(next);
}

// 1.9.3: the open board refreshes in place while it is on screen
export function refreshTopBoard(): void {
  const tabs = document.getElementById("topTabs");
  if (tabs?.offsetParent) fetchBoard(span);
}

export function bindTopBoard(): void {
  onViewShown((view) => {
    if (view === "top") loadTopBoard(span);
  });

  const link = ui.topLink;
  if (!link) return;
  if (!leaderboardsEnabled()) link.style.display = "none";
  link.onclick = () => showView("top");
  hookTouchEvents(link);
}
