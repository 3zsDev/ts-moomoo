import { state } from "../../game/state";
import { createElement, removeAllChildren } from "../../utils/dom";
import { kFormat } from "../../utils/math";
import { ui } from "../elements";

export function refreshLeaderboard(rows: (string | number)[]): void {
  removeAllChildren(ui.leaderboardData);

  let rank = 1;
  for (let i = 0; i < rows.length; i += 3) {
    const isMe = rows[i] === state.myPlayerId;
    const name = String(rows[i + 1] || "unknown");
    const score = rows[i + 2] as number;

    createElement({
      class: "leaderHolder",
      parent: ui.leaderboardData,
      children: [
        createElement({
          class: "leaderboardItem",
          style: `color:${isMe ? "#fff" : "rgba(255,255,255,0.6)"}`,
          text: `${rank}. ${name}`,
        }),
        createElement({ class: "leaderScore", text: kFormat(score) || "0" }),
      ],
    });
    rank++;
  }
}
