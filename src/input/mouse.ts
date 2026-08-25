import { state } from "../game/state";
import { canvas } from "../render/canvas";
import { mouse } from "./aim";
import { attack, sendAttackState } from "./outbound";

function hitTheWorld(event: MouseEvent): boolean {
  return event.target === canvas;
}

export function installMouseHandlers(): void {
  window.addEventListener("mousemove", (event) => {
    mouse.x = event.clientX;
    mouse.y = event.clientY;
  });

  window.addEventListener("mousedown", (event) => {
    if (event.button !== 0 || !state.me?.alive) return;
    if (!hitTheWorld(event)) return;
    if (attack.held === 1) return;
    attack.held = 1;
    sendAttackState();
  });

  window.addEventListener("mouseup", (event) => {
    if (event.button !== 0 || attack.held === 0) return;
    attack.held = 0;
    sendAttackState();
  });
}
