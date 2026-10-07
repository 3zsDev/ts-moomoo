import { config } from "../config";
import { state } from "../game/state";
import { byId } from "../utils/dom";
import { renderCircle } from "./shapes";

export const minimapCanvas = byId<HTMLCanvasElement>("mapDisplay", "canvas");
const ctx = minimapCanvas.getContext("2d")!;

minimapCanvas.width = 300;
minimapCanvas.height = 300;
// joshy the retard forgot that minimap only shows main world
class Ping {
  public x = 0;
  public y = 0;
  public scale = 0;
  public active = false;

  public init(x: number, y: number): void {
    this.x = x;
    this.y = y;
    this.scale = 0;
    this.active = true;
  }

  public update(ctx: CanvasRenderingContext2D, delta: number): void {
    if (!this.active) return;

    this.scale += 0.05 * delta;
    if (this.scale >= config.mapPingScale) {
      this.active = false;
      return;
    }

    ctx.globalAlpha = 1 - Math.max(0, this.scale / config.mapPingScale);
    ctx.beginPath();
    ctx.arc(toMap(this.x), toMap(this.y), this.scale, 0, 2 * Math.PI);
    ctx.stroke();
  }
}

const pings: Ping[] = [];

function toMap(worldValue: number): number {
  return (worldValue / config.mapScale) * minimapCanvas.width;
}

export function addPing(x: number, y: number): void {
  let ping = pings.find((p) => !p.active);
  if (!ping) {
    ping = new Ping();
    pings.push(ping);
  }
  ping.init(x, y);
}

export function markCurrentPosition(): void {
  const me = state.me;
  if (!me) return;
  state.playerMarker = { x: me.x, y: me.y };
}

const REDRAW_INTERVAL = 80;
let sinceRedraw = 0;

export function renderMinimap(delta: number): void {
  sinceRedraw += delta;
  if (sinceRedraw < REDRAW_INTERVAL) return;
  const elapsed = sinceRedraw;
  sinceRedraw = 0;

  const me = state.me;
  if (!me?.alive) return;

  ctx.clearRect(0, 0, minimapCanvas.width, minimapCanvas.height);
  ctx.strokeStyle = "#fff";
  ctx.lineWidth = 4;

  for (const ping of pings) ping.update(ctx, elapsed);

  ctx.globalAlpha = 1;
  ctx.fillStyle = "#fff";
  if (me.x >= 0) renderCircle(ctx, toMap(me.x), toMap(me.y), 7, true);

  ctx.fillStyle = "rgba(255,255,255,0.35)";
  if (me.team || state.staff) {
    for (let i = 0; i < state.minimapPositions.length; i += 2) {
      renderCircle(ctx, toMap(state.minimapPositions[i]), toMap(state.minimapPositions[i + 1]), 7, true);
    }
  }

  ctx.font = "34px Hammersmith One";
  ctx.textBaseline = "middle";
  ctx.textAlign = "center";

  if (state.deathMarker) {
    const inFalls = state.deathMarker.x < 0;
    ctx.fillStyle = "#fc5553";
    ctx.fillText(
      "x",
      inFalls ? 12 : toMap(state.deathMarker.x),
      toMap(inFalls ? config.mapScale / 2 : state.deathMarker.y),
    );
  }
  if (state.playerMarker && state.playerMarker.x >= 0) {
    ctx.fillStyle = "#fff";
    ctx.fillText("x", toMap(state.playerMarker.x), toMap(state.playerMarker.y));
  }
}
