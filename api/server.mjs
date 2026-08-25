import { createReadStream, existsSync, readFileSync, statSync } from "node:fs";
import { createServer } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));

const PORT = Number(process.env.API_PORT ?? 8080);
const HOST = process.env.API_HOST ?? "0.0.0.0";
const PUBLIC_DIR = path.resolve(root, process.env.PUBLIC_DIR ?? "../dist/game");
const HEARTBEAT_TIMEOUT = 15000;

const SANDBOX_PORT = process.env.SANDBOX_PORT ?? "3001";
const LOCAL_SITE = JSON.stringify({
  sandbox: false,
  peer: `http://localhost:${SANDBOX_PORT}/`,
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

const heartbeats = new Map();

function loadRegistry() {
  const raw = JSON.parse(readFileSync(path.join(root, "servers.json"), "utf8"));
  const entries = [];

  for (const region of raw.regions) {
    for (const server of region.servers) {
      entries.push({
        region: region.region,
        key: `${region.region}:${server.name}:${server.index ?? 0}`,
        name: String(server.name),
        index: server.index ?? 0,
        port: server.port,
        playerCapacity: server.playerCapacity ?? 40,
      });
    }
  }
  return entries;
}

let registry = loadRegistry();

function serverList() {
  const now = Date.now();

  return registry.map((entry) => {
    const beat = heartbeats.get(`${entry.region}:${entry.name}`);
    const alive = beat && now - beat.at <= HEARTBEAT_TIMEOUT;

    return {
      ...entry,
      playerCount: alive ? beat.playerCount : 0,
      isPrivate: false,
      games: [
        {
          playerCount: alive ? beat.playerCount : 0,
          playerCapacity: entry.playerCapacity,
          isPrivate: false,
        },
      ],
    };
  });
}

function applyCors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

function sendJson(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(payload),
    "Cache-Control": "no-store",
  });
  res.end(payload);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > 64 * 1024) {
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
    sendJson(res, 200, { ok: true, servers: serverList() });
    return;
  }

  if (pathname === "/internal/heartbeat" && req.method === "POST") {
    try {
      const body = JSON.parse(await readBody(req));
      heartbeats.set(`${body.region ?? "0"}:${body.name ?? "1"}`, {
        playerCount: Number(body.playerCount) || 0,
        at: Date.now(),
      });
      sendJson(res, 200, { ok: true });
    } catch (error) {
      sendJson(res, 400, { ok: false, error: String(error) });
    }
    return;
  }

  if (pathname === "/internal/reload" && req.method === "POST") {
    registry = loadRegistry();
    sendJson(res, 200, { ok: true, servers: serverList() });
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
});
