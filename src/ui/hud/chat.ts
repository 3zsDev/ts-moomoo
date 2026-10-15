import { config } from "../../config";
import { findPlayerBySid } from "../../game/lookups";
import { clearHeldKeys, isUsingTouch } from "../../input";
import { connection } from "../../net/Connection";
import { ClientPacket } from "../../net/protocol";
import { closeAlliance } from "../alliance";
import { ui } from "../elements";
import { showServerNotice } from "../friends/notices";
import { closeGameMenu } from "../gameMenu";
import { runSlashCommand } from "../social/messages";
import { closeStore } from "../store";

const CHAT_LENGTH = 30;
const COMMAND_LENGTH = 240;

export function isChatOpen(): boolean {
  return ui.chatHolder.style.display === "block";
}
// acli, capitals, repeats, masked and leetspeek are all handled and filtered via serverside
// uses the badwords node package. used for names, chat and clans now
export function toggleChat(): void {
  if (isUsingTouch()) {
    setTimeout(() => {
      const message = prompt("chat message");
      if (message) sendChat(message);
    }, 1);
    return;
  }

  if (isChatOpen()) {
    if (ui.chatBox.value) sendChat(ui.chatBox.value);
    closeChat();
    return;
  }

  closeStore();
  closeAlliance();
  closeGameMenu();
  ui.chatHolder.style.display = "block";
  ui.chatBox.value = "";
  ui.chatBox.focus();
  clearHeldKeys();
}

// opens the chat box with text already in it: replies from chat toasts, and "/" in game
export function openChatWith(prefix: string): void {
  if (isUsingTouch()) {
    setTimeout(() => {
      const message = prompt("chat message", prefix);
      if (message) sendChat(message);
    }, 1);
    return;
  }

  if (!isChatOpen()) toggleChat();
  ui.chatBox.maxLength = COMMAND_LENGTH;
  ui.chatBox.value = prefix;
  ui.chatBox.focus();
  ui.chatBox.setSelectionRange(prefix.length, prefix.length);
}

ui.chatBox.addEventListener("input", () => {
  ui.chatBox.maxLength = ui.chatBox.value.startsWith("/") ? COMMAND_LENGTH : CHAT_LENGTH;
});

export function closeChat(): void {
  ui.chatBox.maxLength = CHAT_LENGTH;
  ui.chatBox.value = "";
  ui.chatHolder.style.display = "none";
}

export function sendChat(message: string): void {
  if (runSlashCommand(message)) return;
  connection.send(ClientPacket.SendChat, message.slice(0, CHAT_LENGTH));
}

export function showChatBubble(sid: number, message: string): void {
  if (sid === -1) {
    showServerNotice(message);
    return;
  }

  const player = findPlayerBySid(sid);
  if (!player) return;
  player.chatMessage = message;
  player.chatCountdown = config.chatCountdown;
}
