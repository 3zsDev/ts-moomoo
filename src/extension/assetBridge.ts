declare const chrome: { runtime: { getURL(path: string): string } };

document.documentElement.dataset.tsmoomooAssets = chrome.runtime.getURL("");

// this is if you load the clientside with the extension build, extensions require a specific method for loading sprites

const RELOAD_KEY = "tsmoomoo_sw_reload";

async function removeLiveServiceWorker(): Promise<void> {
  const container = navigator.serviceWorker;
  if (!container) return;

  const controlled = Boolean(container.controller);
  const registrations = await container.getRegistrations();
  await Promise.all(registrations.map((registration) => registration.unregister()));
  if (typeof caches !== "undefined") {
    const keys = await caches.keys();
    await Promise.all(keys.map((key) => caches.delete(key)));
  }

  if (!controlled) {
    sessionStorage.removeItem(RELOAD_KEY);
    return;
  }
  if (sessionStorage.getItem(RELOAD_KEY)) return;
  sessionStorage.setItem(RELOAD_KEY, "1");
  location.reload();
}

removeLiveServiceWorker().catch(() => {});
