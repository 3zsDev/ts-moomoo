import { imageUrl } from "../../render/sprites";
import { trusted } from "../../security/trusted";
import { createElement, findById, removeAllChildren } from "../../utils/dom";
import { shopConfig, type ShopEntry, type ShopTab } from "../shopConfig";
import { isStoreOpen, refreshStore } from "../store";

let editorTab: "hats" | "acc" = "hats";

function changed(): void {
  renderShopEditor();
  if (isStoreOpen()) refreshStore();
}

export function renderShopEditor(): void {
  const editor = findById("shopEditor");
  const combinedToggle = findById<HTMLInputElement>("shopCombined");
  if (!editor) return;
  removeAllChildren(editor);

  const combined = shopConfig.combined();
  if (combinedToggle) combinedToggle.checked = combined;
  const tab: ShopTab = combined ? "all" : editorTab;

  if (!combined) {
    const tabs = createElement({ class: "segTabs", parent: editor });
    for (const [id, label] of [["hats", "Hats"], ["acc", "Accessories"]] as const) {
      createElement({
        tag: "a", class: editorTab === id ? "active" : "", text: label, parent: tabs,
        onclick: () => {
          editorTab = id;
          renderShopEditor();
        },
      });
    }
  }

  const entries = shopConfig.list(tab).filter((entry) => !entry.item.dontSell || entry.item.earned);
  const keys = entries.map((entry) => entry.key);

  const bar = createElement({ class: "shopBar", parent: editor });
  for (const [label, hide] of [["Show all", false], ["Hide all", true]] as const) {
    createElement({
      tag: "a", class: "menuLink", text: label, parent: bar,
      onclick: () => {
        shopConfig.setHidden(keys, hide);
        changed();
      },
    });
  }
  createElement({
    tag: "a", class: "menuLink", text: "Reset", parent: bar,
    onclick: () => {
      shopConfig.reset();
      changed();
    },
  });

  const row = (entry: ShopEntry) => {
    const hidden = shopConfig.hidden(entry.key);
    const el = createElement({ class: "shopRow" + (hidden ? " off" : ""), parent: editor });
    el.dataset.key = entry.key;
    createElement({ tag: "i", class: "material-icons shopGrip", html: "&#xE945;", parent: el });
    const folder = entry.kind ? "accessories/access_" : "hats/hat_";
    createElement({ tag: "img", parent: el, src: imageUrl(`${folder}${entry.item.id}${entry.item.topSprite ? "_p" : ""}.png`) });
    createElement({ tag: "span", class: "shopName", text: entry.item.name, parent: el });
    if (combined) createElement({ tag: "span", class: "shopKind", text: entry.kind ? "Accessory" : "Hat", parent: el });
    createElement({
      tag: "i", class: "material-icons shopEye", html: hidden ? "&#xE8F5;" : "&#xE8F4;", parent: el,
      onclick: () => {
        shopConfig.toggleHidden(entry.key);
        changed();
      },
    });
    el.addEventListener("pointerdown", trusted((event: PointerEvent) => startDrag(event, editor, el, tab)));
  };

  entries.filter((entry) => !shopConfig.hidden(entry.key)).forEach(row);
  const hiddenEntries = entries.filter((entry) => shopConfig.hidden(entry.key));
  if (hiddenEntries.length) createElement({ class: "shopDivide", text: "Hidden", parent: editor });
  hiddenEntries.forEach(row);
}

function startDrag(event: PointerEvent, editor: HTMLElement, row: HTMLElement, tab: ShopTab): void {
  const target = event.target as HTMLElement;
  if (event.button !== 0 || target.classList.contains("shopEye")) return;
  if (event.pointerType !== "mouse" && !target.classList.contains("shopGrip")) return;
  event.preventDefault();

  const scroller = (editor.closest(".viewBody") as HTMLElement | null) ?? editor;
  const startY = event.clientY;
  const box = row.getBoundingClientRect();
  const grabX = event.clientX - box.left;
  const grabY = event.clientY - box.top;
  let ghost: HTMLElement | null = null;
  let pointerY = event.clientY;
  let frame = 0;

  const siblings = () =>
    Array.from(editor.querySelectorAll<HTMLElement>(".shopRow")).filter(
      (other) => other !== row && other.classList.contains("off") === row.classList.contains("off"),
    );

  const place = () => {
    const others = siblings();
    if (!others.length) return;
    const before = others.find((other) => {
      const rect = other.getBoundingClientRect();
      return pointerY < rect.top + rect.height / 2;
    });
    if (before) {
      if (row.nextElementSibling !== before) editor.insertBefore(row, before);
    } else {
      const last = others[others.length - 1];
      if (last.nextElementSibling !== row) editor.insertBefore(row, last.nextElementSibling);
    }
  };

  const autoScroll = () => {
    const rect = scroller.getBoundingClientRect();
    const edge = 44;
    const speed = pointerY < rect.top + edge
      ? -Math.ceil((rect.top + edge - pointerY) / 4)
      : pointerY > rect.bottom - edge ? Math.ceil((pointerY - (rect.bottom - edge)) / 4) : 0;
    if (speed) {
      scroller.scrollTop += Math.max(-18, Math.min(18, speed));
      place();
    }
    frame = requestAnimationFrame(autoScroll);
  };

  const move = (moveEvent: PointerEvent) => {
    pointerY = moveEvent.clientY;
    if (!ghost) {
      if (Math.abs(moveEvent.clientY - startY) < 4) return;
      ghost = row.cloneNode(true) as HTMLElement;
      ghost.className = "shopRow shopGhost";
      ghost.style.width = `${box.width}px`;
      document.body.appendChild(ghost);
      row.classList.add("gap");
      frame = requestAnimationFrame(autoScroll);
    }
    ghost.style.left = `${moveEvent.clientX - grabX}px`;
    ghost.style.top = `${moveEvent.clientY - grabY}px`;
    place();
  };

  const end = () => {
    document.removeEventListener("pointermove", move, true);
    document.removeEventListener("pointerup", end, true);
    document.removeEventListener("pointercancel", end, true);
    cancelAnimationFrame(frame);
    if (!ghost) return;
    ghost.remove();
    row.classList.remove("gap");
    shopConfig.setOrder(tab, Array.from(editor.querySelectorAll<HTMLElement>(".shopRow"), (el) => el.dataset.key!));
    changed();
  };

  document.addEventListener("pointermove", move, true);
  document.addEventListener("pointerup", end, true);
  document.addEventListener("pointercancel", end, true);
}

export function bindShopEditor(): void {
  const combinedToggle = findById<HTMLInputElement>("shopCombined");
  if (!combinedToggle) return;
  combinedToggle.onchange = trusted(() => {
    shopConfig.setCombined(combinedToggle.checked);
    changed();
  });
  renderShopEditor();
}
