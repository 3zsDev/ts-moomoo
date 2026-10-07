import { state } from "../../game/state";
import { ui } from "../elements";

const MAX_FONT_SIZE = 120;

export function animateDeathText(delta: number): void {
  if (state.deathTextSize >= MAX_FONT_SIZE) return;
  state.deathTextSize += 0.1 * delta;
  const cap = Math.min(MAX_FONT_SIZE, window.innerWidth * 0.17, window.innerHeight * 0.3);
  ui.diedText.style.fontSize = `${Math.min(Math.round(state.deathTextSize), Math.round(cap))}px`;
}
