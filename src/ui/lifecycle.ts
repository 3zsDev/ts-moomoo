import { serverBrowser } from "../game/session";
import { state } from "../game/state";
import { boundKey, enableJoysticks, isMobileDevice, setUsingTouch } from "../input";
import { friends } from "../net/api";
import { closeAdminMenu, isAdminMenuOpen } from "./admin";
import { closeAlliance, isAllianceOpen } from "./alliance";
import { closeClanCard, isClanCardOpen } from "./cards/clan";
import { closeProfile, isProfileOpen, resetLiveStats } from "./cards/profile";
import { ui } from "./elements";
import { closeGameMenu, isGameMenuOpen, showGameMenu } from "./gameMenu";
import { closeChat, isChatOpen } from "./hud/chat";
import { hideShutdownNotice, setNetStatsInGame } from "./hud/netStats";
import { onMenuReturn } from "./menu/screens";
import { isAlive } from "./netBridge";
import { refreshNoteDots } from "./noteDots";
import { closeWhisperCard, isWhisperCardOpen } from "./social/messages";
import { refreshUpdateNotice } from "./social/pageStream";
import { closeStore, flushStoreUpdates, isStoreOpen } from "./store";
import { hideButtonsUnderUpgrades } from "./upgrades";

interface Factorem {
  factorem?: { refreshAds(slots: number[], force: boolean): void };
}

function showConsentButton(on: boolean): void {
  const button = document.getElementById("ot-sdk-btn-floating");
  if (button) button.style.display = on ? "block" : "none";
}

export function closeGamePanels(): void {
  closeStore();
  closeAlliance();
  closeGameMenu();
  closeAdminMenu();
  closeChat();
}

function anythingOpen(): boolean {
  return isStoreOpen() || isAllianceOpen() || isGameMenuOpen() || isAdminMenuOpen() || isChatOpen() ||
    isProfileOpen() || isClanCardOpen() || isWhisperCardOpen() || ui.reportMenu.style.display === "block";
}

export function handleGameEscape(): void {
  if (!isAlive()) return;
  if (anythingOpen()) {
    closeGamePanels();
    if (isProfileOpen()) closeProfile();
    closeWhisperCard();
    closeClanCard();
    closeGameMenu();
  } else if (!boundKey("menu_game")) {
    showGameMenu();
  }
}

export function setPlaying(on: boolean, refreshNotice = true): void {
  state.playing = on;
  document.body.classList.toggle("inGame", on);
  if (on) {
    setNetStatsInGame();
    showConsentButton(false);
  }
  if (refreshNotice) refreshUpdateNotice();
}

export function onGameStart(): void {
  setPlaying(true);
  friends.setPresence(serverBrowser.key(), true);
  ui.autoGatherButton.classList.remove("active");
  document.body.classList.add("hud");
  flushStoreUpdates();
  hideButtonsUnderUpgrades();


  if (isMobileDevice()) {
    enableJoysticks({
      onGrab: () => {
        closeAlliance();
        setUsingTouch(true);
      },
    });
  }
}

export function onPlayerDeath(): void {
  setPlaying(false);
  friends.setPresence(serverBrowser.key(), false);
  closeGamePanels();
  showConsentButton(true);
  try {
    (window as unknown as Factorem).factorem?.refreshAds([2], true);
  } catch {}
  document.body.classList.remove("hud");
}

function onSessionReset(): void {
  friends.setPresence("", false);
  hideShutdownNotice();
  resetLiveStats();
  closeGamePanels();
  refreshNoteDots();
}

export function bindLifecycle(): void {
  onMenuReturn(onSessionReset);
}
