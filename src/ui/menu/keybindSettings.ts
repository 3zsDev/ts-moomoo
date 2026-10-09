import {
  boundKeyName, capturingAction, clearHeldKeys, KEY_ACTIONS, onKeybindsChange, resetKeybinds, toggleCapture,
} from "../../input";
import { createElement, removeAllChildren } from "../../utils/dom";
import { ui } from "../elements";
import { isAlive } from "../netBridge";

function render(): void {
  const holder = ui.keybindHolder;
  removeAllChildren(holder);
  const capturing = capturingAction();

  let section: string | undefined;
  for (const action of KEY_ACTIONS) {
    if (action.section !== section) {
      section = action.section;
      createElement({ class: "keybindTitle", text: section, parent: holder });
    }
    const row = createElement({ class: "keybindRow", parent: holder });
    createElement({ tag: "span", text: action.label, parent: row });
    createElement({
      class: "keybindBtn" + (capturing === action ? " capturing" : ""),
      text: capturing === action ? "Press a key" : boundKeyName(action),
      onclick: () => toggleCapture(action),
      parent: row,
    });
    if (action.note) createElement({ class: "keybindNote", text: action.note, parent: holder });
  }

  createElement({
    class: "keybindBtn keybindReset",
    text: "Reset to defaults",
    onclick: resetKeybinds,
    parent: holder,
  });
}

export function mountKeybindSettings(): void {
  onKeybindsChange((bindingsChanged) => {
    render();
    if (bindingsChanged && isAlive()) clearHeldKeys();
  });
  render();
}
