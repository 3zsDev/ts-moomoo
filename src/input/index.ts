import { installKeyboardHandlers, type InputCallbacks } from "./keyboard";
import { installMouseHandlers } from "./mouse";

export { getAimAngle, setAimAngle } from "./aim";
export {
  actionFor, boundKey, boundKeyName, capturingAction, isCapturingKey, KEY_ACTIONS, keyName,
  movementKeys, onKeybindsChange, resetKeybinds, toggleCapture, type MenuId,
} from "./keybinds";
export { initInputMode, isMobileDevice, isUsingTouch, setUsingTouch } from "./inputMode";
export {
  clearHeldKeys, pingMinimap, selectItem, sendAimAngle, sendAttackState, sendMoveDirection, tapBarItem,
  toggleAutoGather, toggleLockDir,
} from "./outbound";
export { bindAimFollowsSetting, enableJoysticks, touchControls } from "./touch";
export type { InputCallbacks } from "./keyboard";

export function installInputHandlers(callbacks: InputCallbacks): void {
  installMouseHandlers();
  installKeyboardHandlers(callbacks);
}
