import { CLIENT_CODES } from "./clientPackets";
import { SERVER_CODES } from "./serverPackets";

export const PROTOCOL_VERSION = 1;

export const MAC_LENGTH = 6;

export const SHUFFLED_MODE = 1;

export const FULL_SHUFFLED_MODE = 2;

export const LEGACY_C2S_COUNT = 17;
export const LEGACY_S2C_COUNT = 36;

export const SHUFFLED_C2S_COUNT = 22;
export const SHUFFLED_S2C_COUNT = 39;

const CODE_SPACE = 128;

export interface CodeTable {
  enc: Record<string, number>;

  dec: Record<number, string>;
}

export interface CipherTables {
  c2s: CodeTable;
  s2c: CodeTable;
}

function createRandom(seed: number): () => number {
  let state = seed | 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function buildTable(codes: string[], seed: number): CodeTable {
  const indices = codes.map((_, index) => index);
  const random = createRandom(seed);

  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }

  const enc: Record<string, number> = {};
  const dec: Record<number, string> = {};
  for (let i = 0; i < codes.length; i++) {
    enc[codes[i]] = indices[i];
    dec[indices[i]] = codes[i];
  }
  return { enc, dec };
}

function hashCode(code: string, seed: number): number {
  let hash = (2166136261 ^ seed) >>> 0;
  for (let i = 0; i < code.length; i++) hash = Math.imul(hash ^ (code.charCodeAt(i) & 0xff), 16777619);
  hash ^= hash >>> 15;
  hash = Math.imul(hash, 739982445);
  hash ^= hash >>> 12;
  return hash >>> 0;
}

function buildFullTable(codes: string[], shuffled: number, seed: number): CodeTable {
  const table = buildTable(codes.slice(0, shuffled), seed);
  const space = CODE_SPACE - shuffled;
  const taken: Record<number, boolean> = {};

  for (let i = shuffled; i < codes.length; i++) {
    let slot = hashCode(codes[i], seed) % space;
    while (taken[slot]) slot = (slot + 1) % space;
    taken[slot] = true;
    table.enc[codes[i]] = shuffled + slot;
    table.dec[shuffled + slot] = codes[i];
  }
  return table;
}

export function buildCipherTables(seed: number, salt?: number | null, fullLists = salt != null): CipherTables {
  const mixed = (seed ^ Math.imul(salt ?? PROTOCOL_VERSION, 2654435761)) >>> 0;
  const s2cSeed = (mixed ^ 2246822507) >>> 0;
  if (!fullLists) {
    return {
      c2s: buildTable(CLIENT_CODES.slice(0, LEGACY_C2S_COUNT), mixed),
      s2c: buildTable(SERVER_CODES.slice(0, LEGACY_S2C_COUNT), s2cSeed),
    };
  }
  return {
    c2s: buildFullTable(CLIENT_CODES, SHUFFLED_C2S_COUNT, mixed),
    s2c: buildFullTable(SERVER_CODES, SHUFFLED_S2C_COUNT, s2cSeed),
  };
}
