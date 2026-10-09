import { isLocal, queryParam } from "../environment";

const API_URL = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

const PRODUCTION_SITEKEY = "0x4AAAAAAAMYHI96GFiJzMmp";
const LOCALHOST_SITEKEY = "1x00000000000000000000AA";
// cloudflare's test key that always shows the interactive challenge - dont use, i only need for local testing and too lazy to remove
const LOCALHOST_INTERACTIVE_SITEKEY = "3x00000000000000000000FF";

const RENDER_POLL_INTERVAL = 150;
const MAX_RENDER_ATTEMPTS = 100;

interface TurnstileRenderOptions {
  sitekey: string;
  theme: "light" | "dark" | "auto";
  appearance: "always" | "execute" | "interaction-only";
  callback: (token: string) => void;
  "error-callback": () => boolean | void;
  "expired-callback": () => void;
  "before-interactive-callback": () => void;
  "after-interactive-callback": () => void;
}

interface TurnstileApi {
  render(container: HTMLElement, options: TurnstileRenderOptions): string | null | undefined;
  reset(widgetId?: string): void;
  remove(widgetId?: string): void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
    onGotTurnstileToken?: (token: string) => void;
    onTurnstileError?: () => boolean;
    onTurnstileExpired?: () => void;
  }
}

export type TurnstileEvent = "token" | "error" | "expired" | "interactive" | "blocked";

export const turnstileState = {
  interactive: false,
  failed: false,
  blocked: false,
};

let token: string | null = null;
let widgetId: string | null = null;
let scriptRequested = false;
let scriptFailed = false;
let pollTimer: ReturnType<typeof setInterval> | null = null;
const requiredByDefault = !isLocal() || queryParam("cf") !== null;
let captchaRequired = requiredByDefault;
const listeners: ((event: TurnstileEvent) => void)[] = [];

function emit(event: TurnstileEvent): void {
  for (const listener of listeners) listener(event);
}

export function onTurnstileEvent(listener: (event: TurnstileEvent) => void): void {
  listeners.push(listener);
}

function sitekey(): string {
  if (!isLocal()) return PRODUCTION_SITEKEY;
  return queryParam("cf") === "interactive" ? LOCALHOST_INTERACTIVE_SITEKEY : LOCALHOST_SITEKEY;
}

export function getCaptchaToken(): string | null {
  if (!token || !isCaptchaRequired()) return null;
  return `cf:${token}`;
}

export function hasCaptchaToken(): boolean {
  return token !== null;
}

export function isCaptchaRequired(): boolean {
  return captchaRequired;
}

export function setCaptchaRequired(on: boolean): void {
  if (captchaRequired === on) return;
  captchaRequired = on;
  if (on) ensureWidget();
}

export function setLocalServerSelected(local: boolean, live = false): void {
  setCaptchaRequired(requiredByDefault && !local && !live);
}

export function isTurnstileApiReady(): boolean {
  return typeof window.turnstile?.render === "function";
}

export function isTurnstileScriptBlocked(): boolean {
  return scriptFailed;
}

function handleToken(value: string): void {
  token = value;
  turnstileState.failed = false;
  turnstileState.blocked = false;
  turnstileState.interactive = false;
  emit("token");
}

function handleError(): boolean {
  token = null;
  turnstileState.failed = true;
  emit("error");
  return true;
}

function handleExpired(): void {
  token = null;
  emit("expired");
}

export function initTurnstile(): void {
  window.onGotTurnstileToken = handleToken;
  window.onTurnstileError = handleError;
  window.onTurnstileExpired = handleExpired;

  if (captchaRequired) ensureWidget();
}

export function ensureWidget(): void {
  if (widgetId !== null) return;
  loadScript();
  if (tryRender() || pollTimer) return;

  let attempts = 0;
  pollTimer = setInterval(() => {
    if (tryRender() || ++attempts > MAX_RENDER_ATTEMPTS) stopPolling();
  }, RENDER_POLL_INTERVAL);
}

export function resetTurnstile(): void {
  token = null;
  if (widgetId === null) return;
  try {
    window.turnstile?.reset(widgetId);
  } catch {}
}

export function retryTurnstile(): void {
  turnstileState.failed = false;
  if (turnstileState.blocked) {
    turnstileState.blocked = false;
    ensureWidget();
    return;
  }
  resetTurnstile();
}

function stopPolling(): void {
  if (pollTimer) clearInterval(pollTimer);
  pollTimer = null;
}

function loadScript(): void {
  if (scriptRequested || isTurnstileApiReady()) return;
  scriptRequested = true;
  scriptFailed = false;

  const script = document.createElement("script");
  script.src = API_URL;
  script.async = true;
  script.defer = true;
  script.onerror = () => {
    console.error("[turnstile] api script failed to load (blocked by an extension / tracking protection?)");
    scriptFailed = true;
    turnstileState.blocked = true;
    scriptRequested = false;
    script.remove();
    emit("blocked");
  };
  document.head.appendChild(script);
}

function tryRender(): boolean {
  if (widgetId !== null) return true;
  if (!isTurnstileApiReady()) return false;

  const container = document.getElementById("turnstileWidget");
  if (!container) return false;

  try {
    widgetId =
      window.turnstile!.render(container, {
        sitekey: sitekey(),
        theme: "light",
        appearance: "interaction-only",
        callback: handleToken,
        "error-callback": handleError,
        "expired-callback": handleExpired,
        "before-interactive-callback": () => {
          turnstileState.interactive = true;
          emit("interactive");
        },
        "after-interactive-callback": () => {
          turnstileState.interactive = false;
        },
      }) ?? null;
    return widgetId !== null;
  } catch (error) {
    console.error("[turnstile] render failed", error);
    return false;
  }
}
