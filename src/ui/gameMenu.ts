import { socialEnabled } from "../environment";
import { players } from "../game/world";
import { auth, friends, isStaff } from "../net/api";
import { byId, createElement, removeAllChildren } from "../utils/dom";
import { openMyClan } from "./cards/clan";
import { ui } from "./elements";
import { renderFriends } from "./friends/friendList";
import { leaderboardPlayers } from "./hud/leaderboard";
import { currentView } from "./menu/views";
import { isAlive, mySid, sendReport, sendReportReason } from "./netBridge";

export type GameMenuTab = "settings" | "friends" | "clan" | "report";

const settingsBody = document.querySelector<HTMLElement>('.menuView[data-view="settings"] .viewBody');
const settingsHome = settingsBody?.parentElement ?? null;
const friendsBody = document.querySelector<HTMLElement>('.menuView[data-view="friends"] .viewBody');
const friendsHome = friendsBody?.parentElement ?? null;

const gameSettingsBody = byId("gameSettingsBody");
const gameFriendsBody = byId("gameFriendsBody");
const tabs = Array.from(document.querySelectorAll<HTMLElement>("#gameMenuTabs a"));

let activeTab: GameMenuTab = "settings";
const reported: Record<number, 1 | 2> = {};
const REPORT_REASONS = ["Bot", "Hack", "Autoheal", "Abuse"];

export function isGameMenuOpen(): boolean {
  return ui.gameSettings.style.display === "block";
}

function returnFriendsBody(): void {
  if (friendsBody && friendsHome && friendsBody.parentElement !== friendsHome) {
    friendsHome.appendChild(friendsBody);
    friends.watch(currentView() === "friends");
  }
}

function renderReports(): void {
  if (!isAlive()) return;
  ui.reportMenu.style.display = "block";
  removeAllChildren(ui.reportHolder);

  const me = mySid();
  const listed: Record<number, true> = {};
  const staff = isStaff();

  const add = (sid: number, name: string) => {
    if (sid === me || listed[sid]) return;
    listed[sid] = true;

    const report = createElement({
      class: "joinAlBtn",
      text: reported[sid] ? "Reported" : "Report",
      hookTouch: true,
      onclick: () => {
        if (reported[sid]) return;
        reported[sid] = 1;
        sendReport(sid);
        report.textContent = "Reported";
        askReason();
      },
    });

    let reasons: HTMLElement | undefined;
    const askReason = () => {
      if (reasons || reported[sid] !== 1) return;
      reasons = createElement({ class: "reportReasons", text: "What for?" });
      REPORT_REASONS.forEach((label, index) => {
        createElement({
          class: "joinAlBtn reportReason",
          text: label,
          parent: reasons,
          hookTouch: true,
          onclick: () => {
            if (reported[sid] !== 1) return;
            reported[sid] = 2;
            sendReportReason(sid, index + 1);
            reasons!.textContent = "Thanks";
          },
        });
      });
      row.after(reasons);
    };
    const buttons = [report];

    if (staff) {
      for (const [label, level] of [["Ban", 2], ["Shadow", 1]] as const) {
        let armed = false;
        const button = createElement({
          class: "joinAlBtn staffInline",
          text: label,
          hookTouch: true,
          onclick: () => {
            if (!armed) {
              armed = true;
              button.textContent = `${label}?`;
              return;
            }
            sendReport(sid, level);
            button.textContent = "Done";
          },
        });
        buttons.push(button);
      }
    }

    const row = createElement({ class: "allianceItem", text: name || "unknown", parent: ui.reportHolder, children: buttons });
    askReason();
  };

  for (const player of players) if (player.visible) add(player.sid, player.name);
  const rows = leaderboardPlayers();
  for (let i = 0; i < rows.length; i += 3) add(rows[i] as number, String(rows[i + 1]));

  if (!ui.reportHolder.children.length) {
    createElement({ class: "allianceItem", text: "No players nearby", parent: ui.reportHolder });
  }
}

function selectTab(tab: GameMenuTab): void {
  if (tab === "clan") {
    closeGameMenu();
    openMyClan();
    return;
  }

  const social = socialEnabled();
  const available: Record<GameMenuTab, boolean> = {
    settings: true,
    friends: social && friends.available(),
    clan: social && auth.isVerified(),
    report: isAlive(),
  };
  if (!available[tab]) tab = "settings";
  activeTab = tab;

  for (const link of tabs) {
    const name = link.getAttribute("data-tab") as GameMenuTab;
    link.classList.toggle("active", name === tab);
    link.style.display = available[name] ? "" : "none";
  }

  const showFriends = tab === "friends";
  gameSettingsBody.style.display = tab === "settings" ? "" : "none";
  gameFriendsBody.style.display = showFriends ? "" : "none";
  ui.reportMenu.style.display = "none";
  if (tab === "report") renderReports();

  if (showFriends && friendsBody) {
    gameFriendsBody.appendChild(friendsBody);
    friends.watch(true);
    renderFriends(friends.state());
  } else {
    returnFriendsBody();
  }
}

function openGameMenu(tab?: GameMenuTab): void {
  if (settingsBody) gameSettingsBody.appendChild(settingsBody);
  ui.gameSettings.style.display = "block";
  selectTab(tab || activeTab);
}

export function closeGameMenu(): void {
  if (!isGameMenuOpen()) return;
  ui.gameSettings.style.display = "none";
  ui.reportMenu.style.display = "none";
  if (settingsBody && settingsHome) settingsHome.appendChild(settingsBody);
  returnFriendsBody();
}

export function toggleGameMenu(closeOthers: () => void, tab?: GameMenuTab): void {
  if (isGameMenuOpen() && (!tab || tab === activeTab)) {
    closeGameMenu();
    return;
  }
  closeOthers();
  openGameMenu(tab);
}

export function showGameMenu(tab?: GameMenuTab): void {
  openGameMenu(tab);
}

export function bindGameMenu(): void {
  for (const link of tabs) {
    link.onclick = () => selectTab(link.getAttribute("data-tab") as GameMenuTab);
  }
  byId("gameSettingsClose").onclick = closeGameMenu;
}
