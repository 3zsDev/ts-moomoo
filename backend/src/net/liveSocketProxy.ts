import { createHash } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { Duplex } from "node:stream";
import { connect as connectTls, type TLSSocket } from "node:tls";
import type { Socket } from "node:net";

const GUID = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11";
const LIVE_HOST = /^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)*moomoo\.io$/;
const HANDSHAKE_TIMEOUT = 10000;
const MAX_HEADER_BYTES = 16384;

function reject(socket: Duplex, status: number, message: string): void {
  socket.end(`HTTP/1.1 ${status} ${message}\r\nConnection: close\r\nContent-Length: 0\r\n\r\n`);
}

function isLoopback(address: string): boolean {
  const ip = address.replace(/^::ffff:/, "");
  return ip === "127.0.0.1" || ip === "::1";
}

const SITE_ORIGINS: Record<string, string> = {
  prod: "https://moomoo.io",
  sandbox: "https://sandbox.moomoo.io",
  dev: "https://dev.moomoo.io",
};

const PROTOCOL_FILE = /^\/p\/([A-Za-z0-9_-]+\.js)$/;
const IMPORT_MAP_ENTRY = /"moomoo-protocol"\s*:\s*"\/p\/([A-Za-z0-9_-]+\.js)"/;
const MAX_CACHED_MODULES = 32;
const FETCH_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36",
};
const moduleCache = new Map<string, string>();

async function fetchText(url: string): Promise<string> {
  const response = await fetch(url, { headers: FETCH_HEADERS, signal: AbortSignal.timeout(8000) });
  if (!response.ok) throw new Error(`${url} answered ${response.status}`);
  return response.text();
}

async function currentProtocolFile(origin: string): Promise<string> {
  const file = IMPORT_MAP_ENTRY.exec(await fetchText(`${origin}/`))?.[1];
  if (!file) throw new Error("no protocol module in the live import map");
  return file;
}

async function protocolModule(origin: string, file: string): Promise<string> {
  const key = `${origin}/p/${file}`;
  let source = moduleCache.get(key);
  if (source === undefined) {
    source = await fetchText(key);
    if (moduleCache.size >= MAX_CACHED_MODULES) moduleCache.clear();
    moduleCache.set(key, source);
    console.log(`[live] pulled ${key}`);
  }
  return source;
}

function sendText(response: ServerResponse, status: number, type: string, body: string): void {
  response.writeHead(status, { "Content-Type": type, "Cache-Control": "no-store" });
  response.end(body);
}

export function serveLiveProtocol(request: IncomingMessage, response: ServerResponse): boolean {
  const requestUrl = new URL(request.url ?? "/", "http://localhost");
  const isLookup = requestUrl.pathname === "/p/live.json";
  const file = isLookup ? null : PROTOCOL_FILE.exec(requestUrl.pathname)?.[1];
  if (!isLookup && !file) return false;

  const origin = SITE_ORIGINS[requestUrl.searchParams.get("environment") ?? "prod"];
  if (!origin) {
    sendText(response, 400, "text/plain", "bad environment");
    return true;
  }

  const job = isLookup
    ? currentProtocolFile(origin).then((name) => sendText(response, 200, "application/json", JSON.stringify({ file: name })))
    : protocolModule(origin, file!).then((source) => sendText(response, 200, "text/javascript; charset=utf-8", source));
  job.catch((error: Error) => {
    console.warn(`[live] can't pull the protocol from ${origin}/p/: ${error.message}`);
    if (!response.headersSent) sendText(response, 502, "text/plain", "live protocol unavailable");
  });
  return true;
}

export function proxyLiveSocket(request: IncomingMessage, client: Duplex, head: Buffer): boolean {
  const requestUrl = new URL(request.url ?? "/", "http://localhost");
  if (requestUrl.pathname !== "/live") return false;

  const clientSocket = client as Socket;
  if (!isLoopback(clientSocket.remoteAddress ?? "")) {
    reject(client, 403, "Forbidden");
    return true;
  }

  const host = (requestUrl.searchParams.get("host") ?? "").toLowerCase();
  const environment = requestUrl.searchParams.get("environment");
  const key = request.headers["sec-websocket-key"];
  if (
    !LIVE_HOST.test(host) ||
    (environment !== "prod" && environment !== "sandbox" && environment !== "dev") ||
    request.headers.upgrade?.toLowerCase() !== "websocket" ||
    typeof key !== "string" ||
    String(request.headers["sec-websocket-version"]) !== "13"
  ) {
    reject(client, 400, "Bad Request");
    return true;
  }

  requestUrl.searchParams.delete("host");
  requestUrl.searchParams.delete("environment");
  const upstreamPath = requestUrl.search ? `/${requestUrl.search}` : "/";
  const origin = SITE_ORIGINS[environment];
  const upstream: TLSSocket = connectTls({
    host,
    port: 443,
    servername: host,
    ALPNProtocols: ["http/1.1"],
  });
  let upgraded = false;
  let done = false;
  let response = Buffer.alloc(0);

  const fail = (status: number, message: string) => {
    if (done) return;
    done = true;
    clearTimeout(timer);
    upstream.destroy();
    if (client.destroyed) return;
    if (upgraded) client.destroy();
    else reject(client, status, message);
  };
  const timer = setTimeout(() => fail(504, "Gateway Timeout"), HANDSHAKE_TIMEOUT);

  client.on("error", () => fail(502, "Bad Gateway"));
  client.once("close", () => fail(502, "Bad Gateway"));
  upstream.on("error", () => fail(502, "Bad Gateway"));
  upstream.once("close", () => fail(502, "Bad Gateway"));

  upstream.once("secureConnect", () => {
    const lines = [
      `GET ${upstreamPath} HTTP/1.1`,
      `Host: ${host}`,
      "Upgrade: websocket",
      "Connection: Upgrade",
      `Sec-WebSocket-Key: ${key}`,
      "Sec-WebSocket-Version: 13",
      `Origin: ${origin}`,
    ];
    const userAgent = request.headers["user-agent"];
    if (typeof userAgent === "string") lines.push(`User-Agent: ${userAgent}`);
    const extensions = request.headers["sec-websocket-extensions"];
    if (typeof extensions === "string") lines.push(`Sec-WebSocket-Extensions: ${extensions}`);
    upstream.write(`${lines.join("\r\n")}\r\n\r\n`);
  });

  const onHandshake = (chunk: Buffer) => {
    response = Buffer.concat([response, chunk]);
    const boundary = response.indexOf("\r\n\r\n");
    if (boundary < 0) {
      if (response.length > MAX_HEADER_BYTES) fail(502, "Bad Gateway");
      return;
    }

    const header = response.subarray(0, boundary + 4);
    const headerText = header.toString("latin1");
    const expectedAccept = createHash("sha1").update(key + GUID).digest("base64");
    const actualAccept = headerText
      .split("\r\n")
      .find((line) => /^sec-websocket-accept:/i.test(line))
      ?.slice("sec-websocket-accept:".length)
      .trim();
    if (!/^HTTP\/1\.[01] 101\b/.test(headerText) || actualAccept !== expectedAccept) {
      fail(502, "Bad Gateway");
      return;
    }

    upgraded = true;
    clearTimeout(timer);
    upstream.off("data", onHandshake);
    client.write(header);
    const remaining = response.subarray(boundary + 4);
    if (remaining.length) client.write(remaining);
    if (head.length) upstream.write(head);
    upstream.pipe(client);
    client.pipe(upstream);
  };
  upstream.on("data", onHandshake);

  return true;
}
