import { state } from "../game/state";
import { canvas } from "../render/canvas";
import { findById } from "../utils/dom";
import { mouse } from "./aim";
import { isMobileDevice, setUsingTouch } from "./inputMode";
import { attack, sendAttackState } from "./outbound";

let overlay: HTMLElement | null = null;

function hitTheWorld(event: MouseEvent): boolean {
  return event.target === canvas || (overlay !== null && event.target === overlay);
}

function setAttack(held: number): void {
  if (attack.held === held) return;
  attack.held = held;
  sendAttackState();
}

export function installMouseHandlers(): void {
  if (!isMobileDevice()) {
    overlay = findById("touch-controls-fullscreen");
    if (overlay) overlay.style.display = "block";
  }

  window.addEventListener("mousemove", (event) => {
    mouse.x = event.clientX;
    mouse.y = event.clientY;
    if (event.target === overlay) setUsingTouch(false);
  });

  window.addEventListener("mousedown", (event) => {
    if (event.button !== 0 || !state.me?.alive) return;
    if (!hitTheWorld(event)) return;
    setUsingTouch(false);
    setAttack(1);
  });

  window.addEventListener("mouseup", (event) => {
    if (event.button !== 0) return;
    setAttack(0);
  });

  for (const id of ["touch-controls-left", "touch-controls-right", "touch-controls-fullscreen", "storeMenu"]) {
    const el = findById(id);
    if (el) el.oncontextmenu = (event) => event.preventDefault();
  }
}
