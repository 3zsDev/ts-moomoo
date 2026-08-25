import { nativeWebSocket } from "./natives";
import { protection, type ProtectionOptions } from "./options";
import { detectUserscripts } from "./userscriptDetection";

export { protection, type ProtectionOptions } from "./options";
export { createSocket, sendOnSocket } from "./socket";

let applied = false;

export function enableProtection(overrides?: Partial<ProtectionOptions>): void {
  if (applied) return;
  applied = true;

  Object.assign(protection, overrides);

  if (protection.lockWebSocket) lockWebSocket();
  if (protection.blockDevToolsKeys) blockDevToolsKeys();
  if (protection.antiDebug) startAntiDebug();
  if (protection.detectUserscripts) detectUserscripts();
}

function lockWebSocket(): void {
  try {
    Object.defineProperty(window, "WebSocket", {
      value: nativeWebSocket,
      writable: false,
      configurable: false,
    });
  } catch {}
}

function blockDevToolsKeys(): void {
  window.addEventListener("keydown", (event) => {
    const code = event.keyCode;
    const isInspect = event.ctrlKey && event.shiftKey && (code === 73 || code === 74 || code === 67);
    const isViewSource = event.ctrlKey && code === 85;

    if (code === 123 || isInspect || isViewSource) event.preventDefault();
  });
}

function startAntiDebug(): void {
  setInterval(() => {
    debugger;
  }, protection.antiDebugInterval);
}
