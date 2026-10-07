import { auth } from "../../net/api";
import { friends } from "../../net/api/social";
import { hookTouchEvents } from "../../utils/dom";
import { openAccountCard } from "../account/accountCard";
import { closeClanCard, isClanCardOpen, openMyClan } from "../cards/clan";
import { closeProfile, isProfileOpen } from "../cards/profile";
import { ui } from "../elements";
import { isAlive } from "../netBridge";
import { isVerifyDialogOpen } from "./verifyDialog";
import { setPlayViewHandler } from "./screens";

export type MenuView = "play" | "help" | "settings" | "friends" | "top";

let current: MenuView = "play";
const viewListeners: ((view: MenuView) => void)[] = [];

export function currentView(): MenuView {
  return current;
}

export function onViewShown(listener: (view: MenuView) => void): void {
  viewListeners.push(listener);
}

export function showView(view: MenuView): void {
  current = view;
  friends.watch(view === "friends");
  for (const listener of viewListeners) listener(view);

  for (const el of ui.menuDialog.querySelectorAll<HTMLElement>(".menuView")) {
    el.style.display = el.getAttribute("data-view") === view ? "" : "none";
  }
}

function onNavClick(view: string): void {
  if (view === "clan") {
    openMyClan();
    return;
  }
  if (view === "friends" && !auth.isVerified()) {
    openAccountCard("Sign in or sign up to add friends.", () => showView("friends"));
    return;
  }
  showView(view as MenuView);
}

export function bindMenuViews(): void {
  setPlayViewHandler(() => showView("play"));

  for (const link of ui.menuDialog.querySelectorAll<HTMLElement>("#menuNav a")) {
    link.onclick = () => onNavClick(link.getAttribute("data-view") ?? "play");
    hookTouchEvents(link);
  }

  for (const back of ui.menuDialog.querySelectorAll<HTMLElement>(".viewBack")) {
    back.onclick = () => showView("play");
    hookTouchEvents(back);
  }

  ui.settingsButton.onclick = () => showView("settings");
  hookTouchEvents(ui.settingsButton);

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape" || isAlive() || isVerifyDialogOpen()) return;
    if (isClanCardOpen()) closeClanCard();
    else if (isProfileOpen()) closeProfile();
    else showView("play");
  });
}
