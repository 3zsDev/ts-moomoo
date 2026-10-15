const MAX_PLAYERS = 200;

function cleanPlayer(raw) {
  if (!raw || typeof raw !== "object") return null;
  const score = Number(raw.score);
  const sid = Number(raw.sid);
  return {
    sid: Number.isInteger(sid) && sid > 0 ? sid : null,
    account: raw.account != null && raw.account !== "" ? String(raw.account) : null,
    name: String(raw.name ?? "").slice(0, 30),
    score: Number.isFinite(score) && score > 0 ? Math.min(Math.round(score), 1e9) : 0,
    anon: Boolean(raw.anon),
    shadow: Boolean(raw.shadow),
  };
}

export class Presence {
  constructor(timeout, onChange) {
    this.timeout = timeout;
    this.onChange = onChange;
    this.servers = new Map();
  }

  alive(entry, now = Date.now()) {
    return now - entry.at <= this.timeout;
  }

  snapshot(serverId, players, sandbox) {
    const before = this.servers.get(serverId);
    const list = (Array.isArray(players) ? players.slice(0, MAX_PLAYERS) : []).map(cleanPlayer).filter(Boolean);
    const accounts = new Map();
    for (const player of list) if (player.account) accounts.set(player.account, player);

    const touched = new Set(accounts.keys());
    if (before) for (const id of before.accounts.keys()) touched.add(id);
    const was = new Map([...touched].map((id) => [id, this.where(id)]));

    this.servers.set(serverId, { at: Date.now(), sandbox: Boolean(sandbox), players: list, accounts });
    this.report(was);
  }

  prune() {
    const now = Date.now();
    for (const [serverId, entry] of this.servers) {
      if (this.alive(entry, now)) continue;
      const was = new Map([...entry.accounts.keys()].map((id) => [id, this.where(id)]));
      this.servers.delete(serverId);
      this.report(was);
    }
  }

  report(was) {
    for (const [id, server] of was) {
      const now = this.where(id);
      if (now !== server) this.onChange?.(id, now);
    }
  }

  where(accountId) {
    const now = Date.now();
    for (const [serverId, entry] of this.servers) {
      const player = this.alive(entry, now) && entry.accounts.get(accountId);
      if (player && !player.anon) return serverId;
    }
    return null;
  }

  playersOn(serverId) {
    const entry = this.servers.get(serverId);
    return entry && this.alive(entry) ? entry.players : [];
  }

  playing(accountId) {
    const now = Date.now();
    for (const [serverId, entry] of this.servers) {
      if (this.alive(entry, now) && entry.accounts.has(accountId)) return serverId;
    }
    return null;
  }
}
