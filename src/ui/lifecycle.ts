import { serverBrowser } from "../game/session";
import { enableJoysticks, isMobileDevice, setUsingTouch } from "../input";
import { friends } from "../net/api";
import { closeAdminMenu, isAdminMenuOpen } from "./admin";
import { closeAlliance, isAllianceOpen } from "./alliance";
import { closeClanCard, isClanCardOpen } from "./cards/clan";
import { closeProfile, isProfileOpen } from "./cards/profile";
import { ui } from "./elements";
import { closeGameMenu, isGameMenuOpen, showGameMenu } from "./gameMenu";
import { closeChat, isChatOpen } from "./hud/chat";
import { hideShutdownNotice, setNetStatsInGame } from "./hud/netStats";
import { onMenuReturn } from "./menu/screens";
import { isAlive } from "./netBridge";
import { refreshNoteDots } from "./noteDots";
import { closeStore, flushStoreUpdates, isStoreOpen } from "./store";
import { hideButtonsUnderUpgrades } from "./upgrades";

interface FrvrTracker {
  FRVR?: { tracker?: { levelStart?(name: string): void } };
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
    isProfileOpen() || isClanCardOpen() || ui.reportMenu.style.display === "block";
}

export function handleGameEscape(): void {
  if (!isAlive()) return;
  if (anythingOpen()) {
    closeGamePanels();
    if (isProfileOpen()) closeProfile();
    closeClanCard();
    closeGameMenu();
  } else {
    showGameMenu();
  }
}

export function onGameStart(): void {
  friends.setPresence(serverBrowser.key(), true);
  ui.autoGatherButton.classList.remove("active");
  document.body.classList.add("hud");
  setNetStatsInGame(true);
  flushStoreUpdates();
  hideButtonsUnderUpgrades();

  window.onbeforeunload = () => "Are you sure?";
  (window as unknown as FrvrTracker).FRVR?.tracker?.levelStart?.("game_start");

  if (isMobileDevice()) {
    enableJoysticks({
      onGrab: () => {
        closeStore();
        closeAlliance();
        setUsingTouch(true);
      },
    });
  }
}

export function onPlayerDeath(): void {
  friends.setPresence(serverBrowser.key(), false);
  closeGamePanels();
  document.body.classList.remove("hud");
  setNetStatsInGame(false);
}

function onSessionReset(): void {
  friends.setPresence("", false);
  hideShutdownNotice();
  closeProfile();
  closeGamePanels();
  setNetStatsInGame(false);
  refreshNoteDots();
}

export function bindLifecycle(): void {
  onMenuReturn(onSessionReset);
}
