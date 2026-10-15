import { soundManager } from "../audio/sounds";
import { config, endpoints } from "../config";
import { isLocal, localSocketUrl, serverListUrl } from "../environment";
import { connection } from "../net/Connection";
import { createHandlers, markPingSent } from "../net/handlers";
import { auth, isStaff, joinTicket } from "../net/api";
import { allowGuestRejoin, guestRejoinAllowed } from "../net/api/join";
import { trackGameStart } from "../net/api/auth";
import { takeCaptchaToken } from "../net/turnstile";
import { BUILD_ID, ClientPacket, loadLiveProtocol, loadProtocol } from "../net/protocol";
import { attack, forgetHeldKeys } from "../input/outbound";
import { ServerBrowser } from "../net/ServerBrowser";
import { clearTelegraphs } from "../render/layers/telegraphs";
import { saveSetting } from "../utils/storage";
import { closeAlliance, refreshNotifications } from "../ui/alliance";
import { joinAnonFlag, onGameSetup, onLeaveGame } from "../ui/anonMode";
import { ui } from "../ui/elements";
import { closeChat } from "../ui/hud";
import { onGameStart, onPlayerDeath, setPlaying } from "../ui/lifecycle";
import { getPlayerName, handleDisconnect, hideMenu, saveName, selectedSkinColor, showMenuStatus } from "../ui/menu";
import { closeStore } from "../ui/store";
import { resetSession, state } from "./state";

export const serverBrowser = new ServerBrowser(endpoints.serverDomain);

let joined = false;
let pingTimer: ReturnType<typeof setTimeout> | undefined;
let reachedServer = false;
let retries = 0;
const MAX_RETRIES = 2;

function retryConnect(error: string): boolean {
  if ((error !== "Socket error" && error !== "disconnected") || retries >= MAX_RETRIES) return false;
  if (!auth.isVerified() && !guestRejoinAllowed()) return false;
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

export function grantFollowBonus(): void {
  if (state.followBonus) return;
  state.followBonus = true;
  saveSetting("moofoll", "1");
}

export async function connectToServer(): Promise<void> {
  const captcha = takeCaptchaToken();

  const address = serverBrowser.resolve((reason) => {
    console.error("Server error:", reason);
    returnToMenu(reason);
  });
  if (!address) return;

  const server = serverBrowser.selected();
  if (server && serverBrowser.isFull(server) && !isStaff()) {
    returnToMenu("server is full");
    return;
  }

  let url = address.wsUrl ?? (isLocal() ? localSocketUrl(address.host, address.port) : `wss://${address.host}`);
  const live = Boolean(address.wsUrl && new URL(address.wsUrl).pathname === "/live");

  if (live && !(await loadLiveProtocol(new URL(url).searchParams.get("environment") ?? "prod"))) {
    returnToMenu("Couldn't load the live game's protocol - try again");
    return;
  }

  // 1.9 now requires token
  let token: string | null;
  try {
    token = await joinTicket(address.host, captcha, live);
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
  window.onbeforeunload = () => "Are you sure?";
  trackGameStart();
  saveName();
  if (joined || !connection.isReady()) return;
  joined = true;

  setPlaying(true, false);
  soundManager.stop("menu");
  showMenuStatus("Loading...");

  connection.send(ClientPacket.JoinGame, {
    name: getPlayerName(),
    moofoll: state.followBonus,
    skin: selectedSkinColor,
    anon: joinAnonFlag(),
  });
}

function onSetupGame(): void {
  attack.held = 0;
  attack.mouse = attack.key = false;
  forgetHeldKeys();
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
  allowGuestRejoin(reached);
  leaveSession();
  retries = 0;
  handleDisconnect(reason, reached);
}

export function leaveSession(): void {
  joined = false;
  reachedServer = false;
  onLeaveGame();
  stopPingLoop();
  connection.close();
  resetSession();
  setPlaying(false, false);
  clearTelegraphs();
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
