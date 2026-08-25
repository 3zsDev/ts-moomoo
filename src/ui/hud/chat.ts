import { config } from "../../config";
import { findPlayerBySid } from "../../game/lookups";
import { connection } from "../../net/Connection";
import { ClientPacket } from "../../net/protocol";
import { closeAlliance } from "../alliance";
import { ui } from "../elements";
import { closeStore } from "../store";

export function isChatOpen(): boolean {
  return ui.chatHolder.style.display === "block";
}

export function toggleChat(): void {
  if (isChatOpen()) {
    if (ui.chatBox.value) sendChat(ui.chatBox.value);
    closeChat();
    return;
  }

  closeStore();
  closeAlliance();
  ui.chatHolder.style.display = "block";
  ui.chatBox.value = "";
  ui.chatBox.focus();
}

export function closeChat(): void {
  ui.chatBox.value = "";
  ui.chatHolder.style.display = "none";
}

export function sendChat(message: string): void {
  connection.send(ClientPacket.SendChat, message.slice(0, 30));
}

export function showChatBubble(sid: number, message: string): void {
  const player = findPlayerBySid(sid);
  if (!player) return;
  player.chatMessage = message;
  player.chatCountdown = config.chatCountdown;
}
