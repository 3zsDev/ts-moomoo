import { imageUrl } from "../render/sprites";
import { state } from "../game/state";
import { connection } from "../net/Connection";
import { ClientPacket } from "../net/protocol";
import { trusted } from "../security/trusted";
import { createElement, hookTouchEvents, removeAllChildren } from "../utils/dom";
import { ui } from "./elements";
import { closeGameMenu } from "./gameMenu";
import { closeChat } from "./hud/chat";
import { hideItemInfo, showItemInfo } from "./itemInfo";
import { shopConfig, type ShopEntry, type ShopTab } from "./shopConfig";

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
  closeGameMenu();
  closeChat();
  refreshStore();
}

export function closeStore(): void {
  if (!isStoreOpen()) return;
  ui.storeMenu.style.display = "none";
  hideItemInfo();
}

export function refreshStore(): void {
  const me = state.me;
  if (!me) return;
  flushStoreUpdates();

  removeAllChildren(ui.storeHolder);

  const ownedEntry = (entry: ShopEntry) => Boolean(entry.kind ? me.tails[entry.item.id] : me.skins[entry.item.id]);
  const visible = (tab: ShopTab) =>
    shopConfig.list(tab).filter((entry) =>
      !shopConfig.hidden(entry.key) && (!entry.item.dontSell || (entry.item.earned && ownedEntry(entry))));

  let tab: ShopTab = "all";
  let showTabs = false;
  if (!shopConfig.combined()) {
    const anyHats = visible("hats").length > 0;
    const anyAccessories = visible("acc").length > 0;
    showTabs = anyHats && anyAccessories;
    if (!showTabs && (anyHats || anyAccessories)) tab = anyHats ? "hats" : "acc";
    else tab = activeTab === 1 ? "acc" : "hats";
  }
  const tabBar = ui.storeMenu.firstElementChild as HTMLElement | null;
  if (tabBar) tabBar.style.display = showTabs ? "" : "none";

  visible(tab).forEach((entry, index) => ui.storeHolder.appendChild(buildTile(entry, index)));

  if (!ui.storeHolder.firstChild) {
    createElement({
      class: "storeItem storeEmpty",
      text: "Nothing in your shop. Choose what shows in Settings, under Shop.",
      parent: ui.storeHolder,
    });
  }
}

let pressedAt = 0;
function equipByPress(id: number, isAccessory: boolean): void {
  pressedAt = Date.now();
  equipCosmetic(id, isAccessory);
}
function justPressed(): boolean {
  return Date.now() - pressedAt < 700;
}

function buildTile(entry: ShopEntry, index: number): HTMLElement {
  const me = state.me!;
  const cosmetic = entry.item;
  const isAccessory = entry.kind === 1;

  const tile = createElement({
    id: `storeDisplay${index}`,
    class: "storeItem",
    onmouseover: () => showItemInfo(cosmetic, false, true),
    onmouseout: hideItemInfo,
  });
  hookTouchEvents(tile, true);

  const owned = isAccessory ? me.tails[cosmetic.id] : me.skins[cosmetic.id];
  const equipped = (isAccessory ? me.tailIndex : me.skinIndex) === cosmetic.id;
  if (owned) equipOnTap(tile, cosmetic.id, isAccessory);

  const folder = isAccessory ? "accessories/access_" : "hats/hat_";

  const suffix = cosmetic.topSprite ? "_p" : "";
  createElement({
    tag: "img",
    class: "hatPreview",
    src: imageUrl(`${folder}${cosmetic.id}${suffix}.png`),
    parent: tile,
  });
  createElement({ tag: "span", text: cosmetic.name, parent: tile });

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
    const target = equipped ? 0 : cosmetic.id;
    createElement({
      class: "joinAlBtn",
      style: "margin-top: 5px",
      text: equipped ? "Unequip" : "Equip",
      onmousedown: trusted((event: MouseEvent) => {
        if (event.button === 0) equipByPress(target, isAccessory);
      }),
      onclick: () => {
        if (!justPressed()) equipCosmetic(target, isAccessory);
      },
      hookTouch: true,
      parent: tile,
    });
  }

  return tile;
}

function equipOnTap(tile: HTMLElement, id: number, isAccessory: boolean): void {
  let startX: number | undefined;
  let startY = 0;
  tile.addEventListener("touchstart", trusted((event: TouchEvent) => {
    startX = event.changedTouches[0].clientX;
    startY = event.changedTouches[0].clientY;
  }), { passive: true });
  tile.addEventListener("touchend", trusted((event: TouchEvent) => {
    const end = event.changedTouches[0];
    const moved = startX === undefined || Math.abs(end.clientX - startX) > 10 || Math.abs(end.clientY - startY) > 10;
    startX = undefined;
    const me = state.me;
    if (moved || !me || (isAccessory ? me.tailIndex : me.skinIndex) === id) return;
    equipCosmetic(id, isAccessory);
  }), { passive: true });
  tile.addEventListener("mousedown", trusted((event: MouseEvent) => {
    const me = state.me;
    if (event.button !== 0 || (event.target as HTMLElement).classList.contains("joinAlBtn") || !me) return;
    if ((isAccessory ? me.tailIndex : me.skinIndex) === id) return;
    equipByPress(id, isAccessory);
  }));
}

export function equipCosmetic(id: number, isAccessory: boolean): void {
  connection.send(ClientPacket.Store, 0, id, isAccessory);
}

export function buyCosmetic(id: number, isAccessory: boolean): void {
  connection.send(ClientPacket.Store, 1, id, isAccessory);
}

const pendingUpdates: [isEquip: boolean, id: number, isAccessory: boolean][] = [];

export function flushStoreUpdates(): void {
  if (!state.me) return;
  for (const update of pendingUpdates.splice(0)) applyStoreUpdate(...update);
}

export function applyStoreUpdate(isEquip: boolean, id: number, isAccessory: boolean): void {
  const me = state.me;
  if (!me) {
    pendingUpdates.push([isEquip, id, isAccessory]);
    return;
  }
  flushStoreUpdates();

  if (isAccessory) {
    if (isEquip) me.tailIndex = id;
    else me.tails[id] = 1;
  } else {
    if (isEquip) me.skinIndex = id;
    else me.skins[id] = 1;
  }

  if (isStoreOpen()) refreshStore();
}
