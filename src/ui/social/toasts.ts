import { account } from "../../net/api";
import { byId, createElement } from "../../utils/dom";
import { loadSetting, saveSetting } from "../../utils/storage";
import { openChatWith } from "../hud/chat";
import { isAlive } from "../netBridge";
import type { ChatMessage } from "./chatLog";

const MAX_TOASTS = 5;
const TOAST_TIME = 12000;
const REPLY_ICON = "";

export type ToastKind = "whisper" | "clan";

export const toastPrefs: Record<ToastKind, boolean> = {
  whisper: loadSetting("toast_whispers") !== "0",
  clan: loadSetting("toast_clan") !== "0",
};

const TOAST_TOGGLES: [kind: ToastKind, id: string, key: string][] = [
  ["whisper", "prefToastWhispers", "toast_whispers"],
  ["clan", "prefToastClan", "toast_clan"],
];

const holder = byId("chatToasts");

export type ChatToast = ChatMessage | { note: string };

export function showChatToast(toast: ChatToast): boolean {
  if (!isAlive()) return false;
  const note = "note" in toast ? toast.note : null;
  const message = "note" in toast ? null : toast;
  const kind = note !== null ? "note" : String(message!.kind);
  if (kind !== "note" && !toastPrefs[kind as ToastKind]) return false;

  const own = Boolean(message && !message.system && message.from.name === account.name);
  const el = createElement({ class: `chatToast ${kind}${own ? " own" : ""}`, parent: holder });
  const body = createElement({ tag: "span", class: "chatToastBody", parent: el });

  if (note !== null || message!.system) {
    if (message?.system) createElement({ tag: "span", class: "chatToastWho", text: "[Clan] ", parent: body });
    createElement({ tag: "span", class: "chatToastText", text: note ?? message!.text, parent: body });
  } else {
    const msg = message!;
    const clan = msg.kind === "clan";
    const who = clan ? `[Clan] ${own ? "You" : msg.from.name}` : own ? `To ${msg.to?.name}` : msg.from.name;
    createElement({ tag: "span", class: "chatToastWho", text: `${who}: `, parent: body });
    createElement({ tag: "span", class: "chatToastText", text: msg.text, parent: body });
    if (!own) {
      const reply = createElement({
        tag: "a", class: "chatToastReply", parent: el,
        onclick: () => openChatWith(clan ? "/c " : `/w ${msg.from.name} `),
      });
      reply.title = clan ? "Reply to the clan" : `Reply to ${msg.from.name}`;
      createElement({ tag: "i", class: "material-icons", text: REPLY_ICON, parent: reply });
    }
  }

  while (holder.childNodes.length > MAX_TOASTS) holder.removeChild(holder.firstChild!);
  setTimeout(() => el.remove(), TOAST_TIME);
  return true;
}

export function bindToastPrefs(): void {
  for (const [kind, id, key] of TOAST_TOGGLES) {
    const toggle = byId<HTMLInputElement>(id, "input");
    toggle.checked = toastPrefs[kind];
    toggle.onchange = () => {
      toastPrefs[kind] = toggle.checked;
      saveSetting(key, toggle.checked ? "1" : "0");
      if (!toggle.checked) holder.querySelectorAll(`.chatToast.${kind}`).forEach((el) => el.remove());
    };
  }
}
