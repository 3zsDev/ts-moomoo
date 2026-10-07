import { config } from "../config";
import { itemData } from "../data/items";
import { state } from "../game/state";
import { isAdmin, onAccountChange } from "../net/api";
import { createElement, removeAllChildren } from "../utils/dom";
import { ui } from "./elements";
import { leaderboardPlayers } from "./hud/leaderboard";
import { isAlive, mySid, sendAdminCommand } from "./netBridge";
import { createDropdown, type DropdownItem } from "./widgets/dropdown";

type Power = "god" | "aura" | "godlike" | "boss" | "invisible";

const powers: Record<Power, number> = { god: 0, aura: 0, godlike: 0, boss: 0, invisible: 0 };
const give = { pick: "w0", tier: 0, to: null as number | null };

const SPAWNS: [string, number][] = [
  ["Cow", 0], ["Pig", 1], ["Sheep", 12], ["Bull", 2], ["Bully", 3], ["Wolf", 4], ["Quack", 5],
  ["Moostafa", 6], ["Treasure", 7], ["Moofie", 8], ["Boar", 9], ["Yeti", 10],
];
const MOBS: [string, number][] = [["MOOFIE", 8], ["MOOSTAFA", 6], ["Crab King", 11], ["Treasure", 7], ["Yeti", 10]];
const VARIANT_NAMES = ["Normal", "Gold", "Diamond", "Ruby", "Emerald"];

function adminRow(label: string): HTMLElement {
  const row = createElement({ class: "adminRow", parent: ui.adminHolder });
  createElement({ tag: "span", class: "adminLabel", text: label, parent: row });
  return row;
}

function adminButton(row: HTMLElement, label: string, onclick: (button: HTMLElement) => void): HTMLElement {
  const button: HTMLElement = createElement({
    class: "adminBtn",
    text: label,
    parent: row,
    hookTouch: true,
    onclick: () => onclick(button),
  });
  return button;
}

function note(row: HTMLElement, text: string): void {
  createElement({ tag: "span", class: "adminLabel", text, parent: row });
}

function sendGive(command: string, a: number, b: number): void {
  if (give.to === null) sendAdminCommand(command, a, b);
  else sendAdminCommand(command, a, b, give.to);
}

function render(): void {
  removeAllChildren(ui.adminHolder);

  const powerRow = adminRow("Powers");
  for (const [label, key] of [["God", "god"], ["Aura", "aura"], ["Godlike", "godlike"], ["Boss", "boss"],
    ["Invisible", "invisible"]] as [string, Power][]) {
    const button = adminButton(powerRow, label, () => {
      powers[key] = powers[key] ? 0 : 1;
      sendAdminCommand(key, powers[key]);
      if (key === "godlike") powers.god = powers.aura = powers.godlike;
      render();
    });
    if (powers[key]) button.classList.add("on");
  }

  for (const [label, command, values] of [
    ["Size", "size", [1, 1.5, 2, 3]],
    ["Damage", "power", [1, 2, 5, 10, 20, 50, 100]],
    ["Speed", "speed", [1, 1.5, 2, 5, 10, 20]],
    ["Health", "health", [1, 2, 5, 10, 20]],
  ] as [string, string, number[]][]) {
    const row = adminRow(label);
    for (const value of values) adminButton(row, `${value}x`, () => sendAdminCommand(command, value));
  }

  const spawnRow = adminRow("Spawn");
  for (const [label, type] of SPAWNS) adminButton(spawnRow, label, () => sendAdminCommand("spawn", type, 1));

  const tpRow = adminRow("Go to");
  const half = config.mapScale / 2;
  for (const [label, x, y] of [["The Falls", -900, half - 440], ["Centre", half, half - 600], ["Snow", half, 1200]] as
    [string, number, number][]) {
    adminButton(tpRow, label, () => sendAdminCommand("tp", x, y));
  }

  const mobRow = adminRow("Go to mob");
  for (const [label, type] of MOBS) adminButton(mobRow, label, () => sendAdminCommand("gotomob", type));

  const me = mySid();
  const rows = leaderboardPlayers();
  const others: [sid: number, name: string][] = [];
  for (let i = 0; i < rows.length; i += 3) {
    if (rows[i] !== me) others.push([rows[i] as number, String(rows[i + 1] || "unknown")]);
  }

  const gotoRow = adminRow("Go to player");
  for (const [sid, name] of others) adminButton(gotoRow, name, () => sendAdminCommand("goto", sid));
  if (!others.length) note(gotoRow, "Nobody else here");

  const summonRow = adminRow("Summon");
  const giveToRow = adminRow("Give to");
  if (!others.some(([sid]) => sid === give.to)) give.to = null;

  const target = (sid: number | null, label: string) => {
    const button = adminButton(giveToRow, label, () => {
      give.to = sid;
      render();
    });
    if (give.to === sid) button.classList.add("on");
  };
  target(null, "Me");
  for (const [sid, name] of others) {
    adminButton(summonRow, name, () => sendAdminCommand("summon", sid));
    target(sid, name);
  }
  if (!others.length) note(summonRow, "Nobody else here");

  const giveRow = adminRow("Give");
  const pickHolder = createElement({ class: "adminPick", parent: giveRow });
  const tierHolder = createElement({ class: "adminPick adminTier", parent: giveRow });
  const label = (text: string) => (el: HTMLElement) => {
    el.textContent = text;
  };

  const pickItems: DropdownItem[] = [
    { header: "Weapons" },
    ...itemData.weapons.map((weapon) => ({
      value: `w${weapon.id}`, text: weapon.name, button: label(weapon.name), row: label(weapon.name),
    })),
    { header: "Items" },
    ...itemData.list.map((item) => ({
      value: `i${item.id}`, text: item.name, button: label(item.name), row: label(item.name),
    })),
  ];
  const showTier = () => (tierHolder.style.display = give.pick[0] === "w" ? "" : "none");
  const pick = createDropdown(pickHolder, {
    label: "Weapon or item",
    onPick: (value) => {
      give.pick = value;
      pick.set(pickItems, value);
      showTier();
    },
  });
  pick.set(pickItems, give.pick);

  const tierItems: DropdownItem<number>[] = config.weaponVariants.map((variant) => {
    const name = VARIANT_NAMES[variant.id] || `Tier ${variant.id}`;
    return { value: variant.id, text: name, button: label(name), row: label(name) };
  });
  const tier = createDropdown<number>(tierHolder, {
    label: "Variant",
    onPick: (value) => {
      give.tier = value;
      tier.set(tierItems, value);
    },
  });
  tier.set(tierItems, give.tier);
  showTier();

  adminButton(giveRow, "Give", () => {
    const id = parseInt(give.pick.slice(1), 10);
    if (give.pick[0] === "w") sendGive("weapon", id, give.tier);
    else sendGive("item", id, 0);
  });

  const tribeRow = adminRow("Delete tribe");
  if (!state.alliances.length) note(tribeRow, "none");
  for (const alliance of state.alliances) {
    adminButton(tribeRow, alliance.sid, () => {
      sendAdminCommand("deltribe", alliance.sid);
      setTimeout(render, 300);
    });
  }

  const resourceRow = adminRow("Give 1k");
  ["Wood", "Food", "Stone", "Gold"].forEach((name, index) => {
    adminButton(resourceRow, name, () => sendGive("give", index, 1000));
  });
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
  if (!isAlive() || !isAdmin()) return;
  closeOthers();
  render();
  ui.adminMenu.style.display = "block";
}

export function bindAdminMenu(): void {
  const refresh = () => {
    ui.adminButton.style.display = isAdmin() ? "block" : "none";
    if (!isAdmin()) closeAdminMenu();
  };
  onAccountChange(refresh);
  refresh();
}
