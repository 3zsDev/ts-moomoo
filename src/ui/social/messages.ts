import { state } from "../../game/state";
import { account, friends, onAccountChange, socialPost } from "../../net/api";
import { byId, removeAllChildren } from "../../utils/dom";
import { ui } from "../elements";
import { refreshFriendsView } from "../friends/friendList";
import { showFriendNote } from "../friends/notices";
import { refreshNoteDots } from "../noteDots";
import { createChatLog, type ChatLog, type ChatMessage } from "./chatLog";
import { pageStream } from "./pageStream";
import { showChatToast } from "./toasts";

const MAX_MESSAGE = 200;
const SEEN_IDS = 300;
const NOTE_PREVIEW = 60;

type ChatKind = "clan" | "whisper";

export const unreadWhispers: Record<string, number> = {};
let unreadClan = 0;

export function unreadWhisperCount(): number {
  if (!account.prefs.whispers) return 0;
  return Object.values(unreadWhispers).reduce((sum, count) => sum + count, 0);
}

export function unreadClanCount(): number {
  return account.clan ? unreadClan : 0;
}

const sentNonces: Record<string, 1> = {};
const seenIds: string[] = [];
let lastWhisperFrom: string | null = null;

export function sendMessage(kind: ChatKind, text: string, to?: string): Promise<{ to?: string }> {
  const nonce = Math.random().toString(36).slice(2, 12) + Date.now().toString(36);
  sentNonces[nonce] = 1;
  return kind === "clan"
    ? socialPost("/chat/clan", { text, n: nonce })
    : socialPost("/chat/whisper", { to, text, n: nonce });
}

const whisperCard = byId("whisperCard");
const whisperBody = byId("whisperBody");
let whisperWith: string | null = null;
let whisperLog: ChatLog | null = null;

export function isWhisperCardOpen(): boolean {
  return whisperCard.style.display === "block";
}

export function closeWhisperCard(): void {
  whisperCard.style.display = "none";
  whisperWith = null;
  whisperLog = null;
}

export function openWhisper(name: string): void {
  whisperWith = name;
  byId("whisperName").textContent = name;
  removeAllChildren(whisperBody);
  whisperLog = createChatLog(whisperBody, {
    placeholder: `Whisper to ${name}`,
    load: () => socialPost("/chat/history", { kind: "whisper", with: name }),
    send: (text) => sendMessage("whisper", text, name),
  });
  whisperCard.style.display = "block";
  delete unreadWhispers[name];
  refreshFriendsView();
}

function openWhisperLog(name: string): ChatLog | null {
  return whisperLog && whisperWith === name && isWhisperCardOpen() ? whisperLog : null;
}

let clanLog: ChatLog | null = null;

export function setClanChatLog(log: ChatLog | null): void {
  clanLog = log;
  if (log) {
    unreadClan = 0;
    refreshNoteDots();
  }
}

let clanName: string | undefined;

export function noteClanChange(): void {
  const name = account.clan?.name ?? "";
  if (clanName !== undefined && clanName !== name) {
    unreadClan = 0;
    pageStream.restart();
  }
  clanName = name;
}

export function onChatEvent(message: ChatMessage): void {
  if (!message?.from || !account.name) return;
  if (message.n && sentNonces[message.n]) {
    delete sentNonces[message.n];
    return;
  }
  if (message.id) {
    if (seenIds.includes(message.id)) return;
    seenIds.push(message.id);
    if (seenIds.length > SEEN_IDS) seenIds.shift();
  }

  const own = !message.system && message.from.name === account.name;
  if (message.kind === "clan") {
    if (clanLog) {
      clanLog.add(message);
    } else if (!own && account.prefs.clanChat) {
      unreadClan++;
      refreshNoteDots();
      showChatToast(message);
    }
    return;
  }
  if (message.kind !== "whisper" || !message.to) return;

  const other = own ? message.to.name : message.from.name;
  const open = openWhisperLog(other);
  if (open) {
    open.add(message);
    return;
  }
  if (own || !account.prefs.whispers) return;

  unreadWhispers[other] = (unreadWhispers[other] || 0) + 1;
  refreshFriendsView();
  lastWhisperFrom = other;
  if (showChatToast(message)) return;
  const text = message.text.length > NOTE_PREVIEW ? `${message.text.slice(0, NOTE_PREVIEW - 3)}...` : message.text;
  showFriendNote({ text: `${other}: ${text}`, server: null, action: ["Open", () => openWhisper(other)] });
}

export function runSlashCommand(input: string): boolean {
  const match = /^\/(w|whisper|r|reply|c|clan)(?:\s+([\s\S]*))?$/i.exec(input.trim());
  if (!match) return false;
  const command = match[1].charAt(0).toLowerCase();
  let text = (match[2] || "").trim();
  let to: string | null = null;

  if (!account.name) {
    showChatToast({ note: "Sign in to message friends and your clan" });
    return true;
  }

  if (command === "w") {
    const names = Object.values(friends.state().names)
      .filter((name): name is string => Boolean(name))
      .sort((a, b) => b.length - a.length);
    const lower = text.toLowerCase();
    to = names.find((name) => lower.startsWith(`${name.toLowerCase()} `)) ?? text.split(" ")[0];
    text = text.slice(to.length).trim();
  } else if (command === "r") {
    to = lastWhisperFrom;
    if (!to) {
      showChatToast({ note: "Nobody has written to you yet" });
      return true;
    }
  }

  if (!text) {
    showChatToast({ note: command === "c" ? "/c <message>" : command === "r" ? "/r <message>" : "/w <friend> <message>" });
    return true;
  }

  text = text.slice(0, MAX_MESSAGE);
  const kind: ChatKind = command === "c" ? "clan" : "whisper";
  sendMessage(kind, text, to ?? undefined)
    .then((result) => {
      const sent: ChatMessage = {
        kind, from: { name: account.name ?? "" }, to: { name: result.to || to || "" }, text, at: Date.now(),
      };
      showChatToast({ note: (kind === "clan" ? "[Clan] You: " : `To ${sent.to!.name}: `) + text });
      if (kind === "clan") clanLog?.add(sent);
      else openWhisperLog(sent.to!.name)?.add(sent);
    })
    .catch((error: Error) => {
      showChatToast({ note: error.message });
    });
  return true;
}

export function bindMessages(): void {
  byId("whisperClose").onclick = closeWhisperCard;
  onAccountChange(noteClanChange);

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape" || !isWhisperCardOpen() || state.playing || ui.verifyDialog.classList.contains("showing")) return;
    closeWhisperCard();
    event.stopImmediatePropagation();
  }, true);
}
