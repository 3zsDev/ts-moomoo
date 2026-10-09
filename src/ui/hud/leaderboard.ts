import { imageUrl } from "../../render/sprites";
import { friends, isStaff } from "../../net/api";
import { createElement, removeAllChildren } from "../../utils/dom";
import { kFormat } from "../../utils/math";
import { openClanByName } from "../cards/clan";
import { openGuestProfile, openProfile, setKnownPlayerSids } from "../cards/profile";
import { ui } from "../elements";
import { mySid } from "../netBridge";

const ROLE_CLASSES = ["", "mod", "admin"];
const ROLE_TITLES = ["Signed-in player", "Moderator", "Admin"];

export const SOLO_TRIBE = "solo";

export interface ClanTag {
  text: string;
  before: string;
  gold: string;
}

export function formatClanTag(tribe: string | null | undefined, clan: string | null | undefined): ClanTag {
  if (!clan) return { text: tribe ? `[${tribe}]` : "", before: "", gold: "" };
  if (tribe === clan) return { text: `[${clan}]`, before: "", gold: `[${clan}]` };
  const before = `[${tribe || SOLO_TRIBE}:`;
  return { text: `${before}${clan}]`, before, gold: clan };
}

let lastRows: (string | number)[] = [];

export function leaderboardPlayers(): (string | number)[] {
  return lastRows;
}

function pairs<T>(list: (string | number)[] | undefined): Record<string, T> {
  const map: Record<string, T> = {};
  for (let i = 0; list && i < list.length; i += 2) map[list[i]] = list[i + 1] as T;
  return map;
}

function nameParts(sid: number, name: string, clan: string | undefined, tribe: string | undefined, hasTribes: boolean) {
  const nameSpan = createElement({ tag: "span", class: "leaderName", text: name });
  if (!clan) return [nameSpan];

  const tag = formatClanTag(hasTribes ? tribe : clan, clan);
  const piece = (text: string, extra?: string) =>
    createElement({ tag: "span", class: "leaderTag" + (extra ? ` ${extra}` : ""), text });

  const clanPiece = piece(tag.before ? tag.gold : `${tag.gold} `, "leaderClan");
  clanPiece.title = "Clan: view";
  clanPiece.onclick = (event) => {
    event.stopPropagation();
    openClanByName(clan);
  };

  const parts = tag.before
    ? [piece("["), piece(tag.before.slice(1, -1), "tribe"), piece(":"), clanPiece, piece("] ")]
    : [clanPiece];
  return [...parts, nameSpan];
}

export function refreshLeaderboard(
  rows: (string | number)[],
  roles?: (string | number)[],
  dead?: number[],
  crabKillers?: number[],
  clanTags?: (string | number)[],
  tribeTags?: (string | number)[],
): void {
  lastRows = rows;
  const roleOf = pairs<number>(roles);
  const clanOf = pairs<string>(clanTags);
  const tribeOf = pairs<string>(tribeTags);
  const me = mySid();
  const staff = isStaff();
  const social = friends.state();
  const friendNames: Record<string, true> = {};
  for (const id of social.friends) {
    const name = social.names[id];
    if (name) friendNames[name] = true;
  }

  const sids: Record<string, number> = {};
  removeAllChildren(ui.leaderboardData);

  for (let i = 0; i < rows.length; i += 3) {
    const sid = rows[i] as number;
    const name = rows[i + 1] !== "" ? String(rows[i + 1] ?? "unknown") : "unknown";
    const score = rows[i + 2] as number;
    const signedIn = sid in roleOf;
    const role = roleOf[sid] || 0;
    const isDead = Boolean(dead?.includes(sid));
    if (signedIn) sids[name] = sid;

    const open = signedIn
      ? () => openProfile(name)
      : staff && sid !== me
        ? () => openGuestProfile(sid, name)
        : null;

    const holder = createElement({
      class: "leaderHolder" + (isDead ? " dead" : "") + (open ? " clickable" : ""),
      parent: ui.leaderboardData,
      onclick: open,
      children: [
        createElement({
          class: "leaderboardItem" + (clanOf[sid] ? " tagged" : ""),
          style: `color:${sid === me ? "#fff" : "rgba(255,255,255,0.6)"}`,
          children: nameParts(sid, name, clanOf[sid], tribeOf[sid], Boolean(tribeTags)),
        }),
        isDead
          ? createElement({
              tag: "img", class: "leaderScore leaderDead", src: imageUrl("icons/skull.png"), alt: "dead", title: "Dead",
            })
          : createElement({ class: "leaderScore", text: kFormat(score) || "0" }),
      ],
    });

    const friend = signedIn && !role && friendNames[name];
    let badge: HTMLElement;
    if (crabKillers?.includes(sid)) {
      badge = createElement({ tag: "span", class: "leaderBadge crab", title: "Killed the Crab King", text: "\u{1F980}" });
    } else if (signedIn) {
      badge = createElement({
        tag: "i",
        class: `material-icons leaderBadge ${friend ? "friend" : ROLE_CLASSES[role] || ""}`,
        title: `${friend ? "Friend" : ROLE_TITLES[role] || ROLE_TITLES[0]}: view profile`,
        text: friend ? "people" : "shield",
      });
    } else {
      badge = createElement({ tag: "i", class: "leaderBadge empty" });
    }
    holder.insertBefore(badge, holder.firstChild);
  }

  setKnownPlayerSids(sids);
}
