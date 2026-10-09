import { isRude, sanitize } from "../lib/filter.mjs";
import { fail, ok, RateLimiter } from "../lib/http.mjs";
import { read } from "../lib/periods.mjs";
import { prefsOf, signedIn } from "./accounts.mjs";

const CLAN_NAME = /^[A-Za-z0-9]{3,4}$/;
const MAX_MEMBERS = 80;
const MAX_PAST = 50;
const RANK = { member: 0, officer: 1, owner: 2 };
const RESERVED = new Set(["solo"]);

const actions = new RateLimiter(30, 60 * 1000);
const lookups = new RateLimiter(60, 60 * 1000);

function nameOf(store, id) {
  return store.users[id]?.name ?? "unknown";
}

function memberView(store, id, member) {
  return {
    name: nameOf(store, id),
    role: member.role,
    stint: member.stint,
    stats: {
      kills: member.kills,
      periods: { week: read(member.periods, "week"), month: read(member.periods, "month") },
    },
  };
}

export function clanView(store, clan, withPast) {
  const view = {
    name: clan.name,
    closed: clan.closed || undefined,
    stats: {
      kills: clan.stats.kills,
      raidKills: clan.stats.raidKills,
      periods: { week: read(clan.stats.periods, "week"), month: read(clan.stats.periods, "month") },
    },
    members: Object.entries(clan.members)
      .map(([id, member]) => memberView(store, id, member))
      .sort((a, b) => RANK[b.role] - RANK[a.role] || (b.stats.kills ?? 0) - (a.stats.kills ?? 0)),
  };
  if (withPast) {
    view.past = clan.past.map((entry) => ({
      name: nameOf(store, entry.id),
      stint: entry.stint,
      kicked: entry.kicked || undefined,
      left: entry.left,
      stats: { kills: entry.kills },
    }));
  }
  return view;
}

export function clanTaken(store, name) {
  const key = String(name ?? "").trim().toLowerCase();
  return RESERVED.has(key) || Boolean(store.clans[key]);
}

function join(store, clan, user, role = "member") {
  const stint = (clan.stints[user.id] ?? 0) + 1;
  clan.stints[user.id] = stint;
  clan.members[user.id] = { role, stint, joined: Date.now(), kills: 0, periods: {} };
  clan.requests = clan.requests.filter((id) => id !== user.id);
  user.clan = clan.key;
  user.invites = [];
}

function depart(store, clan, id, kicked) {
  const member = clan.members[id];
  if (!member) return;
  delete clan.members[id];
  clan.past.unshift({ id, stint: member.stint, kicked, left: Date.now(), kills: member.kills });
  clan.past.length = Math.min(clan.past.length, MAX_PAST);
  const user = store.users[id];
  if (user) user.clan = null;
}

function remove(store, clan) {
  for (const id of Object.keys(clan.members)) depart(store, clan, id, false);
  delete store.clans[clan.key];
}

async function actor(ctx, body) {
  const user = await signedIn(ctx, body.auth);
  if (!user) return { error: fail(401, "auth") };
  if (!user.name) return { error: fail(400, "no name") };
  if (!actions.allow(user.id)) return { error: fail(429, "slow down") };

  const clan = user.clan ? ctx.store.clans[user.clan] : null;
  const rank = clan ? RANK[clan.members[user.id]?.role ?? "member"] : -1;
  return { user, clan, rank };
}

function done(ctx) {
  ctx.store.save();
  return ok();
}

export const clanRoutes = {
  "GET /clan": async (ctx, { query, ip }) => {
    if (!lookups.allow(ip)) return fail(429, "slow down");
    const clan = ctx.store.clanByName(query.get("name"));
    return clan ? ok(clanView(ctx.store, clan, false)) : fail(404, "not found");
  },

  "GET /clan-check": async (ctx, { query }) => ok({ reserved: clanTaken(ctx.store, query.get("name")) }),

  "POST /clan/mine": async (ctx, { body }) => {
    const user = await signedIn(ctx, body.auth);
    if (!user) return fail(401, "auth");

    const clan = user.clan ? ctx.store.clans[user.clan] : null;
    const invites = user.invites
      .filter((invite) => ctx.store.clans[invite.clan])
      .map((invite) => ({ clan: ctx.store.clans[invite.clan].name, by: invite.by }));
    if (!clan) return ok({ invites });

    const role = clan.members[user.id]?.role ?? "member";
    const response = { clan: clanView(ctx.store, clan, true), role, invites };
    if (RANK[role] >= RANK.officer) response.requests = clan.requests.map((id) => nameOf(ctx.store, id));
    return ok(response);
  },

  "POST /clan/create": async (ctx, { body }) => {
    const { user, clan, error } = await actor(ctx, body);
    if (error) return error;
    if (clan) return fail(409, "in a clan");

    const name = typeof body.name === "string" ? sanitize(body.name).trim() : "";
    if (!CLAN_NAME.test(name)) return fail(400, "invalid");
    if (isRude(name)) return fail(400, "unclean");
    if (clanTaken(ctx.store, name)) return fail(409, "taken");

    const created = {
      key: name.toLowerCase(), name, created: Date.now(), shadow: false,
      members: {}, past: [], requests: [], stints: {},
      stats: { kills: 0, raidKills: 0, periods: {} },
    };
    ctx.store.clans[created.key] = created;
    join(ctx.store, created, user, "owner");
    return done(ctx);
  },

  "POST /clan/request": async (ctx, { body }) => {
    const { user, clan, error } = await actor(ctx, body);
    if (error) return error;
    if (clan) return fail(409, "in a clan");

    const target = ctx.store.clanByName(body.clan);
    if (!target) return fail(404, "not found");
    if (target.closed) return fail(403, "closed");
    if (Object.keys(target.members).length >= MAX_MEMBERS) return fail(409, "full");

    if (!target.requests.includes(user.id)) target.requests.push(user.id);
    return done(ctx);
  },

  "POST /clan/requests": async (ctx, { body }) => {
    const { clan, rank, error } = await actor(ctx, body);
    if (error) return error;
    if (!clan || rank < RANK.owner) return fail(403, "rank");

    clan.closed = !body.open;
    return done(ctx);
  },

  "POST /clan/answer": async (ctx, { body }) => {
    const { user, clan, error } = await actor(ctx, body);
    if (error) return error;

    const target = ctx.store.clanByName(body.clan);
    const invite = target && user.invites.find((entry) => entry.clan === target.key);
    if (!invite) return fail(404, "not found");
    user.invites = user.invites.filter((entry) => entry !== invite);

    if (body.accept) {
      if (clan) return fail(409, "in a clan");
      if (Object.keys(target.members).length >= MAX_MEMBERS) return fail(409, "full");
      join(ctx.store, target, user);
    }
    return done(ctx);
  },

  "POST /clan/decide": async (ctx, { body }) => {
    const { clan, rank, error } = await actor(ctx, body);
    if (error) return error;
    if (!clan || rank < RANK.officer) return fail(403, "rank");

    const applicant = ctx.store.userByName(body.name);
    if (!applicant || !clan.requests.includes(applicant.id)) return fail(404, "no player");
    clan.requests = clan.requests.filter((id) => id !== applicant.id);

    if (body.accept) {
      if (applicant.clan) return fail(409, "in a clan");
      if (Object.keys(clan.members).length >= MAX_MEMBERS) return fail(409, "full");
      join(ctx.store, clan, applicant);
    }
    return done(ctx);
  },

  "POST /clan/role": async (ctx, { body }) => {
    const { user, clan, rank, error } = await actor(ctx, body);
    if (error) return error;
    if (!clan || rank < RANK.owner) return fail(403, "rank");
    if (!(body.role in RANK)) return fail(400, "invalid");

    const target = ctx.store.userByName(body.name);
    const member = target && clan.members[target.id];
    if (!member || target.id === user.id) return fail(404, "no member");

    member.role = body.role;
    if (body.role === "owner") clan.members[user.id].role = "officer";
    return done(ctx);
  },

  "POST /clan/kick": async (ctx, { body }) => {
    const { clan, rank, error } = await actor(ctx, body);
    if (error) return error;
    if (!clan || rank < RANK.officer) return fail(403, "rank");

    const target = ctx.store.userByName(body.name);
    const member = target && clan.members[target.id];
    if (!member) return fail(404, "no member");
    if (RANK[member.role] >= rank) return fail(403, "rank");

    depart(ctx.store, clan, target.id, true);
    return done(ctx);
  },

  "POST /clan/invite": async (ctx, { body }) => {
    const { user, clan, rank, error } = await actor(ctx, body);
    if (error) return error;
    if (!clan || rank < RANK.officer) return fail(403, "rank");

    const target = ctx.store.userByName(body.name);
    if (!target) return fail(404, "no player");
    if (target.clan) return fail(409, "in a clan");
    if (!prefsOf(target).clanInvites) return fail(403, "no invites");
    if (Object.keys(clan.members).length >= MAX_MEMBERS) return fail(409, "full");

    if (!target.invites.some((invite) => invite.clan === clan.key)) {
      target.invites.push({ clan: clan.key, by: user.name, at: Date.now() });
    }
    return done(ctx);
  },

  "POST /clan/leave": async (ctx, { body }) => {
    const { user, clan, rank, error } = await actor(ctx, body);
    if (error) return error;
    if (!clan) return fail(404, "not found");

    const others = Object.keys(clan.members).filter((id) => id !== user.id);
    if (!others.length) {
      remove(ctx.store, clan);
      return done(ctx);
    }
    if (rank >= RANK.owner) return fail(409, "owner");

    depart(ctx.store, clan, user.id, false);
    return done(ctx);
  },

  "POST /clan/disband": async (ctx, { body }) => {
    const { clan, rank, error } = await actor(ctx, body);
    if (error) return error;
    if (!clan || rank < RANK.owner) return fail(403, "rank");

    remove(ctx.store, clan);
    return done(ctx);
  },
};
