import { randomBytes } from "node:crypto";

import {
  buildCipherTables, decode, encode, hmacSha256, MAC_LENGTH, SHUFFLED_MODE,
  type CipherTables, type MsgPackValue, type ServerPacketType,
} from "../shared";
import { serverConfig } from "../config";
import type { WebSocketLike } from "./websocket";

export type PacketListener = (type: string, args: MsgPackValue[]) => void;

let nextSocketId = 1;

function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

export class Client {
  public readonly socketId = nextSocketId++;
  public readonly tables: CipherTables;

  private readonly key: Uint8Array;
  private lastSeq = 0;

  private windowStart = Date.now();
  private windowCount = 0;

  public onPacket: PacketListener | null = null;
  public onClose: (() => void) | null = null;

  public constructor(private readonly socket: WebSocketLike) {
    const seed = randomBytes(4).readUInt32BE(0);
    this.key = new Uint8Array(randomBytes(32));
    this.tables = buildCipherTables(seed);

    socket.onmessage = (data) => this.receive(data);
    socket.onclose = () => this.onClose?.();

    this.sendRaw(["io-init", [this.socketId, seed, Buffer.from(this.key).toString("hex"), SHUFFLED_MODE]]);
  }

  public get remoteAddress(): string {
    return this.socket.remoteAddress;
  }

  public get closed(): boolean {
    return this.socket.closed;
  }

  private sendRaw(packet: MsgPackValue): void {
    if (this.socket.closed) return;
    this.socket.send(encode(packet));
  }

  public send(type: ServerPacketType | string, ...args: MsgPackValue[]): void {
    const code = this.tables.s2c.enc[type];
    if (code === undefined) return;
    this.sendRaw([code, args]);
  }

  public close(code = 1000, reason = ""): void {
    this.socket.close(code, reason);
  }

  private throttled(): boolean {
    const now = Date.now();
    if (now - this.windowStart >= 1000) {
      this.windowStart = now;
      this.windowCount = 0;
    }
    return ++this.windowCount > serverConfig.maxPacketsPerSecond;
  }

  private receive(data: Uint8Array): void {
    if (data.length <= MAC_LENGTH || data.length > serverConfig.maxPacketBytes) {
      this.close(4001, "Invalid Connection");
      return;
    }
    if (this.throttled()) {
      this.close(4001, "Invalid Connection");
      return;
    }

    const mac = data.subarray(0, MAC_LENGTH);
    const body = data.subarray(MAC_LENGTH);

    if (!timingSafeEqual(mac, hmacSha256(this.key, body).subarray(0, MAC_LENGTH))) {
      this.close(4001, "Invalid Connection");
      return;
    }

    let packet: MsgPackValue;
    try {
      packet = decode(body);
    } catch {
      this.close(4001, "Invalid Connection");
      return;
    }

    if (!Array.isArray(packet) || packet.length < 3) return;
    const [code, args, seq] = packet as [number, MsgPackValue[], number];

    if (typeof seq !== "number" || seq <= this.lastSeq) return;
    this.lastSeq = seq;

    const type = this.tables.c2s.dec[code];
    if (type === undefined) return;

    this.onPacket?.(type, Array.isArray(args) ? args : []);
  }
}
