import { config, endpoints } from "../config";
import { isLocal, localSocketUrl, serverListUrl } from "../environment";
import { connection } from "../net/Connection";
import { createHandlers, markPingSent } from "../net/handlers";
import { getCaptchaToken, resetTurnstile } from "../net/turnstile";
import { ClientPacket } from "../net/protocol";
import { ServerBrowser } from "../net/ServerBrowser";
import { loadSetting, saveSetting } from "../utils/storage";
import { closeAlliance, refreshNotifications } from "../ui/alliance";
import { ui } from "../ui/elements";
import { closeChat } from "../ui/hud";
import { getPlayerName, hideMenu, saveName, selectedSkinColor, showMenuStatus } from "../ui/menu";
import { closeStore } from "../ui/store";
import { resetSession, state } from "./state";
import { gameObjects } from "./world";

export const serverBrowser = new ServerBrowser(endpoints.serverDomain);

let joined = false;
let pingTimer: ReturnType<typeof setTimeout> | undefined;

export const followBonus = loadSetting("moofoll");

export function grantFollowBonus(): void {
  saveSetting("moofoll", "1");
}

export function connectToServer(): void {
  const address = serverBrowser.resolve((reason) => {
    console.error("Server error:", reason);
    returnToMenu("disconnected");
  });
  if (!address) return;

  let url = address.wsUrl
    ?? (isLocal() ? localSocketUrl(address.host, address.port) : `wss://${address.host}`);

  // The server rejects the handshake with close code 4001 without a captcha token, so it rides along on the query string
  const captchaToken = getCaptchaToken();
  if (captchaToken) url += `?token=${encodeURIComponent(captchaToken)}`;

  connection.connect(
    url,
    (error) => {
      if (error) {
        returnToMenu(error);
        return;
      }
      startPingLoop();
      joinGame();
    },
    createHandlers({ onDisconnect: returnToMenu, onSetupGame, onDeath }),
  );
}

export function joinGame(): void {
  if (joined || !connection.isReady()) return;
  joined = true;

  saveName();
  showMenuStatus("Loading...");

  connection.send(ClientPacket.JoinGame, {
    name: getPlayerName(),
    moofoll: followBonus,
    skin: selectedSkinColor,
  });
}

function onSetupGame(): void {
  hideMenu();
  ui.gameUI.style.display = "block";
  ui.diedText.style.display = "none";
  serverBrowser.stopPinging();
}

function onDeath(): void {
  joined = false;
  const me = state.me;
  if (me) state.deathMarker = { x: me.x, y: me.y };

  ui.gameUI.style.display = "none";
  closeStore();
  closeAlliance();
  refreshNotifications();
  closeChat();

  ui.diedText.style.display = "block";
  ui.diedText.style.fontSize = "0px";
  state.deathTextSize = 0;

  setTimeout(() => {
    ui.menuCards.style.display = "block";
    ui.mainMenu.style.display = "block";
    ui.diedText.style.display = "none";
  }, config.deathFadeout);

  void serverBrowser.load(serverListUrl()).catch(() => {});
}

export function returnToMenu(reason: string): void {
  joined = false;
  stopPingLoop();
  connection.close();
  resetTurnstile();
  resetSession();
  gameObjects.length = 0;
  showMenuStatus(reason, true);
}

function startPingLoop(): void {
  stopPingLoop();
  const tick = () => {
    if (connection.isReady()) {
      markPingSent();
      connection.send(ClientPacket.PingSocket);
    }
    pingTimer = setTimeout(tick, 2500);
  };
  tick();
}

function stopPingLoop(): void {
  if (pingTimer) clearTimeout(pingTimer);
  pingTimer = undefined;
}
