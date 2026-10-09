import { randomBytes } from "node:crypto";

import { fail, isInternal, ok, RateLimiter } from "../lib/http.mjs";
import { signedIn } from "./accounts.mjs";

const CODE_TTL = 10 * 60 * 1000;
const CODE = /^[a-f0-9]{24}$/;

const codes = new Map();
const lookups = new RateLimiter(30, 60 * 1000);

setInterval(() => {
  const now = Date.now();
  for (const [code, entry] of codes) if (now - entry.at > CODE_TTL) codes.delete(code);
}, 60 * 1000).unref();

function pending(code) {
  if (typeof code !== "string" || !CODE.test(code)) return null;
  const entry = codes.get(code);
  if (!entry || Date.now() - entry.at > CODE_TTL) return null;
  return entry;
}

export const discordRoutes = {
  "POST /internal/discord/code": async (ctx, { req, body }) => {
    if (!isInternal(req)) return fail(403, "forbidden");
    const discordId = String(body.discordId ?? "").slice(0, 32);
    const discord = String(body.discord ?? "").slice(0, 40);
    if (!discordId || !discord) return fail(400, "invalid");

    const code = randomBytes(12).toString("hex");
    codes.set(code, { discordId, discord, at: Date.now() });
    return ok({ code, expires: Date.now() + CODE_TTL });
  },

  "GET /discord/link": async (ctx, { query, ip }) => {
    if (!lookups.allow(ip)) return fail(429, "slow down");
    const entry = pending(query.get("code"));
    return entry ? ok({ discord: entry.discord }) : fail(404, "code");
  },

  "POST /discord/link": async (ctx, { body }) => {
    const user = await signedIn(ctx, body.auth);
    if (!user) return fail(401, "auth");
    if (!user.name) return fail(400, "no name");

    const entry = pending(body.code);
    if (!entry) return fail(400, "code");
    codes.delete(body.code);

    for (const other of Object.values(ctx.store.users)) {
      if (other !== user && other.discord?.id === entry.discordId) other.discord = null;
    }
    user.discord = { id: entry.discordId, name: entry.discord, at: Date.now() };
    ctx.store.save();
    return ok({ ok: true, discord: entry.discord });
  },

  "GET /internal/discord/player": async (ctx, { req, query }) => {
    if (!isInternal(req)) return fail(403, "forbidden");
    const id = query.get("id");
    const user = Object.values(ctx.store.users).find((entry) => entry.discord?.id === id);
    return user ? ok({ name: user.name, clan: user.clan ? ctx.store.clans[user.clan]?.name ?? null : null }) : fail(404, "not found");
  },
};
