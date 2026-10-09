import { config } from "../config";
import { state } from "../game/state";
import { getDirection, getDistance } from "../utils/geometry";
import { view } from "./surface";

export const camera = {
  left: 0,
  top: 0,
  locked: false,
};

export function updateCamera(delta: number): void {
  const me = state.me;

  if (!me) {
    state.cameraX = config.mapScale / 2;
    state.cameraY = config.mapScale / 2;
  } else {
    const distance = getDistance(state.cameraX, state.cameraY, me.x, me.y);
    if (distance <= 0.05) {
      state.cameraX = me.x;
      state.cameraY = me.y;
    } else {
      const angle = getDirection(me.x, me.y, state.cameraX, state.cameraY);
      const step = Math.min(distance * 0.01 * delta, distance);
      state.cameraX += step * Math.cos(angle);
      state.cameraY += step * Math.sin(angle);
    }
  }

  camera.left = state.cameraX - view.width / 2;
  camera.top = state.cameraY - view.height / 2;
}

export function lockCameraToPlayer(): void {
  const me = state.me;
  if (!camera.locked || !me?.alive) return;
  state.cameraX = me.x;
  state.cameraY = me.y;
  camera.left = state.cameraX - view.width / 2;
  camera.top = state.cameraY - view.height / 2;
}
