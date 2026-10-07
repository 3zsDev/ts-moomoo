import { isDev, isSandbox, socialEnabled } from "../../environment";
import { account, authedPost, fetchProfile, friends, isStaff, postWithAuth, type Profile, type Socials } from "../../net/api";
import { byId, createElement, removeAllChildren } from "../../utils/dom";
import { kFormat } from "../../utils/math";
import { currentView } from "../menu/views";
import { isConnected, mySid, onPlayerStats, requestPlayerStats } from "../netBridge";
import { closeClanCard, openClanByName } from "./clan";
import { renderStaffPanel } from "./staffPanel";

const card = {
  root: byId("profileCard"),
  name: byId("profileName"),
  role: byId("profileRole"),
  clan: byId("profileClan"),
  note: byId("profileNote"),
  live: byId("profileLive"),
  stats: byId("profileStats"),
  periods: byId("profilePeriods"),
  socials: byId("profileSocials"),
  actions: byId("profileActions"),
  status: byId("profileStatus"),
  close: byId("profileClose"),
};

interface LiveStats {
  kills: number;
  wood: number;
  food: number;
  stone: number;
  gold: number;
  damage: number;
  animalDamage: number;
  healing: number;
  animals: number;
  bosses: number;
  score: number;
}

let shown: Profile | null = null;
let liveSid = -1;
let live: LiveStats | null = null;
let awaitingGuestId = false;
let knownSids: Record<string, number> = {};

export function setKnownPlayerSids(map: Record<string, number>): void {
  knownSids = map;
}

export function isProfileOpen(): boolean {
  return card.root.style.display === "block";
}

export function unsavedStatsNote(): string {
  if (isSandbox()) return "Sandbox: stats from games here aren't saved.";
  if (isDev()) return "Dev server: stats from games here aren't saved.";
  return "";
}

function subscribeLive(sid: number): void {
  if (sid === liveSid) return;
  liveSid = sid;
  live = null;
  if (isConnected()) requestPlayerStats(sid);
}

function liveValue(key: keyof LiveStats): number {
  return live ? live[key] : 0;
}

const BOSSES = ["crab_king", "moostafa", "moofie"];
const ANIMAL_NAMES: Record<string, string> = {
  cow: "Cows", pig: "Pigs", sheep: "Sheep", bull: "Bulls", bully: "Bullies", wolf: "Wolves", duck: "Ducks",
  boar: "Boars", yeti: "Yetis", treasure: "Treasure", crab_king: "Crab King", moostafa: "MOOSTAFA", moofie: "MOOFIE",
};

function killKeys(kills: Record<string, number> | undefined, bosses: boolean): string[] {
  return Object.keys(kills ?? {}).filter((key) => BOSSES.includes(key) === bosses && kills![key] > 0);
}

function killTotal(kills: Record<string, number> | undefined, bosses: boolean): number {
  return killKeys(kills, bosses).reduce((sum, key) => sum + kills![key], 0);
}

function killBreakdown(kills: Record<string, number> | undefined, bosses: boolean): string {
  return killKeys(kills, bosses)
    .sort((a, b) => kills![b] - kills![a])
    .map((key) => `${ANIMAL_NAMES[key] || key}: ${kills![key]}`)
    .join("\n");
}

function playtime(ms: number | undefined): string {
  const minutes = Math.floor((ms || 0) / 60000);
  return minutes >= 60 ? `${Math.floor(minutes / 60)}h ${minutes % 60}m` : `${minutes}m`;
}

const count = (value: number | undefined) => kFormat(Math.round(value || 0)) || "0";
const amount = (value: number | undefined) => {
  const rounded = Math.round(value || 0);
  if (rounded >= 1e6) return `${Math.round(rounded / 1e6)}m`;
  if (rounded >= 1e3) return `${Math.round(rounded / 1e3)}k`;
  return String(rounded);
};

type StatCell = [label: string, value: string, tooltip?: string];
type StatSection = [title: string, cells: StatCell[]];

function renderGrid(parent: HTMLElement, cells: StatCell[], columns = Math.min(cells.length, 5)): void {
  const grid = createElement({
    class: "profileGrid",
    parent,
    style: `grid-template-columns: repeat(${columns}, 1fr)`,
  });
  for (const [label, value, tooltip] of cells) {
    createElement({
      class: "profileStat",
      parent: grid,
      title: tooltip || "",
      children: [createElement({ tag: "span", text: value }), createElement({ tag: "label", text: label })],
    });
  }
}

function renderStats(profile: Profile): void {
  removeAllChildren(card.stats);
  if (isSandbox() && !profile.guest) return;

  const kills = (profile.kills || 0) + liveValue("kills");
  const ratio = profile.deaths ? (kills / profile.deaths).toFixed(2) : String(kills);

  const sections: StatSection[] = profile.guest
    ? [
        ["This life", [
          ["Kills", count(liveValue("kills"))],
          ["Damage", amount(liveValue("damage"))],
          ["Healing", amount(liveValue("healing"))],
          ["Animals", count(liveValue("animals"))],
          ["Bosses", count(liveValue("bosses"))],
        ]],
        ["Resources", [
          ["Wood", count(liveValue("wood"))],
          ["Food", count(liveValue("food"))],
          ["Stone", count(liveValue("stone"))],
          ["Gold", count(liveValue("gold"))],
        ]],
      ]
    : [
        ["Combat", [
          ["Kills", count(kills)],
          ["Deaths", count(profile.deaths)],
          ["K/D", ratio],
          ["Damage", amount((profile.damage || 0) + liveValue("damage"))],
          ["Healing", amount((profile.healing || 0) + liveValue("healing"))],
        ]],
        ["Lifetime Resources", [
          ["Wood", count((profile.wood || 0) + liveValue("wood"))],
          ["Food", count((profile.food || 0) + liveValue("food"))],
          ["Stone", count((profile.stone || 0) + liveValue("stone"))],
          ["Gold", count((profile.gold || 0) + liveValue("gold"))],
        ]],
        ["Lifetime Kills", [
          ["Animals", count(killTotal(profile.animalKills, false) + liveValue("animals")),
            killBreakdown(profile.animalKills, false)],
          ["Bosses", count(killTotal(profile.animalKills, true) + liveValue("bosses")),
            killBreakdown(profile.animalKills, true)],
          ["Animal dmg", amount((profile.animalDamage || 0) + liveValue("animalDamage"))],
        ]],
        ["More Stats", [
          ["Best score", count(Math.max(profile.bestScore || 0, liveValue("score")))],
          ["Best kills", count(Math.max(profile.maxKills || 0, liveValue("kills")))],
          ["Lives", count(profile.lives)],
          ["Played", playtime(profile.playtime)],
        ]],
      ];

  for (const [title, cells] of sections) {
    createElement({ class: "profileSectionTitle", text: title, parent: card.stats });
    renderGrid(card.stats, cells);
  }
}

function renderPeriods(periods: Profile["periods"]): void {
  removeAllChildren(card.periods);
  if (!periods || isSandbox()) return;

  createElement({ class: "profileSectionTitle", text: "Recent", parent: card.periods });
  const spans: [label: string, key: "day" | "week" | "month"][] = [
    ["today", "day"], ["this week", "week"], ["this month", "month"],
  ];

  for (const [label, stat] of [["Kills", "kills"], ["Best", "bestScore"]] as const) {
    renderGrid(
      card.periods,
      spans.map(([spanLabel, key]) => {
        const period = periods[key] ?? {};
        const value = stat === "kills"
          ? (period.kills || 0) + liveValue("kills")
          : Math.max(period.bestScore || 0, liveValue("score"));
        return [`${label} ${spanLabel}`, kFormat(value) || "0"] as StatCell;
      }),
      3,
    );
  }
}

const SOCIALS: Record<keyof Socials, [label: string, url: string | null]> = {
  youtube: ["YouTube", "https://youtube.com/@"],
  twitch: ["Twitch", "https://twitch.tv/"],
  tiktok: ["TikTok", "https://tiktok.com/@"],
  x: ["X", "https://x.com/"],
  discord: ["Discord", null],
};

function renderSocials(socials: Socials, own: boolean): void {
  removeAllChildren(card.socials);

  for (const key of Object.keys(SOCIALS) as (keyof Socials)[]) {
    const handle = socials[key];
    if (!handle) continue;
    const [label, url] = SOCIALS[key];
    if (url) {
      const link = createElement({ tag: "a", class: "profileSocial", text: `${label}: ${handle}`, parent: card.socials });
      (link as HTMLAnchorElement).href = url + encodeURIComponent(handle);
      (link as HTMLAnchorElement).target = "_blank";
      (link as HTMLAnchorElement).rel = "noopener nofollow";
    } else {
      createElement({ tag: "span", class: "profileSocial", text: `${label}: ${handle}`, parent: card.socials });
    }
  }

  if (own) {
    createElement({
      tag: "a",
      class: "profileSocialEdit",
      text: Object.keys(socials).length ? "Edit socials" : "Add socials",
      parent: card.socials,
      onclick: () => editSocials(socials),
    });
  }
}

function editSocials(socials: Socials): void {
  removeAllChildren(card.socials);
  const inputs: Partial<Record<keyof Socials, HTMLInputElement>> = {};

  for (const key of Object.keys(SOCIALS) as (keyof Socials)[]) {
    const input = createElement({ tag: "input", class: "profileSocialInput", parent: card.socials }) as HTMLInputElement;
    input.placeholder = SOCIALS[key][0] + (key === "discord" ? " username" : " handle");
    input.maxLength = 32;
    input.value = socials[key] || "";
    input.addEventListener("keydown", (event) => event.stopPropagation());
    inputs[key] = input;
  }

  createElement({
    class: "staffAction friendly",
    text: "Save",
    parent: card.socials,
    onclick: () => {
      const next: Socials = {};
      for (const [key, input] of Object.entries(inputs) as [keyof Socials, HTMLInputElement][]) {
        if (input.value.trim()) next[key] = input.value.trim();
      }
      postWithAuth("/account/socials", { socials: next })
        .then((response) => {
          if (response.status === 400) throw new Error("Only plain handles, nothing rude");
          if (!response.ok) throw new Error("Couldn't save");
          return response.json() as Promise<{ socials?: Socials }>;
        })
        .then((data) => {
          card.status.textContent = "Saved";
          renderSocials(data.socials ?? {}, true);
        })
        .catch((error: Error) => {
          card.status.textContent = error.message;
        });
    },
  });
}

function renderFriendControls(userId: string): void {
  const holder = document.getElementById("profileFriend");
  if (!holder) return;
  removeAllChildren(holder);

  const social = friends.state();
  const incoming = social.incoming.find((entry) => entry.user === userId);
  const outgoing = social.outgoing.find((entry) => entry.user === userId);

  const action = (label: string, kind: string, run: () => Promise<unknown>) => {
    createElement({
      class: `staffAction ${kind}`,
      text: label,
      parent: holder,
      onclick: () => {
        run().catch((error: { status?: number }) => {
          card.status.textContent =
            error?.status === 429 ? "Too many friend requests - try again later" : "Couldn't do that";
        });
      },
    });
  };
  const note = (text: string) => createElement({ class: "friendState", text, parent: holder });

  if (social.friends.includes(userId)) {
    note("Friends");
  } else if (incoming) {
    note("Wants to be friends");
    action("Accept", "friendly", () => friends.answer(incoming.id, true));
    action("Decline", "", () => friends.answer(incoming.id, false));
  } else if (outgoing) {
    note("Request sent");
    action("Cancel", "", () => friends.cancel(outgoing.id));
  } else {
    action("Add friend", "friendly", () => friends.request(userId));
  }
}

function resetCard(name: string): void {
  card.name.textContent = name;
  card.role.textContent = "";
  card.live.textContent = "";
  for (const el of [card.stats, card.periods, card.socials, card.actions]) removeAllChildren(el);
  card.status.textContent = "Loading...";
  card.root.classList.add("loading");
  card.root.style.display = "block";
}

function fillProfile(profile: Profile): void {
  card.root.classList.remove("loading");
  shown = profile;
  card.name.textContent = profile.name;
  card.role.textContent = profile.role === "admin" ? "Admin" : profile.role === "mod" ? "Moderator" : "";

  const clan = profile.clan;
  card.clan.textContent = clan ? `[${clan.name}]` : "";
  card.clan.onclick = clan
    ? () => {
        closeProfile();
        openClanByName(clan.name);
      }
    : null;

  renderStats(profile);
  renderPeriods(profile.periods);

  const own = Boolean(account.name) && profile.name === account.name;
  card.note.textContent = own && !isSandbox() ? unsavedStatsNote() : "";
  renderSocials(profile.socials ?? {}, own);

  removeAllChildren(card.actions);
  card.status.textContent = "";

  if (socialEnabled() && friends.available() && account.name && !own && profile.id) {
    createElement({ id: "profileFriend", parent: card.actions });
    renderFriendControls(profile.id);
    friends.watch(true);
  }

  const myClan = account.clan;
  if (socialEnabled() && myClan && (myClan.role === "owner" || myClan.role === "officer") && !own && !profile.clan) {
    const invite = createElement({
      class: "friendAction go",
      text: "Invite to clan",
      parent: card.actions,
      onclick: () => {
        authedPost("/clan/invite", { name: profile.name })
          .then(() => {
            invite.remove();
            card.status.textContent = `Invited to [${myClan.name}]`;
          })
          .catch((error: Error) => {
            card.status.textContent = error.message;
          });
      },
    });
  }

  if (isStaff() && !own) {
    renderStaffPanel(card.actions, card.status, { name: profile.name, role: profile.role ?? undefined });
  }
  card.root.style.display = "block";
}

export function openProfile(name: string): void {
  shown = null;
  resetCard(name);

  const sid = name === account.name ? mySid() : knownSids[name];
  subscribeLive(sid == null ? -1 : sid);

  fetchProfile(name)
    .then((profile) => {
      if (!profile) {
        card.status.textContent = "No profile found";
        card.root.classList.remove("loading");
        return;
      }
      if (!isProfileOpen() || card.name.textContent !== name) return;
      fillProfile(profile);
    })
    .catch(() => {
      card.status.textContent = "Couldn't load this profile";
      card.root.classList.remove("loading");
    });
}
// admin stuff
export function openGuestProfile(sid: number, name: string): void {
  shown = { name, guest: true };
  resetCard(name);
  card.role.textContent = "Guest";
  card.status.textContent = "";
  card.root.classList.remove("loading");
  awaitingGuestId = true;
  subscribeLive(sid);
  renderStats(shown);
}

export function closeProfile(): void {
  shown = null;
  awaitingGuestId = false;
  friends.watch(currentView() === "friends");
  subscribeLive(-1);
  card.root.style.display = "none";
}

function reloadProfile(): void {
  const current = shown;
  if (!current) return;
  fetchProfile(current.name)
    .then((profile) => {
      if (profile && shown && shown.name === current.name) {
        shown = profile;
        renderStats(profile);
        renderPeriods(profile.periods);
      }
    })
    .catch(() => {});
}

export function receivePlayerStats(
  sid: number, kills: number, wood: number, food: number, stone: number, gold: number, damage: number,
  animalDamage: number, healing: number, animals: number, bosses: number, accountId?: string | number,
  score?: number,
): void {
  if (sid !== liveSid || !shown) return;

  if (awaitingGuestId && accountId && shown.guest) {
    awaitingGuestId = false;
    renderStaffPanel(card.actions, card.status, { id: String(accountId) });
  }

  const previous = live;
  live = { kills, wood, food, stone, gold, damage, animalDamage, healing, animals, bosses, score: score || 0 };

  // totals going down means a new life: refetch the stored profile
  const total = (stats: LiveStats) =>
    (Object.keys(stats) as (keyof LiveStats)[]).reduce((sum, key) => (key === "score" ? sum : sum + stats[key]), 0);
  if (previous && total(live) < total(previous)) {
    live = null;
    reloadProfile();
    return;
  }

  renderStats(shown);
  renderPeriods(shown.periods);
}

export function bindProfileCard(): void {
  card.close.onclick = closeProfile;
  onPlayerStats((stats) => {
    receivePlayerStats(
      stats.sid, stats.kills, stats.wood, stats.food, stats.stone, stats.gold, stats.damage, stats.animalDamage,
      stats.healing, stats.animals, stats.bosses, stats.accountId, stats.score,
    );
  });
  friends.onChange(() => {
    if (shown?.id && isProfileOpen()) renderFriendControls(shown.id);
  });
}

export function openProfileFromClan(name: string): void {
  closeClanCard();
  openProfile(name);
}
