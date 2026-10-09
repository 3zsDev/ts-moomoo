import { assetUrl } from "../../assetBase";
import { protocol, type ProtocolSource } from "../../config/protocol";
import { isSandbox } from "../../environment";

const SANDBOX_BUILD = isSandbox();
const BUILD = SANDBOX_BUILD ? { id: "s16nz1", salt: 1908827726 } : { id: "s16nz1", salt: 2643987008 };

export let BUILD_ID = BUILD.id;
export let BUILD_SALT = BUILD.salt;

const BUNDLED_PROTOCOL_PATH = "p/moomoo-protocol.js";

interface ProtocolModule {
  BUILD_ID: string;
  BUILD_SALT: number;
  mixKey: (key: Uint8Array, salt: number) => Uint8Array;
}

let moduleMixKey: ProtocolModule["mixKey"] | null = null;
const protocolLoads = new Map<string, Promise<ProtocolModule | null>>();
let warnedMissing = false;

function liveProtocolUrl(): string | null {
  for (const script of document.querySelectorAll<HTMLScriptElement>('script[type="importmap"]')) {
    try {
      const path = JSON.parse(script.textContent ?? "")?.imports?.["moomoo-protocol"];
      if (typeof path === "string") return new URL(path, location.href).toString();
    } catch {
      // ignore malformed import maps
    }
  }
  return null;
}

function protocolUrl(source: ProtocolSource): string | null {
  if (source === "live") return liveProtocolUrl();
  if (source === "bundled") return new URL(assetUrl(BUNDLED_PROTOCOL_PATH), location.href).toString();
  return null;
}

function importProtocol(url: string, source: string): Promise<ProtocolModule | null> {
  let load = protocolLoads.get(url);
  if (!load) {
    load = (async () => {
      try {
        const loaded = (await import(/* @vite-ignore */ url)) as Partial<ProtocolModule>;
        if (typeof loaded.BUILD_ID !== "string" || typeof loaded.BUILD_SALT !== "number" || typeof loaded.mixKey !== "function") {
          console.warn("[protocol] protocol module has an unexpected shape; using built-in values", { source, url });
          return null;
        }
        console.info(`[protocol] using ${source} protocol module`, { buildId: loaded.BUILD_ID });
        return loaded as ProtocolModule;
      } catch (error) {
        console.warn("[protocol] failed to load protocol module; using built-in values", { source, url, error });
        protocolLoads.delete(url);
        return null;
      }
    })();
    protocolLoads.set(url, load);
  }
  return load;
}

function useProtocol(loaded: ProtocolModule | null): void {
  BUILD_ID = loaded?.BUILD_ID ?? BUILD.id;
  BUILD_SALT = loaded?.BUILD_SALT ?? BUILD.salt;
  moduleMixKey = loaded?.mixKey ?? null;
}

export async function loadProtocol(): Promise<void> {
  const source = protocol.protocolSource;
  const url = protocolUrl(source);
  if (!url && source !== "builtin" && !warnedMissing) {
    warnedMissing = true;
    console.warn(`[protocol] no ${source} protocol module found; using built-in values`);
  }
  useProtocol(url ? await importProtocol(url, source) : null);
}

export async function loadLiveProtocol(environment: string): Promise<boolean> {
  try {
    const response = await fetch(`/p/live.json?environment=${encodeURIComponent(environment)}`, { cache: "no-store" });
    const { file } = (await response.json()) as { file?: unknown };
    if (!response.ok || typeof file !== "string") throw new Error(`lookup answered ${response.status}`);
    const loaded = await importProtocol(
      new URL(`/p/${file}?environment=${encodeURIComponent(environment)}`, location.href).toString(),
      `live ${environment}`,
    );
    if (!loaded) return false;
    useProtocol(loaded);
    return true;
  } catch (error) {
    console.warn("[protocol] couldn't find the live protocol module", { environment, error });
    return false;
  }
}

function rotateLeft(value: number, shift: number): number {
  return (value << shift) | (value >>> (32 - shift));
}

function mixProductionByte(salt: number, index: number): number {
  let value = Math.imul(index + 1, 0x9e3779b1) ^ salt;

  value ^= value << 10;
  value ^= value >>> 30;
  value ^= 0xcc34b9fe;
  value ^= value >>> 27;
  value ^= value << 7;
  value = rotateLeft(value, 11);
  value = (value + 0x90a2ad19) | 0;
  value = Math.imul(value, 0x3e28d5bf);
  value = rotateLeft(value, 3);
  value = (value + 0xbdfe6241) | 0;
  value ^= 0x4dd28fb9;
  value = (value + 0xc48ab3b2) | 0;

  return (value >>> 11) & 0xff;
}

function mixSandboxByte(salt: number, index: number): number {
  let value = Math.imul(index + 1, 0x9e3779b1) ^ salt;

  value = (value + 0xbf73ef68) | 0;
  value ^= value >>> 16;
  value = rotateLeft(value, 19);
  value ^= value >>> 19;
  value = Math.imul(value, 0x4a9ae0ef);
  value ^= value >>> 16;
  value = Math.imul(value, 0xda6bbd9b);
  value = rotateLeft(value, 10);
  value ^= 0xec01eaec;

  return (value >>> 11) & 0xff;
}

const mixByte = SANDBOX_BUILD ? mixSandboxByte : mixProductionByte;

export function mixKey(key: Uint8Array, salt: number): Uint8Array {
  if (moduleMixKey) return moduleMixKey(key, salt);

  const output = new Uint8Array(key.length);
  const normalizedSalt = salt | 0;

  for (let index = 0; index < key.length; index++) {
    output[index] = key[index] ^ mixByte(normalizedSalt, index);
  }

  return output;
}
