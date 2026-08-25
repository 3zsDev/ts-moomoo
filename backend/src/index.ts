import { createServer } from "node:http";

import { serverConfig } from "./config";
import { forceSandbox } from "./shared";
import { Client } from "./net/Client";
import { serveStatic } from "./net/static";
import { attachWebSocketServer } from "./net/websocket";
import { createSimulation } from "./sim";

forceSandbox(serverConfig.sandbox);

const game = createSimulation();

const localSite = JSON.stringify({
  sandbox: serverConfig.sandbox,
  peer: serverConfig.peerUrl || null,
}).replace(/[<>]/g, "");
// makes a local server register as sandbox
const INJECT_HEAD = serverConfig.wsOnly ? "" : `<script>window.__MOOMOO_LOCAL__=${localSite};</script>`;

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

function sendJson(res: import("node:http").ServerResponse, body: unknown, status = 200): void {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(payload),
    "Cache-Control": "no-store",
  });
  res.end(payload);
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

attachWebSocketServer(http, (socket) => {
  const client = new Client(socket);
  if (!game.addClient(client)) return;
  console.log(`[join] ${client.remoteAddress} (${game.playerCount} online)`);
});

async function heartbeat(): Promise<void> {
  if (serverConfig.wsOnly) return;
  try {
    await fetch(`${serverConfig.apiUrl}/internal/heartbeat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        region: serverConfig.region,
        name: serverConfig.name,
        playerCount: game.playerCount,
      }),
    });
  } catch {
  }
}

http.listen(serverConfig.port, serverConfig.host, () => {
  game.start();
  if (serverConfig.wsOnly) console.log(`  listening on ws://localhost:${serverConfig.port}`);
  else console.log(`  play at http://localhost:${serverConfig.port}`);
  console.log(`  region  ${serverConfig.region}:${serverConfig.name}${serverConfig.sandbox ? " (sandbox)" : ""}`);
  void heartbeat();
});

const beatTimer = setInterval(() => void heartbeat(), serverConfig.heartbeatInterval);

function shutdown(): void {
  clearInterval(beatTimer);
  game.stop();
  http.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 1000).unref();
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
