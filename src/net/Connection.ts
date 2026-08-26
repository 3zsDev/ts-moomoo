import { createSocket, sendOnSocket } from "../security/socket";
import { hexToBytes, hmacSha256 } from "./crypto";
import { decode, encode, type MsgPackValue } from "./msgpack";
import {
  buildCipherTables, MAC_LENGTH, SHUFFLED_MODE,
  type CipherTables, type ClientPacketType,
} from "./protocol";

export type PacketHandlers = Record<string, (...args: any[]) => void>;

interface CipherState {
  key: Uint8Array;
  tables: CipherTables;

  seq: number;
}

export class Connection {
  private socket: WebSocket | null = null;
  private cipher: CipherState | null = null;

  public connected = false;

  public socketId = -1;

  public connect(url: string, onReady: (error?: string) => void, handlers: PacketHandlers): void {
    if (this.socket) return;

    try {
      this.socket = createSocket(url);
      this.socket.binaryType = "arraybuffer";
    } catch (error) {
      console.warn("Socket connection error:", error);
      onReady(String(error));
      return;
    }

    let errored = false;
    let readyFired = false;

    this.socket.onopen = () => {
      this.connected = true;
    };

    this.socket.onmessage = (event: MessageEvent<ArrayBuffer>) => {
      const packet = decode(new Uint8Array(event.data)) as [string | number, MsgPackValue[]];
      let [type, args] = packet;

      if (type === "io-init") {
        const [socketId, seed, key, mode] = args as [number, number, string, number];
        this.socketId = socketId;
        this.cipher = mode === SHUFFLED_MODE
          ? { key: hexToBytes(key), tables: buildCipherTables(seed), seq: 0 }
          : null;

        if (!readyFired) {
          readyFired = true;
          onReady();
        }
        return;
      }

      if (this.cipher && typeof type === "number") {
        const decoded = this.cipher.tables.s2c.dec[type];
        if (decoded === undefined) return;
        type = decoded;
      }

      handlers[type as string]?.(...(args ?? []));
    };

    this.socket.onclose = (event: CloseEvent) => {
      this.connected = false;
      this.cipher = null;
      if (event.code === 4001) onReady("Invalid Connection");
      else if (!errored) onReady("disconnected");
    };

    this.socket.onerror = () => {
      if (this.socket && this.socket.readyState !== WebSocket.OPEN) {
        errored = true;
        console.error("Socket error");
        onReady("Socket error");
      }
    };
  }

  public send(type: ClientPacketType | string, ...args: MsgPackValue[]): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return;

    if (!this.cipher) {
      sendOnSocket(this.socket, encode([type, args]));
      return;
    }

    const code = this.cipher.tables.c2s.enc[type];
    if (code === undefined) return;

    const body = encode([code, args, ++this.cipher.seq]);
    const mac = hmacSha256(this.cipher.key, body).subarray(0, MAC_LENGTH);

    const frame = new Uint8Array(MAC_LENGTH + body.length);
    frame.set(mac, 0);
    frame.set(body, MAC_LENGTH);
    sendOnSocket(this.socket, frame);
  }

  public isReady(): boolean {
    return !!this.socket && this.connected && this.socket.readyState === WebSocket.OPEN;
  }

  public close(): void {
    this.socket?.close();
    this.socket = null;
    this.connected = false;
    this.cipher = null;
    this.socketId = -1;
  }
}

export const connection = new Connection();
