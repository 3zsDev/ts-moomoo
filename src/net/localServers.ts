import { endpoints, network } from "../config/network";
import { isLocal, isSandbox } from "../environment";
import type { ServerEntry } from "./ServerBrowser";

export const LOCAL_REGION = "local";

const PROBE_TIMEOUT = 800;

interface LocalServerInfo {
  name?: string | number;
  playerCount?: number;
  playerCapacity?: number;
  sandbox?: boolean;
}

async function probe(port: number): Promise<ServerEntry | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PROBE_TIMEOUT);

  try {
    const response = await fetch(`http://localhost:${port}/servers`, {
      cache: "no-store",
      signal: controller.signal,
    });
    if (!response.ok) return null;

    const list = (await response.json()) as LocalServerInfo[];
    const info = Array.isArray(list) ? list[0] : null;
    if (!info) return null;
    if (Boolean(info.sandbox) !== isSandbox()) return null;

    const name = String(info.name ?? port);
    return {
      region: LOCAL_REGION,
      key: `${LOCAL_REGION}:${name}:0`,
      name,
      index: 0,
      port,
      playerCount: Number(info.playerCount) || 0,
      playerCapacity: Number(info.playerCapacity) || network.maxPlayers,
      isPrivate: false,
      sandbox: Boolean(info.sandbox),
      httpUrl: `http://localhost:${port}`,
      wsUrl: `ws://localhost:${port}`,
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function discoverLocalServers(): Promise<ServerEntry[]> {
  if (isLocal()) return [];

  const probed = await Promise.all(endpoints.localPorts.map((port) => probe(port)));
  const servers: ServerEntry[] = [];
  const taken = new Set<string>();

  for (const entry of probed) {
    if (!entry) continue;
    if (taken.has(entry.name)) {
      entry.name = `${entry.name}-${entry.port}`;
      entry.key = `${LOCAL_REGION}:${entry.name}:0`;
    }
    taken.add(entry.name);
    servers.push(entry);
  }

  return servers;
}
