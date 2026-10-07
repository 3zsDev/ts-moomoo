import { config, endpoints } from "../config";
import { isLocal, localSocketUrl, serverListUrl } from "../environment";
import { connection } from "../net/Connection";
import { createHandlers, markPingSent } from "../net/handlers";
import { joinTicket } from "../net/api";
import { trackGameStart } from "../net/api/auth";
import { getCaptchaToken, resetTurnstile } from "../net/turnstile";
import { BUILD_ID, ClientPacket, loadProtocol } from "../net/protocol";
import { ServerBrowser } from "../net/ServerBrowser";
import { clearTelegraphs } from "../render/layers/telegraphs";
import { loadSetting, saveSetting } from "../utils/storage";
import { closeAlliance, refreshNotifications } from "../ui/alliance";
import { ui } from "../ui/elements";
import { closeChat } from "../ui/hud";
import { onGameStart, onPlayerDeath } from "../ui/lifecycle";
import { getPlayerName, handleDisconnect, hideMenu, saveName, selectedSkinColor, showMenuStatus } from "../ui/menu";
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

export async function connectToServer(): Promise<void> {
  const address = serverBrowser.resolve((reason) => {
    console.error("Server error:", reason);
    returnToMenu("disconnected");
  });
  if (!address) return;

  let url = address.wsUrl ?? (isLocal() ? localSocketUrl(address.host, address.port) : `wss://${address.host}`);

  // 1.9 now requires token
  let token: string | null;
  try {
    token = await joinTicket(address.host, getCaptchaToken());
  } catch (error) {
    returnToMenu(error instanceof Error ? error.message : "disconnected");
    return;
  }
  const socketUrl = new URL(url);
  if (!isLocal()) {
    await loadProtocol();
    socketUrl.searchParams.set("b", BUILD_ID);
  }
  if (token) socketUrl.searchParams.set("token", token);
  url = socketUrl.toString();
  const selectedServer = serverBrowser.selectedServer();
  console.info("[socket] connecting", {
    host: new URL(url).host,
    buildId: socketUrl.searchParams.get("b"),
    queryKeys: [...socketUrl.searchParams.keys()].sort(),
    tokenType: token?.startsWith("tk:") ? "ticket" : token?.startsWith("cf:") ? "captcha" : token ? "other" : "none",
    reportedPlayers: selectedServer?.playerCount ?? null,
    reportedCapacity: selectedServer?.playerCapacity ?? null,
    reportedFull: selectedServer ? serverBrowser.isFull(selectedServer) : null,
  });

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
    createHandlers({ onDisconnect: returnToMenu, onSetupGame, onSpawn: onGameStart, onDeath }),
  );
}

export function joinGame(): void {
  if (joined || !connection.isReady()) return;
  joined = true;

  trackGameStart();
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
  if (me) {
    state.deathMarker = { x: me.x, y: me.y };
    me.alive = false;
  }
  onPlayerDeath();

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
  leaveSession();
  handleDisconnect(reason);
}

export function leaveSession(): void {
  joined = false;
  stopPingLoop();
  connection.close();
  resetTurnstile();
  resetSession();
  clearTelegraphs();
  gameObjects.length = 0;
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
