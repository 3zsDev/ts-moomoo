import { state } from "../../game/state";
import { autoReload } from "../reload";
import { byId } from "../../utils/dom";

const TICKET_TIMEOUT = 6000;
const FIRST_RETRY = 5000;
const MAX_RETRY = 2 * 60 * 1000;
const MAX_NOTICE_TIME = 24 * 60 * 60 * 1000;

type StreamHandler = (data: any) => void;

export interface Notice {
  text?: string;
  until?: number;
}

export interface StreamOptions {
  apiHost: string;
  token?(): Promise<string | null> | null;
  onBundle?(bundle: string | null): void;
  onNotice?(notice: Notice | null): void;
  onHello?(hello: Record<string, unknown>): void;
  on?: Record<string, StreamHandler>;
}

function ownBundle(): string {
  for (const script of document.querySelectorAll<HTMLScriptElement>("script[src]")) {
    const match = /((?:index|bundle)-[\w-]+)\.js(?:[?#]|$)/.exec(script.src);
    if (match) return match[1];
  }
  return "";
}

let options: StreamOptions | null = null;
let source: EventSource | null = null;
let retryTimer: ReturnType<typeof setTimeout> | undefined;
let retryDelay = FIRST_RETRY;

function stop(): void {
  clearTimeout(retryTimer);
  retryTimer = undefined;
  source?.close();
  source = null;
}

async function ticket(): Promise<string> {
  try {
    const auth = options!.token ? await options!.token() : null;
    if (!auth) return "";
    const response = await fetch(`${options!.apiHost}/page/ticket`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ auth }),
      signal: AbortSignal.timeout(TICKET_TIMEOUT),
    });
    return response.ok ? ((await response.json()) as { t?: string }).t || "" : "";
  } catch {
    return "";
  }
}

async function connect(): Promise<void> {
  stop();
  const t = await ticket();
  if (source || !options) return;

  const opts = options;
  const stream = new EventSource(`${opts.apiHost}/page/stream${t ? `?t=${encodeURIComponent(t)}` : ""}`);
  source = stream;

  const listen = (event: string, handler: StreamHandler) => {
    stream.addEventListener(event, (message) => {
      retryDelay = FIRST_RETRY;
      try {
        handler(JSON.parse((message as MessageEvent<string>).data));
      } catch {}
    });
  };

  listen("hello", (hello) => {
    opts.onBundle?.(hello.bundle || null);
    opts.onNotice?.(hello.notice || null);
    opts.onHello?.(hello);
  });
  for (const [event, handler] of Object.entries(opts.on ?? {})) listen(event, handler);
  listen("bundle", (data) => opts.onBundle?.(data.name || null));
  listen("notice", (data) => opts.onNotice?.(data || null));

  stream.onerror = () => {
    if (source !== stream || stream.readyState !== EventSource.CLOSED) return;
    stop();
    retryTimer = setTimeout(() => void connect(), retryDelay);
    retryDelay = Math.min(retryDelay * 2, MAX_RETRY);
  };
}

export const pageStream = {
  bundle: ownBundle(),

  start(value: StreamOptions): void {
    if (typeof EventSource === "undefined") return;
    options = value;
    void connect();
  },

  restart(): void {
    if (options) void connect();
  },
};

const updateNotice = byId("updateNotice");
const noticeDisplay = byId("noticeDisplay");
let updateLive = false;
let noticeTimer: ReturnType<typeof setTimeout> | undefined;

export function refreshUpdateNotice(): void {
  const playing = state.playing;
  updateNotice.hidden = !updateLive || playing;
  if (updateLive && !playing && document.hidden) autoReload();
}

export function setLiveBundle(bundle: string | null): void {
  updateLive = Boolean(bundle) && Boolean(pageStream.bundle) && bundle !== pageStream.bundle;
  refreshUpdateNotice();
}

export function showPageNotice(notice: Notice | null): void {
  clearTimeout(noticeTimer);
  const left = notice?.text ? (notice.until ?? 0) - Date.now() : 0;
  noticeDisplay.hidden = !(left > 0);
  if (left <= 0) return;
  noticeDisplay.textContent = notice!.text!;
  noticeTimer = setTimeout(() => (noticeDisplay.hidden = true), Math.min(left, MAX_NOTICE_TIME));
}

document.addEventListener("visibilitychange", refreshUpdateNotice);
