import { accessories, hats, type Cosmetic } from "../data/cosmetics";
import { loadSetting, saveSetting } from "../utils/storage";

const STORAGE_KEY = "moo_shop";

export type ShopTab = "hats" | "acc" | "all";
const TABS: ShopTab[] = ["hats", "acc", "all"];

export interface ShopEntry {
  key: string;
  kind: 0 | 1;
  item: Cosmetic;
}

interface ShopSettings {
  combined: boolean;
  order: Record<ShopTab, string[]>;
  hidden: Record<string, 1>;
}

let settings: ShopSettings = { combined: false, order: { hats: [], acc: [], all: [] }, hidden: {} };

function load(): void {
  let stored: Record<string, unknown> = {};
  try {
    stored = JSON.parse(loadSetting(STORAGE_KEY) || "{}") || {};
  } catch {}

  settings = { combined: stored.combined === true, order: { hats: [], acc: [], all: [] }, hidden: {} };
  for (const tab of TABS) {
    const order = stored[tab];
    settings.order[tab] = Array.isArray(order) ? order.filter((key): key is string => typeof key === "string") : [];
  }
  const hidden = stored.hidden;
  if (hidden && typeof hidden === "object") {
    for (const key in hidden) if ((hidden as Record<string, unknown>)[key]) settings.hidden[key] = 1;
  }
}

function save(): void {
  saveSetting(STORAGE_KEY, JSON.stringify({ combined: settings.combined, ...settings.order, hidden: settings.hidden }));
}

function byDefault(list: Cosmetic[]): Cosmetic[] {
  return list
    .map((item, index) => ({ item, index }))
    .sort((a, b) =>
      Number(Boolean(a.item.earned)) - Number(Boolean(b.item.earned)) ||
      (a.item.price || 0) - (b.item.price || 0) ||
      a.index - b.index)
    .map(({ item }) => item);
}

load();

export const shopConfig = {
  combined(): boolean {
    return settings.combined;
  },

  setCombined(on: boolean): void {
    settings.combined = on;
    save();
  },

  list(tab: ShopTab): ShopEntry[] {
    const entries: ShopEntry[] = [];
    if (tab !== "acc") for (const item of byDefault(hats)) entries.push({ key: `h${item.id}`, kind: 0, item });
    if (tab !== "hats") for (const item of byDefault(accessories)) entries.push({ key: `a${item.id}`, kind: 1, item });

    const byKey = new Map(entries.map((entry) => [entry.key, entry]));
    const ordered: ShopEntry[] = [];
    for (const key of settings.order[tab]) {
      const entry = byKey.get(key);
      if (!entry) continue;
      ordered.push(entry);
      byKey.delete(key);
    }
    for (const entry of entries) if (byKey.has(entry.key)) ordered.push(entry);
    return ordered;
  },

  hidden(key: string): boolean {
    return Boolean(settings.hidden[key]);
  },

  toggleHidden(key: string): void {
    if (settings.hidden[key]) delete settings.hidden[key];
    else settings.hidden[key] = 1;
    save();
  },

  setHidden(keys: string[], hide: boolean): void {
    for (const key of keys) {
      if (hide) settings.hidden[key] = 1;
      else delete settings.hidden[key];
    }
    save();
  },

  setOrder(tab: ShopTab, keys: string[]): void {
    settings.order[tab] = keys.slice();
    save();
  },

  reset(): void {
    for (const tab of TABS) settings.order[tab] = [];
    settings.hidden = {};
    save();
  },
};
