import { state } from "../game/state";
import { fixTo } from "../utils/math";
import { setAimAngle, touch } from "./aim";
import { attack, sendAttackState, sendMoveDirection } from "./outbound";

export const touchControls = {
  startMoving(): void {
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
    touch.active = true;
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
