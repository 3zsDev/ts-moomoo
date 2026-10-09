import { createReadStream, existsSync, readFileSync, statSync } from "node:fs";
import type { ServerResponse } from "node:http";
import path from "node:path";

const MIME_TYPES: Record<string, string> = {
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

function sendError(res: ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(payload),
  });
  res.end(payload);
}

export function shareLinkRedirect(pathname: string): string | null {
  const match = /^\/(player|clan)\/([^/]+)\/?$/.exec(pathname);
  if (!match) return null;
  let value: string;
  try {
    value = decodeURIComponent(match[2]);
  } catch {
    return null;
  }
  return `/?${match[1] === "player" ? "profile" : "clan"}=${encodeURIComponent(value)}`;
}

export function serveStatic(
  res: ServerResponse, publicDir: string, pathname: string, injectHead = "",
): void {
  const redirect = shareLinkRedirect(pathname);
  if (redirect) {
    res.writeHead(302, { Location: redirect, "Cache-Control": "no-store" });
    res.end();
    return;
  }

  if (!existsSync(publicDir)) {
    sendError(res, 404, { error: "client not built", hint: "run: npm run build" });
    return;
  }

  const relative = decodeURIComponent(pathname).replace(/^\/+/, "");
  let target = path.resolve(publicDir, relative || "index.html");

  if (target !== publicDir && !target.startsWith(publicDir + path.sep)) {
    sendError(res, 403, { error: "forbidden" });
    return;
  }

  if (existsSync(target) && statSync(target).isDirectory()) {
    target = path.join(target, "index.html");
  }
  if (!existsSync(target)) {
    sendError(res, 404, { error: "not found", path: pathname });
    return;
  }

  if (injectHead && path.basename(target).toLowerCase() === "index.html") {
    const html = readFileSync(target, "utf8").replace("</head>", injectHead + "</head>");
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
