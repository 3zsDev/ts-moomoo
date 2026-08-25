import { assetUrl } from "../assetBase";
import { accessories, hats, type Cosmetic } from "../data/cosmetics";
import { state } from "../game/state";
import { connection } from "../net/Connection";
import { ClientPacket } from "../net/protocol";
import { createElement, hookTouchEvents, removeAllChildren } from "../utils/dom";
import { ui } from "./elements";
import { hideItemInfo, showItemInfo } from "./itemInfo";

let activeTab = 0;

export function setStoreTab(tab: number): void {
  if (activeTab === tab) return;
  activeTab = tab;
  refreshStore();
}

export function isStoreOpen(): boolean {
  return ui.storeMenu.style.display === "block";
}

export function toggleStore(): void {
  if (isStoreOpen()) {
    closeStore();
    return;
  }
  ui.storeMenu.style.display = "block";
  ui.allianceMenu.style.display = "none";
  refreshStore();
}

export function closeStore(): void {
  if (!isStoreOpen()) return;
  ui.storeMenu.style.display = "none";
  hideItemInfo();
}

export function refreshStore(): void {
  if (!state.me) return;

  removeAllChildren(ui.storeHolder);

  const isAccessoryTab = activeTab === 1;
  const catalogue = isAccessoryTab ? accessories : hats;

  for (const cosmetic of catalogue) {
    if (cosmetic.dontSell) continue;
    ui.storeHolder.appendChild(buildTile(cosmetic, isAccessoryTab));
  }
}

function buildTile(cosmetic: Cosmetic, isAccessory: boolean): HTMLElement {
  const me = state.me!;

  const tile = createElement({
    id: `storeDisplay${cosmetic.id}`,
    class: "storeItem",
    onmouseover: () => showItemInfo(cosmetic, false, true),
    onmouseout: hideItemInfo,
  });
  hookTouchEvents(tile, true);

  const folder = isAccessory ? "accessories/access_" : "hats/hat_";

  const suffix = cosmetic.topSprite ? "_p" : "";
  createElement({
    tag: "img",
    class: "hatPreview",
    src: assetUrl(`img/${folder}${cosmetic.id}${suffix}.png`),
    parent: tile,
  });
  createElement({ tag: "span", text: cosmetic.name, parent: tile });

  const owned = isAccessory ? me.tails[cosmetic.id] : me.skins[cosmetic.id];
  const equipped = (isAccessory ? me.tailIndex : me.skinIndex) === cosmetic.id;

  if (!owned) {
    createElement({
      class: "joinAlBtn",
      style: "margin-top: 5px",
      text: "Buy",
      onclick: () => buyCosmetic(cosmetic.id, isAccessory),
      hookTouch: true,
      parent: tile,
    });
    createElement({ tag: "span", class: "itemPrice", text: String(cosmetic.price), parent: tile });
  } else {
    createElement({
      class: "joinAlBtn",
      style: "margin-top: 5px",
      text: equipped ? "Unequip" : "Equip",

      onclick: () => equipCosmetic(equipped ? 0 : cosmetic.id, isAccessory),
      hookTouch: true,
      parent: tile,
    });
  }

  return tile;
}

export function equipCosmetic(id: number, isAccessory: boolean): void {
  connection.send(ClientPacket.Store, 0, id, isAccessory);
}

export function buyCosmetic(id: number, isAccessory: boolean): void {
  connection.send(ClientPacket.Store, 1, id, isAccessory);
}

export function applyStoreUpdate(isEquip: boolean, id: number, isAccessory: boolean): void {
  const me = state.me;
  if (!me) return;

  if (isAccessory) {
    if (isEquip) me.tailIndex = id;
    else me.tails[id] = 1;
  } else {
    if (isEquip) me.skinIndex = id;
    else me.skins[id] = 1;
  }

  if (isStoreOpen()) refreshStore();
}
