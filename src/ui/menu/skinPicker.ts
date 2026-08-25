import { config } from "../../config";
import { createElement, hookTouchEvents, removeAllChildren } from "../../utils/dom";
import { ui } from "../elements";

export let selectedSkinColor = 0;

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
}

export function selectSkinColor(index: number): void {
  selectedSkinColor = index;
  buildSkinColorPicker();
}
