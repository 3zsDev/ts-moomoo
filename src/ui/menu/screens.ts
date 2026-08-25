import { ui } from "../elements";

export function showMenuStatus(message: string, offerReload = false): void {
  ui.mainMenu.style.display = "block";
  ui.gameUI.style.display = "none";
  ui.menuCards.style.display = "none";
  ui.diedText.style.display = "none";
  ui.loadingText.style.display = "block";
  ui.loadingText.innerHTML = offerReload
    ? `${message}<a href='javascript:window.location.reload()' class='ytLink'>reload</a>`
    : message;
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
