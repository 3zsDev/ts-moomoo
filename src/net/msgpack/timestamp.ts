export const TIMESTAMP_TYPE = -1;

const UINT32_MAX = 0x100000000 - 1;
const SEC34_MAX = 0x400000000 - 1;

export function encodeTimestamp(date: Date): Uint8Array {
  const ms = date.getTime();
  const whole = Math.floor(ms / 1e3);
  const nanos = (ms - whole * 1e3) * 1e6;
  const carry = Math.floor(nanos / 1e9);
  const sec = whole + carry;
  const nsec = nanos - carry * 1e9;

  if (sec >= 0 && nsec >= 0 && sec <= SEC34_MAX) {
    if (nsec === 0 && sec <= UINT32_MAX) {
      const out = new Uint8Array(4);
      new DataView(out.buffer).setUint32(0, sec);
      return out;
    }
    const out = new Uint8Array(8);
    const view = new DataView(out.buffer);
    view.setUint32(0, (nsec << 2) | ((sec / 0x100000000) & 3));
    view.setUint32(4, sec & 0xffffffff);
    return out;
  }
  const out = new Uint8Array(12);
  const view = new DataView(out.buffer);
  view.setUint32(0, nsec);
  view.setUint32(4, Math.floor(sec / 0x100000000));
  view.setUint32(8, sec);
  return out;
}

export function decodeTimestamp(data: Uint8Array): Date {
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  let sec: number;
  let nsec: number;
  switch (data.byteLength) {
    case 4:
      sec = view.getUint32(0);
      nsec = 0;
      break;
    case 8: {
      const high = view.getUint32(0);
      sec = (high & 3) * 0x100000000 + view.getUint32(4);
      nsec = high >>> 2;
      break;
    }
    case 12:
      sec = view.getInt32(4) * 0x100000000 + view.getUint32(8);
      nsec = view.getUint32(0);
      break;
    default:
      throw new Error(`Unrecognized data size for timestamp (expected 4, 8, or 12): ${data.length}`);
  }
  return new Date(sec * 1e3 + nsec / 1e6);
}
