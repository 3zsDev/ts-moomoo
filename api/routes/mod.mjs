import { createHash } from "node:crypto";

import { fail, internalHeaders, ok } from "../lib/http.mjs";
import { isStaff, signedIn } from "./accounts.mjs";
import { setNotice } from "./social.mjs";

const WEEK = 7 * 24 * 60 * 60 * 1000;
const LEVELS = new Set(["ban", "shadow", "clear"]);
const POWER = { admin: 2, mod: 1 };
const SAID_KEEP = 200;
const SAID_KINDS = new Set(["game", "clan", "whisper"]);
const KICK_LOCK_SECONDS = Number(process.env.KICK_LOCK_SECONDS ?? 300);
const IP_SALT = process.env.IP_HASH_SALT ?? process.env.INTERNAL_KEY ?? "moomoo";
const ADMIN_ARGS = 4;
const RESTART_MAX = 3600;

function hashIp(ip) {
  return createHash("sha256").update(`${IP_SALT}:${ip}`).digest("hex").slice(0, 12);
}

export function subjectById(store, id) {
  if (typeof id !== "string" || !id) return null;
  if (id.startsWith("g:") || id.startsWith("d:")) return store.guests[id.slice(2)] ?? null;
  if (id.startsWith("u:")) return store.users[id.slice(2)] ?? null;
  return store.users[id] ?? null;
}

export function subjectOf(store, body) {
  if (typeof body.id === "string" && body.id) return subjectById(store, body.id);
  return store.userByName(body.name);
}

export function feedId(subject) {
  return subject.did ? `d:${subject.did}` : `u:${subject.id}`;
}

export function verdictOf(subject) {
  const verdict = subject?.verdict;
  if (verdict?.until && verdict.until <= Date.now()) {
    subject.verdict = null;
    return null;
  }
  return verdict ?? null;
}

export function ipBanOf(store, ip) {
  const ban = ip ? store.ipBans[ip] : null;
  if (ban?.until && ban.until <= Date.now()) {
    delete store.ipBans[ip];
    store.save();
    return null;
  }
  return ban ?? null;
}

export function targetOf(subject) {
  return subject.did ? { did: subject.did } : { id: subject.id };
}

function flagsSince(log, since) {
  let total = 0;
  for (const entry of log) {
    if (entry.at < since) continue;
    for (const value of Object.values(entry.counts)) total += value;
  }
  return total;
}

export function modRecord(subject) {
  const now = Date.now();
  const sessionStart = subject.session?.at ?? Infinity;
  const reports = subject.reports ?? [];
  const verdict = verdictOf(subject);
  const signals = subject.flagTotals ?? {};

  return {
    reports: {
      session: reports.filter((report) => report.at >= sessionStart).length,
      week: reports.filter((report) => now - report.at < WEEK).length,
      lifetime: subject.reportsTotal ?? reports.length,
    },
    flags: {
      week: { total: flagsSince(subject.flagLog ?? [], now - WEEK) },
      lifetime: { total: Object.values(signals).reduce((sum, value) => sum + value, 0), signals },
    },
    verdict: verdict ? { level: verdict.level, reason: verdict.reason, until: verdict.until } : undefined,
    session: subject.session ? { ...subject.session, ip: subject.session.ip ? hashIp(subject.session.ip) : undefined } : undefined,
    recent: reports.slice(0, 10).map((report) => ({ by: report.by, at: report.at, reason: report.reason })),
  };
}

export function applyVerdict(ctx, subject, level, reason, by, withIp, until) {
  const ip = subject.session?.ip;
  until = until || undefined;

  if (level === "clear") {
    subject.verdict = null;
    if (withIp && ip) delete ctx.store.ipBans[ip];
  } else {
    subject.verdict = { level, reason: reason || undefined, at: Date.now(), by, until };
    if (level === "ban" && withIp && ip) {
      ctx.store.ipBans[ip] = { reason: reason || undefined, at: Date.now(), by, subject: subject.id, until };
    }
  }

  ctx.store.save();
  ctx.notifyServers("/internal/moderate", { ...targetOf(subject), action: level, reason });
}

export function recordSaid(store, subject, entry) {
  if (!subject || !SAID_KINDS.has(entry.kind)) return;
  subject.said ??= [];
  subject.said.unshift({
    kind: entry.kind,
    clan: entry.clan || undefined,
    to: entry.to ? { name: entry.to.name } : undefined,
    server: entry.server || undefined,
    text: String(entry.text).slice(0, 240),
    at: entry.at ?? Date.now(),
    shadow: entry.shadow || undefined,
  });
  subject.said.length = Math.min(subject.said.length, SAID_KEEP);
  store.save();
}

async function staffCall(ctx, body) {
  const actor = await signedIn(ctx, body.auth);
  if (!isStaff(actor)) return { error: fail(403, "rank") };

  const subject = body.clan === undefined ? subjectOf(ctx.store, body) : null;
  if (subject && (POWER[actor.role] ?? 0) <= (POWER[subject.role] ?? 0)) return { error: fail(403, "rank") };
  return { actor, subject };
}

async function adminCall(ctx, body) {
  const actor = await signedIn(ctx, body.auth);
  if (actor?.role !== "admin") return { error: fail(403, "rank") };
  return { actor };
}

function liveServer(ctx, key) {
  if (typeof key !== "string" || !key) return null;
  return ctx.liveServers().find((beat) => beat.key === key || ctx.listKey(beat.key) === key) ?? null;
}

async function askServer(ctx, key, route, body) {
  const server = liveServer(ctx, key);
  if (!server) return fail(404, "not found");
  try {
    const response = await fetch(`${server.url}${route}`, {
      method: "POST",
      headers: internalHeaders(),
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(4000),
    });
    return { status: response.status, body: await response.json() };
  } catch {
    return fail(503, "unavailable");
  }
}

function adminArgs(raw) {
  if (!Array.isArray(raw) || !raw.length || raw.length > ADMIN_ARGS || typeof raw[0] !== "string") return null;
  const args = [];
  for (const value of raw) {
    if (typeof value === "number" && Number.isFinite(value)) args.push(value);
    else if (typeof value === "string") args.push(value.slice(0, 30));
    else if (value === null) args.push(null);
    else return null;
  }
  return args;
}

export const modRoutes = {
  "POST /mod/servers": async (ctx, { body }) => {
    const actor = await signedIn(ctx, body.auth);
    if (!isStaff(actor)) return fail(403, "rank");

    const servers = ctx.liveServers().map((beat) => ({
      key: ctx.listKey(beat.key),
      region: beat.region,
      name: beat.name,
      sandbox: beat.sandbox,
      playerCount: beat.playerCount ?? 0,
      restartAt: beat.restartAt > Date.now() ? beat.restartAt : undefined,
      players: ctx.presence.playersOn(beat.key).map((player) => ({
        sid: player.sid,
        name: player.name,
        account: player.account,
        score: player.score,
        anon: player.anon,
        shadow: player.shadow,
      })),
    }));
    return ok({ servers });
  },

  "POST /mod/admin": async (ctx, { body }) => {
    const actor = await signedIn(ctx, body.auth);
    if (!isStaff(actor)) return fail(403, "rank");

    const sid = Number(body.sid);
    const args = adminArgs(body.args);
    if (!Number.isInteger(sid) || sid <= 0 || !args) return fail(400, "invalid");
    return askServer(ctx, body.server, "/internal/admin", { sid, args, role: actor.role, by: actor.name ?? actor.id });
  },

  "POST /mod/world": async (ctx, { body }) => {
    const { error } = await adminCall(ctx, body);
    if (error) return error;
    return askServer(ctx, body.server, "/internal/world", {});
  },

  "POST /mod/notice": async (ctx, { body }) => {
    const { error } = await adminCall(ctx, body);
    if (error) return error;
    if (body.text !== undefined && typeof body.text !== "string") return fail(400, "invalid");
    return ok({ notice: setNotice(ctx, { text: body.text, minutes: body.minutes }) });
  },

  "POST /mod/restart": async (ctx, { body }) => {
    const { actor, error } = await adminCall(ctx, body);
    if (error) return error;

    const seconds = Number(body.seconds);
    if (!Number.isFinite(seconds) || seconds < 0) return fail(400, "invalid");
    const wait = Math.min(Math.round(seconds), RESTART_MAX);
    const answer = await askServer(ctx, body.server, "/internal/shutdown", { seconds: wait });
    if (answer.status === 200) console.log(`[mod] ${actor.name ?? actor.id} restarts ${body.server} in ${wait}s`);
    return answer;
  },


  "POST /mod/player": async (ctx, { body }) => {
    const { subject, error } = await staffCall(ctx, body);
    if (error) return error;
    return subject ? ok(modRecord(subject)) : fail(404, "not found");
  },

  "POST /mod/messages": async (ctx, { body }) => {
    const from = typeof body.from === "string" ? body.from : "";
    const target = subjectById(ctx.store, from) ?? ctx.store.userByName(from);
    const { subject, error } = await staffCall(ctx, { auth: body.auth, id: target ? feedId(target) : "" });
    if (error) return error;
    if (!subject) return fail(404, "not found");
    return ok({ messages: subject.said ?? [] });
  },

  "POST /mod/kick": async (ctx, { body }) => {
    const { subject, error } = await staffCall(ctx, body);
    if (error) return error;
    if (!subject) return fail(404, "not found");

    ctx.notifyServers("/internal/moderate", { ...targetOf(subject), action: "kick", reason: body.reason });
    if (KICK_LOCK_SECONDS > 0) {
      const ip = subject.session?.ip;
      ctx.store.lock(ip ? [subject.id, `ip:${ip}`] : [subject.id], KICK_LOCK_SECONDS);
    }
    return ok();
  },

  "POST /mod/verdict": async (ctx, { body }) => {
    const { actor, subject, error } = await staffCall(ctx, body);
    if (error) return error;
    if (!subject) return fail(404, "not found");
    if (!LEVELS.has(body.level)) return fail(400, "invalid");

    const days = Number(body.days);
    const until = Number.isFinite(days) && days > 0 ? Date.now() + Math.min(days, 3650) * 24 * 60 * 60 * 1000 : undefined;
    applyVerdict(ctx, subject, body.level, String(body.reason ?? "").slice(0, 200), actor.name ?? actor.id, Boolean(body.ip), until);
    return ok();
  },

  "POST /mod/role": async (ctx, { body }) => {
    const { actor, subject, error } = await staffCall(ctx, body);
    if (error) return error;
    if (actor.role !== "admin") return fail(403, "rank");
    if (!subject || subject.did) return fail(404, "not found");
    if (body.role !== "mod" && body.role !== "none") return fail(400, "invalid");

    subject.role = body.role === "mod" ? "mod" : null;
    subject.roleLocal = true;
    ctx.store.save();
    return ok();
  },

  "POST /mod/clan": async (ctx, { body }) => {
    const { error } = await staffCall(ctx, body);
    if (error) return error;

    const clan = ctx.store.clanByName(body.clan);
    if (!clan) return fail(404, "not found");
    clan.shadow = Boolean(body.shadow);
    ctx.store.save();
    return ok();
  },
};
