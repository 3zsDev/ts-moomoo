import { state } from "../../game/state";
import { ui } from "../elements";

export function refreshResources(): void {
  const me = state.me;
  if (!me) return;

  ui.scoreDisplay.innerText = String(me.points);
  ui.foodDisplay.innerText = String(me.food);
  ui.woodDisplay.innerText = String(me.wood);
  ui.stoneDisplay.innerText = String(me.stone);
  ui.killCounter.innerText = String(me.kills);
}
