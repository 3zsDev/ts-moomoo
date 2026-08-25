import { CLIENT_CODES } from "./clientPackets";
import { SERVER_CODES } from "./serverPackets";

export const PROTOCOL_VERSION = 1;

export const MAC_LENGTH = 6;

export const SHUFFLED_MODE = 1;

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
  const random = createRandom(seed >>> 0);

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

export function buildCipherTables(seed: number): CipherTables {
  const mixed = (seed ^ Math.imul(PROTOCOL_VERSION, 2654435761)) >>> 0;
  return {
    c2s: buildTable(CLIENT_CODES, mixed),
    s2c: buildTable(SERVER_CODES, (mixed ^ 2246822507) >>> 0),
  };
}
