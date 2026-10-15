import { apiBase, restApiEnabled, socialEnabled } from "../../environment";
import { serverBrowser } from "../../game/session";
import { auth, friends } from "../../net/api";
import { onClanOnlineEvent } from "../cards/clan";
import { onFriendEvent, onInviteEvent, pollFriendPresence, serverLabel } from "../friends/friendList";
import { pushNote } from "../friends/notices";
import { isAlive } from "../netBridge";
import { bindMessages, onChatEvent } from "./messages";
import { pageStream, setLiveBundle, showPageNotice } from "./pageStream";

export { refreshUpdateNotice } from "./pageStream";
export { closeWhisperCard, isWhisperCardOpen, openWhisper, unreadClanCount, unreadWhisperCount } from "./messages";

function onCountEvent(event: { server?: unknown; n?: unknown } | null): void {
  if (event && typeof event.server === "string" && typeof event.n === "number" && Number.isFinite(event.n)) {
    serverBrowser.setCount(event.server, event.n);
  }
}

function onGameEvent(event: { kind?: string; server?: string; by?: string; clan?: string } | null): void {
  if (!event?.server) return;
  const selected = serverBrowser.selected();
  if (isAlive() && selected && selected.key === event.server) return;

  const key = serverBrowser.keyOf(event.server);
  const where = key ? serverLabel(key) : "another server";
  const text =
    event.kind === "boss" ? `The Crab King has fallen on ${where}${event.by ? ` to ${event.by}` : ""}`
    : event.kind === "clan_top" && event.clan ? `[${event.clan}] has taken the top on ${where}`
    : "";
  if (text) pushNote({ text, server: null });
}

export function bindSocial(): void {
  bindMessages();
  if (!socialEnabled() || !restApiEnabled()) return;

  pageStream.start({
    apiHost: apiBase(),
    token: () => (auth.isVerified() ? auth.freshAccessToken() : null),
    onBundle: setLiveBundle,
    onNotice: showPageNotice,
    onHello: () => pollFriendPresence(friends.state(), true),
    on: {
      friend: onFriendEvent,
      "clan-on": onClanOnlineEvent,
      chat: onChatEvent,
      invite: onInviteEvent,
      count: onCountEvent,
      event: onGameEvent,
      feed: () => {},
    },
  });
  auth.onAuthChange(() => pageStream.restart());
}
