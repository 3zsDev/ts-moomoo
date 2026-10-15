import { world } from "../../config/world";
import { itemData } from "../../data/items";
import { weaponVariants } from "../../data/weaponVariants";
import { createElement, removeAllChildren } from "../../utils/dom";
import { StaffError, staffPost, type PowerState, type WorldInfo } from "../api";
import { findServer, isAdmin, lookUpPlayer, page, serverLabel, targetPlayer } from "../state";
import { armedButton, button, card, empty, input, type Option, row, select, status, type Status, title } from "../ui";
import { playerTags, refreshServers } from "./servers";

type Toggle = "god" | "aura" | "boss" | "invisible" | "noclip" | "disguise";
type Multiplier = "size" | "power" | "speed" | "health";
type Arg = string | number;

const TOGGLES: [string, Toggle][] = [
  ["God", "god"], ["Aura", "aura"], ["Boss", "boss"], ["Invisible", "invisible"], ["No collision", "noclip"], ["Disguise", "disguise"],
];
const MOD_TOGGLES = new Set<Toggle>(["noclip"]);
const MULTIPLIERS: [string, Multiplier, number[]][] = [
  ["Size", "size", [1, 1.5, 2, 3]],
  ["Damage", "power", [1, 2, 5, 10, 20, 50, 100]],
  ["Speed", "speed", [1, 1.5, 2, 5, 10, 20]],
  ["Health", "health", [1, 2, 5, 10, 20]],
];
const SPAWNS: [number, string][] = [
  [0, "Cow"], [1, "Pig"], [12, "Sheep"], [2, "Bull"], [3, "Bully"], [4, "Wolf"], [5, "Quack"],
  [6, "Moostafa"], [7, "Treasure"], [8, "Moofie"], [9, "Boar"], [10, "Yeti"],
];
const BOSSES: [number, string][] = [[8, "MOOFIE"], [6, "MOOSTAFA"], [11, "Crab King"], [7, "Treasure"], [10, "Yeti"]];
const SPAWN_COUNTS: [number, string][] = [[1, "1"], [2, "2"], [5, "5"], [10, "10"], [20, "20"]];
const DIVE_STATES: [number, string][] = [[0, "Surface"], [1, "Diving"], [2, "Under"], [3, "Surfacing"]];
const VARIANT_NAMES = ["Normal", "Gold", "Diamond", "Ruby", "Emerald"];
const RESOURCES = ["Wood", "Food", "Stone", "Gold"];
const AMOUNTS: [number, string][] = [[100, "100"], [1000, "1,000"], [10000, "10,000"], [100000, "100,000"], [1000000, "1,000,000"]];

const half = world.mapScale / 2;
const PLACES: [string, number, number][] = [["The Falls", -900, half - 440], ["Centre", half, half - 600], ["Snow", half, 1200]];

const panel = { spawn: 0, spawnCount: 1, pick: "w0", tier: 0, amount: 1000, dive: 0, diveMs: "1650" };

let targetStatus: Status | null = null;
let powersStatus: Status | null = null;
let powersHolder: HTMLElement | null = null;
let worldFor: { server: string; info: WorldInfo | null } | null = null;
let rendered: HTMLElement | null = null;

function rerender(): void {
  if (rendered?.isConnected && page.tab === "admin") renderAdmin(rendered);
}

function send(shown: Status | null, args: Arg[], done = `${args[0]}: done`): Promise<void> {
  const target = page.target;
  if (!target) return Promise.resolve();
  shown?.busy();
  return staffPost<{ ok?: boolean; state?: PowerState }>("/mod/admin", { server: target.server, sid: target.sid, args })
    .then((data) => {
      if (data.state && page.target === target) {
        page.powers = data.state;
        fillPowers();
      }
      shown?.ok(done);
    })
    .catch((error) => {
      const gone = error instanceof StaffError && error.status === 404;
      shown?.fail(gone ? new Error(`${target.name || "That player"} isn't alive any more`) : error);
    });
}

let powersAskedFor: object | null = null;
function loadPowers(): void {
  if (page.powers || !page.target || page.target.sid < 0 || powersAskedFor === page.target) return;
  powersAskedFor = page.target;
  void send(powersStatus, ["state"], "");
}

function loadWorld(server: string): void {
  if (worldFor?.server === server) return;
  worldFor = { server, info: null };
  staffPost<WorldInfo>("/mod/world", { server }).then(
    (info) => {
      if (worldFor?.server !== server) return;
      worldFor.info = info;
      rerender();
    },
    (error) => targetStatus?.fail(error),
  );
}

function refreshWorld(): void {
  const server = worldFor?.server;
  worldFor = null;
  if (server) loadWorld(server);
}

function targetSection(parent: HTMLElement): void {
  const box = card(parent, "Target");
  const target = page.target;
  const server = target ? findServer(target.server) : undefined;
  const player = server?.players.find((entry) => entry.sid === target?.sid);

  const where = row(box, "Server");
  select(where, page.servers.length ? null : "No servers", page.servers.map((entry): Option => [entry.key, serverLabel(entry.key) || entry.key]), (key) => {
    const next = findServer(key)?.players[0];
    page.target = next ? { server: key, sid: next.sid, name: next.name } : { server: key, sid: -1, name: "" };
    page.powers = null;
    rerender();
  }, target?.server);

  const who = row(box, "Player");
  const players = server?.players ?? [];
  select(who, players.length ? null : "Nobody playing", players.map((entry): Option => [entry.sid, `${entry.name || "unknown"} (#${entry.sid})`]), (sid) => {
    const picked = players.find((entry) => entry.sid === Number(sid));
    if (picked && target) targetPlayer({ server: target.server, sid: picked.sid, name: picked.name });
  }, target?.sid);

  if (target && player) {
    createElement({ class: "staffInfo", text: playerTags(player), parent: box });
    if (player.account) {
      const actions = createElement({ class: "adminRow", parent: box });
      button(actions, "Record", () => lookUpPlayer({ id: `u:${player.account}`, name: player.name }));
    }
  } else if (target && target.sid >= 0) {
    createElement({ class: "staffInfo", text: `${target.name || `#${target.sid}`} isn't on that server any more`, parent: box });
  }
  targetStatus = status(box);
}

function fillPowers(): void {
  const holder = powersHolder;
  if (!holder?.isConnected) return;
  removeAllChildren(holder);
  const admin = isAdmin();
  const powers = page.powers;

  const toggles = row(holder, "Toggle");
  for (const [label, key] of TOGGLES) {
    if (!admin && !MOD_TOGGLES.has(key)) continue;
    const on = Boolean(powers && (key === "disguise" ? powers.disguised : powers[key]));
    button(toggles, label, () => void send(powersStatus, [key, on ? 0 : 1], `${label} ${on ? "off" : "on"}`), on ? "on" : "");
  }
  if (!powers) createElement({ class: "staffInfo", text: "Checking their powers...", parent: holder });
  if (!admin) return;

  const kinds = worldFor?.info?.animalKinds ?? [];
  const morph = row(holder, "Morph");
  select(morph, null, [[-1, "Off"], ...kinds.map((kind): Option => [kind.id, kind.name])], (value) => {
    void send(powersStatus, ["morph", Number(value)], Number(value) < 0 ? "Morph off" : "Morphed");
  }, powers?.morph ?? -1);

  const dive = row(holder, "Dive");
  select(dive, null, DIVE_STATES, (value) => {
    panel.dive = Number(value);
  }, powers?.dive ?? panel.dive);
  const ms = input(dive, "ms", panel.diveMs);
  ms.inputMode = "numeric";
  ms.oninput = () => {
    panel.diveMs = ms.value;
  };
  button(dive, "Dive", () => void send(powersStatus, ["dive", panel.dive, Math.max(0, Number(panel.diveMs) || 0)]), "go");

  const multiply = row(holder, "Multiply");
  for (const [label, key, values] of MULTIPLIERS) {
    const cell = createElement({ class: "adminCell", parent: multiply });
    createElement({ tag: "span", text: label, parent: cell });
    select(cell, null, values.map((value): Option => [value, `${value}x`]), (value) => {
      void send(powersStatus, [key, Number(value)], `${label} ${value}x`);
    }, powers?.[key] ?? 1);
  }
}

function travelSection(parent: HTMLElement, others: Option[]): void {
  const box = card(parent);
  title(box, "Travel");
  const shown = status(box);
  const goTo = row(box, "Go to");
  select(goTo, "Place", PLACES.map((place, index): Option => [index, place[0]]), (value) => {
    const place = PLACES[Number(value)];
    void send(shown, ["tp", place[1], place[2]], `Sent to ${place[0]}`);
  });
  const mobs = uniqueMobs();
  select(goTo, "Boss", mobs, (value) => void send(shown, ["gotomob", Number(value)], "Sent to the mob"));
  select(goTo, others.length ? "Player" : "Nobody else here", others, (value) => void send(shown, ["goto", Number(value)], "Sent to the player"));
  select(row(box, "Summon"), others.length ? "Player" : "Nobody else here", others, (value) => {
    void send(shown, ["summon", Number(value)], "Summoned");
  });
}

function uniqueMobs(): Option[] {
  const mobs = worldFor?.info?.mobs;
  if (!mobs) return BOSSES;
  const seen = new Set<number>();
  const options: Option[] = [];
  for (const mob of mobs) {
    if (seen.has(mob.type)) continue;
    seen.add(mob.type);
    options.push([mob.type, mob.name]);
  }
  return options;
}

function worldSection(parent: HTMLElement): void {
  const box = card(parent);
  title(box, "World");
  const shown = status(box);
  const kinds = worldFor?.info?.animalKinds;
  const spawns: Option[] = kinds ? kinds.map((kind): Option => [kind.id, kind.name]) : SPAWNS;
  const spawn = row(box, "Spawn");
  select(spawn, null, spawns, (value) => {
    panel.spawn = Number(value);
  }, panel.spawn);
  select(spawn, null, SPAWN_COUNTS, (value) => {
    panel.spawnCount = Number(value);
  }, panel.spawnCount);
  button(spawn, "Spawn", () => void send(shown, ["spawn", panel.spawn, panel.spawnCount], "Spawned"), "go");

  const tribes = worldFor?.info?.tribes ?? [];
  let tribe = "";
  const remove = row(box, "Delete tribe");
  select(remove, tribes.length ? "Tribe" : "No tribes", tribes.map((name): Option => [name, name]), (value) => {
    tribe = value;
    picked.textContent = value;
  });
  const picked = createElement({ tag: "span", class: "friendNote", parent: remove });
  armedButton(remove, "Delete", () => (tribe ? send(shown, ["deltribe", tribe], `Deleted ${tribe}`) : Promise.resolve()), refreshWorld);
}

function giveSection(parent: HTMLElement): void {
  const box = card(parent);
  title(box, "Give");
  const shown = status(box);
  const give = row(box, "Give");
  select(give, null, [
    { group: "Weapons" },
    ...itemData.weapons.map((weapon): Option => [`w${weapon.id}`, weapon.name]),
    { group: "Items" },
    ...itemData.list.map((item): Option => [`i${item.id}`, item.name]),
    { group: "Resources" },
    ...RESOURCES.map((name, index): Option => [`r${index}`, name]),
  ], (value) => {
    panel.pick = value;
    showExtras();
  }, panel.pick);
  const tier = select(give, null, weaponVariants.map((variant): Option => [variant.id, VARIANT_NAMES[variant.id] || `Tier ${variant.id}`]), (value) => {
    panel.tier = Number(value);
  }, panel.tier);
  const amount = select(give, null, AMOUNTS, (value) => {
    panel.amount = Number(value);
  }, panel.amount);
  function showExtras(): void {
    tier.style.display = panel.pick[0] === "w" ? "" : "none";
    amount.style.display = panel.pick[0] === "r" ? "" : "none";
  }
  showExtras();
  button(give, "Give", () => {
    const id = parseInt(panel.pick.slice(1), 10);
    if (panel.pick[0] === "w") void send(shown, ["weapon", id, panel.tier], "Weapon given");
    else if (panel.pick[0] === "r") void send(shown, ["give", id, panel.amount], `${RESOURCES[id]} given`);
    else void send(shown, ["item", id], "Item given");
  }, "go");
}

export function renderAdmin(parent: HTMLElement): void {
  rendered = parent;
  removeAllChildren(parent);
  if (!page.serversAt) {
    empty(card(parent, "Admin"), "Loading servers...");
    refreshServers().then(rerender, (error) => {
      removeAllChildren(parent);
      status(card(parent, "Admin")).fail(error);
    });
    return;
  }

  targetSection(parent);
  const target = page.target;
  if (!target || target.sid < 0) {
    empty(card(parent), "Pick a player here or in the Servers tab");
    return;
  }

  const admin = isAdmin();
  if (admin) loadWorld(target.server);

  const powers = card(parent);
  title(powers, "Powers");
  powersHolder = createElement({ parent: powers });
  powersStatus = status(powers);
  fillPowers();
  loadPowers();
  if (!admin) return;

  const others = (findServer(target.server)?.players ?? [])
    .filter((player) => player.sid !== target.sid)
    .map((player): Option => [player.sid, player.name || `#${player.sid}`]);
  travelSection(parent, others);
  worldSection(parent);
  giveSection(parent);
}
