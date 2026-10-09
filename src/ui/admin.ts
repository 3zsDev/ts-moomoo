import { config } from "../config";
import { itemData } from "../data/items";
import { state } from "../game/state";
import { account, onAccountChange } from "../net/api";
import { createElement, removeAllChildren } from "../utils/dom";
import { ui } from "./elements";
import { leaderboardPlayers } from "./hud/leaderboard";
import { isAlive, mySid, sendAdminCommand } from "./netBridge";

type Toggle = "god" | "aura" | "boss" | "invisible" | "noclip";
type Multiplier = "size" | "power" | "speed" | "health";
type Option = [value: string | number, label: string] | { group: string };

const panel = {
  god: 0, aura: 0, boss: 0, invisible: 0, noclip: 0,
  size: 1, power: 1, speed: 1, health: 1,
  pick: "w0", tier: 0, amount: 1000, spawn: 0, to: null as number | null,
};

const TOGGLES: [string, Toggle][] = [
  ["God", "god"], ["Aura", "aura"], ["Boss", "boss"], ["Invisible", "invisible"], ["No collision", "noclip"],
];
const MULTIPLIERS: [string, Multiplier, number[]][] = [
  ["Size", "size", [1, 1.5, 2, 3]],
  ["Damage", "power", [1, 2, 5, 10, 20, 50, 100]],
  ["Speed", "speed", [1, 1.5, 2, 5, 10, 20]],
  ["Health", "health", [1, 2, 5, 10, 20]],
];
const SPAWNS: [string, number][] = [
  ["Cow", 0], ["Pig", 1], ["Sheep", 12], ["Bull", 2], ["Bully", 3], ["Wolf", 4], ["Quack", 5],
  ["Moostafa", 6], ["Treasure", 7], ["Moofie", 8], ["Boar", 9], ["Yeti", 10],
];
const BOSSES: [number, string][] = [[8, "MOOFIE"], [6, "MOOSTAFA"], [11, "Crab King"], [7, "Treasure"], [10, "Yeti"]];
const VARIANT_NAMES = ["Normal", "Gold", "Diamond", "Ruby", "Emerald"];
const RESOURCES = ["Wood", "Food", "Stone", "Gold"];
const AMOUNTS: [number, string][] = [[100, "100"], [1000, "1,000"], [10000, "10,000"], [100000, "100,000"], [1000000, "1,000,000"]];

function isPanelRole(): boolean {
  return account.role === "admin" || account.role === "mod";
}

function title(text: string): void {
  createElement({ class: "adminTitle", text, parent: ui.adminHolder });
}

function adminRow(label: string): HTMLElement {
  const row = createElement({ class: "adminRow", parent: ui.adminHolder });
  createElement({ tag: "span", class: "adminLabel", text: label, parent: row });
  return row;
}

function adminButton(row: HTMLElement, label: string, onclick: () => void): HTMLElement {
  return createElement({ class: "adminBtn", text: label, parent: row, hookTouch: true, onclick });
}

function select(
  parent: HTMLElement,
  placeholder: string | null,
  options: Option[],
  onPick: (value: string) => void,
  current?: string | number,
): HTMLSelectElement {
  const el = createElement({ tag: "select", class: "adminSelect", parent }) as HTMLSelectElement;
  if (placeholder) {
    const first = createElement({ tag: "option", text: placeholder, parent: el }) as HTMLOptionElement;
    first.value = "";
    first.disabled = true;
    first.selected = true;
  }
  let target: HTMLElement = el;
  for (const option of options) {
    if (!Array.isArray(option)) {
      target = createElement({ tag: "optgroup", parent: el });
      (target as HTMLOptGroupElement).label = option.group;
      continue;
    }
    const entry = createElement({ tag: "option", text: option[1], parent: target }) as HTMLOptionElement;
    entry.value = String(option[0]);
    if (!placeholder && String(option[0]) === String(current)) entry.selected = true;
  }
  if (!options.some(Array.isArray)) el.disabled = true;
  el.onchange = () => {
    const value = el.value;
    if (placeholder) el.selectedIndex = 0;
    el.blur();
    onPick(value);
  };
  return el;
}

function sendGive(command: string, a: number, b: number): void {
  if (panel.to === null) sendAdminCommand(command, a, b);
  else sendAdminCommand(command, a, b, panel.to);
}

function render(): void {
  removeAllChildren(ui.adminHolder);
  const admin = account.role === "admin";

  const head = createElement({ class: "adminHead", parent: ui.adminHolder });
  createElement({ tag: "span", text: admin ? "Admin" : "Moderator", parent: head });
  createElement({ tag: "i", class: "material-icons adminClose", html: "&#xE5CD;", parent: head, hookTouch: true, onclick: closeAdminMenu });

  const me = mySid();
  const rows = leaderboardPlayers();
  const others: [sid: number, name: string][] = [];
  for (let i = 0; i < rows.length; i += 3) {
    if (rows[i] !== me) others.push([rows[i] as number, String(rows[i + 1] || "unknown")]);
  }

  title("Powers");
  const toggles = adminRow("Toggle");
  for (const [label, key] of admin ? TOGGLES : TOGGLES.slice(4)) {
    const button = adminButton(toggles, label, () => {
      panel[key] = panel[key] ? 0 : 1;
      sendAdminCommand(key, panel[key]);
      render();
    });
    if (panel[key]) button.classList.add("on");
  }
  if (!admin) return;

  const multiply = adminRow("Multiply");
  for (const [label, key, values] of MULTIPLIERS) {
    const cell = createElement({ class: "adminCell", parent: multiply });
    createElement({ tag: "span", text: label, parent: cell });
    select(cell, null, values.map((value): Option => [value, `${value}x`]), (value) => {
      panel[key] = Number(value);
      sendAdminCommand(key, Number(value));
    }, panel[key]);
  }

  title("Travel");
  const half = config.mapScale / 2;
  const places: [string, number, number][] = [["The Falls", -900, half - 440], ["Centre", half, half - 600], ["Snow", half, 1200]];
  const goTo = adminRow("Go to");
  select(goTo, "Place", places.map((place, index): Option => [index, place[0]]), (value) => {
    const place = places[Number(value)];
    sendAdminCommand("tp", place[1], place[2]);
  });
  select(goTo, "Boss", BOSSES, (value) => sendAdminCommand("gotomob", Number(value)));
  select(goTo, others.length ? "Player" : "Nobody else here", others, (value) => sendAdminCommand("goto", Number(value)));
  select(adminRow("Summon"), others.length ? "Player" : "Nobody else here", others, (value) => sendAdminCommand("summon", Number(value)));

  title("World");
  const spawn = adminRow("Spawn");
  select(spawn, null, SPAWNS.map(([name, type]): Option => [type, name]), (value) => {
    panel.spawn = Number(value);
  }, panel.spawn);
  adminButton(spawn, "Spawn", () => sendAdminCommand("spawn", panel.spawn, 1)).classList.add("go");
  select(
    adminRow("Delete tribe"),
    state.alliances.length ? "Tribe" : "No tribes",
    state.alliances.map((alliance): Option => [alliance.sid, alliance.sid]),
    (value) => {
      sendAdminCommand("deltribe", value);
      setTimeout(render, 300);
    },
  );

  title("Give");
  if (!others.some(([sid]) => sid === panel.to)) panel.to = null;
  select(adminRow("To"), null, ([["", "Me"]] as Option[]).concat(others), (value) => {
    panel.to = value === "" ? null : Number(value);
  }, panel.to === null ? "" : panel.to);

  const give = adminRow("Give");
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
  const tier = select(give, null, config.weaponVariants.map((variant): Option => [variant.id, VARIANT_NAMES[variant.id] || `Tier ${variant.id}`]), (value) => {
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
  adminButton(give, "Give", () => {
    const id = parseInt(panel.pick.slice(1), 10);
    if (panel.pick[0] === "w") sendGive("weapon", id, panel.tier);
    else if (panel.pick[0] === "r") sendGive("give", id, panel.amount);
    else sendGive("item", id, 0);
  }).classList.add("go");
}

export function isAdminMenuOpen(): boolean {
  return ui.adminMenu.style.display === "block";
}

export function closeAdminMenu(): void {
  ui.adminMenu.style.display = "none";
}

export function toggleAdminMenu(closeOthers: () => void): void {
  if (isAdminMenuOpen()) {
    closeAdminMenu();
    return;
  }
  if (!isAlive() || !isPanelRole()) return;
  closeOthers();
  render();
  ui.adminMenu.style.display = "block";
}

export function bindAdminMenu(): void {
  const refresh = () => {
    ui.adminButton.style.display = isPanelRole() ? "block" : "none";
    if (!isPanelRole()) closeAdminMenu();
  };
  onAccountChange(refresh);
  refresh();
}
