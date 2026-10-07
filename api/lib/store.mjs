import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import path from "node:path";

const EMPTY = () => ({ version: 1, users: {}, guests: {}, clans: {}, ipBans: {} });

export class Store {
  constructor(file) {
    this.file = file;
    this.data = EMPTY();
    this.timer = null;

    if (existsSync(file)) {
      try {
        this.data = { ...EMPTY(), ...JSON.parse(readFileSync(file, "utf8")) };
      } catch (error) {
        console.error(`[api] could not read ${file}, starting empty: ${error}`);
      }
    }
  }

  save() {
    if (this.timer) return;
    this.timer = setTimeout(() => this.flush(), 1000);
    this.timer.unref?.();
  }

  flush() {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    mkdirSync(path.dirname(this.file), { recursive: true });
    const temp = `${this.file}.tmp`;
    writeFileSync(temp, JSON.stringify(this.data));
    renameSync(temp, this.file);
  }

  get users() { return this.data.users; }
  get guests() { return this.data.guests; }
  get clans() { return this.data.clans; }
  get ipBans() { return this.data.ipBans; }

  userByName(name) {
    if (typeof name !== "string" || !name) return null;
    const key = name.trim().toLowerCase();
    for (const user of Object.values(this.users)) {
      if (user.name && user.name.toLowerCase() === key) return user;
    }
    return null;
  }

  clanByName(name) {
    if (typeof name !== "string" || !name) return null;
    return this.clans[name.trim().toLowerCase()] ?? null;
  }

  guest(did) {
    if (!did) return null;
    this.guests[did] ??= { id: `g:${did}`, did, reports: [], verdict: null, session: null };
    return this.guests[did];
  }
}

export function emptyStats() {
  return {
    kills: 0, deaths: 0, damage: 0, healing: 0,
    wood: 0, food: 0, stone: 0, gold: 0,
    animalKills: {}, animalDamage: 0,
    bestScore: 0, maxKills: 0, lives: 0, playtime: 0,
  };
}

export function newUser(id, email) {
  return {
    id, email: email ?? null, name: null, role: null, created: Date.now(),
    clan: null, invites: [], socials: {}, verdict: null, session: null, reports: [],
    stats: emptyStats(), periods: {}, friendRequests: [],
  };
}
