import type { MsgPackValue } from "./types";

class Writer {
  private bytes = new Uint8Array(1024);
  private length = 0;

  private ensure(extra: number): void {
    if (this.length + extra <= this.bytes.length) return;
    let size = this.bytes.length * 2;
    while (size < this.length + extra) size *= 2;
    const grown = new Uint8Array(size);
    grown.set(this.bytes.subarray(0, this.length));
    this.bytes = grown;
  }

  public u8(value: number): void {
    this.ensure(1);
    this.bytes[this.length++] = value;
  }

  public raw(data: Uint8Array): void {
    this.ensure(data.length);
    this.bytes.set(data, this.length);
    this.length += data.length;
  }

  public big(value: number, byteLength: number): void {
    this.ensure(byteLength);
    for (let shift = byteLength - 1; shift >= 0; shift--) {
      this.bytes[this.length++] = (value / Math.pow(2, shift * 8)) & 0xff;
    }
  }

  public f64(value: number): void {
    this.ensure(8);
    new DataView(this.bytes.buffer).setFloat64(this.length, value, false);
    this.length += 8;
  }

  public finish(): Uint8Array {
    return this.bytes.slice(0, this.length);
  }
}

const textEncoder = new TextEncoder();

function writeValue(writer: Writer, value: MsgPackValue): void {
  if (value === null || value === undefined) {
    writer.u8(0xc0);
    return;
  }

  switch (typeof value) {
    case "boolean":
      writer.u8(value ? 0xc3 : 0xc2);
      return;
    case "number":
      writeNumber(writer, value);
      return;
    case "string":
      writeString(writer, value);
      return;
  }

  if (value instanceof Uint8Array) writeBinary(writer, value);
  else if (Array.isArray(value)) writeArray(writer, value);
  else writeMap(writer, value as Record<string, MsgPackValue>);
}

function writeNumber(writer: Writer, value: number): void {
  if (!Number.isInteger(value)) {
    writer.u8(0xcb);
    writer.f64(value);
    return;
  }

  if (value >= 0) {
    if (value < 0x80) writer.u8(value);
    else if (value < 0x100) { writer.u8(0xcc); writer.big(value, 1); }
    else if (value < 0x10000) { writer.u8(0xcd); writer.big(value, 2); }
    else if (value < 0x100000000) { writer.u8(0xce); writer.big(value, 4); }
    else { writer.u8(0xcf); writer.big(value, 8); }
    return;
  }

  if (value >= -0x20) writer.u8(0xe0 | (value + 0x20));
  else if (value >= -0x80) { writer.u8(0xd0); writer.big(value & 0xff, 1); }
  else if (value >= -0x8000) { writer.u8(0xd1); writer.big(value & 0xffff, 2); }
  else if (value >= -0x80000000) { writer.u8(0xd2); writer.big(value >>> 0, 4); }
  else { writer.u8(0xcb); writer.f64(value); }
}

function writeString(writer: Writer, value: string): void {
  const bytes = textEncoder.encode(value);
  const length = bytes.length;

  if (length < 0x20) writer.u8(0xa0 | length);
  else if (length < 0x100) { writer.u8(0xd9); writer.big(length, 1); }
  else if (length < 0x10000) { writer.u8(0xda); writer.big(length, 2); }
  else { writer.u8(0xdb); writer.big(length, 4); }

  writer.raw(bytes);
}

function writeBinary(writer: Writer, value: Uint8Array): void {
  const length = value.length;
  if (length < 0x100) { writer.u8(0xc4); writer.big(length, 1); }
  else if (length < 0x10000) { writer.u8(0xc5); writer.big(length, 2); }
  else { writer.u8(0xc6); writer.big(length, 4); }
  writer.raw(value);
}

function writeArray(writer: Writer, value: MsgPackValue[]): void {
  const length = value.length;
  if (length < 0x10) writer.u8(0x90 | length);
  else if (length < 0x10000) { writer.u8(0xdc); writer.big(length, 2); }
  else { writer.u8(0xdd); writer.big(length, 4); }
  for (const entry of value) writeValue(writer, entry);
}

function writeMap(writer: Writer, value: Record<string, MsgPackValue>): void {
  const keys = Object.keys(value);
  const length = keys.length;
  if (length < 0x10) writer.u8(0x80 | length);
  else if (length < 0x10000) { writer.u8(0xde); writer.big(length, 2); }
  else { writer.u8(0xdf); writer.big(length, 4); }
  for (const key of keys) {
    writeString(writer, key);
    writeValue(writer, value[key]);
  }
}

export function encode(value: MsgPackValue): Uint8Array {
  const writer = new Writer();
  writeValue(writer, value);
  return writer.finish();
}
