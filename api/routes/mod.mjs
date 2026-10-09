import { createHash } from "node:crypto";

import { fail, ok } from "../lib/http.mjs";
import { isStaff, signedIn } from "./accounts.mjs";

const WEEK = 7 * 24 * 60 * 60 * 1000;
const LEVELS = new Set(["ban", "shadow", "clear"]);
const POWER = { admin: 2, mod: 1 };
const KICK_LOCK_SECONDS = Number(process.env.KICK_LOCK_SECONDS ?? 300);
const IP_SALT = process.env.IP_HASH_SALT ?? process.env.INTERNAL_KEY ?? "moomoo";

function hashIp(ip) {
  return createHash("sha256").update(`${IP_SALT}:${ip}`).digest("hex").slice(0, 12);
}

export function subjectOf(store, body) {
  if (typeof body.id === "string" && body.id) {
    if (body.id.startsWith("g:")) return store.guests[body.id.slice(2)] ?? null;
    return store.users[body.id] ?? null;
  }
  return store.userByName(body.name);
}

export function targetOf(subject) {
  return subject.did ? { did: subject.did } : { id: subject.id };
}

export function modRecord(subject) {
  const now = Date.now();
  const sessionStart = subject.session?.at ?? Infinity;
  const reports = subject.reports ?? [];

  return {
    reports: {
      session: reports.filter((report) => report.at >= sessionStart).length,
      week: reports.filter((report) => now - report.at < WEEK).length,
      lifetime: subject.reportsTotal ?? reports.length,
    },
    flags: { week: { total: 0 }, lifetime: { total: 0, signals: {} } },
    verdict: subject.verdict ? { level: subject.verdict.level, reason: subject.verdict.reason } : undefined,
    session: subject.session ? { ...subject.session, ip: subject.session.ip ? hashIp(subject.session.ip) : undefined } : undefined,
    recent: reports.slice(0, 10).map((report) => ({ by: report.by, at: report.at, reason: report.reason })),
  };
}

export function applyVerdict(ctx, subject, level, reason, by, withIp) {
  const ip = subject.session?.ip;

  if (level === "clear") {
    subject.verdict = null;
    if (withIp && ip) delete ctx.store.ipBans[ip];
  } else {
    subject.verdict = { level, reason: reason || undefined, at: Date.now(), by };
    if (level === "ban" && withIp && ip) {
      ctx.store.ipBans[ip] = { reason: reason || undefined, at: Date.now(), by, subject: subject.id };
    }
  }

  ctx.store.save();
  ctx.notifyServers("/internal/moderate", { ...targetOf(subject), action: level, reason });
}

async function staffCall(ctx, body) {
  const actor = await signedIn(ctx, body.auth);
  if (!isStaff(actor)) return { error: fail(403, "rank") };

  const subject = body.clan === undefined ? subjectOf(ctx.store, body) : null;
  if (subject && (POWER[actor.role] ?? 0) <= (POWER[subject.role] ?? 0)) return { error: fail(403, "rank") };
  return { actor, subject };
}

export const modRoutes = {
  "POST /mod/player": async (ctx, { body }) => {
    const { subject, error } = await staffCall(ctx, body);
    if (error) return error;
    return subject ? ok(modRecord(subject)) : fail(404, "not found");
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

    applyVerdict(ctx, subject, body.level, String(body.reason ?? "").slice(0, 200), actor.name ?? actor.id, Boolean(body.ip));
    return ok();
  },

  "POST /mod/role": async (ctx, { body }) => {
    const { actor, subject, error } = await staffCall(ctx, body);
    if (error) return error;
    if (actor.role !== "admin") return fail(403, "rank");
    if (!subject || subject.did) return fail(404, "not found");
    if (body.role !== "mod" && body.role !== "none") return fail(400, "invalid");

    subject.role = body.role === "mod" ? "mod" : null;
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
