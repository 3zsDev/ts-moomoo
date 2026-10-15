import { config } from "../config";
import { itemData } from "../data/items";
import { state } from "../game/state";
import { tapBarItem } from "../input";
import { createElement, hookTouchEvents, removeAllChildren } from "../utils/dom";
import { getItemSprite, sprites } from "../render/sprites";
import { ui } from "./elements";
import { hideItemInfo, showItemInfo } from "./itemInfo";

export const ITEM_INDEX_OFFSET = itemData.weapons.length;

export function actionBarSlotId(index: number): string {
  return `actionBarItem${index}`;
}

export function buildActionBar(): void {
  removeAllChildren(ui.actionBar);

  const total = itemData.weapons.length + itemData.list.length;
  for (let index = 0; index < total; ++index) {
    createElement({
      id: actionBarSlotId(index),
      class: "actionBarItem",
      style: "display:none",
      onmouseout: hideItemInfo,
      parent: ui.actionBar,
    });
  }

  paintActionBar();
}

export function paintActionBar(): void {
  const total = itemData.weapons.length + itemData.list.length;
  for (let index = 0; index < total; ++index) {
    if (index < ITEM_INDEX_OFFSET) setUpWeaponSlot(index);
    else setUpItemSlot(index);
  }
}

function setUpWeaponSlot(index: number): void {
  const weapon = itemData.weapons[index];
  const slot = document.getElementById(actionBarSlotId(index))!;

  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 66;
  const ctx = canvas.getContext("2d")!;
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.imageSmoothingEnabled = false;
  ctx.rotate(Math.PI / 4 + Math.PI);

  const image = sprites.weapon(weapon.src);
  const paint = () => {
    const aspect = 1 / (image.height / image.width);
    const pad = weapon.iPad ?? 1;
    const width = canvas.width * pad * aspect * config.iconPad;
    const height = canvas.height * pad * config.iconPad;

    ctx.drawImage(image, -width / 2, -height / 2, width, height);
    tint(ctx, canvas);
    slot.style.backgroundImage = `url(${canvas.toDataURL()})`;
  };

  if (image.isLoaded) paint();
  else image.addEventListener("load", paint, { once: true });

  slot.onmouseover = () => showItemInfo(weapon, true);
  slot.onclick = () => tapBarItem(index, true);
  hookTouchEvents(slot);
}

function setUpItemSlot(index: number): void {
  const item = itemData.list[index - ITEM_INDEX_OFFSET];
  const slot = document.getElementById(actionBarSlotId(index))!;

  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 66;
  const ctx = canvas.getContext("2d")!;
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.imageSmoothingEnabled = false;

  const sprite = getItemSprite(item, true);
  const size = Math.min(canvas.width - config.iconPadding, sprite.width);
  ctx.globalAlpha = 1;
  ctx.drawImage(sprite, -size / 2, -size / 2, size, size);
  tint(ctx, canvas);

  slot.style.backgroundImage = `url(${canvas.toDataURL()})`;
  slot.onmouseover = () => showItemInfo(item);
  slot.onclick = () => tapBarItem(item.id);
  hookTouchEvents(slot);
}

function tint(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement): void {
  ctx.fillStyle = "rgba(0, 0, 70, 0.1)";
  ctx.globalCompositeOperation = "source-atop";
  ctx.fillRect(-canvas.width / 2, -canvas.height / 2, canvas.width, canvas.height);
  ctx.globalCompositeOperation = "source-over";
}

export function refreshActionBar(list?: number[], isWeapons?: boolean): void {
  const me = state.me;
  if (!me) return;

  if (list) {
    if (isWeapons) me.weapons = list;
    else me.items = list;
  }

  for (let i = 0; i < itemData.list.length; ++i) {
    const slot = document.getElementById(actionBarSlotId(ITEM_INDEX_OFFSET + i));
    if (slot) slot.style.display = me.items.includes(itemData.list[i].id) ? "inline-block" : "none";
  }

  for (let i = 0; i < itemData.weapons.length; ++i) {
    const weapon = itemData.weapons[i];
    const slot = document.getElementById(actionBarSlotId(i));
    if (slot) slot.style.display = me.weapons[weapon.type] === weapon.id ? "inline-block" : "none";
  }
  packActionBar();
}

const MAX_PACKED_ROWS = 3;

function packActionBar(): void {
  const bar = ui.actionBar;
  bar.style.removeProperty("--bar-slot");
  bar.classList.remove("packed");
  const shown = Array.prototype.filter.call(bar.children, (slot: HTMLElement) => slot.style.display !== "none") as HTMLElement[];
  if (!shown.length) return;

  const slotStyle = getComputedStyle(shown[0]);
  const width = shown[0].offsetWidth;
  const margin = parseFloat(slotStyle.marginLeft) + parseFloat(slotStyle.marginRight);
  if (!bar.clientWidth || !width || shown.length <= Math.floor(bar.clientWidth / (width + margin))) return;

  bar.classList.add("packed");
  const barStyle = getComputedStyle(bar);
  const inner = bar.clientWidth - parseFloat(barStyle.paddingLeft) - parseFloat(barStyle.paddingRight);
  const height = 2 * (width + margin);
  let size = 0;
  for (let rows = 2; rows <= MAX_PACKED_ROWS; rows++) {
    const fit = Math.floor(inner / Math.ceil(shown.length / rows)) - margin;
    size = Math.max(size, Math.min(width, fit, Math.floor(height / rows) - margin));
  }
  bar.style.setProperty("--bar-slot", `${Math.max(20, size)}px`);
}

window.addEventListener("resize", () => {
  if (state.me) packActionBar();
});
