import { leaderboardsEnabled } from "../../environment";
import { fetchTop, type TopSpan } from "../../net/api";
import { createElement, removeAllChildren } from "../../utils/dom";
import { kFormat } from "../../utils/math";
import { openClanByName } from "../cards/clan";
import { openProfile } from "../cards/profile";
import { ui } from "../elements";
import { isMenuVisible } from "./screens";

interface Spotlight {
  label: string;
  clan?: string;
  name: string;
  kills: number;
  open(): void;
}

const ROTATE_INTERVAL = 5000;

const SPANS: [TopSpan, string, string][] = [
  ["week", "Player of the week:", "Clan of the week:"],
  ["month", "Player of the month:", "Clan of the month:"],
  ["all", "All-time top player:", "All-time top clan:"],
];

let spots: Spotlight[] = [];
let index = 0;

function showNext(): void {
  const holder = ui.topSpot;
  if (!holder) return;
  removeAllChildren(holder);
  holder.style.display = spots.length ? "" : "none";
  if (!spots.length) return;

  const spot = spots[index++ % spots.length];
  createElement({ tag: "span", class: "topSpotLabel", text: `${spot.label} `, parent: holder });
  if (spot.clan) createElement({ tag: "span", class: "topSpotClan", text: `[${spot.clan}] `, parent: holder });
  createElement({ tag: "span", class: "topSpotName", text: spot.name, parent: holder });
  createElement({ tag: "span", text: ` - ${kFormat(spot.kills) || "0"} kills`, parent: holder });
  holder.onclick = spot.open;
}

export function initTopSpot(): void {
  if (!leaderboardsEnabled()) return;

  Promise.all(SPANS.map(([span]) => fetchTop(span).catch(() => null))).then((boards) => {
    spots = [];
    boards.forEach((board, i) => {
      const player = board?.players[0];
      const clan = board?.clans[0];
      if (player) {
        spots.push({
          label: SPANS[i][1], clan: player.clan, name: player.name, kills: player.kills,
          open: () => openProfile(player.name),
        });
      }
      if (clan) {
        spots.push({ label: SPANS[i][2], name: clan.name, kills: clan.kills, open: () => openClanByName(clan.name) });
      }
    });
    showNext();
  });

  setInterval(() => {
    if (isMenuVisible() && spots.length > 1) showNext();
  }, ROTATE_INTERVAL);
}
