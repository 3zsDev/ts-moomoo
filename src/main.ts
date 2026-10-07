import { initializeFrvrSdk } from "./pageStubs";
import { installPageShell } from "./ui/pageShell";

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
