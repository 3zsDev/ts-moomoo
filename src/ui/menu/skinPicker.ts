import { config } from "../../config";
import { createElement, hookTouchEvents, removeAllChildren } from "../../utils/dom";
import { ui } from "../elements";

export let selectedSkinColor = 0;

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
