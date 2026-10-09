import { apiGet, auth, postWithAuth } from "../net/api";
import { queryParam } from "../environment";
import { openAccountCard } from "./account/accountCard";
import { openClanByName } from "./cards/clan";
import { confirmAction } from "./cards/confirm";
import { openProfile } from "./cards/profile";
import { ui } from "./elements";

const DISCORD_CODE = /^[a-f0-9]{24}$/;
const SIGN_IN_WAIT = 3000;

const EXPIRED = "That Discord link has run out. Use /link in Discord for a new one.";
const FAILED = "Couldn't link your Discord account. Try the link again in a moment.";

function say(text: string): void {
  ui.menuNotice.textContent = text;
}

function linkDiscord(code: string): void {
  apiGet(`/discord/link?code=${code}`, 6000)
    .then((response) => (response.ok ? (response.json() as Promise<{ discord?: string }>) : null))
    .then((pending) => {
      if (!pending) {
        say(EXPIRED);
        return;
      }

      const link = () => {
        postWithAuth("/discord/link", { code })
          .then((response) =>
            response
              .json()
              .catch(() => ({}))
              .then((data: { discord?: string; error?: string }) => {
                if (response.ok) say(`Linked to Discord as ${data.discord}. You can go back to Discord now.`);
                else if (data.error === "no name") say("Pick your player name first: press play once, then open the link from Discord again.");
                else say(data.error === "code" ? EXPIRED : FAILED);
              }),
          )
          .catch(() => say(FAILED));
      };
      const ask = () => confirmAction(`Link your MooMoo.io account to the Discord account "${pending.discord}"?`, "Link", link);

      let waited = 0;
      const timer = setInterval(() => {
        waited += 250;
        if (!auth.isVerified() && waited < SIGN_IN_WAIT) return;
        clearInterval(timer);
        if (auth.isVerified()) ask();
        else openAccountCard("Sign in or sign up to link your Discord account.", ask);
      }, 250);
    })
    .catch(() => say("Couldn't reach the game to link your Discord account. Try the link again in a moment."));
}

export function openDeepLinks(): void {
  const profile = queryParam("profile");
  const clan = queryParam("clan");
  const discord = queryParam("discord");

  window.addEventListener("load", () => {
    if (discord && DISCORD_CODE.test(discord)) linkDiscord(discord);
    if (profile) openProfile(profile);
    else if (clan) openClanByName(clan);
  });
}
