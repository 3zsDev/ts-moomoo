import { config } from "../../config";
import { state } from "../../game/state";
import { ui } from "../elements";

export function refreshAge(xp?: number, maxXp?: number, age?: number): void {
  const me = state.me;
  if (!me) return;

  if (xp != null) me.XP = xp;
  if (maxXp != null) me.maxXP = maxXp;
  if (age != null) me.age = age;

  if (me.age === config.maxAge) {
    ui.ageText.innerHTML = "MAX AGE";
    ui.ageBarBody.style.width = "100%";
    return;
  }

  ui.ageText.innerHTML = `AGE ${me.age}`;
  ui.ageBarBody.style.width = `${(me.XP / me.maxXP) * 100}%`;
}
