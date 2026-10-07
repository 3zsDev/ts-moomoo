import { state } from "../game/state";
import { viewport } from "../render/canvas";
import { fixTo } from "../utils/math";

export const mouse = { x: 0, y: 0 };
export const touch = { usingTouch: false, active: false, moveAngle: 0, aiming: false };

let aimAngle = 0;

export function getAimAngle(): number {
  const me = state.me;
  if (!me) return 0;

  if (!me.lockDir && !touch.usingTouch) {
    aimAngle = Math.atan2(mouse.y - viewport.height / 2, mouse.x - viewport.width / 2);
  }
  return fixTo(aimAngle, 2);
}

export function setAimAngle(angle: number): void {
  aimAngle = angle;
}
