import { ok } from "../lib/http.mjs";
import { liveGet, livePost } from "../lib/mirror.mjs";
import { read } from "../lib/periods.mjs";
import { isStaff, signedIn } from "./accounts.mjs";

const SIZE = 10;
const SPANS = new Set(["week", "month", "all"]);

function killsIn(record, span) {
  return span === "all" ? record.kills ?? 0 : read(record.periods, span).kills ?? 0;
}

function board(store, span, staff) {
  const players = [];
  for (const user of Object.values(store.users)) {
    if (!user.name || user.verdict?.level === "ban") continue;
    const shadowed = user.verdict?.level === "shadow";
    if (shadowed && !staff) continue;

    const kills = span === "all" ? user.stats.kills : read(user.periods, span).kills ?? 0;
    if (kills <= 0) continue;
    const clan = user.clan ? store.clans[user.clan] : null;
    players.push({ name: user.name, clan: clan?.name, kills, shadowed: shadowed || undefined });
  }

  const clans = [];
  for (const clan of Object.values(store.clans)) {
    if (clan.shadow && !staff) continue;
    const kills = killsIn(clan.stats, span);
    if (kills <= 0) continue;
    clans.push({
      name: clan.name, kills, members: Object.keys(clan.members).length,
      shadowed: clan.shadow || undefined,
    });
  }

  players.sort((a, b) => b.kills - a.kills);
  clans.sort((a, b) => b.kills - a.kills);
  return { players: players.slice(0, SIZE), clans: clans.slice(0, SIZE) };
}

function spanOf(value) {
  return SPANS.has(value) ? value : "week";
}

export const topRoutes = {
  "GET /top": async (ctx, { query }) => {
    const span = spanOf(query.get("span"));
    const live = await liveGet(`/top?span=${span}`);
    return ok(live ?? board(ctx.store, span, false));
  },

  "POST /top": async (ctx, { body }) => {
    const user = await signedIn(ctx, body.auth);
    const span = spanOf(body.span);
    const live = await livePost("/top", { auth: body.auth, span });
    return ok(live ?? board(ctx.store, span, isStaff(user)));
  },
};
