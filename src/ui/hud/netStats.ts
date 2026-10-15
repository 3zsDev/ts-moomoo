import { state } from "../../game/state";
import { clicksPerSecond } from "../../input/outbound";
import { noteShutdownNotice } from "../../net/api/join";
import { ui } from "../elements";
import { autoReload } from "../reload";

declare global {
  interface Window {
    pingTime: number;
  }
}

const FPS_SAMPLE_TIME = 500;

const settings = { showPing: false, showFps: false, showCps: false };

let frames = 0;
let sampleStart = Date.now();

function pingTier(ms: number): number {
  if (ms < 75) return 4;
  if (ms < 150) return 3;
  if (ms < 250) return 2;
  return 1;
}

function refreshVisibility(shown: boolean): void {
  ui.pingDisplay.hidden = !settings.showPing || !shown;
  ui.fpsDisplay.hidden = !settings.showFps || !shown;
  ui.cpsDisplay.hidden = !settings.showCps || !shown;
}

export function setNetStatsOptions(showPing: boolean, showFps: boolean, showCps: boolean): void {
  settings.showPing = showPing;
  settings.showFps = showFps;
  settings.showCps = showCps;
  refreshVisibility(state.playing);
}

export function setNetStatsInGame(): void {
  refreshVisibility(true);
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
  if (!ui.cpsDisplay.hidden) ui.cpsDisplay.textContent = `${clicksPerSecond()} CPS`;
  if (ui.fpsDisplay.hidden) return;

  ui.fpsDisplay.textContent = `${fps} FPS`;
  ui.fpsDisplay.className = fps >= 58 ? "tier4" : fps >= 50 ? "tier3" : "tier1";
}

const FAR_NOTICE_TIME = 15000;
let farNoticeTimer: ReturnType<typeof setTimeout> | undefined;

function clockText(seconds: number): string {
  return `${Math.floor(seconds / 60)}:${`0${seconds % 60}`.slice(-2)}`;
}

export function serverShutdownNotice(seconds: number): void {
  clearTimeout(farNoticeTimer);
  if (seconds < 0) {
    ui.shutdownDisplay.hidden = true;
    noteShutdownNotice(false);
    return;
  }
  noteShutdownNotice(true);

  if (seconds > 60) {
    const minutes = Math.round(seconds / 60);
    const when = minutes % 60 === 0 ? `${minutes / 60} ${minutes === 60 ? "hour" : "hours"}` : `${minutes} minutes`;
    ui.shutdownDisplay.innerText = `Server restarting in ${when}`;
    ui.shutdownDisplay.hidden = false;
    farNoticeTimer = setTimeout(() => {
      ui.shutdownDisplay.hidden = true;
    }, FAR_NOTICE_TIME);
    return;
  }
  ui.shutdownDisplay.innerText = `Server restarting in ${clockText(seconds)}`;
  ui.shutdownDisplay.hidden = false;
}

export function hideShutdownNotice(): void {
  clearTimeout(farNoticeTimer);
  ui.shutdownDisplay.hidden = true;
}

const AFTER_LIFE_SHOWN = 10;
let updateCountdown: ReturnType<typeof setInterval> | undefined;

export function gameUpdatedNotice(seconds: number): void {
  if (updateCountdown) return;
  const timed = seconds > 0;
  let left = timed ? seconds : 0;
  let ticks = 0;

  const tick = () => {
    if (state.playing && (left > 0 || !timed)) {
      ui.shutdownDisplay.innerText = timed
        ? `Game updated - reloading in ${clockText(left)}`
        : "Game updated - it reloads after this life";
      ui.shutdownDisplay.hidden = !timed && ticks++ >= AFTER_LIFE_SHOWN;
      left--;
      return;
    }
    clearInterval(updateCountdown);
    updateCountdown = undefined;
    ui.shutdownDisplay.hidden = true;
    autoReload();
  };
  updateCountdown = setInterval(tick, 1000);
  tick();
}
