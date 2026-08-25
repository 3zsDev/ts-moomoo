import { state } from "../../game/state";
import { ui } from "../elements";

export function animateDeathText(delta: number): void {
  if (state.deathTextSize >= 120) return;
  state.deathTextSize += 0.1 * delta;
  ui.diedText.style.fontSize = `${Math.min(Math.round(state.deathTextSize), 120)}px`;
}
