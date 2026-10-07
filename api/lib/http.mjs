const INTERNAL_KEY = process.env.INTERNAL_KEY ?? "";

export function sendJson(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(payload),
    "Cache-Control": "no-store",
  });
  res.end(payload);
}

export function readBody(req, limit = 64 * 1024) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on("data", (chunk) => {
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

function socketAddress(req) {
  return String(req.socket.remoteAddress ?? "").replace(/^::ffff:/, "");
}

function isLoopback(address) {
  return address === "127.0.0.1" || address === "::1";
}

export function isInternal(req) {
  if (INTERNAL_KEY) return req.headers["x-internal-key"] === INTERNAL_KEY;
  return isLoopback(socketAddress(req));
}

export function clientIp(req) {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded && isInternal(req)) return forwarded.split(",")[0].trim();
  return socketAddress(req);
}

export function internalHeaders() {
  return INTERNAL_KEY
    ? { "Content-Type": "application/json", "x-internal-key": INTERNAL_KEY }
    : { "Content-Type": "application/json" };
}

export class RateLimiter {
  constructor(limit, windowMs) {
    this.limit = limit;
    this.windowMs = windowMs;
    this.hits = new Map();
  }

  allow(key) {
    const now = Date.now();
    const entry = this.hits.get(key);
    if (!entry || now - entry.start >= this.windowMs) {
      this.hits.set(key, { start: now, count: 1 });
      if (this.hits.size > 10000) this.prune(now);
      return true;
    }
    return ++entry.count <= this.limit;
  }

  prune(now) {
    for (const [key, entry] of this.hits) {
      if (now - entry.start >= this.windowMs) this.hits.delete(key);
    }
  }
}

export const ok = (body = { ok: true }) => ({ status: 200, body });
export const fail = (status, error) => ({ status, body: { error } });
