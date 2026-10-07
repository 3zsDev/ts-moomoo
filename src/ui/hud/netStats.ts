import { state } from "../../game/state";
import { ui } from "../elements";

declare global {
  interface Window {
    pingTime: number;
  }
}

const FPS_SAMPLE_TIME = 500;

const settings = { showPing: false, showFps: false };
let inGame = false;

let frames = 0;
let sampleStart = Date.now();

function pingTier(ms: number): number {
  if (ms < 75) return 4;
  if (ms < 150) return 3;
  if (ms < 250) return 2;
  return 1;
}

function refreshVisibility(): void {
  ui.pingDisplay.hidden = !settings.showPing || !inGame;
  ui.fpsDisplay.hidden = !settings.showFps || !inGame;
}

export function setNetStatsOptions(showPing: boolean, showFps: boolean): void {
  settings.showPing = showPing;
  settings.showFps = showFps;
  refreshVisibility();
}

export function setNetStatsInGame(on: boolean): void {
  inGame = on;
  refreshVisibility();
}

export function setPingDisplay(ms: number): void {
  state.ping = ms;
  window.pingTime = ms;
  ui.pingText.textContent = `${ms} ms`;
  ui.pingDisplay.className = `tier${pingTier(ms)}`;
}

export function countFrame(now: number): void {
  frames++;
  const elapsed = now - sampleStart;
  if (elapsed < FPS_SAMPLE_TIME) return;

  const fps = Math.round((frames * 1000) / elapsed);
  frames = 0;
  sampleStart = now;
  if (ui.fpsDisplay.hidden) return;

  ui.fpsDisplay.textContent = `${fps} FPS`;
  ui.fpsDisplay.className = fps >= 58 ? "tier4" : fps >= 50 ? "tier3" : "tier1";
}

export function serverShutdownNotice(seconds: number): void {
  if (seconds < 0) return;
  const minutes = Math.floor(seconds / 60);
  const remainder = `0${seconds % 60}`.slice(-2);
  ui.shutdownDisplay.innerText = `Server restarting in ${minutes}:${remainder}`;
  ui.shutdownDisplay.hidden = false;
}

export function hideShutdownNotice(): void {
  ui.shutdownDisplay.hidden = true;
}
