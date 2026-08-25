import { state } from "../../game/state";
import { ui } from "../elements";

export function setPingDisplay(ms: number): void {
  state.ping = ms;
  ui.pingDisplay.innerText = `Ping: ${ms} ms`;
}

export function serverShutdownNotice(seconds: number): void {
  if (seconds < 0) return;
  const minutes = Math.floor(seconds / 60);
  const remainder = `0${seconds % 60}`.slice(-2);
  ui.shutdownDisplay.innerText = `Server restarting in ${minutes}:${remainder}`;
  ui.shutdownDisplay.hidden = false;
}
