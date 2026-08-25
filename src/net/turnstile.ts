import { isLocal } from "../environment";

const API_URL = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

const PRODUCTION_SITEKEY = "0x4AAAAAAAMYHI96GFiJzMmp";
const LOCALHOST_SITEKEY = "1x00000000000000000000AA";

const RENDER_POLL_INTERVAL = 150;
const MAX_RENDER_ATTEMPTS = 100;

interface TurnstileRenderOptions {
  sitekey: string;
  theme: "light" | "dark" | "auto";
  callback: (token: string) => void;
  "error-callback": () => void;
  "expired-callback": () => void;
}

interface TurnstileApi {
  render(container: HTMLElement, options: TurnstileRenderOptions): string | null;
  reset(widgetId?: string): void;
  remove(widgetId?: string): void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}


let token: string | null = null;
let widgetId: string | null = null;
let scriptRequested = false;
let pollTimer: ReturnType<typeof setInterval> | null = null;
let onTokenChange: ((hasToken: boolean) => void) | null = null;
let captchaRequired = true;

export function getCaptchaToken(): string | null {
  if (!token || !isCaptchaRequired()) return null;
  return `cf:${token}`;
}

export function hasCaptchaToken(): boolean {
  return token !== null;
}

export function isCaptchaRequired(): boolean {
  return captchaRequired && !isLocal();
}

export function setCaptchaRequired(on: boolean): void {
  captchaRequired = on;

  const container = document.getElementById("turnstileWidget");
  if (container) container.style.display = on ? "" : "none";

  if (on) {
    if (!isLocal()) ensureWidget();
  } else {
    stopPolling();
    if (widgetId !== null) {
      window.turnstile?.remove(widgetId);
      widgetId = null;
    }
  }

  onTokenChange?.(hasCaptchaToken());
}

export function initTurnstile(onChange: (hasToken: boolean) => void): void {
  onTokenChange = onChange;
  if (isLocal()) {
    token = "local";
    onChange(true);
    return;
  }

  onChange(false);
  ensureWidget();
}

function ensureWidget(): void {
  loadScript();
  if (tryRender() || pollTimer) return;
  let attempts = 0;
  pollTimer = setInterval(() => {
    if (tryRender() || ++attempts > MAX_RENDER_ATTEMPTS) stopPolling();
  }, RENDER_POLL_INTERVAL);
}

export function resetTurnstile(): void {
  if (!isCaptchaRequired()) return;
  token = null;
  onTokenChange?.(false);
  if (widgetId !== null) window.turnstile?.reset(widgetId);
}

function stopPolling(): void {
  if (pollTimer) clearInterval(pollTimer);
  pollTimer = null;
}

function isApiReady(): boolean {
  return typeof window.turnstile?.render === "function";
}

function loadScript(): void {
  if (scriptRequested || isApiReady()) return;
  scriptRequested = true;

  const script = document.createElement("script");
  script.src = API_URL;
  script.async = true;
  script.defer = true;
  script.onerror = () => {
    console.error("[turnstile] api script failed to load (blocked by an extension?)");
  };
  document.head.appendChild(script);
}

function tryRender(): boolean {
  if (widgetId !== null) return true;
  if (!isApiReady()) return false;

  const container = document.getElementById("turnstileWidget");
  // offsetParent is null while the element or an ancestor is display:none.
  if (!container || container.offsetParent === null) return false;

  try {
    widgetId = window.turnstile!.render(container, {
      sitekey: isLocal() ? LOCALHOST_SITEKEY : PRODUCTION_SITEKEY,
      theme: "light",
      callback: (value: string) => {
        token = value;
        onTokenChange?.(true);
      },
      "error-callback": () => {
        token = null;
        onTokenChange?.(false);
      },
      "expired-callback": () => {
        token = null;
        onTokenChange?.(false);
      },
    });
    return widgetId !== null;
  } catch (error) {
    console.error("[turnstile] render failed", error);
    return false;
  }
}
