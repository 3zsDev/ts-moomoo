import { assetUrl } from "../../assetBase";
import { protocol, type ProtocolSource } from "../../config/protocol";
import { isSandbox } from "../../environment";

const SANDBOX_BUILD = isSandbox();
const BUILD = SANDBOX_BUILD ? { id: "s16nx6", salt: 3312325388 } : { id: "s16nto", salt: 3836703251 };

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

  value = rotateLeft(value, 31);
  value ^= 0x4546a6c3;
  value ^= value << 1;
  value = (value + 0xfa2c5de4) | 0;
  value = rotateLeft(value, 9);
  value = (value + 0x599d3f8d) | 0;
  value = Math.imul(value, 0x5641c747);
  value ^= 0x1b45a0c9;
  value ^= value >>> 26;
  value = (value + 0x7c7ab76e) | 0;
  value = Math.imul(value, 0xe94e39eb);

  return (value >>> 11) & 0xff;
}

function mixSandboxByte(salt: number, index: number): number {
  let value = Math.imul(index + 1, 0x9e3779b1) ^ salt;

  value = Math.imul(value, 0xa1c2b131);
  value ^= 0x9ade9f1c;
  value = rotateLeft(value, 18);
  value = (value + 0x6d942d68) | 0;
  value ^= 0xa863a7b9;
  value = Math.imul(value, 0xe3ddf835);
  value ^= value << 28;
  value = Math.imul(value, 0x97b513f3);
  value = (value + 0xc7c2bc9b) | 0;
  value ^= value >>> 24;
  value = (value + 0x1a5ee6bf) | 0;
  value = rotateLeft(value, 2);
  value = (value + 0x5be3a83b) | 0;
  value ^= 0x9921b73d;

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
