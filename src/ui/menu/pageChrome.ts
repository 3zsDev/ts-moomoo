import { assetUrl } from "../../assetBase";
import { alternateSite } from "../../environment";
import { serverBrowser } from "../../game/session";
import { createElement, findById, hookTouchEvents } from "../../utils/dom";
import { ui } from "../elements";

export function bindPageChrome(): void {
  bindPartyButtons();
  bindAltServerLink();
  bindLeaderboardToggle();
  bindPromoBanner();
  applyInputMode(false);
}

const PROMO_LINK = "https://krunker.io/?play=SquidGame_KB";

function bindPromoBanner(): void {
  const holder = findById("promoImgHolder");
  const image = findById<HTMLImageElement>("promoImg");
  if (!holder || !image) return;

  const file = (image.getAttribute("src") ?? "").split("/").pop();
  if (!file) {
    holder.style.display = "none";
    return;
  }

  image.onerror = () => {
    holder.style.display = "none";
  };
  image.src = assetUrl(`img/promotion/${file}`);

  image.onclick = () => window.open(PROMO_LINK, "_blank");
  hookTouchEvents(image);
}

function bindPartyButtons(): void {
  const join = () => {
    const key = window.prompt("party key", serverBrowser.selectedKey ?? "");
    if (!key) return;
    window.onbeforeunload = null;
    window.location.href = `/?server=${encodeURIComponent(key)}`;
  };

  for (const button of [ui.joinPartyButton, ui.partyButton]) {
    if (!button) continue;
    button.onclick = join;
    hookTouchEvents(button);
  }
}

const ALT_SERVER_ICON = "arrow_forward_ios";
const ALT_SERVER_ICON_STYLE = "font-size:10px;vertical-align:middle";

function bindAltServerLink(): void {
  const holder = findById("altServer");
  if (!holder) return;

  const alternate = alternateSite();
  const link =
    holder.querySelector("a") ??
    (createElement({ tag: "a", parent: holder }) as HTMLAnchorElement);
  link.href = alternate.href;

  const icon =
    link.querySelector("i") ??
    createElement({
      tag: "i",
      class: "material-icons",
      style: ALT_SERVER_ICON_STYLE,
      text: ALT_SERVER_ICON,
      parent: link,
    });

  for (const node of Array.from(link.childNodes)) {
    if (node.nodeType === Node.TEXT_NODE) link.removeChild(node);
  }
  link.insertBefore(document.createTextNode(alternate.label), icon);
}

function bindLeaderboardToggle(): void {
  const button = findById("leaderboardButton");
  const board = findById("leaderboard");
  if (!button || !board) return;

  const show = () => board.classList.add("is-showing");
  const hide = () => board.classList.remove("is-showing");

  button.addEventListener("touchstart", show);
  button.onmouseover = show;
  button.onmouseout = hide;

  for (const event of ["touchend", "touchleave", "touchcancel"] as const) {
    document.body.addEventListener(event, hide);
  }
}

export function applyInputMode(usingTouch: boolean): void {
  ui.guideCard.classList.toggle("touch", usingTouch);

  for (const id of ["touch-controls-left", "touch-controls-right"]) {
    const el = findById(id);
    if (el) el.style.display = usingTouch ? "block" : "none";
  }
}
