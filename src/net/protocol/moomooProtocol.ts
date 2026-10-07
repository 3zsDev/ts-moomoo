import { assetUrl } from "../../assetBase";
import { protocol, type ProtocolSource } from "../../config/protocol";
import { isSandbox } from "../../environment";

const SANDBOX_BUILD = isSandbox();
const BUILD = SANDBOX_BUILD ? { id: "s16nrc", salt: 3423846518 } : { id: "s16nqy", salt: 580153463 };

export let BUILD_ID = BUILD.id;
export let BUILD_SALT = BUILD.salt;

const BUNDLED_PROTOCOL_PATH = "p/moomoo-protocol.js";

interface ProtocolModule {
  BUILD_ID: string;
  BUILD_SALT: number;
  mixKey: (key: Uint8Array, salt: number) => Uint8Array;
}

let moduleMixKey: ProtocolModule["mixKey"] | null = null;
let protocolLoad: Promise<void> | null = null;

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

export function loadProtocol(): Promise<void> {
  protocolLoad ??= (async () => {
    const source = protocol.protocolSource;
    const url = protocolUrl(source);
    if (!url) {
      if (source !== "builtin") console.warn(`[protocol] no ${source} protocol module found; using built-in values`);
      return;
    }
    try {
      const loaded = (await import(/* @vite-ignore */ url)) as Partial<ProtocolModule>;
      if (typeof loaded.BUILD_ID !== "string" || typeof loaded.BUILD_SALT !== "number" || typeof loaded.mixKey !== "function") {
        console.warn("[protocol] protocol module has an unexpected shape; using built-in values", { source, url });
        return;
      }
      BUILD_ID = loaded.BUILD_ID;
      BUILD_SALT = loaded.BUILD_SALT;
      moduleMixKey = loaded.mixKey;
      console.info(`[protocol] using ${source} protocol module`, { buildId: BUILD_ID });
    } catch (error) {
      console.warn("[protocol] failed to load protocol module; using built-in values", { source, url, error });
    }
  })();
  return protocolLoad;
}

function rotateLeft(value: number, shift: number): number {
  return (value << shift) | (value >>> (32 - shift));
}

function mixProductionByte(salt: number, index: number): number {
  let value = Math.imul(index + 1, 0x9e3779b1) ^ salt;

  value = rotateLeft(value, 6);
  value = Math.imul(value, 0xfd856881) ^ 0x0102efc2;
  value = (value + 0xb361822f) | 0;
  value = rotateLeft(value, 8);
  value = Math.imul(value, 0xc0587463);
  value ^= value >>> 30;
  value = rotateLeft(value, 7);
  value = (value + 0xda531200) | 0;
  value ^= value << 1;
  value = rotateLeft(value, 19);
  value ^= value >>> 22;
  value = Math.imul(value, 0xbc973307);

  return (value >>> 11) & 0xff;
}

function mixSandboxByte(salt: number, index: number): number {
  let value = Math.imul(index + 1, 0x9e3779b1) ^ salt;

  value = rotateLeft(value, 8);
  value = (value + 0xcf12ee92) | 0;
  value = rotateLeft(value, 29);
  value ^= value << 2;
  value ^= value >>> 23;
  value = (value + 0x91cace47) | 0;
  value ^= value >>> 10;
  value = rotateLeft(value, 25);
  value ^= 0x89c5c94a;
  value ^= value << 1;

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
