import { isSandbox } from "../../environment";
import { isCapturingKey } from "../../input";
import { account } from "../../net/api";
import { trusted } from "../../security/trusted";
import { byId } from "../../utils/dom";
import { openAccountCard } from "../account/accountCard";
import { openProfile } from "../cards/profile";
import { renderLookEditor } from "./lookEditor";
import { renderShopEditor } from "./shopEditor";

export type SettingsPart = "social" | "shop" | "keys" | "look";

const TITLES: Record<SettingsPart, string> = { social: "Social", shop: "Shop", keys: "Keys", look: "Look" };

const popup = byId("settingsPopup");

export function refreshSocialNote(): void {
  const note = byId("socialSignedOut");
  const prefs = byId("accountPrefs");
  note.textContent = prefs.style.display !== "none"
    ? ""
    : isSandbox() ? "These aren't used on sandbox." : "Sign in to change these.";
  note.style.display = note.textContent ? "" : "none";
}

export function isSettingsPopupOpen(): boolean {
  return popup.style.display === "block";
}

export function openSettingsPopup(part: SettingsPart): void {
  byId("settingsPopupTitle").textContent = TITLES[part] ?? "";
  for (const el of popup.querySelectorAll<HTMLElement>(".popupPart")) {
    el.style.display = el.dataset.part === part ? "" : "none";
  }
  refreshSocialNote();
  if (part === "shop") renderShopEditor();
  if (part === "look") renderLookEditor(closeSettingsPopup);
  popup.style.display = "block";
}

export function closeSettingsPopup(): void {
  popup.style.display = "none";
}

export function bindSettingsPopup(): void {
  for (const link of document.querySelectorAll<HTMLElement>(".settingsLink")) {
    link.onclick = trusted(() => openSettingsPopup(link.dataset.popup as SettingsPart));
  }
  byId("settingsPopupClose").onclick = trusted(closeSettingsPopup);
  byId("settingsProfileLink").onclick = trusted(() => {
    closeSettingsPopup();
    if (account.name) openProfile(account.name);
    else openAccountCard("Sign in to have a profile.");
  });
  byId("settingsLookLink").onclick = trusted(() => {
    if (account.name) {
      openSettingsPopup("look");
      return;
    }
    closeSettingsPopup();
    openAccountCard("Sign in to pick a look.");
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape" || !isSettingsPopupOpen() || isCapturingKey()) return;
    closeSettingsPopup();
    event.stopImmediatePropagation();
    event.preventDefault();
  }, true);
}
