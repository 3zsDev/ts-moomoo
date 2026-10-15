import nipplejs from "nipplejs";
import { state } from "../game/state";
import { findById } from "../utils/dom";
import { loadBool, saveBool } from "../utils/storage";
import { fixTo } from "../utils/math";
import { setAimAngle, touch } from "./aim";
import { setUsingTouch } from "./inputMode";
import { attack, sendAttackState, sendMoveDirection } from "./outbound";


let aimFollowsMove = loadBool("aim_follows_move", true);

export function bindAimFollowsSetting(isTouchDevice: boolean): void {
  const toggle = findById<HTMLInputElement>("aimFollows");
  const row = findById("aimFollowsRow");
  if (!toggle || !row) return;
  row.style.display = isTouchDevice ? "" : "none";
  toggle.checked = aimFollowsMove;
  toggle.onchange = () => {
    aimFollowsMove = toggle.checked;
    saveBool("aim_follows_move", aimFollowsMove);
  };
}

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

    if (!touch.aiming && aimFollowsMove) setAimAngle(angle);
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

type Stick = ReturnType<typeof nipplejs.create>;

function guarded<A extends unknown[]>(handler: (...args: A) => void): (...args: A) => void {
  return (...args) => {
    try {
      handler(...args);
    } catch (error) {
      console.error(error);
    }
  };
}

function releaseStuckSticks(sticks: [zone: HTMLElement, stick: Stick][]): void {
  const release = (stick: Stick) => {
    if (!window.PointerEvent) return;
    for (const pointerId of [...stick.actives.keys()]) {
      if (typeof pointerId !== "number") continue;
      document.dispatchEvent(new PointerEvent("pointerup", { pointerId, bubbles: true }));
    }
  };
  const check = (event?: TouchEvent) => {
    const touches = event?.touches ?? [];
    for (const [zone, stick] of sticks) {
      if (!stick.actives.size) continue;
      let held = false;
      for (let i = 0; i < touches.length; i++) {
        if (zone.contains(touches[i].target as Node)) held = true;
      }
      if (!held) release(stick);
    }
  };

  for (const type of ["touchstart", "touchend", "touchcancel"] as const) {
    window.addEventListener(type, check, true);
  }
  window.addEventListener("blur", () => check());
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) check();
  });
  for (const [, stick] of sticks) {
    stick.on("added", (event) => {
      const el = event.data?.ui?.el;
      if (el) el.style.pointerEvents = "none";
    });
  }
}

export function enableJoysticks(hooks: JoystickHooks = {}): void {
  if (joysticksEnabled) return;
  const left = findById("touch-controls-left");
  const right = findById("touch-controls-right");
  if (!left || !right) return;
  joysticksEnabled = true;

  const move = nipplejs.create({ zone: left });
  move.on("start", guarded(() => {
    hooks.onGrab?.();
    touchControls.startMoving();
  }));
  move.on("end", guarded(() => touchControls.stopMoving()));
  move.on("move", guarded((event) => {
    const data = event.data as unknown as StickData;
    if (data.force < 0.25) return;
    touchControls.rotateMoving(-data.angle.radian);
  }));

  const aim = nipplejs.create({ zone: right });
  aim.on("start", guarded(() => {
    hooks.onGrab?.();
    touchControls.startAttacking();
  }));
  aim.on("end", guarded(() => touchControls.stopAttacking()));
  aim.on("move", guarded((event) => {
    const data = event.data as unknown as StickData;
    if (data.force < 0.25) return;
    touchControls.rotateAttacking(-data.angle.radian);
  }));

  releaseStuckSticks([[left, move], [right, aim]]);

  left.style.display = "block";
  right.style.display = "block";
}
