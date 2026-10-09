import { itemData } from "../data/items";
import { state } from "../game/state";
import { trusted } from "../security/trusted";
import { markCurrentPosition } from "../render/minimap";
import { actionFor, movementKeys, type ItemKind, type MenuId } from "./keybinds";
import {
  attack, clearHeldKeys, heldKeys, pingMinimap, selectItem, sendAttackState,
  sendMoveDirection, toggleAutoGather, toggleLockDir,
} from "./outbound";

const ESCAPE = 27;
const ENTER = 13;
const SPACE = 32;

export interface InputCallbacks {
  isPlaying(): boolean;
  toggleChat(): void;
  escape(): void;
  openMenu(menu: MenuId): void;
  canUseHotkeys(): boolean;
  canToggleChat(): boolean;
  chatInput: HTMLElement;
}

const NON_TEXT_INPUTS = new Set(["checkbox", "radio", "button", "submit", "reset", "range", "color", "file", "image"]);

function isTextField(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  if (el.tagName === "TEXTAREA" || el.tagName === "SELECT" || el.isContentEditable) return true;
  return el instanceof HTMLInputElement && !NON_TEXT_INPUTS.has(el.type);
}

function isTyping(event: Event): boolean {
  return isTextField(event.target) || isTextField(document.activeElement);
}

const typedKeys: Record<number, boolean> = {};

export function installKeyboardHandlers(callbacks: InputCallbacks): void {
  window.addEventListener("keydown", (event) => {
    if (event.keyCode === SPACE && event.target === document.body) event.preventDefault();
  });

  window.addEventListener("keydown", (event) => {
    typedKeys[event.which || event.keyCode || 0] = isTyping(event) && event.target !== callbacks.chatInput;
  }, true);
  window.addEventListener("keydown", trusted((event: KeyboardEvent) => handleKeyDown(event, callbacks)));
  window.addEventListener("keyup", trusted((event: KeyboardEvent) => handleKeyUp(event, callbacks)));

  window.addEventListener("focus", () => {
    if (callbacks.isPlaying()) clearHeldKeys();
  });

  document.addEventListener("focusin", (event) => {
    if (!isTextField(event.target) || !callbacks.isPlaying()) return;
    if (!Object.values(heldKeys).some(Boolean)) return;
    clearHeldKeys();
    attack.mouse = attack.key = false;
    if (attack.held) {
      attack.held = 0;
      sendAttackState();
    }
  });
}

function selectKind(kind: ItemKind): boolean {
  const me = state.me!;
  if (kind.weapon !== undefined) {
    if (me.weapons[kind.weapon] == null) return false;
    selectItem(me.weapons[kind.weapon], true);
    return true;
  }
  for (const id of me.items) {
    const item = itemData.list[id];
    if (item && kind.groups.includes(item.group.id)) {
      selectItem(id);
      return true;
    }
  }
  return false;
}

function handleKeyDown(event: KeyboardEvent, callbacks: InputCallbacks): void {
  const code = event.which || event.keyCode || 0;

  if (code === ESCAPE) {
    callbacks.escape();
    return;
  }
  if (isTyping(event)) return;

  const me = state.me;
  if (!me || !callbacks.isPlaying()) return;

  const action = actionFor(code);
  if (action?.menu) {
    if (!event.repeat) callbacks.openMenu(action.menu);
    return;
  }

  if (!callbacks.canUseHotkeys() || heldKeys[code]) return;
  heldKeys[code] = true;

  const id = action?.id;
  const slot = action?.slot;

  if (id === "autoGather") {
    toggleAutoGather();
  } else if (id === "mapMarker") {
    markCurrentPosition();
  } else if (id === "lockDir") {
    toggleLockDir();
  } else if (action?.kind) {
    selectKind(action.kind);
  } else if (slot !== undefined && me.weapons[slot] != null) {
    selectItem(me.weapons[slot], true);
  } else if (slot !== undefined && me.items[slot - me.weapons.length] != null) {
    selectItem(me.items[slot - me.weapons.length]);
  } else if (id === "food") {
    selectItem(me.items[0]);
  } else if (id === "mapPing") {
    pingMinimap();
  } else if (movementKeys()[code]) {
    sendMoveDirection();
  } else if (id === "attack") {
    attack.key = true;
    attack.held = 1;
    sendAttackState();
  }
}

function handleKeyUp(event: KeyboardEvent, callbacks: InputCallbacks): void {
  const code = event.which || event.keyCode || 0;
  if (typedKeys[code]) {
    typedKeys[code] = false;
    return;
  }
  if (!callbacks.isPlaying()) return;

  if (code === ENTER) {
    if (!callbacks.canToggleChat() || (isTyping(event) && document.activeElement !== callbacks.chatInput)) return;
    callbacks.toggleChat();
    return;
  }

  if (isTyping(event)) {
    heldKeys[code] = false;
    return;
  }
  if (!callbacks.canUseHotkeys() || !heldKeys[code]) return;
  heldKeys[code] = false;

  if (movementKeys()[code]) {
    sendMoveDirection();
  } else if (actionFor(code)?.id === "attack") {
    attack.key = false;
    if (!attack.mouse) {
      attack.held = 0;
      sendAttackState();
    }
  }
}
