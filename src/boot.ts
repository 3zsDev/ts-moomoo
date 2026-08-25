import { config } from "./config";
import { serverListUrl } from "./environment";
import { state } from "./game/state";
import { createBackgroundMenu } from "./game/menuWorld";
import { connectToServer, grantFollowBonus, joinGame, serverBrowser } from "./game/session";
import { installInputHandlers, sendAimAngle, touchControls } from "./input";
import { connection } from "./net/Connection";
import { ClientPacket } from "./net/protocol";
import { initTurnstile, isCaptchaRequired, setCaptchaRequired } from "./net/turnstile";
import { canvas } from "./render/canvas";
import { minimapCanvas } from "./render/minimap";
import { updateGame } from "./render/renderer";
import { enableProtection } from "./security";
import { hookTouchEvents } from "./utils/dom";
import { buildActionBar } from "./ui/actionBar";
import { closeAlliance, isAllianceOpen, toggleAlliance } from "./ui/alliance";
import { ui } from "./ui/elements";
import { animateDeathText, isChatOpen, toggleChat } from "./ui/hud";
import { hideItemInfo } from "./ui/itemInfo";
import { injectStylesheets } from "./ui/stylesheets";
import {
  bindPageChrome, bindServerSelect, bindSettingToggles, buildServerList,
  buildSkinColorPicker, loadSettings, refreshServerList, showMenuCards,
  showMenuStatus, toggleSettings,
} from "./ui/menu";
import { closeStore, setStoreTab, toggleStore } from "./ui/store";

declare global {
  interface Window {
    changeStoreIndex: typeof setStoreTab;
    follmoo: typeof grantFollowBonus;
    touchControls: typeof touchControls;
    config: typeof config;
  }
}

export function boot(): void {
  enableProtection();
  void injectStylesheets();

  exposeGlobals();

  loadSettings();
  bindSettingToggles();
  buildSkinColorPicker();
  buildActionBar();
  createBackgroundMenu();

  bindMenuButtons();
  bindPageChrome();
  initTurnstile(updateEnterButton);
  installInputHandlers({
    toggleChat,
    closeMenus: closeAllMenus,
    canUseHotkeys: () => !isAllianceOpen() && !isChatOpen(),
  });

  canvas.oncontextmenu = () => false;

  showMenuStatus("Loading servers...");
  serverBrowser.onUpdate = () => refreshServerList(serverBrowser);
  void serverBrowser
    .load(serverListUrl())
    .then(() => {
      buildServerList(serverBrowser);
      bindServerSelect(serverBrowser);
      setCaptchaRequired(!serverBrowser.isLocalSelected());
      showMenuCards();
    })
    .catch((error) => {
      console.error("Failed to load server list:", error);
      showMenuStatus("Could not reach the server list.", true);
    });

  requestAnimationFrame(frame);
}

function updateEnterButton(hasToken: boolean): void {
  const ready = hasToken || !isCaptchaRequired();
  ui.enterGameButton.classList.toggle("disabled", !ready);
}

function exposeGlobals(): void {
  window.changeStoreIndex = setStoreTab;
  window.follmoo = grantFollowBonus;
  window.touchControls = touchControls;
  window.config = config;
}

function closeAllMenus(): void {
  closeStore();
  closeAlliance();
  hideItemInfo();
}

function bindMenuButtons(): void {
  ui.enterGameButton.onclick = () => {
    if (ui.enterGameButton.classList.contains("disabled")) return;
    showMenuStatus("Connecting...");
    if (connection.isReady()) joinGame();
    else connectToServer();
  };
  hookTouchEvents(ui.enterGameButton);

  ui.settingsButton.onclick = toggleSettings;
  hookTouchEvents(ui.settingsButton);

  ui.allianceButton.onclick = toggleAlliance;
  hookTouchEvents(ui.allianceButton);

  ui.storeButton.onclick = toggleStore;
  hookTouchEvents(ui.storeButton);

  ui.chatButton.onclick = toggleChat;
  hookTouchEvents(ui.chatButton);

  minimapCanvas.onclick = () => connection.send(ClientPacket.PingMap, 1);
  hookTouchEvents(minimapCanvas);

  ui.nameInput.onkeypress = (event) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    ui.enterGameButton.onclick?.(event as unknown as PointerEvent);
  };
  ui.nameInput.onchange = () => {
    ui.nameInput.value = (ui.nameInput.value || "").slice(0, config.maxNameLength);
  };
}

function frame(): void {
  state.now = Date.now();
  state.delta = state.now - state.lastFrame;
  state.lastFrame = state.now;

  sendAimAngle();
  animateDeathText(state.delta);
  updateGame(state.delta);

  requestAnimationFrame(frame);
}
