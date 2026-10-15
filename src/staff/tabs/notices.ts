import { createElement } from "../../utils/dom";
import { staffPost } from "../api";
import type { Notice } from "../stream";
import { page, timeLeft } from "../state";
import { armedButton, button, card, input, type Option, row, select, status } from "../ui";

const TEXT_MAX = 200;
const MINUTES: [number, string][] = [[5, "5 minutes"], [15, "15 minutes"], [30, "30 minutes"], [60, "1 hour"], [180, "3 hours"], [720, "12 hours"], [1440, "1 day"]];

let current: Notice | null = null;
let minutes = 60;
let currentHolder: HTMLElement | null = null;

function fillCurrent(): void {
  const holder = currentHolder;
  if (!holder?.isConnected) return;
  const live = current?.text && (current.until ?? 0) > Date.now();
  holder.textContent = live ? `"${current!.text}" - ${timeLeft(current!.until!)} left` : "No notice is showing";
}

export function setNotice(notice: Notice | null): void {
  current = notice?.text ? notice : null;
  if (page.tab === "notices") fillCurrent();
}

export function renderNotices(parent: HTMLElement): void {
  const box = card(parent, "Notices");
  createElement({ class: "menuText", text: "A notice shows at the top of every open game page.", parent: box });

  const showing = row(box, "Showing");
  currentHolder = createElement({ tag: "span", class: "friendNote staffNotice", parent: showing });
  fillCurrent();

  const write = row(box, "Text");
  const text = input(write, "Server restarting soon...", "", "staffWide");
  text.maxLength = TEXT_MAX;

  const length = row(box, "For");
  select(length, null, MINUTES.map(([value, label]): Option => [value, label]), (value) => {
    minutes = Number(value);
  }, minutes);

  const shown = status(box);
  const post = (body: object, done: string) =>
    staffPost<{ notice?: Notice | null }>("/mod/notice", body).then(
      (data) => {
        setNotice(data.notice ?? null);
        shown.ok(done);
      },
      (error) => shown.fail(error),
    );

  const buttons = createElement({ class: "adminRow", parent: box });
  button(buttons, "Send", () => {
    const value = text.value.trim();
    if (!value) {
      shown.fail(new Error("Write the notice first"));
      return;
    }
    void post({ text: value, minutes }, "Notice sent");
  }, "go");
  armedButton(buttons, "Clear notice", () => post({ text: "", minutes }, "Notice cleared"));
}
