import { isListedAdmin, readAuth } from "../lib/auth.mjs";
import { censor, isRude, sanitize } from "../lib/filter.mjs";
import { fail, ok, RateLimiter } from "../lib/http.mjs";
import { read } from "../lib/periods.mjs";
import { forward, liveAccepts, liveGet, liveProfileOf, livePost, syncAccount } from "../lib/mirror.mjs";
import { newUser } from "../lib/store.mjs";

const NAME = /^[\w:()/? -]{1,15}$/;
const HANDLE = /^[A-Za-z0-9_.\-@#]{1,32}$/;
const SOCIALS = ["youtube", "twitch", "tiktok", "x", "discord"];
const FRIEND_REQUESTS_PER_HOUR = 20;
const DEFAULT_PREFS = { friendNotifs: true, friendRequests: true, clanInvites: true };
const STAT_KEYS = [
  "kills", "deaths", "damage", "healing", "wood", "food", "stone", "gold",
  "animalKills", "animalDamage", "bestScore", "maxKills", "lives", "playtime",
];

const lookups = new RateLimiter(60, 60 * 1000);
const SKIN_COLORS = 10;

function lookOf(user) {
  user.look ??= { owned: { hats: [0], accs: [0], weapons: { 0: 0 } }, best: null, chosen: null };
  return user.look;
}

const count = (value) => (Number.isInteger(value) && value >= 0 ? value : null);

export function recordLifeLook(user, life, wasBest) {
  const look = lookOf(user);
  const add = (list, ids) => {
    for (const id of Array.isArray(ids) ? ids : []) if (count(id) !== null && !list.includes(id)) list.push(id);
  };
  add(look.owned.hats, life.owned?.hats);
  add(look.owned.accs, life.owned?.accs);
  for (const [id, variant] of Object.entries(life.owned?.weapons ?? {})) {
    if (count(Number(id)) === null || count(variant) === null) continue;
    look.owned.weapons[id] = Math.max(look.owned.weapons[id] ?? 0, variant);
  }
  if (wasBest && life.look && typeof life.look === "object") look.best = cleanLook(life.look);
}

function cleanLook(raw) {
  const out = {};
  for (const key of ["hat", "acc", "weapon", "variant", "color"]) out[key] = count(raw?.[key]) ?? 0;
  return out;
}

function earned(owned, look) {
  return (
    owned.hats.includes(look.hat) &&
    owned.accs.includes(look.acc) &&
    owned.weapons[look.weapon] !== undefined &&
    look.variant <= owned.weapons[look.weapon] &&
    look.color < SKIN_COLORS
  );
}

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
    user.roleLocal = true;
    ctx.store.save();
  }
  await syncAccount(ctx.store, user, auth);
  return user;
}

export function viaLive(path, handler) {
  return async (ctx, request) => {
    const auth = request.body?.auth;
    const user = await signedIn(ctx, auth);
    if (!user || !liveAccepts(auth)) return handler(ctx, request);
    const answer = await forward(path, request.body);
    if (user.live) user.live.at = 0;
    return answer;
  };
}

export function clanOf(store, user) {
  const clan = user.clan ? store.clans[user.clan] : null;
  if (clan) return { name: clan.name, role: clan.members[user.id]?.role ?? "member" };
  return user.liveClan ?? null;
}

export function isStaff(user) {
  return user?.role === "admin" || user?.role === "mod";
}

export function prefsOf(user) {
  return { ...DEFAULT_PREFS, ...(user?.prefs ?? {}) };
}

export function checkName(raw) {
  const typed = typeof raw === "string" ? raw.trim() : "";
  const name = sanitize(typed).trim();
  if (!NAME.test(name) || name.toLowerCase() === "unknown") return { error: "invalid" };
  if (isRude(name)) {
    const shown = censor(name);
    return /[^*\s]/.test(shown) ? { error: "censored", shown } : { error: "unclean" };
  }
  if (name !== typed) return { error: "censored", shown: name };
  return { name };
}

export function validName(raw) {
  return checkName(raw).name ?? null;
}

function clanNotes(store, user) {
  const clan = user.clan ? store.clans[user.clan] : null;
  if (!clan) return user.invites.filter((invite) => store.clans[invite.clan]).length;
  const role = clan.members[user.id]?.role;
  return role === "owner" || role === "officer" ? clan.requests.length : 0;
}

export function profileView(store, user) {
  const clan = clanOf(store, user);
  const stats = {};
  for (const key of STAT_KEYS) stats[key] = user.stats[key];
  const live = liveProfileOf(user);

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
    gear: user.look?.chosen ?? user.look?.best ?? undefined,
    ...(live ?? {}),
    ...(user.look?.chosen ? { gear: user.look.chosen } : {}),
  };
}

export const accountRoutes = {
  "POST /account": async (ctx, { body }) => {
    const user = await signedIn(ctx, body.auth);
    if (!user) return fail(401, "auth");

    return ok({
      name: user.name ?? undefined,
      role: user.role,
      clan: clanOf(ctx.store, user) ?? undefined,
      clanNotes: clanNotes(ctx.store, user),
      prefs: prefsOf(user),
    });
  },

  "POST /account/look": async (ctx, { body }) => {
    const user = await signedIn(ctx, body.auth);
    if (!user) return fail(401, "auth");

    const look = lookOf(user);
    if (body.look) {
      const picked = cleanLook(body.look);
      if (!earned(look.owned, picked)) return fail(400, "not earned");
      look.chosen = picked;
      ctx.store.save();
    }
    return ok({ options: look.owned, look: look.chosen, best: look.best });
  },

  "POST /account/prefs": async (ctx, { body }) => {
    const user = await signedIn(ctx, body.auth);
    if (!user) return fail(401, "auth");

    const prefs = prefsOf(user);
    for (const key of Object.keys(DEFAULT_PREFS)) {
      if (typeof body.prefs?.[key] === "boolean") prefs[key] = body.prefs[key];
    }
    user.prefs = prefs;
    ctx.store.save();
    return ok({ prefs });
  },

  "GET /name-check": async (ctx, { query, ip }) => {
    if (!lookups.allow(ip)) return fail(429, "slow down");
    if (ctx.store.userByName(query.get("name"))) return ok({ reserved: true });
    const live = await liveGet(`/name-check?name=${encodeURIComponent(query.get("name") ?? "")}`);
    return ok({ reserved: live?.reserved === true });
  },

  "POST /name": async (ctx, { body }) => {
    const user = await signedIn(ctx, body.auth);
    if (!user) return fail(401, "auth");
    if (user.name) return ok({ name: user.name });

    const checked = checkName(body.name);
    if (!checked.name) return { status: 400, body: checked };
    const { name } = checked;
    if (ctx.store.userByName(name)) return fail(409, "taken");

    user.name = name;
    ctx.store.save();
    return ok({ name });
  },

  "GET /profile": async (ctx, { query, ip }) => {
    if (!lookups.allow(ip)) return fail(429, "slow down");
    const user = ctx.store.userByName(query.get("name"));
    if (user) return ok(profileView(ctx.store, user));
    const live = await liveGet(`/profile?name=${encodeURIComponent(query.get("name") ?? "")}`);
    return live ? ok(live) : fail(404, "not found");
  },

  "POST /account/socials": async (ctx, { body }) => {
    const user = await signedIn(ctx, body.auth);
    if (!user) return fail(401, "auth");

    const socials = {};
    for (const key of SOCIALS) {
      const value = typeof body.socials?.[key] === "string" ? sanitize(body.socials[key]).trim() : "";
      if (!value) continue;
      if (!HANDLE.test(value)) return { status: 400, body: { error: "invalid", field: key, why: "format" } };
      if (isRude(value)) return { status: 400, body: { error: "invalid", field: key, why: "rude" } };
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
    const missing = Object.keys(names).filter((id) => names[id] === null);
    if (missing.length) {
      const live = await livePost("/names-for", { ids: missing });
      for (const id of missing) if (typeof live?.names?.[id] === "string") names[id] = live.names[id];
    }
    return ok({ names });
  },

  "POST /friends/allow": async (ctx, { body }) => {
    const user = await signedIn(ctx, body.auth);
    if (!user) return fail(401, "auth");

    const recipient = typeof body.to === "string" ? ctx.store.users[body.to] : null;
    if (recipient && !prefsOf(recipient).friendRequests) return fail(403, "closed");

    const hourAgo = Date.now() - 60 * 60 * 1000;
    user.friendRequests = user.friendRequests.filter((at) => at > hourAgo);
    if (user.friendRequests.length >= FRIEND_REQUESTS_PER_HOUR) return fail(429, "slow down");

    user.friendRequests.push(Date.now());
    ctx.store.save();
    return ok({ silent: user.verdict?.level === "shadow" });
  },
};

for (const path of ["/name", "/account/prefs", "/account/socials", "/account/look", "/friends/allow"]) {
  accountRoutes[`POST ${path}`] = viaLive(path, accountRoutes[`POST ${path}`]);
}
