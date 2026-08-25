import type { MsgPackValue } from "./types";
class Reader {
  private static readonly textDecoder = new TextDecoder();

  private offset = 0;
  private readonly view: DataView;

  public constructor(private readonly bytes: Uint8Array) {
    this.view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  }

  private u8(): number {
    return this.bytes[this.offset++];
  }

  private uint(byteLength: number): number {
    let value = 0;
    for (let i = 0; i < byteLength; i++) value = value * 256 + this.bytes[this.offset++];
    return value;
  }

  private int(byteLength: number): number {
    let value: number;
    switch (byteLength) {
      case 1: value = this.view.getInt8(this.offset); break;
      case 2: value = this.view.getInt16(this.offset, false); break;
      case 4: value = this.view.getInt32(this.offset, false); break;
      default: {
        const high = this.view.getInt32(this.offset, false);
        const low = this.view.getUint32(this.offset + 4, false);
        value = high * 4294967296 + low;
        break;
      }
    }
    this.offset += byteLength;
    return value;
  }

  private f32(): number {
    const value = this.view.getFloat32(this.offset, false);
    this.offset += 4;
    return value;
  }

  private f64(): number {
    const value = this.view.getFloat64(this.offset, false);
    this.offset += 8;
    return value;
  }

  private str(length: number): string {
    const value = Reader.textDecoder.decode(this.bytes.subarray(this.offset, this.offset + length));
    this.offset += length;
    return value;
  }

  private bin(length: number): Uint8Array {
    const value = this.bytes.slice(this.offset, this.offset + length);
    this.offset += length;
    return value;
  }

  private array(length: number): MsgPackValue[] {
    const result: MsgPackValue[] = new Array(length);
    for (let i = 0; i < length; i++) result[i] = this.value();
    return result;
  }

  private map(length: number): Record<string, MsgPackValue> {
    const result: Record<string, MsgPackValue> = {};
    for (let i = 0; i < length; i++) {
      const key = String(this.value());
      result[key] = this.value();
    }
    return result;
  }

  public value(): MsgPackValue {
    const tag = this.u8();

    if (tag < 0x80) return tag;
    if (tag < 0x90) return this.map(tag & 0x0f);
    if (tag < 0xa0) return this.array(tag & 0x0f);
    if (tag < 0xc0) return this.str(tag & 0x1f);
    if (tag >= 0xe0) return tag - 0x100;

    switch (tag) {
      case 0xc0: return null;
      case 0xc2: return false;
      case 0xc3: return true;

      case 0xc4: return this.bin(this.uint(1));
      case 0xc5: return this.bin(this.uint(2));
      case 0xc6: return this.bin(this.uint(4));

      case 0xca: return this.f32();
      case 0xcb: return this.f64();

      case 0xcc: return this.uint(1);
      case 0xcd: return this.uint(2);
      case 0xce: return this.uint(4);
      case 0xcf: return this.uint(8);

      case 0xd0: return this.int(1);
      case 0xd1: return this.int(2);
      case 0xd2: return this.int(4);
      case 0xd3: return this.int(8);

      case 0xd9: return this.str(this.uint(1));
      case 0xda: return this.str(this.uint(2));
      case 0xdb: return this.str(this.uint(4));

      case 0xdc: return this.array(this.uint(2));
      case 0xdd: return this.array(this.uint(4));

      case 0xde: return this.map(this.uint(2));
      case 0xdf: return this.map(this.uint(4));

      default:
        throw new Error(`msgpack: unsupported tag 0x${tag.toString(16)}`);
    }
  }
}

export function decode(bytes: Uint8Array): MsgPackValue {
  return new Reader(bytes).value();
}
