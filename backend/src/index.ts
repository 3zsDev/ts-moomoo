import { createServer, type IncomingMessage, type ServerResponse } from "node:http";

import { serverConfig } from "./config";
import { forceSandbox } from "./shared";
import { admit, fetchReserved, internalHeaders } from "./net/api";
import { Client } from "./net/Client";
import { serveStatic } from "./net/static";
import { attachWebSocketServer } from "./net/websocket";
import { createSimulation } from "./sim";
import type { ModerationAction } from "./sim/game/Game";

forceSandbox(serverConfig.sandbox);

const game = createSimulation();

const localSite = JSON.stringify({
  sandbox: serverConfig.sandbox,
  peer: serverConfig.peerUrl || null,
  api: serverConfig.apiEnabled,
}).replace(/[<>]/g, "");
const INJECT_HEAD = serverConfig.wsOnly ? "" : `<script>window.__MOOMOO_LOCAL__=${localSite};</script>`;

const API_ROUTE = /^\/(join|account|account\/socials|account\/prefs|name|name-check|profile|clan|clan-check|clan\/[a-z]+|top|mod\/[a-z]+|names-for|friends\/allow|discord\/link)$/;
const MODERATION_ACTIONS = new Set(["kick", "ban", "shadow", "clear"]);

function selfServerList(): unknown[] {
  const entry = {
    region: serverConfig.region,
    key: `${serverConfig.region}:${serverConfig.name}:0`,
    name: serverConfig.name,
    index: 0,
    port: serverConfig.port,
    playerCount: game.playerCount,
    playerCapacity: serverConfig.playerCapacity,
    isPrivate: false,
    sandbox: serverConfig.sandbox,
    auth: serverConfig.membersOnly || undefined,
  };

  return [{
    ...entry,
    games: [{
      playerCount: entry.playerCount,
      playerCapacity: entry.playerCapacity,
      isPrivate: false,
    }],
  }];
}

function sendJson(res: ServerResponse, body: unknown, status = 200): void {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(payload),
    "Cache-Control": "no-store",
  });
  res.end(payload);
}

function readBody(req: IncomingMessage, limit = 64 * 1024): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    req.on("data", (chunk: Buffer) => {
      size += chunk.length;
      if (size > limit) {
        reject(new Error("body too large"));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

function remoteAddress(req: IncomingMessage): string {
  return String(req.socket.remoteAddress ?? "").replace(/^::ffff:/, "");
}

// the api calling in: the shared key, or this machine when there isn't one
function isInternal(req: IncomingMessage): boolean {
  if (serverConfig.internalKey) return req.headers["x-internal-key"] === serverConfig.internalKey;
  const address = remoteAddress(req);
  return address === "127.0.0.1" || address === "::1";
}

async function proxyToApi(req: IncomingMessage, res: ServerResponse, url: string): Promise<void> {
  try {
    const body = req.method === "POST" ? await readBody(req) : undefined;
    const response = await fetch(`${serverConfig.apiUrl}${url}`, {
      method: req.method,
      headers: { ...internalHeaders(), "x-forwarded-for": remoteAddress(req) },
      body,
      signal: AbortSignal.timeout(10000),
    });
    const text = await response.text();
    res.writeHead(response.status, {
      "Content-Type": response.headers.get("content-type") ?? "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    });
    res.end(text);
  } catch {
    sendJson(res, { error: "unavailable" }, 503);
  }
}

async function handleInternal(req: IncomingMessage, res: ServerResponse, path: string): Promise<void> {
  if (!isInternal(req)) {
    sendJson(res, { error: "forbidden" }, 403);
    return;
  }

  let body: Record<string, unknown>;
  try {
    body = JSON.parse((await readBody(req)) || "{}");
  } catch {
    sendJson(res, { error: "invalid" }, 400);
    return;
  }

  if (path === "/internal/moderate") {
    const action = String(body.action);
    if (!MODERATION_ACTIONS.has(action)) {
      sendJson(res, { error: "invalid" }, 400);
      return;
    }
    const target = {
      id: typeof body.id === "string" ? body.id : undefined,
      did: typeof body.did === "string" ? body.did : undefined,
    };
    sendJson(res, { ok: true, matched: game.moderate(target, action as ModerationAction) });
    return;
  }

  if (path === "/internal/shutdown") {
    void shutdown(Number(body.seconds) || 0);
    sendJson(res, { ok: true });
    return;
  }

  sendJson(res, { error: "not found" }, 404);
}

const http = createServer((req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Allow-Private-Network", "true");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  const path = (req.url ?? "/").split("?")[0];

  if (path === "/ping") {
    res.writeHead(200, { "Content-Type": "text/plain", "Cache-Control": "no-store" });
    res.end("pong");
    return;
  }

  if (path === "/servers") {
    sendJson(res, selfServerList());
    return;
  }

  if (path === "/sim") {
    sendJson(res, game.simStats());
    return;
  }

  if (path === "/health") {
    sendJson(res, {
      ok: true,
      region: serverConfig.region,
      name: serverConfig.name,
      sandbox: serverConfig.sandbox,
      wsOnly: serverConfig.wsOnly,
      playerCount: game.playerCount,
      objects: game.gameObjects.length,
      animals: game.animals.length,
    });
    return;
  }

  if (path.startsWith("/internal/") && req.method === "POST") {
    void handleInternal(req, res, path);
    return;
  }

  if (API_ROUTE.test(path)) {
    if (!serverConfig.apiEnabled) {
      sendJson(res, { error: "unavailable" }, 503);
      return;
    }
    void proxyToApi(req, res, req.url ?? path);
    return;
  }

  if (req.method !== "GET") {
    res.writeHead(405, { "Content-Type": "text/plain" });
    res.end("method not allowed");
    return;
  }

  if (serverConfig.wsOnly) {
    sendJson(res, { error: "websocket only", hint: "connect over ws://" }, 404);
    return;
  }

  serveStatic(res, serverConfig.publicDir, path, INJECT_HEAD);
});

attachWebSocketServer(http, async (socket) => {
  const ip = socket.remoteAddress.replace(/^::ffff:/, "");
  const admission = await admit(socket.url.searchParams.get("token"), ip);
  if (socket.closed) return;

  const client = new Client(socket);
  if (!admission.ok) {
    game.turnAway(client, admission.reason);
    return;
  }
  if (!game.addClient(client, admission.session)) return;

  const who = admission.session.account?.name ?? admission.session.account?.id ?? "guest";
  console.log(`[join] ${client.remoteAddress} ${who} (${game.playerCount} online)`);
});

async function heartbeat(): Promise<void> {
  if (serverConfig.wsOnly || !serverConfig.apiEnabled) return;
  try {
    await fetch(`${serverConfig.apiUrl}/internal/heartbeat`, {
      method: "POST",
      headers: internalHeaders(),
      body: JSON.stringify({
        region: serverConfig.region,
        name: serverConfig.name,
        playerCount: game.playerCount,
        port: serverConfig.port,
        sandbox: serverConfig.sandbox,
      }),
      signal: AbortSignal.timeout(3000),
    });
  } catch {
  }
}

async function refreshReserved(): Promise<void> {
  const reserved = await fetchReserved();
  if (reserved) game.setReserved(reserved.names, reserved.clans);
}

http.listen(serverConfig.port, serverConfig.host, () => {
  game.start();
  if (serverConfig.wsOnly) console.log(`  listening on ws://localhost:${serverConfig.port}`);
  else console.log(`  play at http://localhost:${serverConfig.port}`);
  console.log(`  region  ${serverConfig.region}:${serverConfig.name}${serverConfig.sandbox ? " (sandbox)" : ""}`);
  void heartbeat();
  void refreshReserved();
});

const beatTimer = setInterval(() => void heartbeat(), serverConfig.heartbeatInterval);
const reservedTimer = setInterval(() => void refreshReserved(), serverConfig.reservedRefresh);

let shuttingDown = false;

async function shutdown(seconds: number): Promise<void> {
  if (shuttingDown) {
    process.exit(0);
  }
  shuttingDown = true;
  clearInterval(beatTimer);
  clearInterval(reservedTimer);

  for (let left = Math.round(seconds); left > 0 && game.humanCount() > 0; left--) {
    game.shutdownNotice(left);
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  game.kickAll("Server is restarting - pick another");
  game.stop();
  http.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 1000).unref();
}

process.on("SIGINT", () => void shutdown(0));
process.on("SIGTERM", () => void shutdown(serverConfig.shutdownNotice));
