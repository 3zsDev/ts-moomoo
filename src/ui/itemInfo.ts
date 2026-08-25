import { config } from "../config";
import type { Cosmetic } from "../data/cosmetics";
import type { Item, Weapon } from "../data/items";
import { state } from "../game/state";
import { createElement, removeAllChildren } from "../utils/dom";
import { capitalizeFirst } from "../utils/math";
import { ui } from "./elements";

type Describable = Item | Weapon | Cosmetic;

export function showItemInfo(entry?: Describable | null, isWeapon = false, hideCost = false): void {
  if (!state.me || !entry) {
    hideItemInfo();
    return;
  }

  removeAllChildren(ui.itemInfoHolder);
  ui.itemInfoHolder.classList.add("visible");

  createElement({ id: "itemInfoName", text: capitalizeFirst(entry.name), parent: ui.itemInfoHolder });
  createElement({ id: "itemInfoDesc", text: entry.desc, parent: ui.itemInfoHolder });

  if (hideCost) return;

  if (isWeapon) {
    createElement({
      class: "itemInfoReq",
      text: (entry as Weapon).type ? "secondary" : "primary",
      parent: ui.itemInfoHolder,
    });
    return;
  }

  const item = entry as Item;
  for (let i = 0; i < item.req.length; i += 2) {
    createElement({
      class: "itemInfoReq",
      html: `${item.req[i]}<span class='itemInfoReqVal'> x${item.req[i + 1]}</span>`,
      parent: ui.itemInfoHolder,
    });
  }

  if (item.group?.limit) {
    const limit = config.inSandbox
      ? item.group.sandboxLimit ?? Math.max(item.group.limit * 3, 99)
      : item.group.limit;
    createElement({
      class: "itemInfoLmt",
      text: `${state.me.itemCounts[item.group.id] || 0}/${limit}`,
      parent: ui.itemInfoHolder,
    });
  }
}

export function hideItemInfo(): void {
  ui.itemInfoHolder.classList.remove("visible");
}
