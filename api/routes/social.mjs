import { randomBytes } from "node:crypto";

import { isRude } from "../lib/filter.mjs";
import { fail, internalOnly, ok, RateLimiter } from "../lib/http.mjs";
import { clanOf, isStaff, prefsOf, signedIn } from "./accounts.mjs";
import { recordSaid, verdictOf } from "./mod.mjs";

const TEXT_MAX = 200;
const CLAN_KEEP = 100;
const WHISPER_KEEP = 50;
const MAX_FRIENDS = 500;
const INVITE_GAP = 30 * 1000;
const TOP_NOW = 10;
const NOTICE_MAX = 24 * 60 * 60 * 1000;

const tickets = new RateLimiter(30, 60 * 1000);
const lookups = new RateLimiter(30, 60 * 1000);
const chatBurst = new RateLimiter(4, 5 * 1000);
const chatMinute = new RateLimiter(30, 60 * 1000);
const inviteMinute = new RateLimiter(10, 60 * 1000);
const invitePairs = new Map();

function clanKey(store, user) {
  const clan = user ? clanOf(store, user) : null;
  return clan?.name ? clan.name.toLowerCase() : null;
}

function lists(user, other) {
  return Array.isArray(user?.friends) && user.friends.includes(other.id);
}

export function mutualFriends(user, other) {
  return Boolean(user && other && user !== other && lists(user, other) && lists(other, user));
}

function sameClan(store, user, other) {
  const key = clanKey(store, user);
  return key !== null && key === clanKey(store, other);
}

function cleanText(raw) {
  return typeof raw === "string"
    ? raw.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, TEXT_MAX)
    : "";
}

function messageId() {
  return Date.now().toString(36) + randomBytes(4).toString("hex");
}

function view(message) {
  return {
    id: message.id,
    kind: message.kind,
    from: message.from,
    to: message.to,
    text: message.text,
    at: message.at,
    n: message.n,
    system: message.system || undefined,
  };
}

function keep(list, message, size) {
  list.push(message);
  if (list.length > size) list.splice(0, list.length - size);
}

function pairKey(a, b) {
  return [a, b].sort().join("|");
}

function serverOf(ctx, serverId) {
  return serverId ? ctx.listKey(serverId) : null;
}

export function presenceChanged(ctx, id, serverId) {
  const { store, hub } = ctx;
  const user = store.users[id];
  if (!user?.name) return;

  const server = serverOf(ctx, serverId);
  hub.toUsersWhere((other) => mutualFriends(user, store.users[other]), "friend", { id, name: user.name, server });

  const key = clanKey(store, user);
  if (key) hub.toUsersWhere((other) => clanKey(store, store.users[other]) === key, "clan-on", { name: user.name, server });
}

export function clanNote(ctx, clanName, text) {
  const key = String(clanName ?? "").toLowerCase();
  if (!key) return;
  const message = { id: messageId(), kind: "clan", from: { name: clanName }, text, at: Date.now(), system: true };
  keep((ctx.store.chat.clan[key] ??= []), message, CLAN_KEEP);
  ctx.store.save();
  ctx.hub.toUsersWhere((other) => clanKey(ctx.store, ctx.store.users[other]) === key, "chat", view(message));
}

export function staffFeed(ctx, entry) {
  ctx.hub.toUsersWhere((other) => isStaff(ctx.store.users[other]), "feed", entry);
}

export function noticeOf(store) {
  const notice = store.data.notice;
  return notice?.text && notice.until > Date.now() ? notice : null;
}

export function openPageStream(ctx, req, res, url, ip) {
  const userId = ctx.hub.redeem(url.searchParams.get("t"));
  const user = userId ? ctx.store.users[userId] : null;
  ctx.hub.open(req, res, ip, user ? userId : null, {
    bundle: ctx.bundle(),
    notice: noticeOf(ctx.store),
    signedIn: Boolean(user),
  });
}

async function chatter(ctx, body) {
  const user = await signedIn(ctx, body.auth);
  if (!user) return { error: fail(401, "auth") };
  if (!user.name || verdictOf(user)?.level === "ban") return { error: fail(403, "denied") };
  return { user, shadow: verdictOf(user)?.level === "shadow" };
}

async function sendChat(ctx, body, kind) {
  const { user, shadow, error } = await chatter(ctx, body);
  if (error) return error;

  const text = cleanText(body.text);
  if (!text) return fail(400, "empty");
  if (!chatBurst.allow(user.id) || !chatMinute.allow(user.id)) return fail(429, "slow down");
  if (isRude(text)) return fail(400, "unclean");

  const { store, hub } = ctx;
  const message = {
    id: messageId(), kind, fromId: user.id, from: { name: user.name }, text, at: Date.now(),
    n: typeof body.n === "string" ? body.n.slice(0, 40) : undefined, shadow: shadow || undefined,
  };

  if (kind === "clan") {
    const key = clanKey(store, user);
    if (!key) return fail(403, "no clan");

    keep((store.chat.clan[key] ??= []), message, CLAN_KEEP);
    recordSaid(store, user, { kind, clan: clanOf(store, user).name, text, at: message.at, shadow });
    if (shadow) hub.toUser(user.id, "chat", view(message));
    else hub.toUsersWhere((other) => other === user.id || (clanKey(store, store.users[other]) === key && prefsOf(store.users[other]).clanChat), "chat", view(message));
    return ok({});
  }

  const recipient = store.userByName(body.to);
  if (!recipient) return fail(404, "not found");
  if (recipient === user || !(mutualFriends(user, recipient) || sameClan(store, user, recipient))) return fail(403, "not yours");
  if (!prefsOf(recipient).whispers) return fail(403, "closed");

  message.to = { name: recipient.name };
  message.toId = recipient.id;
  keep((store.chat.whisper[pairKey(user.id, recipient.id)] ??= []), message, WHISPER_KEEP);
  recordSaid(store, user, { kind, to: message.to, text, at: message.at, shadow });
  hub.toUser(user.id, "chat", view(message));
  if (!shadow) hub.toUser(recipient.id, "chat", view(message));
  return ok({ to: recipient.name });
}

export const socialRoutes = {
  "POST /page/ticket": async (ctx, { body, ip }) => {
    if (!tickets.allow(ip)) return fail(429, "slow down");
    const user = await signedIn(ctx, body.auth);
    if (!user) return fail(401, "auth");
    return ok({ t: ctx.hub.ticket(user.id) });
  },

  "POST /page/friends": async (ctx, { body }) => {
    const user = await signedIn(ctx, body.auth);
    if (!user) return fail(401, "auth");
    if (!lookups.allow(user.id)) return fail(429, "slow down");

    const ids = [...new Set((Array.isArray(body.friends) ? body.friends : []).map(String))].slice(0, MAX_FRIENDS).sort();
    if (ids.join(",") !== (user.friends ?? []).join(",")) {
      user.friends = ids;
      ctx.store.save();
    }

    const online = [];
    for (const id of ids) {
      const friend = ctx.store.users[id];
      const where = mutualFriends(user, friend) && friend.name ? ctx.presence.where(id) : null;
      if (where) online.push({ id, name: friend.name, server: ctx.listKey(where) });
    }
    return ok({ online });
  },

  "POST /invite": async (ctx, { body }) => {
    const { user, shadow, error } = await chatter(ctx, body);
    if (error) return error;

    const recipient = ctx.store.userByName(body.to);
    if (!recipient) return fail(404, "not found");
    const clan = sameClan(ctx.store, user, recipient);
    if (recipient === user || !(clan || mutualFriends(user, recipient))) return fail(403, "not yours");

    const server = ctx.presence.playing(user.id);
    if (!server) return fail(409, "not in a game");

    const pair = `${user.id}>${recipient.id}`;
    if (Date.now() - (invitePairs.get(pair) ?? 0) < INVITE_GAP || !inviteMinute.allow(user.id)) return fail(429, "slow down");
    if (invitePairs.size > 10000) invitePairs.clear();
    invitePairs.set(pair, Date.now());

    if (!shadow) {
      ctx.hub.toUser(recipient.id, "invite", { from: { name: user.name }, server: ctx.listKey(server), as: clan ? "clan" : "friend" });
    }
    return ok();
  },

  "POST /chat/clan": async (ctx, { body }) => sendChat(ctx, body, "clan"),

  "POST /chat/whisper": async (ctx, { body }) => sendChat(ctx, body, "whisper"),

  "POST /chat/history": async (ctx, { body }) => {
    const user = await signedIn(ctx, body.auth);
    if (!user) return fail(401, "auth");
    if (!lookups.allow(`h:${user.id}`)) return fail(429, "slow down");

    let list;
    if (body.kind === "whisper") {
      const other = ctx.store.userByName(body.with);
      if (!other) return fail(404, "not found");
      list = ctx.store.chat.whisper[pairKey(user.id, other.id)] ?? [];
    } else {
      const key = clanKey(ctx.store, user);
      if (!key) return fail(403, "no clan");
      list = ctx.store.chat.clan[key] ?? [];
    }
    return ok({ messages: list.filter((message) => !message.shadow || message.fromId === user.id).map(view) });
  },

  "POST /clan/online": async (ctx, { body }) => {
    const user = await signedIn(ctx, body.auth);
    if (!user) return fail(401, "auth");
    const key = clanKey(ctx.store, user);
    if (!key) return fail(403, "no clan");

    const online = [];
    for (const member of Object.values(ctx.store.users)) {
      if (!member.name || clanKey(ctx.store, member) !== key) continue;
      const where = ctx.presence.where(member.id);
      if (where) online.push({ name: member.name, server: ctx.listKey(where) });
    }
    return ok({ online });
  },

  "GET /top-now": async (ctx) => ok(ctx.presence.top(TOP_NOW).map((entry) => ({ ...entry, server: ctx.listKey(entry.server) }))),

  "POST /internal/notice": internalOnly(async (ctx, { body }) => {
    const text = cleanText(body.text);
    const minutes = Number(body.minutes);
    const until = Number(body.until) || (Number.isFinite(minutes) && minutes > 0 ? Date.now() + minutes * 60 * 1000 : Date.now() + 60 * 60 * 1000);
    ctx.store.data.notice = text ? { text, until: Math.min(until, Date.now() + NOTICE_MAX) } : null;
    ctx.store.save();
    ctx.hub.broadcast("notice", ctx.store.data.notice ?? {});
    return ok({ notice: ctx.store.data.notice });
  }),

  "POST /internal/bundle": internalOnly(async (ctx, { body }) => {
    const name = typeof body.name === "string" && /^[\w.-]{1,64}$/.test(body.name) ? body.name : null;
    ctx.setBundle(name);
    ctx.hub.broadcast("bundle", { name });
    return ok({ name });
  }),
};
