import { createElement, removeAllChildren } from "../../utils/dom";
import { staffPost, type ServerPlayer, type StaffServer } from "../api";
import { isAdmin, lookUpPlayer, page, serverLabel, targetPlayer, timeLeft } from "../state";
import { armedButton, button, card, empty, select, status, type Status } from "../ui";

const REFRESH_EVERY = 4000;
const RESTART_DELAYS: [number, string][] = [[10, "10 seconds"], [30, "30 seconds"], [60, "1 minute"], [120, "2 minutes"], [300, "5 minutes"]];

let restartDelay = 60;
let listHolder: HTMLElement | null = null;
let listStatus: Status | null = null;
let loading: Promise<StaffServer[]> | null = null;

export function refreshServers(): Promise<StaffServer[]> {
  loading ??= staffPost<{ servers?: StaffServer[] }>("/mod/servers")
    .then((data) => {
      page.servers = (data.servers ?? []).map((server) => ({
        ...server,
        players: [...(server.players ?? [])].sort((a, b) => (b.score || 0) - (a.score || 0)),
      }));
      page.serversAt = Date.now();
      return page.servers;
    })
    .finally(() => {
      loading = null;
    });
  return loading;
}

export function playerTags(player: ServerPlayer): string {
  const tags = [`${(player.score || 0).toLocaleString()} gold`];
  if (!player.account) tags.push("guest");
  if (player.anon) tags.push("anonymous");
  if (player.shadow) tags.push("shadowed");
  return tags.join(" · ");
}

function playerRow(parent: HTMLElement, server: StaffServer, player: ServerPlayer): void {
  const target = () => targetPlayer({ server: server.key, sid: player.sid, name: player.name });
  const row = createElement({ class: "friendRow staffPlayer", parent });
  createElement({ tag: "span", class: "friendName", text: player.name || "unknown", parent: row, onclick: target });
  createElement({ tag: "span", class: "friendNote", text: `#${player.sid} · ${playerTags(player)}`, parent: row });
  if (player.account) button(row, "Record", () => lookUpPlayer({ id: `u:${player.account}`, name: player.name }));
  button(row, "Admin", target, "go");
}

function restart(server: StaffServer, seconds: number, done: string): () => Promise<unknown> {
  return () =>
    staffPost("/mod/restart", { server: server.key, seconds }).then(
      () => listStatus?.ok(done),
      (error) => listStatus?.fail(error),
    );
}


function restartRow(parent: HTMLElement, server: StaffServer): void {
  const holder = createElement({ class: "adminRow", parent });
  const label = serverLabel(server.key) || server.key;
  const refresh = () => void refreshServers().then(fillServers, () => {});
  if (server.restartAt && server.restartAt > Date.now()) {
    createElement({ tag: "span", class: "adminLabel", text: "Restarting", parent: holder });
    armedButton(holder, "Stop now", restart(server, 0, `${label} is stopping now`), refresh);
    return;
  }
  createElement({ tag: "span", class: "adminLabel", text: "Restart in", parent: holder });
  select(holder, null, RESTART_DELAYS, (value) => {
    restartDelay = Number(value);
  }, restartDelay);
  armedButton(holder, "Restart", () => restart(server, restartDelay, `${label} restarts in ${restartDelay}s`)(), refresh);
}

function serverBlock(parent: HTMLElement, server: StaffServer): void {
  const block = createElement({ class: "staffServer", parent });
  const head = createElement({ class: "staffServerHead", parent: block });
  createElement({ tag: "span", class: "staffServerName", text: serverLabel(server.key) || server.key, parent: head });
  const notes = [`${server.playerCount} playing`];
  if (server.sandbox) notes.push("sandbox");
  if (server.restartAt && server.restartAt > Date.now()) notes.push(`restarting in ${timeLeft(server.restartAt)}`);
  createElement({ tag: "span", class: "friendNote", text: notes.join(" · "), parent: head });

  if (isAdmin()) restartRow(block, server);

  if (!server.players.length) empty(block, "Nobody playing");
  for (const player of server.players) playerRow(block, server, player);
}

function fillServers(): void {
  const holder = listHolder;
  if (!holder?.isConnected) return;
  removeAllChildren(holder);
  if (!page.servers.length) empty(holder, page.serversAt ? "No servers are reporting in" : "Loading servers...");
  for (const server of page.servers) serverBlock(holder, server);
}

function poll(): void {
  if (page.tab !== "servers" || document.hidden) return;
  refreshServers().then(
    () => {
      if (listStatus?.el.classList.contains("error")) listStatus.clear();
      const busy = listHolder?.querySelector(".armed") || listHolder?.contains(document.activeElement);
      if (!busy) fillServers();
    },
    (error) => listStatus?.fail(error),
  );
}

setInterval(poll, REFRESH_EVERY);

export function renderServers(parent: HTMLElement): void {
  const box = card(parent, "Servers");
  createElement({ class: "menuText", text: "Pick a player to open them in the Admin tab.", parent: box });
  listStatus = status(box);
  listHolder = createElement({ class: "staffServers", parent: box });
  fillServers();
  poll();
}
