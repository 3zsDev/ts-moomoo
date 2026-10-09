import { config } from "../../config";
import { createElement, hookTouchEvents, removeAllChildren } from "../../utils/dom";
import { loadSetting, saveSetting } from "../../utils/storage";
import { ui } from "../elements";

export let selectedSkinColor = (() => {
  const saved = Number(loadSetting("skin_color")) || 0;
  return Number.isInteger(saved) && saved >= 0 && saved < config.skinColors.length ? saved : 0;
})();

declare global {
  interface Window {
    selectSkinColor: typeof selectSkinColor;
  }
}

export function buildSkinColorPicker(): void {
  removeAllChildren(ui.skinColorHolder);

  config.skinColors.forEach((color, index) => {
    const swatch = createElement({
      class: index === selectedSkinColor ? "skinColorItem activeSkin" : "skinColorItem",
      style: `background-color:${color}`,
      onclick: () => selectSkinColor(index),
      parent: ui.skinColorHolder,
    });
    hookTouchEvents(swatch);
  });

  ui.skinButton.style.backgroundColor = config.skinColors[selectedSkinColor];
}

export function selectSkinColor(index: number): void {
  selectedSkinColor = index;
  saveSetting("skin_color", String(index));
  buildSkinColorPicker();
  ui.skinPopover.style.display = "none";
}

export function bindSkinPicker(): void {
  window.selectSkinColor = selectSkinColor;

  ui.skinButton.onclick = () => {
    ui.skinPopover.style.display = ui.skinPopover.style.display === "none" ? "" : "none";
  };
  hookTouchEvents(ui.skinButton);

  document.addEventListener("click", (event) => {
    const target = event.target as Node;
    if (target !== ui.skinButton && !ui.skinPopover.contains(target)) ui.skinPopover.style.display = "none";
  });

  buildSkinColorPicker();
}
