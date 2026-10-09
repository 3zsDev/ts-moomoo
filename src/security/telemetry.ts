import { nativeWebSocket } from "./natives";
import { protection } from "./options";

export const SecurityFlag = {
  Userscript: 1,
  SocketTampered: 2,
  RenderTampered: 4,
  Debugger: 8,
} as const;

let raised = 0;

export function raiseSecurityFlag(flag: number): void {
  raised |= flag;
}

const fnToString = Function.prototype.toString;

function isNative(fn: unknown): boolean {
  try {
    return typeof fn === "function" && fnToString.call(fn).indexOf("[native code]") !== -1;
  } catch {
    return false;
  }
}

export function securityFlags(): number {
  if (!protection.telemetry) return 0;
  let flags = raised;
  try {
    if (window.WebSocket !== nativeWebSocket || !isNative(window.WebSocket.prototype.send)) flags |= SecurityFlag.SocketTampered;

    const canvas2d = window.CanvasRenderingContext2D?.prototype;
    if (canvas2d && ![canvas2d.drawImage, canvas2d.fillRect, canvas2d.arc, canvas2d.fillText, canvas2d.stroke].every(isNative)) {
      flags |= SecurityFlag.RenderTampered;
    }
    if (!isNative(window.requestAnimationFrame)) flags |= SecurityFlag.RenderTampered;

    const webgl = window.WebGLRenderingContext?.prototype;
    if (webgl && ![webgl.drawElements, webgl.drawArrays, webgl.bufferSubData, webgl.texSubImage2D, webgl.useProgram].every(isNative)) {
      flags |= SecurityFlag.RenderTampered;
    }
    if (!isNative(HTMLCanvasElement.prototype.getContext)) flags |= SecurityFlag.RenderTampered;
  } catch {}
  return flags;
}
