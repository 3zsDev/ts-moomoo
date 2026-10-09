import { randomBytes } from "node:crypto";

import { fail, isInternal, ok, RateLimiter } from "../lib/http.mjs";
import { bump } from "../lib/periods.mjs";
import { isStaff, signedIn } from "./accounts.mjs";
import { applyVerdict } from "./mod.mjs";

const TURNSTILE_SECRET = process.env.TURNSTILE_SECRET ?? "";
const VPN_CHECK_URL = process.env.VPN_CHECK_URL ?? "";
const TICKET_TTL = 2 * 60 * 1000;
const REPORT_COOLDOWN = 10 * 60 * 1000;
const REPORT_REASONS = ["Bot", "Hack", "Autoheal", "Abuse"];
const MAX_REPORTS = 200;
const DEVICE_ID = /^[A-Za-z0-9_-]{8,64}$/;
const STAT_LIMIT = 1e9;
const ANIMAL_KEYS = new Set([
  "cow", "pig", "sheep", "bull", "bully", "wolf", "duck", "boar", "yeti", "treasure",
  "crab_king", "moostafa", "moofie",
]);

const joins = new RateLimiter(30, 60 * 1000);
const tickets = new Map();

setInterval(() => {
  const now = Date.now();
  for (const [ticket, entry] of tickets) if (now - entry.at > TICKET_TTL) tickets.delete(ticket);
}, 60 * 1000).unref();

async function captchaValid(token, ip) {
  if (!TURNSTILE_SECRET) return true;
  try {
    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body: new URLSearchParams({ secret: TURNSTILE_SECRET, response: token, remoteip: ip }),
      signal: AbortSignal.timeout(5000),
    });
    return (await response.json()).success === true;
  } catch {
    return false;
  }
}

const vpnCache = new Map();

async function isProxy(ip) {
  if (!VPN_CHECK_URL || !ip || ip === "127.0.0.1" || ip === "::1") return false;
  const cached = vpnCache.get(ip);
  if (cached && Date.now() - cached.at < 60 * 60 * 1000) return cached.proxy;

  let proxy = false;
  try {
    const response = await fetch(VPN_CHECK_URL.replace("{ip}", encodeURIComponent(ip)), { signal: AbortSignal.timeout(3000) });
    const data = await response.json();
    const entry = data?.[ip] ?? data;
    proxy = entry?.proxy === true || entry?.proxy === "yes" || entry?.vpn === true || entry?.vpn === "yes";
  } catch {}
  vpnCache.set(ip, { proxy, at: Date.now() });
  if (vpnCache.size > 10000) vpnCache.clear();
  return proxy;
}

export function lockKeys(subject, ip) {
  const keys = [subject.id];
  if (ip) keys.push(`ip:${ip}`);
  return keys;
}

function count(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? Math.min(Math.round(number), STAT_LIMIT) : 0;
}

function banned(subject) {
  return subject?.verdict?.level === "ban";
}

function internalOnly(handler) {
  return (ctx, request) => (isInternal(request.req) ? handler(ctx, request) : fail(403, "forbidden"));
}

export const gameRoutes = {
  "POST /join": async (ctx, { body, ip }) => {
    if (!joins.allow(ip)) return fail(429, "slow down");
    if (ctx.store.ipBans[ip]) return fail(403, "banned");
    if (typeof body.captcha === "string" && !(await captchaValid(body.captcha, ip))) return fail(403, "captcha");

    const user = body.auth ? await signedIn(ctx, body.auth) : null;
    const did = typeof body.did === "string" && DEVICE_ID.test(body.did) ? body.did : randomBytes(16).toString("hex");
    if (banned(user) || banned(ctx.store.guests[did])) return fail(403, "banned");

    const seconds = ctx.store.lockedFor([user?.id ?? `g:${did}`, `ip:${ip}`]);
    if (seconds) return { status: 403, body: { error: "locked", seconds } };
    if (!user && (await isProxy(ip))) return fail(403, "vpn");

    const ticket = randomBytes(24).toString("base64url");
    tickets.set(ticket, { userId: user?.id ?? null, did, at: Date.now() });
    return ok({ ticket, did });
  },

  "POST /internal/ticket": internalOnly(async (ctx, { body }) => {
    const token = typeof body.token === "string" ? body.token : "";
    const ip = String(body.ip ?? "");
    let userId = null;
    let did = null;

    if (token.startsWith("tk:")) {
      const entry = tickets.get(token.slice(3));
      tickets.delete(token.slice(3));
      if (!entry || Date.now() - entry.at > TICKET_TTL) return ok({ ok: false, reason: "ticket" });
      userId = entry.userId;
      did = entry.did;
    } else if (token.startsWith("cf:")) {
      if (!(await captchaValid(token.slice(3), ip))) return ok({ ok: false, reason: "captcha" });
    }

    if (ctx.store.ipBans[ip]) return ok({ ok: false, reason: "banned" });

    did ??= randomBytes(16).toString("hex");
    const user = userId ? ctx.store.users[userId] ?? null : null;
    const subject = user ?? ctx.store.guest(did);
    if (banned(subject)) return ok({ ok: false, reason: "banned" });
    if (ctx.store.lockedFor(lockKeys(subject, ip))) return ok({ ok: false, reason: "locked" });

    subject.session = { at: Date.now(), server: String(body.server ?? ""), ip };
    ctx.store.save();

    const clan = user?.clan ? ctx.store.clans[user.clan] : null;
    return ok({
      ok: true,
      did,
      shadow: subject.verdict?.level === "shadow",
      account: user ? { id: user.id, name: user.name, role: user.role, clan: clan?.name ?? null } : null,
    });
  }),

  "POST /internal/stats": internalOnly(async (ctx, { body }) => {
    const user = body.account ? ctx.store.users[String(body.account)] : null;
    if (!user) return ok();

    const kills = count(body.kills);
    const score = count(body.score);
    const stats = user.stats;

    stats.kills += kills;
    if (body.died) stats.deaths += 1;
    for (const key of ["damage", "healing", "wood", "food", "stone", "gold", "animalDamage", "playtime"]) {
      stats[key] += count(body[key]);
    }
    for (const [key, value] of Object.entries(body.animalKills ?? {})) {
      if (ANIMAL_KEYS.has(key)) stats.animalKills[key] = (stats.animalKills[key] ?? 0) + count(value);
    }
    stats.bestScore = Math.max(stats.bestScore, score);
    stats.maxKills = Math.max(stats.maxKills, kills);
    stats.lives += 1;
    bump(user.periods, ["day", "week", "month"], kills, score);

    const clan = user.clan ? ctx.store.clans[user.clan] : null;
    const member = clan?.members[user.id];
    if (member) {
      member.kills += kills;
      bump(member.periods, ["week", "month"], kills, score);
      clan.stats.kills += kills;
      clan.stats.raidKills += count(body.raidKills);
      bump(clan.stats.periods, ["week", "month"], kills, 0);
    }

    ctx.store.save();
    return ok();
  }),

  "POST /internal/report": internalOnly(async (ctx, { body }) => {
    const reporter = body.reporter ?? {};
    const target = body.target ?? {};
    const reporterUser = reporter.account ? ctx.store.users[String(reporter.account)] : null;
    const subject = target.account
      ? ctx.store.users[String(target.account)]
      : target.did ? ctx.store.guest(String(target.did)) : null;
    if (!subject) return ok();

    const action = Number(body.action) || 0;
    if (action && isStaff(reporterUser) && subject.role !== "admin") {
      const level = action === 2 ? "ban" : "shadow";
      applyVerdict(ctx, subject, level, "in-game", reporterUser.name ?? reporterUser.id, false);
      return ok({ verdict: level });
    }

    const reporterKey = reporterUser?.id ?? `g:${reporter.did ?? ""}`;
    const reason = REPORT_REASONS[(Number(body.reason) || 0) - 1];
    subject.reports ??= [];
    const recent = subject.reports.find((report) => report.from === reporterKey && Date.now() - report.at < REPORT_COOLDOWN);
    if (recent) {
      // the reason arrives as a second packet right after the report itself
      if (reason && !recent.reason) {
        recent.reason = reason;
        ctx.store.save();
      }
      return ok();
    }

    subject.reports.unshift({
      at: Date.now(),
      from: reporterKey,
      server: String(body.server ?? ""),
      by: { name: (reporterUser?.name ?? String(reporter.name ?? "")) || undefined, kind: reporterUser ? undefined : "guest" },
      reason,
    });
    subject.reports.length = Math.min(subject.reports.length, MAX_REPORTS);
    subject.reportsTotal = (subject.reportsTotal ?? 0) + 1;
    ctx.store.save();
    return ok();
  }),

  "GET /internal/reserved": internalOnly(async (ctx) => ok({
    names: Object.values(ctx.store.users).filter((user) => user.name).map((user) => user.name.toLowerCase()),
    clans: Object.keys(ctx.store.clans),
  })),

  "POST /internal/heartbeat": internalOnly(async (ctx, { body, req }) => {
    const address = String(req.socket.remoteAddress ?? "127.0.0.1").replace(/^::ffff:/, "");
    const host = address.includes(":") ? `[${address}]` : address;
    const port = Number(body.port) || null;

    ctx.servers.set(`${body.region ?? "0"}:${body.name ?? "1"}`, {
      playerCount: count(body.playerCount),
      sandbox: Boolean(body.sandbox),
      url: port ? `http://${host}:${port}` : null,
      at: Date.now(),
    });
    return ok();
  }),
};
