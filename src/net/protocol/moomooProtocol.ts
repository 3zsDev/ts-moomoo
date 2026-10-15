import { assetUrl } from "../../assetBase";
import { protocol, type ProtocolSource } from "../../config/protocol";
import { isSandbox } from "../../environment";

const SANDBOX_BUILD = isSandbox();
const BUILD = SANDBOX_BUILD ? { id: "s16od8", salt: 369627087 } : { id: "s16od8", salt: 1830113564 };

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

  value = (value + 0x8ef8cf64) | 0;
  value ^= 0x91e965da;
  value ^= value >>> 31;
  value ^= value << 26;
  value = Math.imul(value, 0xe25b92e5);
  value = rotateLeft(value, 2);
  value = (value + 0x8b10e1d5) | 0;
  value ^= 0x6d3efce8;
  value ^= value << 6;
  value ^= value >>> 12;

  return (value >>> 11) & 0xff;
}

function mixSandboxByte(salt: number, index: number): number {
  let value = Math.imul(index + 1, 0x9e3779b1) ^ salt;

  value = (value + 0x4d395cf9) | 0;
  value ^= value << 22;
  value ^= 0x3dc43501;
  value ^= value << 4;
  value ^= 0xd1162a5f;
  value = Math.imul(value, 0x3d8b3a3f);
  value ^= value >>> 23;
  value ^= value << 2;
  value = Math.imul(value, 0x7da50313);

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
