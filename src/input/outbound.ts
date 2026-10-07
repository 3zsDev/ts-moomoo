import { config } from "../config";
import { state } from "../game/state";
import { connection } from "../net/Connection";
import { ClientPacket } from "../net/protocol";
import { fixTo } from "../utils/math";
import { getAimAngle, touch } from "./aim";
import { movementKeys } from "./keybinds";

export const heldKeys: Record<number, boolean> = {};

export const attack = { held: 0 };

let lastSentMoveAngle: number | undefined;

// the move packet only goes out once the heading changes by more than this
const MOVE_ANGLE_EPSILON = 0.3;

function getMoveAngle(): number | undefined {
  let angle: number | undefined;
  if (touch.usingTouch) {
    if (!touch.active) return undefined;
    angle = touch.moveAngle;
  }

  let x = 0;
  let y = 0;
  const keys = movementKeys();
  for (const code in keys) {
    if (!heldKeys[code]) continue;
    x += keys[code][0];
    y += keys[code][1];
  }

  if (x !== 0 || y !== 0) angle = Math.atan2(y, x);
  return angle === undefined ? undefined : fixTo(angle, 2);
}

export function sendMoveDirection(): void {
  const angle = getMoveAngle();
  const changed =
    lastSentMoveAngle == null || angle == null || Math.abs(angle - lastSentMoveAngle) > MOVE_ANGLE_EPSILON;

  if (!changed) return;
  connection.send(ClientPacket.Move, angle ?? null);
  lastSentMoveAngle = angle;
}

export function sendAttackState(): void {
  const me = state.me;
  if (!me?.alive) return;
  connection.send(ClientPacket.SendHit, attack.held, me.buildIndex >= 0 ? getAimAngle() : null);
}

let lastSentAim: number | undefined;

export function sendAimAngle(): void {
  if (!state.me) return;
  if (state.lastAngleSend && state.now - state.lastAngleSend < 1000 / config.clientSendRate) return;

  state.lastAngleSend = state.now;
  const angle = getAimAngle();
  if (angle === lastSentAim) return;
  lastSentAim = angle;
  connection.send(ClientPacket.SendAim, angle);
}

export function selectItem(index: number, isWeapon = false): void {
  connection.send(ClientPacket.SelectToBuild, index, isWeapon);
}

export function toggleAutoGather(): void {
  connection.send(ClientPacket.AutoGather, 1);
}

// locking rotation is now also reported to the server (K 0)
export function toggleLockDir(): void {
  const me = state.me;
  if (!me) return;
  me.lockDir = !me.lockDir;
  connection.send(ClientPacket.AutoGather, 0);
}

export function pingMinimap(): void {
  connection.send(ClientPacket.PingMap, 1);
}

export function clearHeldKeys(): void {
  for (const key in heldKeys) delete heldKeys[Number(key)];
  lastSentMoveAngle = undefined;
  connection.send(ClientPacket.ResetMovementDir);
}
