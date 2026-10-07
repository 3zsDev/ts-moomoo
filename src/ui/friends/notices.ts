import { serverBrowser } from "../../game/session";
import { friends } from "../../net/api";
import type { FriendInvite, IncomingRequest, PresenceNote } from "../../net/api/social";
import { byId, createElement, removeAllChildren } from "../../utils/dom";
import { joinFriendServer, serverLabel } from "./friendList";

const TOAST_TIME = 15000;

const toast = byId("friendToast");
let toastRequest: IncomingRequest | null = null;
let toastTimer: ReturnType<typeof setTimeout> | undefined;

export function showFriendRequest(request: IncomingRequest): void {
  toastRequest = request;
  byId("friendToastText").textContent = `${request.name} wants to be friends`;
  toast.style.display = "block";
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (toast.style.display = "none"), TOAST_TIME);
}

const banner = byId("inviteBanner");
let invite: FriendInvite | null = null;

export function showGameInvite(next: FriendInvite): void {
  if (!next.server) return;
  invite = next;
  byId("inviteText").textContent = `${next.name} invited you to ${serverLabel(next.server)}`;
  banner.style.display = "block";
}

interface Note {
  text?: string;
  name?: string;
  kind?: PresenceNote["kind"];
  server: string | null;
  notice?: boolean;
}

const notes = byId("friendNotes");
const queue: Note[] = [];
let noteTimer: ReturnType<typeof setTimeout> | undefined;

function noteText(note: Note): string {
  if (note.text) return note.text;
  if (note.kind === "offline") return `${note.name} has gone offline`;
  if (note.kind === "joined") {
    return `${note.name} has joined ${note.server === serverBrowser.key() ? "your game" : serverLabel(note.server ?? "")}`;
  }
  return `${note.name} is now online`;
}

function nextNote(): void {
  clearTimeout(noteTimer);
  removeAllChildren(notes);
  const note = queue.shift();
  if (!note) return;

  const line = createElement({ class: "friendPrompt" + (note.notice ? " notice" : ""), parent: notes });
  createElement({ tag: "span", text: noteText(note), parent: line });

  const joinable = Boolean(note.server && note.server !== serverBrowser.key());
  if (joinable) {
    createElement({
      tag: "a",
      text: "Join",
      parent: line,
      onclick: () => {
        nextNote();
        joinFriendServer(note.server!);
      },
    });
  }

  const time = note.notice ? 15000 : queue.length ? 3000 : joinable ? 12000 : 5000;
  noteTimer = setTimeout(nextNote, time);
}

function pushNote(note: Note): void {
  queue.push(note);
  const showing = notes.firstChild as HTMLElement | null;
  if (!showing) {
    nextNote();
  } else if (queue.length === 1 && !showing.classList.contains("notice")) {
    clearTimeout(noteTimer);
    noteTimer = setTimeout(nextNote, 3000);
  }
}

export function showPresenceNote(note: PresenceNote): void {
  pushNote({ name: note.name, kind: note.kind, server: note.server });
}

export function showServerNotice(text: string): void {
  pushNote({ text: String(text), server: null, notice: true });
}

export function bindNotices(): void {
  byId("friendToastAccept").onclick = () => {
    toast.style.display = "none";
    if (toastRequest) friends.answer(toastRequest.id, true).catch(() => {});
  };
  byId("friendToastDismiss").onclick = () => {
    toast.style.display = "none";
  };

  byId("inviteJoin").onclick = () => {
    banner.style.display = "none";
    if (invite) joinFriendServer(invite.server);
  };
  byId("inviteDismiss").onclick = () => {
    banner.style.display = "none";
  };
}
