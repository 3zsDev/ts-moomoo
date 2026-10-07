import { state } from "../game/state";
import { markCurrentPosition } from "../render/minimap";
import { actionFor, movementKeys } from "./keybinds";
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
  canUseHotkeys(): boolean;
  canToggleChat(): boolean;
}

export function installKeyboardHandlers(callbacks: InputCallbacks): void {
  window.addEventListener("keydown", (event) => {
    if (event.keyCode === SPACE && event.target === document.body) event.preventDefault();
  });

  window.addEventListener("keydown", (event) => handleKeyDown(event, callbacks));
  window.addEventListener("keyup", (event) => handleKeyUp(event, callbacks));

  window.addEventListener("focus", () => {
    if (callbacks.isPlaying()) clearHeldKeys();
  });
}

function handleKeyDown(event: KeyboardEvent, callbacks: InputCallbacks): void {
  const code = event.which || event.keyCode || 0;

  if (code === ESCAPE) {
    callbacks.escape();
    return;
  }

  const me = state.me;
  if (!me || !callbacks.isPlaying() || !callbacks.canUseHotkeys()) return;
  if (heldKeys[code]) return;
  heldKeys[code] = true;

  const action = actionFor(code);
  const id = action?.id;
  const slot = action?.slot;

  if (id === "autoGather") {
    toggleAutoGather();
  } else if (id === "mapMarker") {
    markCurrentPosition();
  } else if (id === "lockDir") {
    toggleLockDir();
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
    attack.held = 1;
    sendAttackState();
  }
}

function handleKeyUp(event: KeyboardEvent, callbacks: InputCallbacks): void {
  if (!callbacks.isPlaying()) return;
  const code = event.which || event.keyCode || 0;

  if (code === ENTER) {
    if (callbacks.canToggleChat()) callbacks.toggleChat();
    return;
  }

  if (!callbacks.canUseHotkeys() || !heldKeys[code]) return;
  heldKeys[code] = false;

  if (movementKeys()[code]) {
    sendMoveDirection();
  } else if (actionFor(code)?.id === "attack") {
    attack.held = 0;
    sendAttackState();
  }
}
