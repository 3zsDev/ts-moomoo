export const nativeWebSocket: typeof WebSocket = window.WebSocket;

export const nativeSocketSend: typeof WebSocket.prototype.send | undefined =
  window.WebSocket && window.WebSocket.prototype.send;
