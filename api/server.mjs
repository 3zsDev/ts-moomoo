import { createReadStream, existsSync, readFileSync, statSync } from "node:fs";
import { createServer } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { signaturesChecked } from "./lib/auth.mjs";
import { clientIp, internalHeaders, isInternal, readBody, sendJson } from "./lib/http.mjs";
import { Store } from "./lib/store.mjs";
import { accountRoutes } from "./routes/accounts.mjs";
import { clanRoutes } from "./routes/clans.mjs";
import { gameRoutes } from "./routes/game.mjs";
import { modRoutes } from "./routes/mod.mjs";
import { topRoutes } from "./routes/top.mjs";

const root = path.dirname(fileURLToPath(import.meta.url));

const PORT = Number(process.env.API_PORT ?? 8080);
const HOST = process.env.API_HOST ?? "0.0.0.0";
const PUBLIC_DIR = path.resolve(root, process.env.PUBLIC_DIR ?? "../dist/game");
const DATA_FILE = path.resolve(root, process.env.API_DATA ?? "data/db.json");
const HEARTBEAT_TIMEOUT = 15000;

const SANDBOX_PORT = process.env.SANDBOX_PORT ?? "3001";
const LOCAL_SITE = JSON.stringify({
  sandbox: false,
  peer: `http://localhost:${SANDBOX_PORT}/`,
  api: true,
}).replace(/[<>]/g, "");
const INJECT_HEAD = `<script>window.__MOOMOO_LOCAL__=${LOCAL_SITE};</script>`;

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
};

const store = new Store(DATA_FILE);
const servers = new Map();

function liveServers() {
  const now = Date.now();
  return [...servers.values()].filter((beat) => beat.url && now - beat.at <= HEARTBEAT_TIMEOUT);
}

function notifyServers(route, body) {
  for (const server of liveServers()) {
    fetch(`${server.url}${route}`, {
      method: "POST",
      headers: internalHeaders(),
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(3000),
    }).catch(() => {});
  }
}

const ctx = { store, servers, notifyServers };

const routes = { ...gameRoutes, ...accountRoutes, ...clanRoutes, ...topRoutes, ...modRoutes };

function loadRegistry() {
  const raw = JSON.parse(readFileSync(path.join(root, "servers.json"), "utf8"));
  const entries = [];

  for (const region of raw.regions) {
    for (const server of region.servers) {
      entries.push({
        region: region.region,
        regionName: region.regionName,
        key: `${region.region}:${server.name}:${server.index ?? 0}`,
        name: String(server.name),
        port: server.port,
        playerCapacity: server.playerCapacity ?? 40,
        auth: server.auth || undefined,
      });
    }
  }
  return entries;
}

let registry = loadRegistry();

function serverList() {
  const now = Date.now();

  return registry.map((entry) => {
    const beat = servers.get(`${entry.region}:${entry.name}`);
    const alive = beat && now - beat.at <= HEARTBEAT_TIMEOUT;
    return { ...entry, playerCount: alive ? beat.playerCount : 0 };
  });
}

function applyCors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

function serveStatic(req, res, pathname) {
  if (!existsSync(PUBLIC_DIR)) {
    sendJson(res, 404, { error: "client not built", hint: "run: npm run build" });
    return;
  }

  const relative = decodeURIComponent(pathname).replace(/^\/+/, "");
  let target = path.resolve(PUBLIC_DIR, relative || "index.html");

  if (target !== PUBLIC_DIR && !target.startsWith(PUBLIC_DIR + path.sep)) {
    sendJson(res, 403, { error: "forbidden" });
    return;
  }

  if (existsSync(target) && statSync(target).isDirectory()) {
    target = path.join(target, "index.html");
  }
  if (!existsSync(target)) {
    sendJson(res, 404, { error: "not found", path: pathname });
    return;
  }

  if (path.basename(target).toLowerCase() === "index.html") {
    const html = readFileSync(target, "utf8").replace("</head>", INJECT_HEAD + "</head>");
    res.writeHead(200, {
      "Content-Type": MIME_TYPES[".html"],
      "Content-Length": Buffer.byteLength(html),
      "Cache-Control": "no-store",
    });
    res.end(html);
    return;
  }

  const type = MIME_TYPES[path.extname(target).toLowerCase()] ?? "application/octet-stream";
  res.writeHead(200, { "Content-Type": type, "Cache-Control": "no-store" });
  createReadStream(target).pipe(res);
}

async function runRoute(handler, req, res, url) {
  let body = {};
  if (req.method === "POST") {
    try {
      const text = await readBody(req);
      body = text ? JSON.parse(text) : {};
      if (!body || typeof body !== "object" || Array.isArray(body)) body = {};
    } catch {
      sendJson(res, 400, { error: "invalid" });
      return;
    }
  }

  try {
    const result = await handler(ctx, { req, body, query: url.searchParams, ip: clientIp(req) });
    sendJson(res, result.status, result.body);
  } catch (error) {
    console.error(`[api] ${req.method} ${url.pathname} failed:`, error);
    sendJson(res, 500, { error: "server" });
  }
}

const server = createServer(async (req, res) => {
  applyCors(res);

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
  const pathname = url.pathname;

  if (pathname === "/ping") {
    res.writeHead(200, { "Content-Type": "text/plain", "Cache-Control": "no-store" });
    res.end("pong");
    return;
  }

  if (pathname === "/servers") {
    sendJson(res, 200, serverList());
    return;
  }

  if (pathname === "/health") {
    sendJson(res, 200, { ok: true, servers: serverList(), users: Object.keys(store.users).length });
    return;
  }

  if (pathname === "/internal/reload" && req.method === "POST") {
    if (!isInternal(req)) {
      sendJson(res, 403, { error: "forbidden" });
      return;
    }
    registry = loadRegistry();
    sendJson(res, 200, { ok: true, servers: serverList() });
    return;
  }

  const handler = routes[`${req.method} ${pathname}`];
  if (handler) {
    await runRoute(handler, req, res, url);
    return;
  }

  if (req.method !== "GET") {
    sendJson(res, 405, { error: "method not allowed" });
    return;
  }

  serveStatic(req, res, pathname);
});

server.listen(PORT, HOST, () => {
  console.log(`  api      http://localhost:${PORT}`);
  console.log(`  client   ${existsSync(PUBLIC_DIR) ? PUBLIC_DIR : `${PUBLIC_DIR} (not built yet)`}`);
  console.log(`  data     ${DATA_FILE}`);
  if (!signaturesChecked) {
    console.log("  warning  account tokens are decoded, not verified (fine locally; set API_JWKS_URL before going public)");
  }
});

function shutdown() {
  store.flush();
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
