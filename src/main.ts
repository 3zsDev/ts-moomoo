import { initializeFrvrSdk } from "./pageStubs";
import { installPageShell } from "./ui/pageShell";
import { lerpAngle } from "./utils/angles";

declare global {
  interface Window {
    loadedScript: boolean;
  }
  interface Math {
    lerpAngle: typeof lerpAngle;
  }
}

function installLiveGlobals(): void {
  window.loadedScript = true;
  Math.lerpAngle = lerpAngle;
  (CanvasRenderingContext2D.prototype as unknown as { roundRect: unknown }).roundRect = function (
    this: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, r: number,
  ): CanvasRenderingContext2D {
    if (width < 2 * r) r = width / 2;
    if (height < 2 * r) r = height / 2;
    if (r < 0) r = 0;
    this.beginPath();
    this.moveTo(x + r, y);
    this.arcTo(x + width, y, x + width, y + height, r);
    this.arcTo(x + width, y + height, x, y + height, r);
    this.arcTo(x, y + height, x, y, r);
    this.arcTo(x, y, x + width, y, r);
    this.closePath();
    return this;
  };
}

installLiveGlobals();

async function start(): Promise<void> {
  await installPageShell();
  await initializeFrvrSdk();

  const { boot } = await import("./boot");
  boot();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => void start(), { once: true });
} else {
  void start();
}
