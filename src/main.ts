import { installPageStubs } from "./pageStubs";
import { installPageShell } from "./ui/pageShell";

installPageStubs();

async function start(): Promise<void> {
  await installPageShell();

  const { boot } = await import("./boot");
  boot();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => void start(), { once: true });
} else {
  void start();
}
