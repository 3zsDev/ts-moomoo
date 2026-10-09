import { config } from "./config";
import { serverListUrl, siteEnv, socialEnabled } from "./environment";
import { state } from "./game/state";
import { createBackgroundMenu } from "./game/menuWorld";
import { grantFollowBonus, serverBrowser } from "./game/session";
import {
  bindAimFollowsSetting, clearHeldKeys, initInputMode, installInputHandlers, isCapturingKey, isMobileDevice,
  pingMinimap, sendAimAngle, toggleAutoGather, touchControls,
} from "./input";
import { account, auth, friends, initAccount, isStaff, onAccountChange } from "./net/api";
import { initTurnstile, setLocalServerSelected } from "./net/turnstile";
import { canvas } from "./render/surface";
import { minimapCanvas } from "./render/minimap";
import { updateGame } from "./render/renderer";
import { enableProtection, ignoreSyntheticClicks } from "./security";
import { hookTouchEvents } from "./utils/dom";
import { bindAccountCard } from "./ui/account/accountCard";
import { buildActionBar, paintActionBar } from "./ui/actionBar";
import { bindAdminMenu, closeAdminMenu, toggleAdminMenu } from "./ui/admin";
import { closeAlliance, isAllianceOpen, toggleAlliance } from "./ui/alliance";
import { bindClanCard } from "./ui/cards/clan";
import { bindConfirmCard } from "./ui/cards/confirm";
import { bindProfileCard } from "./ui/cards/profile";
import { ui } from "./ui/elements";
import { bindFriendList } from "./ui/friends/friendList";
import { bindNotices, showFriendRequest, showGameInvite, showPresenceNote } from "./ui/friends/notices";
import { bindGameMenu, closeGameMenu, toggleGameMenu } from "./ui/gameMenu";
import { animateDeathText, closeChat, countFrame, isChatOpen, toggleChat } from "./ui/hud";
import { hideItemInfo } from "./ui/itemInfo";
import { bindLifecycle, handleGameEscape } from "./ui/lifecycle";
import {
  bindAccountPrefs, bindMenuViews, bindNameField, bindPageChrome, bindPlayButtons, bindServerPicker, bindSettingToggles,
  bindSkinPicker, bindTopBoard, bindVerifyDialog, initTopSpot, isMenuVisible, loadSettings,
  mountKeybindSettings, showMenuCards, showMenuStatus, startPlay,
} from "./ui/menu";
import { isAlive } from "./ui/netBridge";
import { openDeepLinks } from "./ui/deepLinks";
import { refreshNoteDots } from "./ui/noteDots";
import { bindAnonMode } from "./ui/anonMode";
import { redrawLeaderboard } from "./ui/hud/leaderboard";
import { bindShopEditor } from "./ui/menu/shopEditor";
import { bindSettingsPopup } from "./ui/menu/settingsPopup";
import { injectStylesheets } from "./ui/stylesheets";
import { closeStore, isStoreOpen, refreshStore, setStoreTab, toggleStore } from "./ui/store";
import { initTexturePack } from "./ui/texturePack";

declare global {
  interface Window {
    changeStoreIndex: typeof setStoreTab;
    follmoo: typeof grantFollowBonus;
    touchControls: typeof touchControls;
    config: typeof config;
  }
}

const SERVER_POLL_INTERVAL = 5000;

export function boot(): void {
  enableProtection();
  ignoreSyntheticClicks();
  void injectStylesheets();

  exposeGlobals();
  initInputMode();

  loadSettings();
  bindSettingToggles();
  mountKeybindSettings();
  bindSettingsPopup();
  bindShopEditor();
  bindAnonMode(redrawLeaderboard);
  bindAimFollowsSetting(isMobileDevice());
  bindSkinPicker();
  buildActionBar();
  initTexturePack(() => {
    paintActionBar();
    if (isStoreOpen()) refreshStore();
  });
  createBackgroundMenu();

  bindCards();
  bindMenu();
  bindGameButtons();
  bindAccounts();

  initTurnstile();
  openDeepLinks();
  installInputHandlers({
    isPlaying: isAlive,
    toggleChat,
    escape: handleGameEscape,
    openMenu: (menu) => {
      if (menu === "store") toggleStore();
      else if (menu === "tribe") toggleAlliance();
      else toggleGameMenu(closeOtherPanels);
    },
    canUseHotkeys: () => (!isAllianceOpen() || Boolean(state.me?.team)) && !isChatOpen() && !isCapturingKey(),
    canToggleChat: () => !isAllianceOpen(),
    chatInput: ui.chatBox,
  });

  canvas.oncontextmenu = () => false;

  showMenuStatus("Loading...");
  startServerList();

  requestAnimationFrame(frame);
}

function exposeGlobals(): void {
  window.changeStoreIndex = setStoreTab;
  window.follmoo = grantFollowBonus;
  window.touchControls = touchControls;
  window.config = config;
}

function bindCards(): void {
  bindConfirmCard();
  bindAccountCard();
  bindProfileCard();
  bindClanCard();
  bindFriendList();
  bindNotices();
}

function bindMenu(): void {
  bindMenuViews();
  bindNameField(startPlay);
  bindPlayButtons();
  bindVerifyDialog();
  bindServerPicker();
  bindTopBoard();
  bindPageChrome();
  bindLifecycle();
}

function closeOtherPanels(): void {
  closeStore();
  closeAlliance();
  closeGameMenu();
  closeAdminMenu();
  closeChat();
  clearHeldKeys();
  hideItemInfo();
}

function bindGameButtons(): void {
  const bind = (el: HTMLElement, onclick: () => void) => {
    el.onclick = onclick;
    hookTouchEvents(el);
  };

  bind(ui.allianceButton, toggleAlliance);
  bind(ui.storeButton, toggleStore);
  bind(ui.chatButton, toggleChat);
  bind(ui.menuButton, () => toggleGameMenu(closeOtherPanels));
  bind(ui.adminButton, () => toggleAdminMenu(closeOtherPanels));
  bind(ui.autoGatherButton, () => {
    if (!isAlive()) return;
    toggleAutoGather();
    ui.autoGatherButton.classList.toggle("active");
  });
  bind(minimapCanvas, pingMinimap);

  bindGameMenu();
  bindAdminMenu();
}

function bindAccounts(): void {
  serverBrowser.init({ isMember: auth.isVerified, isStaff });

  const refreshSocialNav = () => {
    const social = socialEnabled();
    const named = social && Boolean(account.name) && friends.available();
    const guestPrompt = social && !auth.isVerified() && auth.signInAvailable();
    ui.friendsNav.style.display = named || guestPrompt ? "" : "none";
    ui.clanNav.style.display = social && (auth.isVerified() || auth.signInAvailable()) ? "" : "none";
    if (named) void friends.refresh();
    refreshNoteDots();
  };
  onAccountChange(refreshSocialNav);
  bindAccountPrefs();
  friends.onChange(() => refreshNoteDots());
  refreshSocialNav();

  if (socialEnabled()) {
    friends.init({
      env: siteEnv(), onInvite: showGameInvite, onRequest: showFriendRequest, onPresence: showPresenceNote,
    });
  }

  initAccount();
  auth.initAuth();
}

function startServerList(): void {
  let shown = false;
  const load = () =>
    serverBrowser.load(serverListUrl()).then(() => {
      setLocalServerSelected(serverBrowser.isLocalSelected(), serverBrowser.isLiveSelected());
    });

  setInterval(() => {
    if (isMenuVisible() && !isAlive()) void load().catch(() => {});
  }, SERVER_POLL_INTERVAL);
  setTimeout(() => void load().catch(() => {}), 1000);
  setTimeout(() => void load().catch(() => {}), 3000);

  void load()
    .then(() => {
      if (shown) return;
      shown = true;
      showMenuCards();
      initTopSpot();
    })
    .catch((error) => {
      console.error("Failed to load server list:", error);
      showMenuStatus("Could not reach the server list.", true);
    });
}

function frame(): void {
  state.now = Date.now();
  state.delta = state.now - state.lastFrame;
  state.lastFrame = state.now;

  sendAimAngle();
  animateDeathText(state.delta);
  updateGame(state.delta);
  countFrame(state.now);

  requestAnimationFrame(frame);
}
