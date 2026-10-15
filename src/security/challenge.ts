import { connection } from "../net/Connection";
import { ClientPacket } from "../net/protocol";
import { protection } from "./options";
import { securityFlags } from "./telemetry";
import { untrustedEventCount } from "./trusted";

export type ChallengeProbe = [kind: number, path: string, hash: number];

export const ProbeKind = {
  OwnKeys: 1,
  PrimitiveValues: 2,
  StorageKeys: 3,
  ElementIds: 4,
  PatchedClass: 5,
  SymbolKeys: 6,
  NonNative: 7,
} as const;

const MAX_PROBES = 30;
const NATIVE_SOURCE = /\{\s*\[native code\]\s*\}\s*$/;
const fnToString = Function.prototype.toString;

let probes: ChallengeProbe[] | null = null;
let challengeSeed = 0;

type ProbeCache = Record<string, number[]>;

export function setChallenge(seed: number, list: unknown): void {
  challengeSeed = seed >>> 0;
  probes = Array.isArray(list) ? (list.slice(0, MAX_PROBES) as ChallengeProbe[]) : null;
}

function hashName(text: string): number {
  let hash = (2166136261 ^ challengeSeed) >>> 0;
  for (let i = 0; i < text.length; i++) hash = Math.imul(hash ^ (text.charCodeAt(i) & 0xff), 16777619);
  hash ^= hash >>> 15;
  hash = Math.imul(hash, 739982445);
  hash ^= hash >>> 12;
  return hash >>> 0;
}

function resolvePath(path: unknown): any {
  let value: any = window;
  for (const key of String(path).split(".")) {
    if (value === null || value === undefined) return undefined;
    value = value[key];
  }
  return value;
}

function listHashes(kind: number, path: string): number[] {
  const names: string[] = [];

  if (kind === ProbeKind.OwnKeys || kind === ProbeKind.PrimitiveValues) {
    const target = resolvePath(path);
    if (target == null) return [];
    for (const name of Object.getOwnPropertyNames(target)) {
      if (kind === ProbeKind.OwnKeys) {
        names.push(name);
        continue;
      }
      try {
        const value = target[name];
        const type = typeof value;
        if (type === "number" || type === "string" || type === "boolean") names.push(`${name}=${value}`);
      } catch {}
    }
  } else if (kind === ProbeKind.SymbolKeys) {
    const target = resolvePath(path);
    if (target == null) return [];
    for (const symbol of Object.getOwnPropertySymbols(target)) {
      names.push(String(Symbol.keyFor(symbol) || symbol.description || ""));
    }
  } else if (kind === ProbeKind.StorageKeys) {
    for (let i = 0; i < window.localStorage.length; i++) names.push(String(window.localStorage.key(i)));
  } else if (kind === ProbeKind.ElementIds) {
    document.querySelectorAll("[id]").forEach((element) => names.push(`${element.tagName.toLowerCase()}#${element.id}`));
  }

  return names.map(hashName);
}

function runProbe(probe: ChallengeProbe, cache: ProbeCache): boolean {
  try {
    const [kind, path] = probe;
    if (kind === ProbeKind.PatchedClass) {
      const target = resolvePath(path);
      return typeof target === "function" && !!target.prototype && target.prototype.constructor !== target;
    }
    if (kind === ProbeKind.NonNative) {
      const target = resolvePath(path);
      return typeof target === "function" && !NATIVE_SOURCE.test(fnToString.call(target));
    }
    const key = `${kind}:${path}`;
    return (cache[key] ||= listHashes(kind, path)).indexOf(probe[2] >>> 0) !== -1;
  } catch {
    return false;
  }
}

export function probeMask(): number | null {
  if (!probes) return null;
  const cache: ProbeCache = {};
  let mask = 0;
  for (let i = 0; i < probes.length; i++) if (runProbe(probes[i], cache)) mask |= 1 << i;
  return mask;
}

export function runChallenge(done: (mask: number | null, seed: number) => void): void {
  if (!probes) {
    done(null, 0);
    return;
  }
  const list = probes;
  const seed = challengeSeed;
  const startedAt = Date.now();
  const cache: ProbeCache = {};
  let mask = 0;
  let index = 0;

  const step = () => {
    if (probes !== list || challengeSeed !== seed) return;
    const rush = document.hidden || Date.now() - startedAt > 2000;
    do {
      if (index < list.length && runProbe(list[index], cache)) mask |= 1 << index;
      index++;
    } while (rush && index < list.length);
    if (index >= list.length) {
      done(mask, seed);
      return;
    }

    let fired = false;
    const next = () => {
      if (fired) return;
      fired = true;
      step();
    };
    window.requestAnimationFrame(next);
    setTimeout(next, 250);
  };
  step();
}

export function answerChallenge(seed: number, list: unknown): void {
  setChallenge(Number(seed) || 0, protection.telemetry ? list : null);
  const challenge = challengeSeed;
  runChallenge((mask) => {
    if (!connection.isReady() || !connection.isPinned()) return;
    connection.send(ClientPacket.Telemetry, securityFlags(), untrustedEventCount(), mask, connection.seal(), challenge);
  });
}
