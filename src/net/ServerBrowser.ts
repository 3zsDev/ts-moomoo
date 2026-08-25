import { discoverLocalServers, LOCAL_REGION } from "./localServers";

export interface RegionInfo {
  name: string;
  latitude: number;
  longitude: number;
}

export const regionInfo: Record<string, RegionInfo> = {
  0: { name: "Local", latitude: 0, longitude: 0 },
  local: { name: "Local", latitude: 0, longitude: 0 },
  "us-east": { name: "Miami", latitude: 40.1393329, longitude: -75.8521818 },
  miami: { name: "Miami", latitude: 40.1393329, longitude: -75.8521818 },
  "us-west": { name: "Silicon Valley", latitude: 47.6149942, longitude: -122.4759879 },
  siliconvalley: { name: "Silicon Valley", latitude: 47.6149942, longitude: -122.4759879 },
  gb: { name: "London", latitude: 51.5283063, longitude: -0.382486 },
  london: { name: "London", latitude: 51.5283063, longitude: -0.382486 },
  "eu-west": { name: "Frankfurt", latitude: 50.1211273, longitude: 8.496137 },
  frankfurt: { name: "Frankfurt", latitude: 50.1211273, longitude: 8.496137 },
  au: { name: "Sydney", latitude: -33.8479715, longitude: 150.651084 },
  sydney: { name: "Sydney", latitude: -33.8479715, longitude: 150.651084 },
  saopaulo: { name: "São Paulo", latitude: 23.5558, longitude: 46.6396 },
  sg: { name: "Singapore", latitude: 1.3147268, longitude: 103.7065876 },
  singapore: { name: "Singapore", latitude: 1.3147268, longitude: 103.7065876 },
};

export interface ServerEntry {
  region: string;

  key: string;
  name: string;
  index: number;
  port?: number;
  playerCount: number;
  playerCapacity: number;
  isPrivate?: boolean;
  games?: Array<{ playerCount: number; playerCapacity: number; isPrivate?: boolean }>;

  sandbox?: boolean;
  httpUrl?: string;
  wsUrl?: string;

  ping?: number;
  pings?: number[];
  selected?: boolean;
}

export interface ServerAddress {
  host: string;
  port?: number;
  gameIndex: number;
  wsUrl?: string;
}

export class ServerBrowser {
  public servers: Record<string, ServerEntry[]> = {};

  public selectedKey?: string;
  public password?: string | null;

  private pingTimer?: ReturnType<typeof setInterval>;
  private localTimer?: ReturnType<typeof setInterval>;
  public onUpdate: (() => void) | null = null;

  public constructor(private readonly baseUrl: string) {}

  public parseServerQuery(override?: string): [region: string, name: string, password: string | null] | [] {
    const params = new URLSearchParams(location.search);
    const value = override ?? params.get("server");
    if (typeof value !== "string") return [];
    const [region, name] = value.split(":");
    return [region, name, params.get("password")];
  }

  public generateHref(region: string, name: string, password?: string | null): string {
    let href = `${window.location.href.split("?")[0]}?server=${region}:${name}`;
    if (password) href += `&password=${encodeURIComponent(password)}`;
    return href;
  }

  public switchServer(region: string, name: string): void {
    window.location.href = this.generateHref(region, name, null);
  }

  public findServer(region: string, name: string): ServerEntry | undefined {
    const found = this.servers[region]?.find((server) => server.name === name);
    if (!found) console.warn(`No server "${name}" in region "${region}".`);
    return found;
  }

  public serverHost(server: ServerEntry): string {
    if (server.wsUrl) return "localhost";
    return String(server.region) === "0" ? location.hostname : `${server.key}.${server.region}.${this.baseUrl}`;
  }

  // Local servers are plain http, so probing them over https never resolves.
  private pingScheme(server: ServerEntry): string {
    return String(server.region) === "0" ? location.protocol.replace(":", "") : "https";
  }

  private pingUrl(server: ServerEntry): string {
    if (server.httpUrl) return `${server.httpUrl}/ping`;

    let host = this.serverHost(server);
    if (server.port) host += `:${server.port}`;
    return `${this.pingScheme(server)}://${host}/ping`;
  }

  public selectedServer(): ServerEntry | undefined {
    const [region, name] = this.parseServerQuery(this.selectedKey);
    if (!region || !name) return undefined;
    return this.servers[region]?.find((server) => server.name === name);
  }

  public isLocalSelected(): boolean {
    return Boolean(this.selectedServer()?.wsUrl);
  }

  public resolve(onError: (reason: string) => void, overrideKey?: string): ServerAddress | null {
    const [region, name, password] = this.parseServerQuery(overrideKey ?? this.selectedKey);
    if (!region || !name) {
      onError("Unable to find server");
      return null;
    }
    this.password = password;

    const server = this.findServer(region, name);
    if (!server) {
      onError(`Failed to find server for region ${region} and name ${name}`);
      return null;
    }
    if (server.playerCount >= server.playerCapacity) {
      onError("Server is already full.");
      return null;
    }

    window.history.replaceState(document.title, document.title, this.generateHref(region, name, this.password));
    return { host: this.serverHost(server), port: server.port, gameIndex: 0, wsUrl: server.wsUrl };
  }

  public async load(listUrl: string): Promise<void> {
    const entries: ServerEntry[] = await fetch(listUrl)
      .then((response) => response.json())
      .catch(() => [] as ServerEntry[]);

    this.processServers(entries);
    await this.syncLocal();

    const all = [...entries, ...(this.servers[LOCAL_REGION] ?? [])];
    if (all.length === 0) throw new Error("no servers available");

    await this.measureLatency();
    await this.measureLatency();
    this.selectDefault(all);
    this.onUpdate?.();

    if (this.pingTimer) clearInterval(this.pingTimer);
    this.pingTimer = setInterval(() => void this.measureLatency(), 5000);

    if (this.localTimer) clearInterval(this.localTimer);
    this.localTimer = setInterval(() => {
      void this.syncLocal().then(() => this.onUpdate?.());
    }, 5000);
  }

  private async syncLocal(): Promise<void> {
    const found = await discoverLocalServers();
    const previous = this.servers[LOCAL_REGION] ?? [];

    for (const entry of found) {
      const known = previous.find((server) => server.key === entry.key);
      if (!known) continue;
      entry.ping = known.ping;
      entry.pings = known.pings;
      entry.selected = known.selected;
    }

    if (found.length === 0) delete this.servers[LOCAL_REGION];
    else this.servers[LOCAL_REGION] = found;
  }

  public stopPinging(): void {
    if (this.pingTimer) clearInterval(this.pingTimer);
    this.pingTimer = undefined;
    if (this.localTimer) clearInterval(this.localTimer);
    this.localTimer = undefined;
  }

  private processServers(entries: ServerEntry[]): void {
    const grouped: Record<string, ServerEntry[]> = {};
    for (const entry of entries) {
      (grouped[entry.region] ||= []).push(entry);
    }
    for (const region in grouped) {
      grouped[region].sort((a, b) => b.playerCount - a.playerCount);
    }
    this.servers = grouped;
  }

  private async measureLatency(): Promise<void> {
    await Promise.all(
      Object.values(this.servers).map(async (regionServers) => {
        const first = regionServers[0];
        if (!first) return;

        const start = Date.now();

        await Promise.race([
          fetch(this.pingUrl(first))
            .then(() => {
              const elapsed = Date.now() - start;
              for (const server of regionServers) {
                server.pings ??= [];
                server.pings.push(elapsed);
                if (server.pings.length > 10) server.pings.shift();
                server.ping = Math.floor(server.pings.reduce((sum, p) => sum + p, 0) / server.pings.length);
              }
            })
            .catch(() => {}),
          new Promise<void>((resolve) => setTimeout(resolve, 100)),
        ]);
      }),
    );

    this.onUpdate?.();
  }

  private selectDefault(entries: ServerEntry[]): void {
    const [region, name] = this.parseServerQuery();

    for (const entry of entries) {
      if (entry.region === region && entry.name === name) {
        entry.selected = true;
        this.selectedKey = `${entry.region}:${entry.name}`;
        return;
      }
    }

    const remote = entries.filter((entry) => !entry.wsUrl);
    const best = ServerBrowser.pickBestServer(remote) ?? remote[0] ?? entries[0];
    if (!best) return;
    best.selected = true;
    this.selectedKey = `${best.region}:${best.name}`;
    window.history.replaceState(
      document.title, document.title,
      this.generateHref(best.region, best.name, this.password),
    );
  }

  private static pickBestServer(entries: ServerEntry[]): ServerEntry | null {
    const open = entries.filter((entry) => entry.playerCount !== entry.playerCapacity);
    if (open.length === 0) return null;

    const bestPing = Math.min(...open.map((entry) => entry.ping ?? Infinity));
    const fastest = open.filter((entry) => entry.ping === bestPing);
    if (fastest.length === 0) return null;

    return fastest.reduce((a, b) => (a.playerCount > b.playerCount ? a : b));
  }
}
