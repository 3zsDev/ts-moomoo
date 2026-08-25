import { installKeyboardHandlers, type InputCallbacks } from "./keyboard";
import { installMouseHandlers } from "./mouse";

export { getAimAngle, setAimAngle } from "./aim";
export { KEY_BINDINGS, MOVEMENT_KEYS } from "./bindings";
export { selectItem, sendAimAngle, sendAttackState, sendMoveDirection, clearHeldKeys } from "./outbound";
export { touchControls } from "./touch";
export type { InputCallbacks } from "./keyboard";

export function installInputHandlers(callbacks: InputCallbacks): void {
  installMouseHandlers();
  installKeyboardHandlers(callbacks);
}
