import { serverBrowser } from "../../game/session";
import { isStaff } from "../../net/api";
import type { ServerEntry } from "../../net/ServerBrowser";
import { createElement, hookTouchEvents } from "../../utils/dom";
import { ui } from "../elements";
import { createDropdown, type Dropdown, type DropdownItem } from "../widgets/dropdown";

let regionDropdown: Dropdown | null = null;
let serverDropdown: Dropdown | null = null;

function span(parent: HTMLElement, className: string, text: string): HTMLElement {
  return createElement({ tag: "span", class: className, text, parent });
}

function icon(parent: HTMLElement, className: string, glyph: string): HTMLElement {
  return createElement({ tag: "i", class: `material-icons ${className}`, html: glyph, parent });
}

function fillClass(server: ServerEntry): string {
  const fill = server.playerCount / Math.max(1, server.playerCapacity);
  return fill >= 0.9 ? "full" : fill >= 0.7 ? "busy" : "low";
}

export function appendPlayerCount(parent: HTMLElement, server: ServerEntry, withCapacity: boolean): HTMLElement {
  const holder = span(parent, `playerCount ${server.playerCount > 0 ? fillClass(server) : "empty"}`, "");
  icon(holder, "", "&#xE7FD;");
  const players = Math.min(server.playerCount, server.playerCapacity);
  span(holder, "", withCapacity ? `${players}/${server.playerCapacity}` : String(players));
  return holder;
}

function serverItem(server: ServerEntry, regionHasMembersOnly: boolean): DropdownItem {
  const full = serverBrowser.isFull(server);
  const nameClass = server.playerCount > 0 ? "" : " empty";
  return {
    value: server.name,
    text: server.name,
    disabled: full && !isStaff(),
    button: (face) => {
      if (server.auth) icon(face, "chipIcon", "shield");
      span(face, `chipName${nameClass}`, server.name);
      appendPlayerCount(face, server, false);
    },
    row: (row) => {
      if (regionHasMembersOnly) icon(row, "rowLock", server.auth ? "shield" : "");
      span(row, `rowName${nameClass}`, server.name);
      if (full) span(row, "rowTag", "Full");
      appendPlayerCount(row, server, true);
    },
  };
}

export function refreshServerPicker(): void {
  if (!regionDropdown || !serverDropdown) return;
  if (regionDropdown.isOpen() || serverDropdown.isOpen()) return;

  const region = serverBrowser.selectedRegion();
  const selected = serverBrowser.selected();

  regionDropdown.set(
    serverBrowser.regions().map((summary) => ({
      value: summary.id,
      text: summary.name,
      button: (face) => {
        icon(face, "chipIcon", "&#xE894;");
        span(face, "chipName", summary.name);
      },
      row: (row) => {
        span(row, "rowName", summary.name);
        span(row, "rowDetail", summary.ping !== null ? `${summary.ping}ms` : "");
      },
    })),
    region,
  );

  const servers = serverBrowser.serversIn(region);
  const membersOnly = servers.some((server) => server.auth);
  const restricted = servers.filter((server) => server.auth).map((server) => serverItem(server, membersOnly));
  const open = servers.filter((server) => !server.auth).map((server) => serverItem(server, membersOnly));

  let items = open;
  if (restricted.length) {
    items = [{ header: "Members only" }, ...restricted];
    if (open.length) items = items.concat([{ header: "Everyone" }], open);
  }
  serverDropdown.set(items, selected ? selected.name : null);

  ui.serverPicker.style.display = region ? "" : "none";
  ui.serverNote.textContent = serverBrowser.needsSignIn() ? "Members-only server. Sign in to play here." : "";
}

function copyInviteLink(button: HTMLElement): void {
  const link = `${location.origin}${location.pathname}#${serverBrowser.key()}`;
  const label = button.getElementsByTagName("span")[0];
  const flash = (text: string) => {
    if (!label) return;
    label.textContent = text;
    setTimeout(() => (label.textContent = "Invite"), 2000);
  };

  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(link).then(() => flash("Link copied"), () => flash(link));
  } else {
    flash(link);
  }
}

export function bindServerPicker(): void {
  regionDropdown = createDropdown(ui.regionSelect, {
    label: "Region",
    onPick: (region) => serverBrowser.choose(region),
  });
  serverDropdown = createDropdown(ui.serverSelect, {
    label: "Server",
    onPick: (name) => serverBrowser.choose(serverBrowser.selectedRegion() ?? "", name),
  });

  const invite = ui.joinPartyButton;
  if (invite) {
    invite.onclick = () => copyInviteLink(invite);
    hookTouchEvents(invite);
  }

  serverBrowser.onChange(() => refreshServerPicker());
}
