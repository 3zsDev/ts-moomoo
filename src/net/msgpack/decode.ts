import { decodeTimestamp, TIMESTAMP_TYPE } from "./timestamp";
import { ExtData, type MsgPackValue } from "./types";
import { utf8Read } from "./utf8";

class Reader {
  private offset = 0;
  private readonly view: DataView;
  private mapKey = false;

  public constructor(private readonly bytes: Uint8Array) {
    this.view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  }

  public remaining(): number {
    return this.bytes.byteLength - this.offset;
  }

  public extraBytesError(): RangeError {
    const total = this.bytes.byteLength;
    return new RangeError(`Extra ${total - this.offset} of ${total} byte(s) found at buffer[${this.offset}]`);
  }

  private u8(): number {
    return this.view.getUint8(this.offset++);
  }

  private uint(byteLength: number): number {
    let value: number;
    switch (byteLength) {
      case 1: value = this.view.getUint8(this.offset); break;
      case 2: value = this.view.getUint16(this.offset, false); break;
      case 4: value = this.view.getUint32(this.offset, false); break;
      default:
        value = this.view.getUint32(this.offset, false) * 4294967296 + this.view.getUint32(this.offset + 4, false);
        break;
    }
    this.offset += byteLength;
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

  private take(length: number): number {
    if (this.remaining() < length) throw new RangeError("Insufficient data");
    const start = this.offset;
    this.offset += length;
    return start;
  }

  private str(length: number, asKey: boolean): string {
    const start = this.take(length);
    return utf8Read(this.bytes, start, length, asKey);
  }

  private bin(length: number): Uint8Array {
    const start = this.take(length);
    return this.bytes.slice(start, start + length);
  }

  private ext(length: number): MsgPackValue {
    const type = this.int(1);
    const data = this.bin(length);
    return type === TIMESTAMP_TYPE ? decodeTimestamp(data) : new ExtData(type, data);
  }

  private array(length: number): MsgPackValue[] {
    const result: MsgPackValue[] = new Array(length);
    for (let i = 0; i < length; i++) result[i] = this.value();
    return result;
  }

  private map(length: number): Record<string, MsgPackValue> {
    const result: Record<string, MsgPackValue> = {};
    for (let i = 0; i < length; i++) {
      this.mapKey = true;
      const key = this.value();
      if (typeof key !== "string" && typeof key !== "number") {
        throw new Error(`The type of key must be string or number but ${typeof key}`);
      }
      if (key === "__proto__") throw new Error("The key __proto__ is not allowed");
      result[key] = this.value();
    }
    return result;
  }

  public value(): MsgPackValue {
    const asKey = this.mapKey;
    this.mapKey = false;
    const tag = this.u8();

    if (tag < 0x80) return tag;
    if (tag < 0x90) return this.map(tag & 0x0f);
    if (tag < 0xa0) return this.array(tag & 0x0f);
    if (tag < 0xc0) return this.str(tag & 0x1f, asKey);
    if (tag >= 0xe0) return tag - 0x100;

    switch (tag) {
      case 0xc0: return null;
      case 0xc2: return false;
      case 0xc3: return true;

      case 0xc4: return this.bin(this.uint(1));
      case 0xc5: return this.bin(this.uint(2));
      case 0xc6: return this.bin(this.uint(4));

      case 0xc7: return this.ext(this.uint(1));
      case 0xc8: return this.ext(this.uint(2));
      case 0xc9: return this.ext(this.uint(4));

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

      case 0xd4: return this.ext(1);
      case 0xd5: return this.ext(2);
      case 0xd6: return this.ext(4);
      case 0xd7: return this.ext(8);
      case 0xd8: return this.ext(16);

      case 0xd9: return this.str(this.uint(1), asKey);
      case 0xda: return this.str(this.uint(2), asKey);
      case 0xdb: return this.str(this.uint(4), asKey);

      case 0xdc: return this.array(this.uint(2));
      case 0xdd: return this.array(this.uint(4));

      case 0xde: return this.map(this.uint(2));
      case 0xdf: return this.map(this.uint(4));

      default:
        throw new Error(`Unrecognized type byte: 0x${tag.toString(16).padStart(2, "0")}`);
    }
  }
}

function toBytes(data: ArrayLike<number> | ArrayBuffer | ArrayBufferView): Uint8Array {
  if (data instanceof Uint8Array) return data;
  if (ArrayBuffer.isView(data)) return new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
  if (data instanceof ArrayBuffer) return new Uint8Array(data);
  return Uint8Array.from(data);
}

export function decode(data: ArrayLike<number> | ArrayBuffer | ArrayBufferView): MsgPackValue {
  const reader = new Reader(toBytes(data));
  const value = reader.value();
  if (reader.remaining() > 0) throw reader.extraBytesError();
  return value;
}
