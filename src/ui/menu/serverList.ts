import { regionInfo, type ServerBrowser } from "../../net/ServerBrowser";
import { createElement, removeAllChildren } from "../../utils/dom";
import { ui } from "../elements";

let select: HTMLSelectElement | null = null;

function getSelect(): HTMLSelectElement {
  if (select?.isConnected) return select;

  const holder = ui.serverBrowser;
  if (holder instanceof HTMLSelectElement) {
    select = holder;
    return select;
  }

  const existing = holder.querySelector("select");
  if (existing) {
    select = existing;
    return select;
  }

  select = createElement({ tag: "select", id: "serverSelect", parent: holder }) as HTMLSelectElement;
  return select;
}

export function buildServerList(browser: ServerBrowser): void {
  const target = getSelect();
  removeAllChildren(target);

  let totalPlayers = 0;

  for (const region of Object.keys(browser.servers)) {
    const regionName = regionInfo[region]?.name ?? region;
    const servers = browser.servers[region];
    const regionPlayers = servers.reduce((sum, server) => sum + server.playerCount, 0);
    totalPlayers += regionPlayers;

    target.appendChild(
      createElement({ tag: "option", disabled: true, text: `${regionName} - ${regionPlayers} players` }),
    );

    for (const server of servers) {
      const players = Math.min(server.playerCount, server.playerCapacity);
      let label = `${regionName} ${server.name} [${players}/${server.playerCapacity}]`;
      if (server.ping && (server.pings?.length ?? 0) >= 2) {
        label += ` [${Math.floor(server.ping)}ms]`;
      } else if (!server.selected) {
        label += " [?]";
      }

      const option = createElement({
        tag: "option",
        value: `${region}:${server.name}`,
        text: label,
      }) as HTMLOptionElement;
      if (server.selected) option.selected = true;
      target.appendChild(option);
    }

    target.appendChild(createElement({ tag: "option", disabled: true, text: "" }));
  }

  target.appendChild(
    createElement({ tag: "option", disabled: true, text: `All Servers - ${totalPlayers} players` }),
  );

  if (browser.selectedKey) target.value = browser.selectedKey;
}

export function refreshServerList(browser: ServerBrowser): void {
  if (document.activeElement === getSelect()) return;
  buildServerList(browser);
}

export function bindServerSelect(browser: ServerBrowser): void {
  const target = getSelect();
  target.onchange = () => {
    const [region, name] = target.value.split(":");
    if (region && name) browser.switchServer(region, name);
  };
}
