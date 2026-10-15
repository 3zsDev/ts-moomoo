import { account } from "../../net/api";
import { createElement } from "../../utils/dom";

const MAX_LINES = 200;
const MAX_LENGTH = 200;
const STICK_TO_BOTTOM = 40;

export interface ChatMessage {
  id?: string;
  n?: string;
  kind?: "clan" | "whisper" | string;
  from: { name: string };
  to?: { name: string };
  text: string;
  at?: number;
  system?: boolean;
}

export interface ChatLog {
  add(message: ChatMessage): void;
}

interface ChatLogOptions {
  placeholder?: string;
  load(): Promise<{ messages?: ChatMessage[] }>;
  send(text: string): Promise<unknown>;
}

function button(parent: HTMLElement, label: string, onclick: () => void, kind?: string): HTMLElement {
  return createElement({ class: "friendAction" + (kind ? ` ${kind}` : ""), text: label, parent, onclick });
}

export function createChatLog(parent: HTMLElement, options: ChatLogOptions): ChatLog {
  const log = createElement({ class: "chatLog", parent });
  const row = createElement({ class: "clanInputRow", parent });
  const input = createElement({ tag: "input", class: "profileSocialInput", parent: row }) as HTMLInputElement;
  const status = createElement({ class: "chatStatus", parent });
  input.placeholder = options.placeholder || "Say something";
  input.maxLength = MAX_LENGTH;

  let empty: HTMLElement | null = createElement({ class: "friendEmpty", text: "Loading...", parent: log });

  const add = (message: ChatMessage) => {
    if (!message?.from || typeof message.text !== "string") return;
    const own = !message.system && message.from.name === account.name;
    const atBottom = own || log.scrollHeight - log.scrollTop - log.clientHeight < STICK_TO_BOTTOM;
    empty?.remove();
    empty = null;

    const line = createElement({
      class: "chatLine" + (message.system ? " system" : own ? " own" : ""),
      parent: log,
    });
    if (!message.system) {
      createElement({
        tag: "span", class: "chatWho", text: `${message.from.name}${own ? " (you)" : ""}: `, parent: line,
      });
    }
    createElement({ tag: "span", text: message.text, parent: line });
    line.title = new Date(message.at || Date.now()).toLocaleString([], { dateStyle: "medium", timeStyle: "short" });

    while (log.childNodes.length > MAX_LINES) log.removeChild(log.firstChild!);
    if (atBottom) log.scrollTop = log.scrollHeight;
  };

  options
    .load()
    .then((data) => {
      if (empty) empty.textContent = "Nothing said yet";
      (data.messages ?? []).forEach(add);
      log.scrollTop = log.scrollHeight;
    })
    .catch((error: Error) => {
      if (empty) empty.textContent = error.message || "Couldn't load what was said";
    });

  const send = () => {
    const text = input.value.replace(/\s+/g, " ").trim();
    if (!text) return;
    status.textContent = "";
    input.value = "";
    options
      .send(text)
      .then(() => add({ from: { name: account.name ?? "" }, text, at: Date.now() }))
      .catch((error: Error) => {
        status.textContent = error.message;
        if (!input.value) input.value = text;
      });
  };

  input.addEventListener("keydown", (event) => {
    if ((event.which || event.keyCode) === 13) send();
    event.stopPropagation();
  });
  button(row, "Send", send, "go");

  return { add };
}
