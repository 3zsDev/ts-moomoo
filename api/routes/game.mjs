import { randomBytes } from "node:crypto";

import { fail, internalOnly, ok, RateLimiter } from "../lib/http.mjs";
import { bump } from "../lib/periods.mjs";
import { clanOf, isStaff, recordLifeLook, signedIn } from "./accounts.mjs";
import { applyVerdict, feedId, ipBanOf, recordSaid, verdictOf } from "./mod.mjs";
import { staffFeed } from "./social.mjs";

const TURNSTILE_SECRET = process.env.TURNSTILE_SECRET ?? "";
const VPN_CHECK_URL = process.env.VPN_CHECK_URL ?? "";
const TICKET_TTL = 2 * 60 * 1000;
const REPORT_COOLDOWN = 10 * 60 * 1000;
const REPORT_FEED_DELAY = 1500;
const CAPTCHA_PASS = 10 * 60 * 1000;
const EVENT_GAP = 30 * 1000;
const EVENT_KINDS = new Set(["boss", "clan_top"]);
const FLAG_LOG = 200;
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
const captchaPassed = new Map();
const lastEvents = new Map();

setInterval(() => {
  const now = Date.now();
  for (const [ticket, entry] of tickets) if (now - entry.at > TICKET_TTL) tickets.delete(ticket);
  for (const [did, at] of captchaPassed) if (now - at > CAPTCHA_PASS) captchaPassed.delete(did);
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

async function networkKind(ip) {
  if (!VPN_CHECK_URL || !ip || ip === "127.0.0.1" || ip === "::1") return null;
  const cached = vpnCache.get(ip);
  if (cached && Date.now() - cached.at < 60 * 60 * 1000) return cached.kind;

  let kind = null;
  try {
    const response = await fetch(VPN_CHECK_URL.replace("{ip}", encodeURIComponent(ip)), { signal: AbortSignal.timeout(3000) });
    const data = await response.json();
    const entry = data?.[ip] ?? data;
    const proxy = entry?.proxy === true || entry?.proxy === "yes" || entry?.vpn === true || entry?.vpn === "yes";
    const hosting = entry?.hosting === true || /hosting|data ?cent(er|re)/i.test(String(entry?.type ?? ""));
    kind = proxy ? "vpn" : hosting ? "hosting" : null;
  } catch {}
  vpnCache.set(ip, { kind, at: Date.now() });
  if (vpnCache.size > 10000) vpnCache.clear();
  return kind;
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
  return verdictOf(subject)?.level === "ban";
}

function bannedAnswer(ban) {
  return { status: 403, body: { error: "banned", until: ban?.until || undefined } };
}

function subjectOfReport(store, entry) {
  if (entry?.account) return store.users[String(entry.account)] ?? null;
  return entry?.did ? store.guest(String(entry.did)) : null;
}

export const gameRoutes = {
  "POST /join": async (ctx, { body, ip }) => {
    if (!joins.allow(ip)) return fail(429, "slow down");
    const ipBan = ipBanOf(ctx.store, ip);
    if (ipBan) return bannedAnswer(ipBan);
    const captcha = typeof body.captcha === "string" && body.captcha ? body.captcha : null;
    if (captcha && !(await captchaValid(captcha, ip))) return fail(403, "captcha");

    const user = body.auth ? await signedIn(ctx, body.auth) : null;
    const did = typeof body.did === "string" && DEVICE_ID.test(body.did) ? body.did : randomBytes(16).toString("hex");
    if (!user && !captcha && TURNSTILE_SECRET && !captchaPassed.has(did)) return fail(403, "captcha");
    if (banned(user)) return bannedAnswer(user.verdict);
    if (banned(ctx.store.guests[did])) return bannedAnswer(ctx.store.guests[did].verdict);

    const seconds = ctx.store.lockedFor([user?.id ?? `g:${did}`, `ip:${ip}`]);
    if (seconds) return { status: 403, body: { error: "locked", seconds } };
    if (!user) {
      const network = await networkKind(ip);
      if (network) return fail(403, network);
    }
    if (captcha && !user) captchaPassed.set(did, Date.now());

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

    if (ipBanOf(ctx.store, ip)) return ok({ ok: false, reason: "banned" });

    did ??= randomBytes(16).toString("hex");
    const user = userId ? ctx.store.users[userId] ?? null : null;
    const subject = user ?? ctx.store.guest(did);
    if (banned(subject)) return ok({ ok: false, reason: "banned" });
    if (ctx.store.lockedFor(lockKeys(subject, ip))) return ok({ ok: false, reason: "locked" });

    subject.session = { at: Date.now(), server: String(body.server ?? ""), ip };
    ctx.store.save();

    const clan = user ? clanOf(ctx.store, user) : null;
    return ok({
      ok: true,
      did,
      shadow: verdictOf(subject)?.level === "shadow",
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
    recordLifeLook(user, body, score > 0 && score >= stats.bestScore);
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
    const subject = subjectOfReport(ctx.store, target);
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

    const report = subject.reports[0];
    setTimeout(() => {
      const since = Math.min(subject.session?.at ?? Infinity, Date.now() - REPORT_COOLDOWN);
      const reporters = new Set(subject.reports.filter((entry) => entry.at >= since).map((entry) => entry.from)).size;
      staffFeed(ctx, {
        kind: "report",
        target: { id: feedId(subject), name: subject.name ?? (String(target.name ?? "") || undefined) },
        by: { name: report.by.name },
        reason: report.reason,
        reporters,
        server: ctx.listKey(report.server),
        at: report.at,
      });
    }, REPORT_FEED_DELAY).unref();
    return ok();
  }),

  "POST /internal/flags": internalOnly(async (ctx, { body }) => {
    const subject = subjectOfReport(ctx.store, body.target);
    if (!subject) return ok();

    const counts = {};
    for (const [key, value] of Object.entries(body.counts ?? {})) {
      if (/^[a-z0-9_]{1,32}$/.test(key) && count(value)) counts[key] = count(value);
    }
    if (!Object.keys(counts).length) return ok();

    subject.flagLog ??= [];
    subject.flagLog.unshift({ at: Date.now(), counts });
    subject.flagLog.length = Math.min(subject.flagLog.length, FLAG_LOG);
    subject.flagTotals ??= {};
    for (const [key, value] of Object.entries(counts)) subject.flagTotals[key] = (subject.flagTotals[key] ?? 0) + value;
    ctx.store.save();

    staffFeed(ctx, {
      kind: "flags",
      target: { id: feedId(subject), name: subject.name ?? (String(body.target?.name ?? "") || undefined) },
      counts,
      server: ctx.listKey(String(body.server ?? "")),
      at: Date.now(),
    });
    return ok();
  }),

  "POST /internal/chat": internalOnly(async (ctx, { body }) => {
    const subject = subjectOfReport(ctx.store, body);
    const text = typeof body.text === "string" ? body.text.trim() : "";
    if (!subject || !text) return ok();
    recordSaid(ctx.store, subject, { kind: "game", server: String(body.server ?? ""), text, shadow: Boolean(body.shadow) });
    return ok();
  }),

  "POST /internal/event": internalOnly(async (ctx, { body }) => {
    const kind = String(body.kind ?? "");
    const server = String(body.server ?? "");
    if (!EVENT_KINDS.has(kind) || !server) return fail(400, "invalid");
    const clan = typeof body.clan === "string" ? body.clan.slice(0, 8) : undefined;
    if (kind === "clan_top" && (!clan || ctx.store.clanByName(clan)?.shadow)) return ok();

    const key = `${kind}|${server}|${clan ?? ""}`;
    if (Date.now() - (lastEvents.get(key) ?? 0) < EVENT_GAP) return ok();
    lastEvents.set(key, Date.now());

    const by = typeof body.by === "string" ? body.by.slice(0, 30) || undefined : undefined;
    ctx.hub.broadcast("event", { kind, server: ctx.listKey(server), by, clan });
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

    const key = `${body.region ?? "0"}:${body.name ?? "1"}`;
    const before = ctx.servers.get(key);
    const playerCount = count(body.playerCount);
    const restartAt = Number(body.restartAt) > Date.now() ? Number(body.restartAt) : undefined;

    ctx.servers.set(key, {
      key,
      region: String(body.region ?? "0"),
      name: String(body.name ?? "1"),
      playerCount,
      sandbox: Boolean(body.sandbox),
      url: port ? `http://${host}:${port}` : null,
      restartAt,
      at: Date.now(),
    });
    if (!before || before.gone || before.playerCount !== playerCount) {
      ctx.hub.broadcast("count", { server: ctx.listKey(key), n: playerCount });
    }
    if (Array.isArray(body.players)) ctx.presence.snapshot(key, body.players, body.sandbox);
    return ok();
  }),
};
