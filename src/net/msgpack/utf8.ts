const env = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env;
const isNode = (globalThis as { process?: unknown }).process !== undefined;
const textCodec = env?.TEXT_ENCODING !== "never";
const ENCODE_THRESHOLD = !textCodec ? 0xffffffff : isNode && env?.TEXT_ENCODING !== "force" ? 200 : 0;
const DECODE_THRESHOLD = !textCodec ? 0xffffffff : isNode && env?.TEXT_DECODER !== "force" ? 200 : 0;
const MAX_CACHED_KEY = 16;
const CHUNK = 0x1000;

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

export function utf8Count(value: string): number {
  let bytes = 0;
  for (let i = 0; i < value.length;) {
    let code = value.charCodeAt(i++);
    if ((code & 0xffffff80) === 0) { bytes++; continue; }
    if ((code & 0xfffff800) === 0) { bytes += 2; continue; }
    if (code >= 0xd800 && code <= 0xdbff && i < value.length) {
      const low = value.charCodeAt(i);
      if ((low & 0xfc00) === 0xdc00) { i++; code = ((code & 0x3ff) << 10) + (low & 0x3ff) + 0x10000; }
    }
    bytes += code & 0xffff0000 ? 4 : 3;
  }
  return bytes;
}

export function utf8Write(value: string, out: Uint8Array, offset: number): void {
  if (value.length > ENCODE_THRESHOLD) {
    textEncoder.encodeInto(value, out.subarray(offset));
    return;
  }
  let pos = offset;
  for (let i = 0; i < value.length;) {
    let code = value.charCodeAt(i++);
    if ((code & 0xffffff80) === 0) { out[pos++] = code; continue; }
    if ((code & 0xfffff800) === 0) {
      out[pos++] = ((code >> 6) & 0x1f) | 0xc0;
    } else {
      if (code >= 0xd800 && code <= 0xdbff && i < value.length) {
        const low = value.charCodeAt(i);
        if ((low & 0xfc00) === 0xdc00) { i++; code = ((code & 0x3ff) << 10) + (low & 0x3ff) + 0x10000; }
      }
      if (code & 0xffff0000) {
        out[pos++] = ((code >> 18) & 0x07) | 0xf0;
        out[pos++] = ((code >> 12) & 0x3f) | 0x80;
        out[pos++] = ((code >> 6) & 0x3f) | 0x80;
      } else {
        out[pos++] = ((code >> 12) & 0x0f) | 0xe0;
        out[pos++] = ((code >> 6) & 0x3f) | 0x80;
      }
    }
    out[pos++] = (code & 0x3f) | 0x80;
  }
}

export function utf8Read(bytes: Uint8Array, offset: number, length: number, mapKey: boolean): string {
  const cachedKey = mapKey && length > 0 && length <= MAX_CACHED_KEY;
  if (!cachedKey && length > DECODE_THRESHOLD) return textDecoder.decode(bytes.subarray(offset, offset + length));
  const units: number[] = [];
  let result = "";
  for (let pos = offset, end = offset + length; pos < end;) {
    const byte = bytes[pos++];
    if ((byte & 0x80) === 0) {
      units.push(byte);
    } else if ((byte & 0xe0) === 0xc0) {
      units.push(((byte & 0x1f) << 6) | (bytes[pos++] & 0x3f));
    } else if ((byte & 0xf0) === 0xe0) {
      const b1 = bytes[pos++] & 0x3f;
      const b2 = bytes[pos++] & 0x3f;
      units.push(((byte & 0x1f) << 12) | (b1 << 6) | b2);
    } else if ((byte & 0xf8) === 0xf0) {
      const b1 = bytes[pos++] & 0x3f;
      const b2 = bytes[pos++] & 0x3f;
      const b3 = bytes[pos++] & 0x3f;
      let code = ((byte & 0x07) << 18) | (b1 << 12) | (b2 << 6) | b3;
      if (code > 0xffff) {
        code -= 0x10000;
        units.push(((code >>> 10) & 0x3ff) | 0xd800);
        code = 0xdc00 | (code & 0x3ff);
      }
      units.push(code);
    } else {
      units.push(byte);
    }
    if (units.length >= CHUNK) {
      result += String.fromCharCode(...units);
      units.length = 0;
    }
  }
  if (units.length > 0) result += String.fromCharCode(...units);
  return result;
}
