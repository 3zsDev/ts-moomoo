import { config, endpoints } from "../config";
import { isLocal, localSocketUrl, serverListUrl } from "../environment";
import { connection } from "../net/Connection";
import { createHandlers, markPingSent } from "../net/handlers";
import { auth, joinTicket } from "../net/api";
import { trackGameStart } from "../net/api/auth";
import { getCaptchaToken, resetTurnstile } from "../net/turnstile";
import { BUILD_ID, ClientPacket, loadLiveProtocol, loadProtocol } from "../net/protocol";
import { securityFlags, untrustedEventCount } from "../security";
import { attack } from "../input/outbound";
import { ServerBrowser } from "../net/ServerBrowser";
import { clearTelegraphs } from "../render/layers/telegraphs";
import { loadSetting, saveSetting } from "../utils/storage";
import { closeAlliance, refreshNotifications } from "../ui/alliance";
import { joinAnonFlag, onGameSetup, onLeaveGame } from "../ui/anonMode";
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
let reachedServer = false;
let telemetryStart: ReturnType<typeof setTimeout> | undefined;
let telemetryTimer: ReturnType<typeof setInterval> | undefined;
let retries = 0;
const MAX_RETRIES = 2;

function retryConnect(error: string): boolean {
  if ((error !== "Socket error" && error !== "disconnected") || !auth.isVerified() || retries >= MAX_RETRIES) return false;
  retries++;
  connection.close();
  showMenuStatus("Connecting...");
  setTimeout(() => {
    void serverBrowser
      .load(serverListUrl())
      .catch(() => {})
      .then(() => {
        if (!serverBrowser.selected()) serverBrowser.moveOff();
        void connectToServer();
      });
  }, 600 * retries);
  return true;
}

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
  const live = Boolean(address.wsUrl && new URL(address.wsUrl).pathname === "/live");

  if (live && !(await loadLiveProtocol(new URL(url).searchParams.get("environment") ?? "prod"))) {
    returnToMenu("Couldn't load the live game's protocol - try again");
    return;
  }

  // 1.9 now requires token
  let token: string | null;
  try {
    token = await joinTicket(address.host, getCaptchaToken(), live);
  } catch (error) {
    returnToMenu(error instanceof Error ? error.message : "disconnected");
    return;
  }
  const socketUrl = new URL(url);
  if (!isLocal() || live) {
    if (!live) await loadProtocol();
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
        if (!reachedServer && retryConnect(error)) return;
        returnToMenu(error);
        return;
      }
      reachedServer = true;
      retries = 0;
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
    anon: joinAnonFlag(),
  });
}

function sendTelemetry(): void {
  if (connection.isReady() && connection.isPinned()) {
    connection.send(ClientPacket.Telemetry, securityFlags(), untrustedEventCount());
  }
}

function startTelemetry(): void {
  if (telemetryTimer) return;
  telemetryStart = setTimeout(sendTelemetry, 5000);
  telemetryTimer = setInterval(sendTelemetry, 60000);
}

function stopTelemetry(): void {
  clearTimeout(telemetryStart);
  clearInterval(telemetryTimer);
  telemetryStart = telemetryTimer = undefined;
}

function onSetupGame(): void {
  attack.held = 0;
  attack.mouse = attack.key = false;
  startTelemetry();
  onGameSetup();
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
  const reached = reachedServer;
  leaveSession();
  retries = 0;
  handleDisconnect(reason, reached);
}

export function leaveSession(): void {
  joined = false;
  reachedServer = false;
  onLeaveGame();
  stopTelemetry();
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
