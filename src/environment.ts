const SANDBOX_HOSTS = ["sandbox.moomoo.io", "sandbox-dev.moomoo.io"];
const LOCAL_HOSTS = ["localhost", "127.0.0.1"];

const SERVER_LIST_VERSION = {
  root: "1.28",
  legacy: "1.27",
  old: "1.26",
  sandbox: "1.28",
} as const;

// shard hosts - joshy like new subdomains and i lazy
const SHARD_HOST = /^(prod|sandbox)-[a-z0-9]+\.moomoo\.io$/;
const DEV_HOST = /^dev[a-z0-9-]*\.moomoo\.io$/;

export interface LocalSite {
  sandbox: boolean;
  peer: string | null;
  // our local servers set this when the api is running, so ?api=local isn't needed
  api?: boolean;
}

function localSite(): LocalSite | null {
  if (typeof window === "undefined") return null;
  const value = (window as unknown as { __MOOMOO_LOCAL__?: LocalSite }).__MOOMOO_LOCAL__;
  return value && typeof value === "object" ? value : null;
}

let sandboxOverride: boolean | null = null;

export function forceSandbox(on: boolean): void {
  sandboxOverride = on;
}

function hostname(): string {
  return typeof location === "undefined" ? "" : location.hostname;
}

export function queryParam(name: string): string | null {
  if (typeof location === "undefined") return null;
  return new URLSearchParams(location.search).get(name);
}

function siteFlavour(): string | null {
  const host = hostname();
  return SHARD_HOST.exec(host)?.[1] ?? null;
}

export function isSandbox(): boolean {
  if (sandboxOverride !== null) return sandboxOverride;

  const site = localSite();
  if (site) return site.sandbox;

  return SANDBOX_HOSTS.includes(hostname()) || siteFlavour() === "sandbox";
}

export function isDev(): boolean {
  return DEV_HOST.test(hostname());
}

export function isLocal(): boolean {
  const host = hostname();
  return LOCAL_HOSTS.includes(host) || host.startsWith("192.168.");
}

export function isApiLocal(): boolean {
  return isLocal() && queryParam("api") === "local";
}

export function restApiEnabled(): boolean {
  return !isLocal() || isApiLocal() || localSite()?.api === true;
}

export function socialEnabled(): boolean {
  return !isSandbox();
}

export function leaderboardsEnabled(): boolean {
  return !isSandbox() && !isDev() && restApiEnabled();
}

export function apiBase(): string {
  if (isLocal()) return location.origin;

  const flavour = siteFlavour();
  if (flavour) return `https://api-${flavour}2.moomoo.io`;
  if (isSandbox()) return "https://api-sandbox2.moomoo.io";
  if (isDev()) return "https://api-dev.moomoo.io";
  return "https://api.moomoo.io";
}

export function serverListUrl(): string {
  const version = isSandbox()
    ? SERVER_LIST_VERSION.sandbox
    : siteFlavour() || isDev()
      ? SERVER_LIST_VERSION.legacy
      : SERVER_LIST_VERSION.root;
  return `${apiBase()}/servers?v=${version}`;
}

export function localSocketUrl(host: string, port?: number): string {
  const scheme = location.protocol === "https:" ? "wss" : "ws";
  return port ? `${scheme}://${host}:${port}` : `${scheme}://${host}`;
}

export interface AlternateSite {
  href: string;
  label: string;
}

export function alternateSite(): AlternateSite {
  const site = localSite();
  if (site?.peer) {
    return site.sandbox
      ? { href: site.peer, label: "Back to MooMoo" }
      : { href: site.peer, label: "Try the sandbox" };
  }

  return isSandbox()
    ? { href: "//moomoo.io/", label: "Back to MooMoo" }
    : { href: "//sandbox.moomoo.io/", label: "Try the sandbox" };
}
