import { createElement } from "../utils/dom";
import { errorText } from "./api";

export type Option = [value: string | number, label: string] | { group: string };

export function card(parent: HTMLElement, header?: string): HTMLElement {
  const el = createElement({ class: "menuCard staffCard", parent });
  if (header) createElement({ class: "menuHeader", text: header, parent: el });
  return el;
}

export function title(parent: HTMLElement, text: string): HTMLElement {
  return createElement({ class: "adminTitle", text, parent });
}

export function row(parent: HTMLElement, label: string): HTMLElement {
  const el = createElement({ class: "adminRow", parent });
  createElement({ tag: "span", class: "adminLabel", text: label, parent: el });
  return el;
}

export function button(parent: HTMLElement, label: string, onclick: () => void, kind = ""): HTMLElement {
  return createElement({ class: `adminBtn${kind ? ` ${kind}` : ""}`, text: label, parent, onclick });
}

export function empty(parent: HTMLElement, text: string): HTMLElement {
  return createElement({ class: "friendEmpty", text, parent });
}

export function line(parent: HTMLElement, label: string, value: string): void {
  createElement({
    class: "staffLine",
    parent,
    children: [createElement({ tag: "label", text: label }), createElement({ tag: "span", text: value })],
  });
}

export function select(
  parent: HTMLElement,
  placeholder: string | null,
  options: Option[],
  onPick: (value: string) => void,
  current?: string | number,
): HTMLSelectElement {
  const el = createElement({ tag: "select", class: "adminSelect", parent }) as HTMLSelectElement;
  if (placeholder) {
    const first = createElement({ tag: "option", text: placeholder, parent: el }) as HTMLOptionElement;
    first.value = "";
    first.disabled = true;
    first.selected = true;
  }
  let target: HTMLElement = el;
  for (const option of options) {
    if (!Array.isArray(option)) {
      target = createElement({ tag: "optgroup", parent: el });
      (target as HTMLOptGroupElement).label = option.group;
      continue;
    }
    const entry = createElement({ tag: "option", text: option[1], parent: target }) as HTMLOptionElement;
    entry.value = String(option[0]);
    if (!placeholder && String(option[0]) === String(current)) entry.selected = true;
  }
  if (!options.some(Array.isArray)) el.disabled = true;
  el.onchange = () => {
    const value = el.value;
    if (placeholder) el.selectedIndex = 0;
    el.blur();
    onPick(value);
  };
  return el;
}

export function input(parent: HTMLElement, placeholder: string, value = "", extraClass = ""): HTMLInputElement {
  const el = createElement({ tag: "input", class: `adminSelect adminInput${extraClass ? ` ${extraClass}` : ""}`, parent }) as HTMLInputElement;
  el.type = "text";
  el.placeholder = placeholder;
  el.value = value;
  return el;
}

export function checkbox(parent: HTMLElement, label: string): HTMLInputElement {
  const holder = createElement({ tag: "label", class: "staffCheck", parent });
  const box = createElement({ tag: "input", parent: holder }) as HTMLInputElement;
  box.type = "checkbox";
  createElement({ tag: "span", text: label, parent: holder });
  return box;
}

export interface Status {
  el: HTMLElement;
  busy(text?: string): void;
  ok(text: string): void;
  fail(error: unknown): void;
  clear(): void;
}

export function status(parent: HTMLElement): Status {
  const el = createElement({ class: "staffStatus", parent });
  const set = (text: string, kind: string) => {
    el.textContent = text;
    el.className = `staffStatus${kind ? ` ${kind}` : ""}`;
  };
  return {
    el,
    busy: (text = "Working...") => set(text, "busy"),
    ok: (text) => set(text, "ok"),
    fail: (error) => set(errorText(error), "error"),
    clear: () => set("", ""),
  };
}

// destructive actions take two clicks, like the old staff card
export function armedButton(parent: HTMLElement, label: string, run: () => Promise<unknown>, onDone?: () => void): HTMLElement {
  let armed = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const disarm = () => {
    armed = false;
    clearTimeout(timer);
    el.textContent = label;
    el.classList.remove("armed");
  };
  const el = createElement({
    class: "staffAction",
    text: label,
    parent,
    onclick: () => {
      if (!armed) {
        armed = true;
        el.textContent = `${label}?`;
        el.classList.add("armed");
        timer = setTimeout(disarm, 4000);
        return;
      }
      disarm();
      void run().then(() => onDone?.(), () => {});
    },
  });
  return el;
}
