import nipplejs from "nipplejs";
import { state } from "../game/state";
import { findById } from "../utils/dom";
import { fixTo } from "../utils/math";
import { setAimAngle, touch } from "./aim";
import { setUsingTouch } from "./inputMode";
import { attack, sendAttackState, sendMoveDirection } from "./outbound";


export const touchControls = {
  startMoving(): void {
    setUsingTouch(true);
    touch.active = true;
  },

  stopMoving(): void {
    touch.active = false;
    sendMoveDirection();
  },

  rotateMoving(angle: number): void {
    touch.moveAngle = fixTo(angle, 2);
    sendMoveDirection();

    if (!touch.aiming) setAimAngle(angle);
  },

  startAttacking(): void {
    setUsingTouch(true);
    touch.aiming = true;
    if (state.me && state.me.buildIndex < 0) {
      attack.held = 1;
      sendAttackState();
    }
  },

  stopAttacking(): void {
    if (state.me && state.me.buildIndex >= 0) {
      attack.held = 1;
      sendAttackState();
    }
    attack.held = 0;
    sendAttackState();
    touch.aiming = false;
  },

  rotateAttacking(angle: number): void {
    setAimAngle(angle);
  },
};

export interface JoystickHooks {
  onGrab?(): void;
}

let joysticksEnabled = false;

interface StickData {
  force: number;
  angle: { radian: number };
}

export function enableJoysticks(hooks: JoystickHooks = {}): void {
  if (joysticksEnabled) return;
  const left = findById("touch-controls-left");
  const right = findById("touch-controls-right");
  if (!left || !right) return;
  joysticksEnabled = true;

  const move = nipplejs.create({ zone: left });
  move.on("start", () => {
    hooks.onGrab?.();
    touchControls.startMoving();
  });
  move.on("end", () => touchControls.stopMoving());
  move.on("move", (event) => {
    const data = event.data as unknown as StickData;
    if (data.force < 0.25) return;
    touchControls.rotateMoving(-data.angle.radian);
  });

  const aim = nipplejs.create({ zone: right });
  aim.on("start", () => {
    hooks.onGrab?.();
    touchControls.startAttacking();
  });
  aim.on("end", () => touchControls.stopAttacking());
  aim.on("move", (event) => {
    const data = event.data as unknown as StickData;
    if (data.force < 0.25) return;
    touchControls.rotateAttacking(-data.angle.radian);
  });

  left.style.display = "block";
  right.style.display = "block";
}
