import { alternateSite, isSandbox } from "../../environment";
import { createElement, findById } from "../../utils/dom";
import { ui } from "../elements";

export function bindPageChrome(): void {
  bindAltServerLink();
  bindBackToMain();
  bindLeaderboardToggle();
  bindErrorNotification();
}

const ALT_SERVER_ICON = "arrow_forward_ios";
const ALT_SERVER_ICON_STYLE = "font-size:10px;vertical-align:middle";

function linkWithArrow(parent: HTMLElement, href: string, label: string): void {
  const link = createElement({ tag: "a", parent }) as HTMLAnchorElement;
  link.href = href;
  link.appendChild(document.createTextNode(label));
  createElement({ tag: "i", class: "material-icons", style: ALT_SERVER_ICON_STYLE, text: ALT_SERVER_ICON, parent: link });
}

function bindAltServerLink(): void {
  const holder = findById("altServer");
  if (!holder) return;
  holder.textContent = "";
  // Sandbox already has "Back to MooMoo" on the play view.
  if (isSandbox()) return;
  const alternate = alternateSite();
  linkWithArrow(holder, alternate.href, alternate.label);
}

// Live puts a "Back to MooMoo" link on the sandbox play view.
function bindBackToMain(): void {
  if (!isSandbox()) return;
  ui.backToMain.textContent = "";
  linkWithArrow(ui.backToMain, alternateSite().href, "Back to MooMoo");
}

// Hold the button (touch or mouse) to peek at the leaderboard.
function bindLeaderboardToggle(): void {
  const button = ui.leaderboardButton;
  const board = ui.leaderboard;

  const show = () => board.classList.add("is-showing");
  const hide = () => board.classList.remove("is-showing");

  button.addEventListener("touchstart", show);
  button.addEventListener("mousedown", (event) => {
    event.preventDefault();
    show();
  });

  for (const event of ["touchend", "touchleave", "touchcancel"]) {
    document.body.addEventListener(event, hide);
  }
  window.addEventListener("mouseup", hide);
  window.addEventListener("blur", hide);
}

function bindErrorNotification(): void {
  const hide = findById("errorNotificationHide");
  const card = findById("errorNotification");
  if (hide && card) hide.onclick = () => (card.style.display = "none");
}
