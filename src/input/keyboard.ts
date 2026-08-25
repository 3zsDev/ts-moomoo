import { state } from "../game/state";
import { connection } from "../net/Connection";
import { ClientPacket } from "../net/protocol";
import { markCurrentPosition } from "../render/minimap";
import { KEY_BINDINGS, MOVEMENT_KEYS } from "./bindings";
import { attack, clearHeldKeys, heldKeys, selectItem, sendAttackState, sendMoveDirection } from "./outbound";

export interface InputCallbacks {
  toggleChat(): void;
  closeMenus(): void;

  canUseHotkeys(): boolean;
}

export function installKeyboardHandlers(callbacks: InputCallbacks): void {
  window.addEventListener("keydown", (event) => {
    if (event.keyCode === KEY_BINDINGS.space && event.target === document.body) event.preventDefault();
  });

  window.addEventListener("keydown", (event) => handleKeyDown(event, callbacks));
  window.addEventListener("keyup", (event) => handleKeyUp(event, callbacks));

  window.addEventListener("blur", () => {
    if (state.me?.alive) clearHeldKeys();
  });
}

function handleKeyDown(event: KeyboardEvent, callbacks: InputCallbacks): void {
  const code = event.which || event.keyCode || 0;

  if (code === KEY_BINDINGS.escape) {
    callbacks.closeMenus();
    return;
  }

  const me = state.me;
  if (!me?.alive || !callbacks.canUseHotkeys()) return;
  if (heldKeys[code]) return;
  heldKeys[code] = true;

  switch (code) {
    case KEY_BINDINGS.autoGather:
      connection.send(ClientPacket.AutoGather, 1);
      return;

    case KEY_BINDINGS.markPosition:
      markCurrentPosition();
      return;

    case KEY_BINDINGS.lockAim:
      me.lockDir = !me.lockDir;
      return;

    case KEY_BINDINGS.quickFood:
      selectItem(me.items[0]);
      return;

    case KEY_BINDINGS.pingMap:
      connection.send(ClientPacket.PingMap, 1);
      return;

    case KEY_BINDINGS.space:
      if (attack.held !== 1) {
        attack.held = 1;
        sendAttackState();
      }
      return;
  }

  const slot = code - KEY_BINDINGS.hotbarStart;
  if (me.weapons[slot] != null) {
    selectItem(me.weapons[slot], true);
    return;
  }
  const itemSlot = slot - me.weapons.length;
  if (me.items[itemSlot] != null) {
    selectItem(me.items[itemSlot]);
    return;
  }

  if (MOVEMENT_KEYS[code]) sendMoveDirection();
}

function handleKeyUp(event: KeyboardEvent, callbacks: InputCallbacks): void {
  const code = event.which || event.keyCode || 0;
  const wasHeld = heldKeys[code];
  heldKeys[code] = false;

  const me = state.me;
  if (!me?.alive) return;

  if (code === KEY_BINDINGS.enter) {
    callbacks.toggleChat();
    return;
  }

  if (!wasHeld) return;

  if (MOVEMENT_KEYS[code]) {
    sendMoveDirection();
  } else if (code === KEY_BINDINGS.space && callbacks.canUseHotkeys()) {
    attack.held = 0;
    sendAttackState();
  }
}
