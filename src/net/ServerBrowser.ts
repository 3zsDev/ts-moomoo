import { discoverLocalServers } from "./localServers";

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
  regionName?: string;

  key: string;
  name: string;
  playerCount: number;
  playerCapacity: number;
  auth?: boolean;
  port?: number;
  sandbox?: boolean;
  httpUrl?: string;
  wsUrl?: string;
}

export interface ServerAddress {
  host: string;
  port?: number;
  gameIndex: number;
  wsUrl?: string;
}

export interface RegionSummary {
  id: string;
  name: string;
  ping: number | null;
  players: number;
}

export type BrowserChange = "list" | "refresh" | "user";

interface Selection {
  region: string;
  name: string;
}

export interface BrowserPolicy {
  isMember(): boolean;
  isStaff(): boolean;
}

const PING_TIMEOUT = 2500;

function measure(url: string): Promise<number> {
  const start = performance.now();
  return fetch(url, { cache: "no-store" }).then(() => performance.now() - start);
}

export class ServerBrowser {
  private entries: ServerEntry[] = [];
  private pings: Record<string, number> = {};
  private selection: Selection | null = null;
  private userChose = false;
  private policy: BrowserPolicy = { isMember: () => false, isStaff: () => false };
  private readonly listeners: ((kind: BrowserChange) => void)[] = [];

  public onUpdate: (() => void) | null = null;

  public constructor(private readonly baseHost: string) {}

  public init(policy: BrowserPolicy): void {
    this.policy = policy;
  }

  public onChange(listener: (kind: BrowserChange) => void): void {
    this.listeners.push(listener);
  }

  private emit(kind: BrowserChange): void {
    for (const listener of this.listeners) listener(kind);
    this.onUpdate?.();
  }

  public get selectedKey(): string | undefined {
    return this.selection ? this.key() : undefined;
  }

  public regionName(region: string | null): string {
    if (region == null) return "";
    const named = this.entries.find((entry) => entry.region == region && entry.regionName);
    return named?.regionName ?? regionInfo[region]?.name ?? region;
  }

  public address(server: ServerEntry): string {
    if (server.wsUrl) return "localhost";
    return String(server.region) === "0" ? location.hostname : `${server.key}.${server.region}.${this.baseHost}`;
  }

  public isFull(server: ServerEntry): boolean {
    return server.playerCount >= server.playerCapacity;
  }

  public joinable(server: ServerEntry): boolean {
    if (server.auth && !this.policy.isMember()) return false;
    return !this.isFull(server) || this.policy.isStaff();
  }

  private regionIds(): string[] {
    const ids: string[] = [];
    for (const entry of this.entries) if (!ids.includes(entry.region)) ids.push(entry.region);
    return ids;
  }

  private inRegion(region: string): ServerEntry[] {
    return this.entries.filter((entry) => entry.region == region);
  }

  private find(region: string, name: string): ServerEntry | null {
    return this.entries.find((entry) => entry.region == region && entry.name == name) ?? null;
  }

  private bestIn(region: string): ServerEntry | null {
    let open = this.inRegion(region).filter((entry) => this.joinable(entry));
    if (this.policy.isMember() && open.some((entry) => entry.auth)) open = open.filter((entry) => entry.auth);
    open.sort((a, b) => b.playerCount - a.playerCount);
    return open[0] ?? null;
  }

  private bestRegion(): string | null {
    const ping = (region: string) => this.pings[region] ?? Infinity;
    const usable = this.regionIds().filter((region) => this.bestIn(region));
    usable.sort((a, b) => ping(a) - ping(b));
    return usable[0] ?? this.regionIds()[0] ?? null;
  }

  public regions(): RegionSummary[] {
    return this.regionIds().map((id) => ({
      id,
      name: this.regionName(id),
      ping: this.pings[id] === undefined ? null : Math.round(this.pings[id]),
      players: this.inRegion(id).reduce((sum, entry) => sum + entry.playerCount, 0),
    }));
  }

  public serversIn(region: string | null): ServerEntry[] {
    if (region == null) return [];
    return this.inRegion(region).sort((a, b) => b.playerCount - a.playerCount);
  }

  public totalPlayers(): number {
    return this.entries.reduce((sum, entry) => sum + entry.playerCount, 0);
  }

  public selected(): ServerEntry | null {
    return this.selection ? this.find(this.selection.region, this.selection.name) : null;
  }

  public selectedServer(): ServerEntry | undefined {
    return this.selected() ?? undefined;
  }

  public selectedRegion(): string | null {
    return this.selection?.region ?? null;
  }

  public key(): string {
    return this.selection ? `${this.selection.region}:${this.selection.name}` : "";
  }

  public needsSignIn(): boolean {
    const server = this.selected();
    return Boolean(server?.auth) && !this.policy.isMember();
  }

  public isLocalSelected(): boolean {
    return Boolean(this.selected()?.wsUrl);
  }

  private fromUrl(): Selection | null {
    let value = decodeURIComponent((location.hash || "").replace(/^#/, ""));
    if (!value) value = new URLSearchParams(location.search).get("server") || "";
    const [region, name] = value.split(":");
    return region ? { region, name: name || "" } : null;
  }

  private writeHash(): void {
    if (!this.selection) return;
    const hash = `#${this.key()}`;
    if (location.hash === hash) return;
    const params = new URLSearchParams(location.search);
    params.delete("server");
    const search = params.toString() ? `?${params}` : "";
    try {
      history.replaceState(null, document.title, location.pathname + search + hash);
    } catch {
      location.hash = hash;
    }
  }

  private reselect(): boolean {
    const before = this.selection && this.key();
    let next = this.selection;

    if (!next) {
      const fromUrl = this.fromUrl();
      if (fromUrl && this.inRegion(fromUrl.region).length) {
        next = fromUrl;
        this.userChose = true;
      }
    }

    if (!next || !this.inRegion(next.region).length) {
      const region = this.bestRegion();
      next = region ? { region, name: "" } : null;
    } else if (!this.userChose) {
      const region = this.bestRegion();
      if (region && region != next.region) next = { region, name: "" };
    }

    if (next) {
      const current = next.name ? this.find(next.region, next.name) : null;
      if (!current || (this.isFull(current) && !this.policy.isStaff())) {
        const best = this.bestIn(next.region);
        next = { region: next.region, name: best?.name ?? current?.name ?? "" };
      }
    }

    this.selection = next;
    this.writeHash();
    return (this.selection && this.key()) !== before;
  }

  public choose(region: string, name?: string): void {
    this.userChose = true;
    this.selection = { region, name: name || "" };
    this.reselect();
    this.emit("user");
  }

  public moveOff(): ServerEntry | null {
    if (!this.selection) return null;
    const current = this.selection.name;
    const others = this.inRegion(this.selection.region)
      .filter((entry) => entry.name != current && this.joinable(entry))
      .sort((a, b) => b.playerCount - a.playerCount);

    const target = others[0];
    if (!target) return null;
    this.selection = { region: this.selection.region, name: target.name };
    this.writeHash();
    this.emit("user");
    return target;
  }

  public refresh(): void {
    this.emit(this.reselect() ? "list" : "refresh");
  }


  private pingUrl(server: ServerEntry): string {
    if (server.httpUrl) return `${server.httpUrl}/ping`;
    let host = this.address(server);
    if (server.port) host += `:${server.port}`;
    const scheme = String(server.region) === "0" ? location.protocol.replace(":", "") : "https";
    return `${scheme}://${host}/ping`;
  }

  private measureRegions(): Promise<unknown> {
    return Promise.all(
      this.regionIds().map((region) => {
        const first = this.inRegion(region)[0];
        const url = this.pingUrl(first);
        const ping = measure(url)
          .then(() => measure(url))
          .then((ms) => {
            this.pings[region] = this.pings[region] === undefined ? ms : Math.min(this.pings[region], ms);
          })
          .catch(() => {});
        return Promise.race([ping, new Promise((resolve) => setTimeout(resolve, PING_TIMEOUT))]);
      }),
    );
  }

  public setEntries(list: ServerEntry[]): Promise<void> {
    const first = !this.entries.length;
    this.entries = (Array.isArray(list) ? list : []).map((entry) => ({ ...entry, region: String(entry.region) }));

    if (first) {
      return this.measureRegions().then(() => {
        this.reselect();
        this.emit("list");
      });
    }

    this.emit(this.reselect() ? "list" : "refresh");
    void this.measureRegions().then(() => this.emit(this.reselect() ? "list" : "refresh"));
    return Promise.resolve();
  }

  public async load(listUrl: string): Promise<void> {
    const [remote, local] = await Promise.all([
      fetch(listUrl)
        .then((response) => response.json() as Promise<ServerEntry[]>)
        .catch(() => null),
      discoverLocalServers(),
    ]);
    if (!Array.isArray(remote) && !local.length) throw new Error("could not load the server list");

    await this.setEntries([...(Array.isArray(remote) ? remote : []), ...local]);
    if (!this.entries.length) throw new Error("no servers available");
  }

  public stopPinging(): void {}

  public resolve(onError: (reason: string) => void): ServerAddress | null {
    const server = this.selected();
    if (!server) {
      onError("No servers are available right now. Try again in a moment.");
      return null;
    }
    return { host: this.address(server), port: server.port, gameIndex: 0, wsUrl: server.wsUrl };
  }
}
