import { isListedAdmin, readAuth } from "../lib/auth.mjs";
import { isRude, sanitize } from "../lib/filter.mjs";
import { fail, ok, RateLimiter } from "../lib/http.mjs";
import { read } from "../lib/periods.mjs";
import { newUser } from "../lib/store.mjs";

const NAME = /^[\w:()/? -]{1,15}$/;
const HANDLE = /^[A-Za-z0-9_.\-@#]{1,32}$/;
const SOCIALS = ["youtube", "twitch", "tiktok", "x", "discord"];
const FRIEND_REQUESTS_PER_HOUR = 20;
const STAT_KEYS = [
  "kills", "deaths", "damage", "healing", "wood", "food", "stone", "gold",
  "animalKills", "animalDamage", "bestScore", "maxKills", "lives", "playtime",
];

const lookups = new RateLimiter(60, 60 * 1000);

export async function signedIn(ctx, auth) {
  const identity = await readAuth(auth);
  if (!identity?.verified) return null;

  let user = ctx.store.users[identity.id];
  if (!user) {
    user = newUser(identity.id, identity.email);
    ctx.store.users[identity.id] = user;
    ctx.store.save();
  }
  if (isListedAdmin(identity) && user.role !== "admin") {
    user.role = "admin";
    ctx.store.save();
  }
  return user;
}

export function isStaff(user) {
  return user?.role === "admin" || user?.role === "mod";
}

export function validName(raw) {
  const name = typeof raw === "string" ? sanitize(raw).trim() : "";
  if (!NAME.test(name) || name.toLowerCase() === "unknown" || isRude(name)) return null;
  return name;
}

function clanNotes(store, user) {
  const clan = user.clan ? store.clans[user.clan] : null;
  if (!clan) return user.invites.filter((invite) => store.clans[invite.clan]).length;
  const role = clan.members[user.id]?.role;
  return role === "owner" || role === "officer" ? clan.requests.length : 0;
}

export function profileView(store, user) {
  const clan = user.clan ? store.clans[user.clan] : null;
  const stats = {};
  for (const key of STAT_KEYS) stats[key] = user.stats[key];

  return {
    id: user.id,
    name: user.name,
    role: user.role ?? undefined,
    clan: clan ? { name: clan.name } : null,
    guest: false,
    ...stats,
    periods: {
      day: read(user.periods, "day"),
      week: read(user.periods, "week"),
      month: read(user.periods, "month"),
    },
    socials: user.socials,
  };
}

export const accountRoutes = {
  "POST /account": async (ctx, { body }) => {
    const user = await signedIn(ctx, body.auth);
    if (!user) return fail(401, "auth");

    const clan = user.clan ? ctx.store.clans[user.clan] : null;
    return ok({
      name: user.name ?? undefined,
      role: user.role,
      clan: clan ? { name: clan.name, role: clan.members[user.id]?.role ?? "member" } : undefined,
      clanNotes: clanNotes(ctx.store, user),
    });
  },

  "GET /name-check": async (ctx, { query, ip }) => {
    if (!lookups.allow(ip)) return fail(429, "slow down");
    return ok({ reserved: Boolean(ctx.store.userByName(query.get("name"))) });
  },

  "POST /name": async (ctx, { body }) => {
    const user = await signedIn(ctx, body.auth);
    if (!user) return fail(401, "auth");
    if (user.name) return ok({ name: user.name });

    const name = validName(body.name);
    if (!name) return fail(400, "invalid");
    if (ctx.store.userByName(name)) return fail(409, "taken");

    user.name = name;
    ctx.store.save();
    return ok({ name });
  },

  "GET /profile": async (ctx, { query, ip }) => {
    if (!lookups.allow(ip)) return fail(429, "slow down");
    const user = ctx.store.userByName(query.get("name"));
    if (!user) return fail(404, "not found");
    return ok(profileView(ctx.store, user));
  },

  "POST /account/socials": async (ctx, { body }) => {
    const user = await signedIn(ctx, body.auth);
    if (!user) return fail(401, "auth");

    const socials = {};
    for (const key of SOCIALS) {
      const value = typeof body.socials?.[key] === "string" ? sanitize(body.socials[key]).trim() : "";
      if (!value) continue;
      if (!HANDLE.test(value) || isRude(value)) return fail(400, "invalid");
      socials[key] = value;
    }

    user.socials = socials;
    ctx.store.save();
    return ok({ socials });
  },

  "POST /names-for": async (ctx, { body }) => {
    const ids = Array.isArray(body.ids) ? body.ids.slice(0, 200) : [];
    const names = {};
    for (const id of ids) names[String(id)] = ctx.store.users[String(id)]?.name ?? null;
    return ok({ names });
  },

  "POST /friends/allow": async (ctx, { body }) => {
    const user = await signedIn(ctx, body.auth);
    if (!user) return fail(401, "auth");

    const hourAgo = Date.now() - 60 * 60 * 1000;
    user.friendRequests = user.friendRequests.filter((at) => at > hourAgo);
    if (user.friendRequests.length >= FRIEND_REQUESTS_PER_HOUR) return fail(429, "slow down");

    user.friendRequests.push(Date.now());
    ctx.store.save();
    return ok({ silent: user.verdict?.level === "shadow" });
  },
};
