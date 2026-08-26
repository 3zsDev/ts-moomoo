import { config } from "../config";
import { itemData } from "../data/items";
import { state } from "../game/state";
import { connection } from "../net/Connection";
import { ClientPacket } from "../net/protocol";
import { createElement, hookTouchEvents, removeAllChildren } from "../utils/dom";
import { actionBarSlotId, ITEM_INDEX_OFFSET } from "./actionBar";
import { ui } from "./elements";
import { hideItemInfo, showItemInfo } from "./itemInfo";

export function refreshUpgrades(points: number, age?: number): void {
  const me = state.me;
  if (!me) return;

  me.upgradePoints = points;
  if (age != null) me.upgrAge = age;

  if (points <= 0) {
    hideUpgrades();
    return;
  }

  state.upgradeChoices.length = 0;
  removeAllChildren(ui.upgradeHolder);

  for (let i = 0; i < itemData.weapons.length; ++i) {
    const weapon = itemData.weapons[i];
    if (weapon.age !== me.upgrAge) continue;
    if (!config.allowAllUpgrades && weapon.pre != null && !me.weapons.includes(weapon.pre)) continue;
    addChoice(i);
  }

  for (let i = 0; i < itemData.list.length; ++i) {
    const item = itemData.list[i];
    if (item.age !== me.upgrAge) continue;
    if (!config.allowAllUpgrades && item.pre != null && !me.items.includes(item.pre)) continue;
    addChoice(ITEM_INDEX_OFFSET + i);
  }

  if (state.upgradeChoices.length === 0) {
    hideUpgrades();
    return;
  }

  ui.upgradeHolder.style.display = "block";
  ui.upgradeCounter.style.display = "block";
  ui.upgradeCounter.innerHTML = `SELECT ITEMS (${points})`;
}

function addChoice(actionBarIndex: number): void {
  const slot = createElement({
    id: `upgradeItem${actionBarIndex}`,
    class: "actionBarItem",
    onmouseout: hideItemInfo,
    parent: ui.upgradeHolder,
  });

  const source = document.getElementById(actionBarSlotId(actionBarIndex));
  if (source) slot.style.backgroundImage = source.style.backgroundImage;

  slot.onmouseover = () => {
    if (actionBarIndex < ITEM_INDEX_OFFSET) showItemInfo(itemData.weapons[actionBarIndex], true);
    else showItemInfo(itemData.list[actionBarIndex - ITEM_INDEX_OFFSET]);
  };
  slot.onclick = () => connection.send(ClientPacket.SendUpgrade, actionBarIndex);
  hookTouchEvents(slot);

  state.upgradeChoices.push(actionBarIndex);
}

function hideUpgrades(): void {
  ui.upgradeHolder.style.display = "none";
  ui.upgradeCounter.style.display = "none";
  hideItemInfo();
}
