import { installKeyboardHandlers, type InputCallbacks } from "./keyboard";
import { installMouseHandlers } from "./mouse";

export { getAimAngle, setAimAngle } from "./aim";
export {
  actionFor, boundKeyName, capturingAction, isCapturingKey, KEY_ACTIONS, keyName,
  movementKeys, onKeybindsChange, resetKeybinds, toggleCapture,
} from "./keybinds";
export { initInputMode, isMobileDevice, isUsingTouch, setUsingTouch } from "./inputMode";
export {
  clearHeldKeys, pingMinimap, selectItem, sendAimAngle, sendAttackState, sendMoveDirection,
  toggleAutoGather, toggleLockDir,
} from "./outbound";
export { enableJoysticks, touchControls } from "./touch";
export type { InputCallbacks } from "./keyboard";

export function installInputHandlers(callbacks: InputCallbacks): void {
  installMouseHandlers();
  installKeyboardHandlers(callbacks);
}
