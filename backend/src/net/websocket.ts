import { createHash } from "node:crypto";
import type { IncomingMessage, Server as HttpServer } from "node:http";
import type { Duplex } from "node:stream";
import type { Socket } from "node:net";

const GUID = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11";

const OP_CONTINUATION = 0x0;
const OP_TEXT = 0x1;
const OP_BINARY = 0x2;
const OP_CLOSE = 0x8;
const OP_PING = 0x9;
const OP_PONG = 0xa;

const MAX_MESSAGE_BYTES = 1 << 20;

export interface WebSocketLike {
  readonly remoteAddress: string;
  readonly url: URL;
  onmessage: ((data: Uint8Array, isBinary: boolean) => void) | null;
  onclose: (() => void) | null;
  send(data: Uint8Array): void;
  close(code?: number, reason?: string): void;
  readonly closed: boolean;
}

export type ConnectionHandler = (socket: WebSocketLike) => void;

function acceptKey(key: string): string {
  return createHash("sha1").update(key + GUID).digest("base64");
}

class Connection implements WebSocketLike {
  public onmessage: ((data: Uint8Array, isBinary: boolean) => void) | null = null;
  public onclose: (() => void) | null = null;
  public closed = false;

  private buffer: Buffer<ArrayBufferLike> = Buffer.alloc(0);
  private fragments: Buffer<ArrayBufferLike>[] = [];
  private fragmentOpcode = 0;
  private fragmentBytes = 0;

  public constructor(
    private readonly socket: Duplex,
    public readonly url: URL,
    public readonly remoteAddress: string,
  ) {
    socket.on("data", (chunk: Buffer) => this.receive(chunk));
    socket.on("close", () => this.finish());
    socket.on("error", () => this.finish());
  }

  private finish(): void {
    if (this.closed) return;
    this.closed = true;
    this.onclose?.();
  }

  private receive(chunk: Buffer): void {
    this.buffer = this.buffer.length === 0 ? chunk : Buffer.concat([this.buffer, chunk]);

    while (!this.closed) {
      const frame = this.readFrame();
      if (!frame) break;
      this.handleFrame(frame.fin, frame.opcode, frame.payload);
    }
  }

  private readFrame(): { fin: boolean; opcode: number; payload: Buffer } | null {
    const buffer = this.buffer;
    if (buffer.length < 2) return null;

    const first = buffer[0];
    const second = buffer[1];
    const fin = (first & 0x80) !== 0;
    const opcode = first & 0x0f;
    const masked = (second & 0x80) !== 0;

    let length = second & 0x7f;
    let offset = 2;

    if (length === 126) {
      if (buffer.length < offset + 2) return null;
      length = buffer.readUInt16BE(offset);
      offset += 2;
    } else if (length === 127) {
      if (buffer.length < offset + 8) return null;
      const big = buffer.readBigUInt64BE(offset);
      if (big > BigInt(MAX_MESSAGE_BYTES)) {
        this.close(1009, "message too large");
        return null;
      }
      length = Number(big);
      offset += 8;
    }

    if (!masked) {
      this.close(1002, "unmasked frame");
      return null;
    }
    if (buffer.length < offset + 4 + length) return null;

    const mask = buffer.subarray(offset, offset + 4);
    offset += 4;

    const payload = Buffer.allocUnsafe(length);
    for (let i = 0; i < length; i++) payload[i] = buffer[offset + i] ^ mask[i & 3];
    offset += length;

    this.buffer = buffer.subarray(offset);
    return { fin, opcode, payload };
  }

  private handleFrame(fin: boolean, opcode: number, payload: Buffer): void {
    if (opcode === OP_CLOSE) {
      this.close(1000);
      return;
    }
    if (opcode === OP_PING) {
      this.writeFrame(OP_PONG, payload);
      return;
    }
    if (opcode === OP_PONG) return;

    if (opcode === OP_CONTINUATION) {
      if (this.fragmentOpcode === 0) return;
      this.fragmentBytes += payload.length;
      if (this.fragmentBytes > MAX_MESSAGE_BYTES) {
        this.close(1009, "message too large");
        return;
      }
      this.fragments.push(payload);
      if (!fin) return;

      const complete = Buffer.concat(this.fragments);
      const completedOpcode = this.fragmentOpcode;
      this.fragments = [];
      this.fragmentOpcode = 0;
      this.fragmentBytes = 0;
      this.deliver(completedOpcode, complete);
      return;
    }

    if (opcode !== OP_TEXT && opcode !== OP_BINARY) return;

    if (!fin) {
      this.fragmentOpcode = opcode;
      this.fragments = [payload];
      this.fragmentBytes = payload.length;
      return;
    }
    this.deliver(opcode, payload);
  }

  private deliver(opcode: number, payload: Buffer): void {
    this.onmessage?.(
      new Uint8Array(payload.buffer, payload.byteOffset, payload.byteLength),
      opcode === OP_BINARY,
    );
  }

  private writeFrame(opcode: number, payload: Buffer): void {
    if (this.closed || this.socket.destroyed) return;

    const length = payload.length;
    let header: Buffer;

    if (length < 126) {
      header = Buffer.allocUnsafe(2);
      header[1] = length;
    } else if (length < 0x10000) {
      header = Buffer.allocUnsafe(4);
      header[1] = 126;
      header.writeUInt16BE(length, 2);
    } else {
      header = Buffer.allocUnsafe(10);
      header[1] = 127;
      header.writeBigUInt64BE(BigInt(length), 2);
    }
    header[0] = 0x80 | opcode;

    this.socket.write(Buffer.concat([header, payload]));
  }

  public send(data: Uint8Array): void {
    this.writeFrame(OP_BINARY, Buffer.from(data.buffer, data.byteOffset, data.byteLength));
  }

  public close(code = 1000, reason = ""): void {
    if (this.closed) return;

    const reasonBytes = Buffer.from(reason, "utf8");
    const payload = Buffer.allocUnsafe(2 + reasonBytes.length);
    payload.writeUInt16BE(code, 0);
    reasonBytes.copy(payload, 2);
    this.writeFrame(OP_CLOSE, payload);

    this.closed = true;
    this.socket.end();
    this.onclose?.();
  }
}

export function attachWebSocketServer(server: HttpServer, onConnection: ConnectionHandler): void {
  server.on("upgrade", (request: IncomingMessage, socket: Duplex, head: Buffer) => {
    const key = request.headers["sec-websocket-key"];
    const version = request.headers["sec-websocket-version"];

    if (
      request.headers.upgrade?.toLowerCase() !== "websocket" ||
      typeof key !== "string" ||
      String(version) !== "13"
    ) {
      socket.end("HTTP/1.1 400 Bad Request\r\n\r\n");
      return;
    }

    socket.write(
      "HTTP/1.1 101 Switching Protocols\r\n" +
        "Upgrade: websocket\r\n" +
        "Connection: Upgrade\r\n" +
        `Sec-WebSocket-Accept: ${acceptKey(key)}\r\n\r\n`,
    );

    (socket as Socket).setNoDelay?.(true);

    const host = request.headers.host ?? "localhost";
    const url = new URL(request.url ?? "/", `http://${host}`);
    const connection = new Connection(socket, url, (socket as Socket).remoteAddress ?? "unknown");

    onConnection(connection);
    if (head?.length) socket.emit("data", head);
  });
}
