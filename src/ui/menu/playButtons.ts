import { connectToServer, joinGame, serverBrowser } from "../../game/session";
import { isDev, isSandbox } from "../../environment";
import { auth, isStaff, SIGN_IN_REQUIRED, withTimeout } from "../../net/api";
import { hasCaptchaToken, isCaptchaRequired } from "../../net/turnstile";
import { createElement, hookTouchEvents } from "../../utils/dom";
import { openAccountCard } from "../account/accountCard";
import { unsavedStatsNote } from "../cards/profile";
import { ui } from "../elements";
import { isAlive, isConnected, leaveGame } from "../netBridge";
import { checkName, refreshNameHint } from "./nameField";
import { showMenuNotice, showMenuStatus } from "./screens";
import { awaitVerification } from "./verifyDialog";

interface FrvrAds {
  FRVR?: { ads?: { show(kind: string): Promise<unknown> } };
}

const AD_TIMEOUT = 10000;

let connectedKey = "";
let connectedIdentity = "";
let playedOnce = false;

function identity(): string {
  return auth.isVerified() ? `u:${auth.accountEmail()}` : "guest";
}

export function connectedServerKey(): string {
  return connectedKey;
}

function sameConnection(): boolean {
  return isConnected() && connectedKey === serverBrowser.key() && connectedIdentity === identity();
}

function setBusy(on: boolean): void {
  ui.enterGameButton.classList.toggle("busy", on);
}

export function handleFullServer(): void {
  const full = serverBrowser.selected();
  const moved = serverBrowser.moveOff();
  const name = full ? full.name : "That server";
  showMenuNotice(
    moved
      ? `${name} is full - switched you to ${moved.name}. Press play.`
      : `${name} is full and so is the rest of ${serverBrowser.regionName(serverBrowser.selectedRegion())}. Try another region.`,
  );
}

const DISCONNECT_NOTICES: Record<string, string> = {
  disconnected: "Disconnected. Press play to rejoin.",
  "Socket error": "Couldn't reach that server. Press play to try again.",
  kicked: "You were removed from the server.",
  "Invalid Connection": "Could not verify the connection. Press play to try again.",
};

export function handleDisconnect(reason: string): void {
  if (reason === "Game updated - please reload") {
    showMenuStatus(`${reason} `, true);
    return;
  }
  if (reason.toLowerCase() === "server is full") {
    handleFullServer();
    return;
  }
  if (reason === SIGN_IN_REQUIRED) {
    showMenuNotice("That server is for signed-in players.");
    openAccountCard("This server is for signed-in players.");
    return;
  }
  showMenuNotice(DISCONNECT_NOTICES[reason] ?? reason);
}

function connect(): void {
  connectedKey = serverBrowser.key();
  connectedIdentity = identity();
  void connectToServer();
}

function continuePlay(): void {
  setBusy(false);

  const server = serverBrowser.selected();
  if (server && serverBrowser.isFull(server) && !isStaff()) {
    handleFullServer();
    return;
  }

  showMenuStatus("Connecting...");
  if (isConnected() && !sameConnection()) leaveGame();

  const go = () => (isConnected() ? joinGame() : connect());
  if (!playedOnce) {
    playedOnce = true;
    go();
    return;
  }

  const ads = (window as unknown as FrvrAds).FRVR?.ads;
  const shown = ads ? Promise.resolve().then(() => ads.show("interstitial")) : Promise.resolve();
  void withTimeout(shown, AD_TIMEOUT)
    .catch(console.error)
    .finally(go);
}

export function startPlay(): void {
  if (ui.enterGameButton.classList.contains("busy")) return;
  setBusy(true);
  ui.menuNotice.textContent = "";

  if (serverBrowser.needsSignIn()) {
    setBusy(false);
    openAccountCard("This server is for signed-in players.");
    return;
  }

  checkName().then(
    () => { // only guests get ass fucked by cloudflare
      if (!sameConnection() && !auth.isVerified() && isCaptchaRequired() && !hasCaptchaToken()) {
        awaitVerification(continuePlay, () => setBusy(false));
        return;
      }
      continuePlay();
    },
    (error: Error) => {
      setBusy(false);
      refreshNameHint(error.message);
    },
  );
}

function renderStatsNote(): void {
  ui.statsNote.textContent = auth.isVerified() ? unsavedStatsNote() : "";
}

export function bindPlayButtons(): void {
  ui.enterGameButton.onclick = startPlay;
  hookTouchEvents(ui.enterGameButton);

  if (isSandbox() || isDev()) {
    ui.signInHint.textContent = "Sign in to keep your name";
    createElement({ text: `Stats aren't saved on ${isSandbox() ? "sandbox" : "dev"}`, parent: ui.signInHint });
  }

  auth.onAuthChange(renderStatsNote);
  renderStatsNote();
  serverBrowser.onChange((kind) => {
    if (kind === "user" && isConnected() && !isAlive()) {
      leaveGame();
      showMenuNotice("");
    }
  });
  auth.onAuthChange(() => serverBrowser.refresh());
}
