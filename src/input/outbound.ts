import { config } from "../config";
import { state } from "../game/state";
import { connection } from "../net/Connection";
import { ClientPacket } from "../net/protocol";
import { getAngleDist } from "../utils/angles";
import { fixTo } from "../utils/math";
import { getAimAngle, touch } from "./aim";
import { MOVEMENT_KEYS } from "./bindings";

export const heldKeys: Record<number, boolean> = {};

export const attack = { held: 0 };

let lastSentMoveAngle: number | undefined;

const MOVE_ANGLE_EPSILON = 0.05;

function getMoveAngle(): number | undefined {
  if (touch.active) return touch.moveAngle;

  let x = 0;
  let y = 0;
  for (const code in MOVEMENT_KEYS) {
    if (!heldKeys[code]) continue;
    const [dx, dy] = MOVEMENT_KEYS[code];
    x += dx;
    y += dy;
  }

  x = Math.sign(x);
  y = Math.sign(y);

  if (x === 0 && y === 0) return undefined;
  return fixTo(Math.atan2(y, x), 2);
}

export function sendMoveDirection(): void {
  const angle = getMoveAngle();
  const unchanged =
    angle == null || lastSentMoveAngle == null
      ? angle === lastSentMoveAngle
      : getAngleDist(angle, lastSentMoveAngle) <= MOVE_ANGLE_EPSILON;

  if (unchanged) return;
  connection.send(ClientPacket.Move, angle ?? null);
  lastSentMoveAngle = angle;
}

export function sendAttackState(): void {
  const me = state.me;
  if (!me?.alive) return;
  connection.send(ClientPacket.SendHit, attack.held, me.buildIndex >= 0 ? getAimAngle() : null);
}

export function sendAimAngle(): void {
  if (!state.me) return;
  if (state.lastAngleSend && state.now - state.lastAngleSend < 1000 / config.clientSendRate) return;

  state.lastAngleSend = state.now;
  connection.send(ClientPacket.SendAim, getAimAngle());
}

export function selectItem(index: number, isWeapon = false): void {
  connection.send(ClientPacket.SelectToBuild, index, isWeapon);
}

export function clearHeldKeys(): void {
  for (const key in heldKeys) delete heldKeys[Number(key)];
  lastSentMoveAngle = undefined;
  connection.send(ClientPacket.ResetMovementDir);
}
