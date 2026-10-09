import { state } from "../game/state";
import { canvas } from "../render/surface";
import { trusted } from "../security/trusted";
import { findById } from "../utils/dom";
import { mouse } from "./aim";
import { isMobileDevice, setUsingTouch } from "./inputMode";
import { attack, countNextPress, sendAttackState } from "./outbound";

let overlay: HTMLElement | null = null;

function hitTheWorld(event: MouseEvent): boolean {
  return event.target === canvas || (overlay !== null && event.target === overlay);
}


export function installMouseHandlers(): void {
  if (!isMobileDevice()) {
    overlay = findById("touch-controls-fullscreen");
    if (overlay) overlay.style.display = "block";
  }

  window.addEventListener("mousemove", trusted((event: MouseEvent) => {
    mouse.x = event.clientX;
    mouse.y = event.clientY;
    if (event.target === overlay) setUsingTouch(false);
  }));

  window.addEventListener("mousedown", trusted((event: MouseEvent) => {
    if (event.button !== 0 || !state.me?.alive) return;
    if (!hitTheWorld(event)) return;
    setUsingTouch(false);
    attack.mouse = true;
    attack.held = 1;
    countNextPress();
    sendAttackState();
  }));

  window.addEventListener("mouseup", trusted((event: MouseEvent) => {
    if (event.button !== 0) return;
    setUsingTouch(false);
    if (event.buttons) return;
    attack.mouse = false;
    if (!attack.key && attack.held !== 0) {
      attack.held = 0;
      sendAttackState();
    }
  }));

  for (const id of ["touch-controls-left", "touch-controls-right", "touch-controls-fullscreen", "storeMenu"]) {
    const el = findById(id);
    if (el) el.oncontextmenu = (event) => event.preventDefault();
  }
}
