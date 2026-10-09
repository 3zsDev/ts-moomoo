import { state } from "../game/state";
import { account } from "../net/api";
import { connection } from "../net/Connection";
import { ClientPacket } from "../net/protocol";
import { trusted } from "../security/trusted";
import { findById } from "../utils/dom";
import { loadSetting, saveSetting } from "../utils/storage";

const COOLDOWN = 31000;

let anon = loadSetting("anon_mode") === "true";
let showSelf = loadSetting("anon_show_self") !== "false";
let sentThisGame = false;
let lastSent = 0;
let realName = "";
let noteTimer: ReturnType<typeof setInterval> | undefined;
let rerender: () => void = () => {};

export function joinAnonFlag(): 0 | 1 {
  return account.name && anon ? 1 : 0;
}

function sendAnon(): void {
  if (!connection.isReady() || !account.name) return;
  connection.send(ClientPacket.SetAnonymous, anon ? 1 : 0);
  lastSent = Date.now();
}

function cooldownLeft(): number {
  return Math.max(0, Math.ceil((lastSent + COOLDOWN - Date.now()) / 1000));
}

export function hidesOwnName(): boolean {
  return anon && !showSelf && Boolean(account.name);
}

export function ownLeaderboardName(): string | null {
  return anon && showSelf && account.name ? account.name : null;
}

function applyOwnName(): void {
  const me = state.me;
  if (me) me.name = hidesOwnName() ? `Anon#${me.sid}` : realName;
}

export function rememberOwnName(name: string): void {
  realName = name;
  applyOwnName();
}

export function onGameSetup(): void {
  if (anon && !sentThisGame) sendAnon();
  sentThisGame = true;
}

export function onLeaveGame(): void {
  sentThisGame = false;
}

function showCooldown(changed: boolean): void {
  const note = findById("prefAnonNote");
  if (!note) return;
  clearInterval(noteTimer);
  const tick = () => {
    const left = cooldownLeft();
    if (!left || !state.inGame) {
      clearInterval(noteTimer);
      note.style.display = "none";
      return;
    }
    note.textContent = changed
      ? `Anonymous mode is ${anon ? "on" : "off"}. You can change it again in ${left}s.`
      : `You can change this again in ${left}s.`;
    note.classList.toggle("warn", !changed);
    note.style.display = "";
  };
  tick();
  noteTimer = setInterval(tick, 1000);
}

export function bindAnonMode(rerenderLeaderboard: () => void): void {
  rerender = rerenderLeaderboard;
  const toggle = findById<HTMLInputElement>("prefAnon");
  const selfToggle = findById<HTMLInputElement>("prefAnonSelf");
  if (!toggle || !selfToggle) return;

  const show = () => {
    toggle.checked = anon;
    selfToggle.checked = showSelf;
    findById("prefAnonSelfRow")!.style.display = anon ? "" : "none";
  };
  show();

  toggle.onchange = trusted(() => {
    if (state.inGame && cooldownLeft() > 0) {
      toggle.checked = anon;
      showCooldown(false);
      return;
    }
    anon = toggle.checked;
    saveSetting("anon_mode", anon ? "true" : "false");
    show();
    if (state.inGame) {
      sendAnon();
      showCooldown(true);
    }
    applyOwnName();
    rerender();
  });

  selfToggle.onchange = trusted(() => {
    showSelf = selfToggle.checked;
    saveSetting("anon_show_self", showSelf ? "true" : "false");
    applyOwnName();
    rerender();
  });
}
