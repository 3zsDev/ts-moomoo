import { randomBytes } from "node:crypto";

const TICKET_TTL = 60 * 1000;
const PING_EVERY = 25 * 1000;
const MAX_PER_IP = 12;
const MAX_TICKETS = 20000;

export class PageHub {
  constructor() {
    this.connections = new Set();
    this.tickets = new Map();
    this.byIp = new Map();

    setInterval(() => {
      const now = Date.now();
      for (const [ticket, entry] of this.tickets) if (now - entry.at > TICKET_TTL) this.tickets.delete(ticket);
      for (const connection of this.connections) this.write(connection, ": ping\n\n");
    }, PING_EVERY).unref();
  }

  ticket(userId) {
    if (this.tickets.size > MAX_TICKETS) this.tickets.clear();
    const t = randomBytes(18).toString("base64url");
    this.tickets.set(t, { userId, at: Date.now() });
    return t;
  }

  redeem(t) {
    if (typeof t !== "string" || !t) return null;
    const entry = this.tickets.get(t);
    this.tickets.delete(t);
    return entry && Date.now() - entry.at <= TICKET_TTL ? entry.userId : null;
  }

  open(req, res, ip, userId, hello) {
    const open = this.byIp.get(ip) ?? 0;
    if (open >= MAX_PER_IP) {
      res.writeHead(429, { "Content-Type": "text/plain", "Cache-Control": "no-store" });
      res.end("too many streams");
      return null;
    }
    this.byIp.set(ip, open + 1);

    req.socket.setTimeout(0);
    req.socket.setNoDelay(true);
    res.writeHead(200, {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-store",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    });

    const connection = { res, ip, userId };
    this.connections.add(connection);
    this.write(connection, "retry: 5000\n\n");
    this.send(connection, "hello", hello);

    const close = () => {
      if (!this.connections.delete(connection)) return;
      const left = (this.byIp.get(ip) ?? 1) - 1;
      if (left > 0) this.byIp.set(ip, left);
      else this.byIp.delete(ip);
    };
    req.on("close", close);
    res.on("close", close);
    res.on("error", close);
    return connection;
  }

  write(connection, text) {
    try {
      connection.res.write(text);
    } catch {}
  }

  send(connection, event, data) {
    this.write(connection, `event: ${event}\ndata: ${JSON.stringify(data ?? {})}\n\n`);
  }

  broadcast(event, data) {
    for (const connection of this.connections) this.send(connection, event, data);
  }

  toUser(userId, event, data) {
    if (!userId) return;
    for (const connection of this.connections) {
      if (connection.userId === userId) this.send(connection, event, data);
    }
  }

  toUsersWhere(test, event, data) {
    const answers = new Map();
    for (const connection of this.connections) {
      if (!connection.userId) continue;
      if (!answers.has(connection.userId)) answers.set(connection.userId, Boolean(test(connection.userId)));
      if (answers.get(connection.userId)) this.send(connection, event, data);
    }
  }

  userIds() {
    const ids = new Set();
    for (const connection of this.connections) if (connection.userId) ids.add(connection.userId);
    return ids;
  }
}
