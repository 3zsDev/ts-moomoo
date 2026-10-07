import { socialEnabled } from "../environment";
import { account, friends } from "../net/api";
import { state } from "../game/state";
import { createElement, findById } from "../utils/dom";

// joshy used gpt for this
function setDot(el: Element | null, on: boolean): void {
  if (!el) return;
  const dot = el.querySelector(".noteDot");
  if (on && !dot) createElement({ tag: "span", class: "noteDot", parent: el as HTMLElement });
  else if (!on && dot) dot.remove();
}

export function refreshNoteDots(): void {
  const social = socialEnabled();
  const friendDot = social && friends.state().incoming.length > 0;
  const clanDot = social && account.clanNotes > 0;

  setDot(findById("friendsNav"), friendDot);
  setDot(findById("clanNav"), clanDot);
  setDot(document.querySelector('#gameMenuTabs a[data-tab="friends"]'), friendDot);
  setDot(document.querySelector('#gameMenuTabs a[data-tab="clan"]'), clanDot);
  setDot(findById("menuButton"), friendDot || clanDot);
  setDot(findById("allianceButton"), state.joinRequests.length > 0);
}
