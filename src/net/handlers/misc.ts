import { textManager } from "../../game/world";
import { addPing } from "../../render/minimap";
import { state } from "../../game/state";
import { showChatBubble } from "../../ui/hud/chat";
import { setPingDisplay } from "../../ui/hud/ping";

export function receiveChat(sid: number, message: string): void {
  showChatBubble(sid, message);
}

export function updateMinimap(positions: number[]): void {
  state.minimapPositions = positions;
}

export function showText(x: number, y: number, value: number): void {
  textManager.showText(x, y, 50, 0.18, 500, String(Math.abs(value)), value >= 0 ? "#fff" : "#8ecc51");
}

export function pingMap(x: number, y: number): void {
  addPing(x, y);
}

let pingSentAt = -1;

export function markPingSent(): void {
  pingSentAt = Date.now();
}

export function pingSocketResponse(): void {
  if (pingSentAt < 0) return;
  setPingDisplay(Date.now() - pingSentAt);
}
