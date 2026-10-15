import { assetUrl } from "../../assetBase";
import { protocol, type ProtocolSource } from "../../config/protocol";
import { isSandbox } from "../../environment";

const SANDBOX_BUILD = isSandbox();
const BUILD = SANDBOX_BUILD ? { id: "s16o48", salt: 586296834 } : { id: "s16o49", salt: 509036625 };

export let BUILD_ID = BUILD.id;
export let BUILD_SALT = BUILD.salt;
export let LIVE_BUNDLE: string | null = null;

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
  LIVE_BUNDLE = null;
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
    const { file, bundle } = (await response.json()) as { file?: unknown; bundle?: unknown };
    if (!response.ok || typeof file !== "string") throw new Error(`lookup answered ${response.status}`);
    const loaded = await importProtocol(
      new URL(`/p/${file}?environment=${encodeURIComponent(environment)}`, location.href).toString(),
      `live ${environment}`,
    );
    if (!loaded) return false;
    useProtocol(loaded);
    LIVE_BUNDLE = typeof bundle === "string" && bundle ? bundle : null;
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

  value = (value + 0x1de8d981) | 0;
  value = rotateLeft(value, 11);
  value ^= value >>> 12;
  value = Math.imul(value, 0x806217ad);
  value ^= 0xd551ba52;
  value = Math.imul(value, 0x2a952c0b);
  value ^= value << 3;
  value = rotateLeft(value, 22);
  value ^= value << 4;
  value ^= value >>> 14;
  value ^= value << 20;
  value ^= value >>> 25;
  value ^= 0x787b2bfd;
  value = Math.imul(value, 0xe87993d);

  return (value >>> 11) & 0xff;
}

function mixSandboxByte(salt: number, index: number): number {
  let value = Math.imul(index + 1, 0x9e3779b1) ^ salt;

  value ^= 0x9961ff4d;
  value = (value + 0x1586f328) | 0;
  value ^= value << 30;
  value ^= value >>> 2;
  value = (value + 0xa001611f) | 0;
  value ^= value >>> 23;
  value ^= value << 19;
  value = Math.imul(value, 0xc58fb503);
  value ^= value >>> 26;
  value ^= value << 19;
  value = Math.imul(value, 0x1ac645e9);
  value ^= value >>> 11;
  value = (value + 0xb0d46485) | 0;

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
