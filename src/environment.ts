const SANDBOX_HOSTS = ["sandbox.moomoo.io", "sandbox-dev.moomoo.io"];
const DEV_HOSTS = ["dev.moomoo.io", "dev2.moomoo.io"];
const LOCAL_HOSTS = ["localhost", "127.0.0.1"];

const SERVER_LIST_VERSION = "1.27";

export interface LocalSite {
  sandbox: boolean;
  peer: string | null;
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

export function isSandbox(): boolean {
  if (sandboxOverride !== null) return sandboxOverride;

  const site = localSite();
  if (site) return site.sandbox;

  return SANDBOX_HOSTS.includes(hostname());
}

export function isDev(): boolean {
  return DEV_HOSTS.includes(hostname());
}

export function isLocal(): boolean {
  const host = hostname();
  return LOCAL_HOSTS.includes(host) || host.startsWith("192.168.");
}

export function apiBase(): string {
  if (isLocal()) return location.origin;
  if (isSandbox()) return "https://api-sandbox.moomoo.io";
  if (isDev()) return "https://api-dev.moomoo.io";
  return "https://api.moomoo.io";
}

export function serverListUrl(): string {
  return `${apiBase()}/servers?v=${SERVER_LIST_VERSION}`;
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
