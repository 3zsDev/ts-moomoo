import { createSocket, sendOnSocket } from "../security/socket";
import { hexToBytes, hmacSha256 } from "./crypto";
import { decode, encode, type MsgPackValue } from "./msgpack";
import {
  buildCipherTables, BUILD_SALT, FULL_SHUFFLED_MODE, MAC_LENGTH, mixKey, SHUFFLED_MODE,
  type CipherTables, type ClientPacketType,
} from "./protocol";


export type PacketHandlers = Record<string, (...args: any[]) => void>;

const CLOSE_REASONS: Record<number, string> = {
  4001: "Invalid Connection",
  4002: "Server closed the connection (code 4002)",
  4003: "Kicked",
  4004: "Server closed the connection (code 4004)",
};

interface CipherState {
  key: Uint8Array;
  tables: CipherTables;
  seq: number;
  received: number;
  pinned: boolean;
  c2sMask: number | null;
  s2cMask: number | null;
}

type PacketFormat = "flat" | "nested";

function bytesFromKey(value: unknown): Uint8Array | null {
  if (typeof value === "string") {
    if (value.length % 2 !== 0 || !/^[0-9a-f]*$/i.test(value)) return null;
    return hexToBytes(value);
  }
  if (value instanceof ArrayBuffer) return new Uint8Array(value);
  if (ArrayBuffer.isView(value)) {
    return new Uint8Array(value.buffer, value.byteOffset, value.byteLength).slice();
  }
  if (
    Array.isArray(value) &&
    value.every((byte) => typeof byte === "number" && Number.isInteger(byte) && byte >= 0 && byte <= 255)
  ) {
    return Uint8Array.from(value as number[]);
  }
  return null;
}

function readUint32LE(bytes: Uint8Array, offset: number): number {
  return (
    bytes[offset] |
    (bytes[offset + 1] << 8) |
    (bytes[offset + 2] << 16) |
    (bytes[offset + 3] << 24)
  ) >>> 0;
}

function derivePacketMasks(key: Uint8Array): { c2s: number; s2c: number } {
  return {
    c2s: (readUint32LE(key, 0) ^ 3266489909) >>> 0,
    s2c: (readUint32LE(key, 4) ^ 668265263) >>> 0,
  };
}

function xorPacket(data: Uint8Array, seed: number): void {
  let state = seed >>> 0;
  if (state === 0) state = 1831565813;

  for (let offset = 0; offset < data.length; offset += 4) {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;

    data[offset] ^= state & 0xff;
    if (offset + 1 < data.length) data[offset + 1] ^= (state >>> 8) & 0xff;
    if (offset + 2 < data.length) data[offset + 2] ^= (state >>> 16) & 0xff;
    if (offset + 3 < data.length) data[offset + 3] ^= state >>> 24;
  }
}

export class Connection {
  private socket: WebSocket | null = null;
  private cipher: CipherState | null = null;
  private packetFormat: PacketFormat = "nested";

  public connected = false;

  public socketId: number | string = -1;

  public connect(url: string, onReady: (error?: string) => void, handlers: PacketHandlers): void {
    if (this.socket) return;

    let sock: WebSocket;
    try {
      sock = createSocket(url);
      sock.binaryType = "arraybuffer";
    } catch (error) {
      console.warn("Socket connection error:", error);
      onReady(String(error));
      return;
    }
    this.socket = sock;

    // a socket that has since been replaced must not touch the current session
    const stale = () => this.socket !== sock;
    let receivedIoInit = false;
    this.packetFormat = "nested";

    let errored = false;
    let readyFired = false;

    sock.onopen = () => {
      if (stale()) return;
      this.connected = true;
    };

    sock.onmessage = (event: MessageEvent<ArrayBuffer>) => {
      if (stale()) return;
      let bytes = new Uint8Array(event.data);
      if (this.cipher?.pinned && this.cipher.s2cMask !== null) {
        const sequence = ++this.cipher.received;
        const seed = (
          this.cipher.s2cMask ^ Math.imul(sequence, 2654435761)
        ) >>> 0;
        xorPacket(bytes, seed);
      }

      const decoded = decode(bytes);
      if (!Array.isArray(decoded) || decoded.length === 0) {
        console.error("[socket] received a malformed packet");
        sock.close(4001, "Invalid Connection");
        return;
      }

      let type = decoded[0];
      let args: MsgPackValue[];

      if (type === "io-init") {
        receivedIoInit = true;
        const nested = decoded.length === 2 && Array.isArray(decoded[1]);
        this.packetFormat = nested ? "nested" : "flat";
        args = nested ? decoded[1] as MsgPackValue[] : decoded.slice(1);

        const [socketId, seed, key, mode, pinned] = args;
        let keyBytes = bytesFromKey(key);
        const isPinned = pinned === 1 || pinned === true;
        if (
          (typeof socketId !== "number" && typeof socketId !== "string") ||
          typeof seed !== "number" ||
          !keyBytes?.length ||
          (isPinned && keyBytes.length < 8) ||
          typeof mode !== "number"
        ) {
          console.error("[socket] received malformed io-init data", {
            argumentCount: args.length,
            socketIdType: socketId === null ? "null" : typeof socketId,
            seedType: seed === null ? "null" : typeof seed,
            keyType: key === null ? "null" : typeof key,
            keyByteLength: keyBytes?.length ?? null,
            modeType: mode === null ? "null" : typeof mode,
            pinnedType: pinned === null ? "null" : typeof pinned,
          });
          sock.close(4001, "Invalid Connection");
          return;
        }
        this.socketId = socketId;
        if (mode === SHUFFLED_MODE || mode === FULL_SHUFFLED_MODE) {
          let tables: CipherTables;

          if (isPinned) {
            keyBytes = mixKey(keyBytes, seed >>> 0);
            tables = buildCipherTables(seed >>> 0, BUILD_SALT);
          } else {
            tables = buildCipherTables(seed >>> 0, null, mode === FULL_SHUFFLED_MODE);
          }

          const masks = isPinned ? derivePacketMasks(keyBytes) : null;
          this.cipher = {
            key: keyBytes,
            tables,
            seq: 0,
            received: 0,
            pinned: masks !== null,
            c2sMask: masks?.c2s ?? null,
            s2cMask: masks?.s2c ?? null,
          };
        } else {
          this.cipher = null;
        }

        if (!readyFired) {
          readyFired = true;
          onReady();
        }
        return;
      }

      if (this.packetFormat === "nested") {
        if (decoded.length < 2 || !Array.isArray(decoded[1])) {
          console.error("[socket] received malformed nested packet", { packetLength: decoded.length });
          sock.close(4001, "Invalid Connection");
          return;
        }
        args = decoded[1];
      } else {
        args = decoded.slice(1);
      }

      if (this.cipher && typeof type === "number") {
        const decoded = this.cipher.tables.s2c.dec[type];
        if (decoded === undefined) return;
        type = decoded;
      }

      if (typeof type !== "string" && typeof type !== "number") {
        console.error("[socket] received a packet with an invalid type");
        return;
      }
      handlers[String(type)]?.(...args);
    };

    sock.onclose = (event: CloseEvent) => {
      if (stale()) return;
      this.connected = false;
      this.cipher = null;
      console.warn("[socket] closed", {
        host: new URL(url).host,
        code: event.code,
        reason: event.reason,
        wasClean: event.wasClean,
        receivedIoInit,
      });
      const reason = CLOSE_REASONS[event.code];
      if (reason) onReady(reason);
      else if (!errored) onReady("disconnected");
    };

    sock.onerror = () => {
      if (stale()) return;
      if (sock.readyState !== WebSocket.OPEN) {
        errored = true;
        console.error("Socket error");
        onReady("Socket error");
      }
    };
  }

  public send(type: ClientPacketType | string, ...args: MsgPackValue[]): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return;

    if (!this.cipher) {
      const packet = this.packetFormat === "nested" ? [type, args] : [type, ...args];
      sendOnSocket(this.socket, encode(packet));
      return;
    }

    const code = this.cipher.tables.c2s.enc[type];
    if (code === undefined) return;

    const body = encode([code, args, ++this.cipher.seq]);
    const mac = hmacSha256(this.cipher.key, body).subarray(0, MAC_LENGTH);

    const frame = new Uint8Array(MAC_LENGTH + body.length);
    frame.set(mac, 0);
    frame.set(body, MAC_LENGTH);
    if (this.cipher.pinned && this.cipher.c2sMask !== null) {
      const seed = (this.cipher.c2sMask ^ readUint32LE(mac, 0)) >>> 0;
      xorPacket(frame.subarray(MAC_LENGTH), seed);
    }
    sendOnSocket(this.socket, frame);
  }

  public isPinned(): boolean {
    return Boolean(this.cipher?.pinned);
  }

  public isReady(): boolean {
    return !!this.socket && this.connected && this.socket.readyState === WebSocket.OPEN;
  }

  public close(): void {
    this.socket?.close();
    this.socket = null;
    this.connected = false;
    this.cipher = null;
    this.packetFormat = "nested";
    this.socketId = -1;
  }
}

export const connection = new Connection();
