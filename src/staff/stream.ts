import { apiBase } from "../environment";
import { freshAccessToken } from "../net/api/auth";
import { apiPost } from "../net/api/http";
import type { FeedEntry } from "./api";

const FIRST_RETRY = 5000;
const MAX_RETRY = 2 * 60 * 1000;

export interface Notice {
  text?: string;
  until?: number;
}

export interface StreamHandlers {
  feed(entry: FeedEntry): void;
  notice(notice: Notice | null): void;
  connected(on: boolean): void;
}

let handlers: StreamHandlers | null = null;
let source: EventSource | null = null;
let retryTimer: ReturnType<typeof setTimeout> | undefined;
let retryDelay = FIRST_RETRY;

async function ticket(): Promise<string> {
  try {
    const auth = await freshAccessToken();
    if (!auth) return "";
    const response = await apiPost("/page/ticket", { auth });
    return response.ok ? ((await response.json()) as { t?: string }).t || "" : "";
  } catch {
    return "";
  }
}

function retry(): void {
  source?.close();
  source = null;
  handlers?.connected(false);
  clearTimeout(retryTimer);
  retryTimer = setTimeout(() => void connect(), retryDelay);
  retryDelay = Math.min(retryDelay * 2, MAX_RETRY);
}

async function connect(): Promise<void> {
  const t = await ticket();
  if (!t) {
    retry();
    return;
  }

  const stream = new EventSource(`${apiBase()}/page/stream?t=${encodeURIComponent(t)}`);
  source = stream;
  const listen = (event: string, handler: (data: any) => void) => {
    stream.addEventListener(event, (message) => {
      try {
        handler(JSON.parse((message as MessageEvent<string>).data));
      } catch {}
    });
  };

  listen("hello", (hello) => {
    retryDelay = FIRST_RETRY;
    handlers?.connected(true);
    handlers?.notice(hello.notice || null);
  });
  listen("feed", (entry) => {
    if (entry?.target) handlers?.feed(entry);
  });
  listen("notice", (notice) => handlers?.notice(notice?.text ? notice : null));

  stream.onerror = () => {
    if (source === stream) retry();
  };
}

export function startStream(value: StreamHandlers): void {
  if (typeof EventSource === "undefined") return;
  handlers = value;
  void connect();
}
