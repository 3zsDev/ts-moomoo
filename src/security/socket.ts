import { nativeSocketSend, nativeWebSocket } from "./natives";
import { protection } from "./options";

export function createSocket(url: string): WebSocket {
  const Constructor = protection.bypassPatchedSend ? nativeWebSocket : WebSocket;
  return new Constructor(url);
}

export function sendOnSocket(socket: WebSocket, data: Uint8Array): void {
  const payload = data as unknown as ArrayBufferView & BufferSource;

  if (protection.bypassPatchedSend && nativeSocketSend) {
    nativeSocketSend.call(socket, payload);
    return;
  }
  socket.send(payload);
}
