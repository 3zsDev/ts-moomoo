import { leaderboardsEnabled } from "../../environment";
import {
  clearTopCache, fetchTop, isStaff, postWithAuth,
  type TopBoard, type TopClan, type TopPlayer, type TopSpan,
} from "../../net/api";
import { byId, createElement, hookTouchEvents, removeAllChildren } from "../../utils/dom";
import { kFormat } from "../../utils/math";
import { confirmAction } from "../cards/confirm";
import { openClanByName } from "../cards/clan";
import { openProfile } from "../cards/profile";
import { ui } from "../elements";
import { onViewShown, showView } from "./views";

const SPANS: [TopSpan, string][] = [["week", "This week"], ["month", "This month"], ["all", "All time"]];
const ROWS = 10;

let span: TopSpan = "week";

function row(
  column: HTMLElement, rank: number, entry: TopPlayer | TopClan, onOpen: () => void,
  onShadow: ((shadow: boolean) => void) | null,
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

export function loadTopBoard(next: TopSpan): void {
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
  fetchTop(next)
    .then((board) => {
      if (span === next) render(board ?? { players: [], clans: [] });
    })
    .catch(() => {
      if (span === next) render({ players: [], clans: [] });
    });
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
