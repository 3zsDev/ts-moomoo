import { ui } from "../elements";

type Listener = () => void;

const menuReturnListeners: Listener[] = [];

export function onMenuReturn(listener: Listener): void {
  menuReturnListeners.push(listener);
}

let showPlayView: Listener = () => {};

export function setPlayViewHandler(handler: Listener): void {
  showPlayView = handler;
}

export function showMenuStatus(message: string, offerReload = false): void {
  ui.mainMenu.style.display = "block";
  ui.gameUI.style.display = "none";
  document.body.classList.remove("hud");
  ui.menuCards.style.display = "none";
  ui.diedText.style.display = "none";
  ui.loadingText.style.display = "block";
  ui.loadingText.innerHTML = offerReload
    ? `${message} <a href='javascript:window.location.href=window.location.href' class='ytLink'>reload</a>`
    : message;
}

export function showMenuNotice(notice: string): void {
  for (const listener of menuReturnListeners) listener();
  ui.gameUI.style.display = "none";
  document.body.classList.remove("hud");
  ui.diedText.style.display = "none";
  ui.loadingText.style.display = "none";
  ui.mainMenu.style.display = "block";
  ui.menuCards.style.display = "block";
  showPlayView();
  ui.menuNotice.textContent = notice || "";
}

export function showMenuCards(): void {
  ui.loadingText.style.display = "none";
  ui.mainMenu.style.display = "block";
  ui.menuCards.style.display = "block";
}

export function hideMenu(): void {
  ui.loadingText.style.display = "none";
  ui.menuCards.style.display = "block";
  ui.mainMenu.style.display = "none";
}

export function isMenuVisible(): boolean {
  return ui.mainMenu.style.display !== "none";
}
