import { createElement, removeAllChildren } from "../../utils/dom";
import type { FeedEntry } from "../api";
import { lookUpPlayer, page, serverLabel, timeAgo } from "../state";
import { button, card, empty } from "../ui";

const FEED_MAX = 100;
const feed: FeedEntry[] = [];
let holder: HTMLElement | null = null;
let connected = false;
let unseen = 0;
let onUnseen: (count: number) => void = () => {};

export function onUnseenChange(listener: (count: number) => void): void {
  onUnseen = listener;
}

export function setFeedConnected(on: boolean): void {
  connected = on;
  if (page.tab === "live") fillFeed();
}

export function addFeedEntry(entry: FeedEntry): void {
  feed.unshift(entry);
  feed.length = Math.min(feed.length, FEED_MAX);
  if (page.tab === "live") fillFeed();
  else onUnseen(++unseen);
}

function describe(entry: FeedEntry): string {
  if (entry.kind === "report") {
    return `Reported by ${entry.by?.name || "unnamed"}${entry.reason ? ` for ${entry.reason}` : ""}` +
      (entry.reporters && entry.reporters > 1 ? ` (${entry.reporters} reporters)` : "");
  }
  const counts = Object.entries(entry.counts ?? {}).map(([signal, count]) => `${signal.replace(/_/g, " ")} ${count}`);
  return `Flagged: ${counts.join(", ")}`;
}

function fillFeed(): void {
  if (!holder?.isConnected) return;
  removeAllChildren(holder);
  if (!feed.length) empty(holder, connected ? "Nothing since this page opened" : "Connecting to the live feed...");

  for (const entry of feed) {
    const guest = String(entry.target.id).startsWith("d:");
    const who = entry.target.name || (guest ? "a guest" : "unnamed");
    const row = createElement({ class: "adminFeedRow" + (entry.kind === "report" ? " report" : ""), parent: holder });
    const text = createElement({ class: "adminFeedText", parent: row });
    createElement({ tag: "span", class: "adminFeedWho", text: who, parent: text });
    createElement({ tag: "span", text: ` ${describe(entry)}`, parent: text });
    const where = serverLabel(entry.server);
    createElement({
      class: "adminFeedNote",
      text: `${where ? `${where} · ` : ""}${timeAgo(entry.at || Date.now())}`,
      parent: text,
    });
    button(row, "View", () => lookUpPlayer({ id: entry.target.id, name: entry.target.name }));
  }
}

setInterval(() => {
  if (page.tab === "live") fillFeed();
}, 30000);

export function renderLive(parent: HTMLElement): void {
  unseen = 0;
  onUnseen(0);
  const box = card(parent, "Live");
  createElement({ class: "menuText", text: "Reports and cheat flags as they come in, newest first.", parent: box });
  holder = createElement({ class: "adminFeed staffFeed", parent: box });
  fillFeed();
}
