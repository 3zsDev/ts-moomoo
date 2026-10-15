import { freshAccessToken, initAuth, onAuthChange } from "../net/api/auth";
import { initializeFrvrSdk } from "../pageStubs";
import { byId, createElement, removeAllChildren } from "../utils/dom";
import { staffPost, type AccountReply, StaffError } from "./api";
import { startStream } from "./stream";
import { isAdmin, page, setTabOpener, type TabName } from "./state";
import { renderAdmin } from "./tabs/admin";
import { addFeedEntry, onUnseenChange, renderLive, setFeedConnected } from "./tabs/live";
import { renderNotices, setNotice } from "./tabs/notices";
import { renderPlayer } from "./tabs/player";
import { renderServers } from "./tabs/servers";
import { card } from "./ui";

type SignIn = "staff" | "signed-out" | "not-staff" | "offline";

const TABS: [tab: TabName, label: string, adminOnly: boolean][] = [
  ["live", "Live", false],
  ["servers", "Servers", false],
  ["admin", "Admin", false],
  ["player", "Player", false],
  ["notices", "Notices", true],
];
const RENDER: Record<TabName, (parent: HTMLElement) => void> = {
  live: renderLive,
  servers: renderServers,
  admin: renderAdmin,
  player: renderPlayer,
  notices: renderNotices,
};

const main = byId("staffMain");
const tabLinks = new Map<TabName, HTMLElement>();
let body: HTMLElement | null = null;
let signedIn: SignIn | null = null;

async function signIn(): Promise<SignIn> {
  const auth = await freshAccessToken();
  if (!auth) return "signed-out";
  try {
    const account = await staffPost<AccountReply>("/account");
    page.name = account.name || "";
    page.role = account.role === "admin" || account.role === "mod" ? account.role : null;
    return page.role ? "staff" : "not-staff";
  } catch (error) {
    return error instanceof StaffError && error.status === 401 ? "signed-out" : "offline";
  }
}

const GATE_TEXT: Record<Exclude<SignIn, "staff">, string> = {
  "signed-out": "Sign in to your staff account in the game first, then open this page again.",
  "not-staff": "This page is for MooMoo.io staff only, and this account isn't staff.",
  offline: "Couldn't reach the API. Check your connection and try again.",
};

function showGate(state: Exclude<SignIn, "staff">): void {
  removeAllChildren(main);
  body = null;
  const gate = card(main, "Staff");
  gate.id = "staffGate";
  createElement({ class: "menuText", text: GATE_TEXT[state], parent: gate });
  if (state === "offline") {
    createElement({ class: "menuButton", text: "Try again", parent: gate, onclick: () => void start() });
  }
  createElement({ tag: "a", class: "menuButton secondary staffGateBack", text: "Back to game", href: gameUrl(), parent: gate });
}

function gameUrl(): string {
  return `/${location.search}`;
}

function showTab(tab: TabName): void {
  if (!body) return;
  if (TABS.some(([name, , adminOnly]) => name === tab && adminOnly && !isAdmin())) tab = "live";
  page.tab = tab;
  for (const [name, link] of tabLinks) link.classList.toggle("active", name === tab);
  removeAllChildren(body);
  RENDER[tab](body);
  window.scrollTo(0, 0);
}

function showPage(): void {
  removeAllChildren(main);
  tabLinks.clear();
  const nav = createElement({ class: "segTabs staffTabs", parent: main });
  for (const [tab, label, adminOnly] of TABS) {
    if (adminOnly && !isAdmin()) continue;
    tabLinks.set(tab, createElement({ tag: "a", text: label, parent: nav, onclick: () => showTab(tab) }));
  }
  body = createElement({ id: "staffBody", parent: main });
  showTab(page.tab);
}

function showWho(): void {
  const who = byId("staffWho");
  removeAllChildren(who);
  if (signedIn !== "staff") return;
  createElement({ tag: "span", class: "staffWhoName", text: page.name || "unnamed", parent: who });
  createElement({ tag: "span", class: `staffRole ${page.role}`, text: page.role === "admin" ? "Admin" : "Moderator", parent: who });
}

let streaming = false;

async function start(): Promise<void> {
  const state = await signIn();
  const changed = state !== signedIn;
  signedIn = state;
  showWho();
  if (state !== "staff") {
    showGate(state);
    return;
  }
  if (changed || !body) showPage();
  if (streaming) return;
  streaming = true;
  startStream({ feed: addFeedEntry, notice: setNotice, connected: setFeedConnected });
}

onUnseenChange((count) => {
  const link = tabLinks.get("live");
  if (link) link.textContent = count ? `Live (${count})` : "Live";
});
setTabOpener(showTab);

async function boot(): Promise<void> {
  (byId("staffBack") as HTMLAnchorElement).href = gameUrl();
  await initializeFrvrSdk();
  initAuth();
  await start();

  let pending: ReturnType<typeof setTimeout> | undefined;
  onAuthChange(() => {
    clearTimeout(pending);
    pending = setTimeout(() => void start(), 250);
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => void boot(), { once: true });
} else {
  void boot();
}
