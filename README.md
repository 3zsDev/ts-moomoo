# Building & running ts-moomoo

This is a TypeScript port of the MooMoo.io client **and** a matching game server.
Everything runs locally on your own machine — you don't need a website, a domain,
or an account.

If you've never used Node.js before, start at the top and follow along in order.

---

## 1. Install Node.js

You need **Node.js 18 or newer** (this project is developed on 24.x). Download the
LTS installer from <https://nodejs.org> and accept the defaults.

Then open a terminal — PowerShell on Windows, Terminal on macOS/Linux — and check it
worked:

```
node --version
npm --version
```

Both should print a version number. If you get "command not found", close the
terminal and open a new one so it picks up the new PATH.

## 2. Get into the project folder

Every command on this page must be run from the project's root folder (the one
containing `package.json`):

```
cd path/to/ts-moomoo
```

On Windows you can right-click the folder → *Open in Terminal*.

## 3. Install the dependencies — once

```
npm install
```

This downloads esbuild, TypeScript and nipplejs (the mobile touch joysticks, bundled
into the client) into a `node_modules/` folder. It only needs
to be done once, and only in the root — the `backend/` and `api/` folders have no
dependencies of their own.

## 4. Play

```
npm run play
```

That builds everything, starts all three services, and prints something like:

```
  play at     http://localhost:3000
  sandbox at  http://localhost:3001
  api at      http://localhost:8080
```

Open <http://localhost:3000> in your browser and you're in. Press **Ctrl+C** in the
terminal to stop everything.

That's the whole happy path. The rest of this page explains the pieces.

---

## What the pieces are

| Piece | Lives in | What it is |
| --- | --- | --- |
| **Client** | `src/` | The game itself — rendering, input, UI. Compiled into one `bundle.js`. |
| **Backend** | `backend/src/` | The game server: physics, mobs, players, the websocket protocol. |
| **API** | `api/` | Server list, join tickets, accounts, names, profiles, clans, top boards and moderation. Saves to `api/data/db.json`. Also serves the built client as a normal web page. |
| **Extension** | built from `src/` | The same client, packaged as a Chrome extension that replaces the real moomoo.io page. |

`npm run play` starts a game server, a sandbox server, and the API together, which is
why one command is enough to play.

### Where builds go

- `dist/game/` — the standalone web build (`index.html`, `bundle.js`, plus everything from `public/`)
- `dist/extension/` — the unpacked Chrome extension
- `backend/dist/server.mjs` — the bundled game server

These folders are generated. Deleting them is always safe; the next build recreates them.

---

## Building

Run these with `npm run <name>`.

| Script | What it does |
| --- | --- |
| `build` | Builds **both** the standalone game and the Chrome extension, minified. |
| `build:game` | Standalone web build only → `dist/game/`. |
| `build:ext` | Chrome extension only → `dist/extension/`. Also writes `manifest.json` and `rules.json`. |
| `build:backend` | Bundles the game server → `backend/dist/server.mjs`. |
| `build:all` | `build` + `build:backend` — everything, in one go. |

You usually don't need to run these by hand: `npm run play` builds what it needs
before starting.

## Running

| Script | What it does |
| --- | --- |
| `play` | **The one you want.** Builds the game + backend, then starts the game server on `:3000`, the sandbox on `:3001`, and the API on `:8080`. |
| `sandbox` | Sandbox server only, on `:3001`. No normal server, no API. |
| `ws` | WebSocket-only mode — see *Playing through the extension* below. |
| `backend` | Runs an already-built server directly (`backend/dist/server.mjs`). No build step, no sandbox, no API. Run `npm run build:backend` first, or it will fail with "Cannot find module". |
| `api` | Starts just the API / server list on `:8080`. It also serves `dist/game/` as static files. |

## Developing

| Script | What it does |
| --- | --- |
| `watch` | Rebuilds the game bundle every time you save a source file. Dev mode: sourcemaps on, no minification, extension not built. |
| `serve` | Same as `watch`, plus a dev web server on <http://localhost:5173>. |
| `typecheck` | Runs `tsc --noEmit` over the client and the backend. Reports type errors without producing any files. |
| `diff:live` | Compares a zip from `scripts/live-dump.js` (paste it into the DevTools console on moomoo.io) against `public/`: `npm run diff:live -- live-moomoo.io-….zip`. Add `--apply` to copy new and changed assets into `public/`. |

A typical loop: run `npm run play` in one terminal to get the servers up, and
`npm run watch` in a second terminal so your client edits rebuild automatically.
Refresh the browser to pick up a change.

---

## Playing through the extension

Instead of the local web page, you can run this client on the real moomoo.io site.
The extension blocks moomoo.io's own bundle so ours loads in its place.

1. Build it:
   ```
   npm run build:ext
   ```
2. Open `chrome://extensions` in Chrome.
3. Turn on **Developer mode** (top-right toggle).
4. Click **Load unpacked** and select the `dist/extension` folder.
5. Visit <https://moomoo.io> — you're now running this client.

To point it at your own server rather than a public one, start the servers in
websocket-only mode:

```
npm run ws
```

That builds the extension and starts `ws://localhost:3000` and `ws://localhost:3001`
with no static file serving and no API.

---

## Environment variables

Set these to override defaults without editing any code. `run.mjs`, the backend, and
the API all read them.

| Variable | Default | Meaning |
| --- | --- | --- |
| `GAME_PORT` | `3000` | Port for the normal game server |
| `SANDBOX_PORT` | `3001` | Port for the sandbox server |
| `API_PORT` | `8080` | Port for the API / server list |
| `GAME_HOST` / `API_HOST` | `0.0.0.0` | Network interface to bind to |
| `GAME_NAME` | `1` | How the server identifies itself to the server list |
| `GAME_REGION` | `0` | Region label for the server list |
| `GAME_CAPACITY` | `40` | Max players |
| `GAME_SANDBOX` | `0` | `1` = run as a sandbox server |
| `GAME_WS_ONLY` | — | `1` = same as passing `--ws` |
| `GAME_PEER_URL` | — | URL of the paired server, for the in-game server switcher |
| `API_URL` | `http://localhost:8080` | Where the game server finds the API (heartbeats, tickets, stats, reports, and the account calls it passes on) |
| `PUBLIC_DIR` | `dist/game` | Folder to serve static files from |
| `GAME_API` | `1` | `0` = run the game server without the API: everyone plays as a guest. `npm run play -- --no-api` sets this |
| `GAME_ADMIN` | — | `1` = same as passing `--admin`: every player can use admin commands. Local testing only |
| `GAME_REQUIRE_TICKET` | — | `1` = refuse sockets that didn't get a `/join` ticket or pass the captcha |
| `GAME_MEMBERS_ONLY` | — | `1` = only signed-in players may join. The server list shows a shield |
| `GAME_SHUTDOWN_NOTICE` | `0` | Seconds of "Server restarting in m:ss" before a SIGTERM shuts the server down. Ctrl+C always stops right away |
| `API_DATA` | `api/data/db.json` | Where the API saves accounts, clans and stats |
| `API_ADMINS` | — | Comma-separated emails or account ids that are always admins |
| `API_JWKS_URL` | — | JWKS for checking account token signatures. Without it tokens are only decoded, which is fine locally but **must be set on a public server** |
| `TURNSTILE_SECRET` | — | Cloudflare Turnstile secret. Without it captcha tokens aren't checked |
| `INTERNAL_KEY` | — | Shared secret between the API and game servers. Without it, only calls from the same machine are trusted |
| `KICK_LOCK_SECONDS` | `300` | How long a player kicked by a mod can't rejoin ("You were removed from the game - try again in ..."). `0` turns it off |
| `VPN_CHECK_URL` | — | Optional proxy/VPN lookup for guests, e.g. `https://proxycheck.io/v2/{ip}?vpn=1`. Guests it flags are refused; signed-in players never are |
| `IP_HASH_SALT` | `INTERNAL_KEY` | Salt for the hashed IP that staff see in the mod panel |

Setting one for a single run:

```powershell
# PowerShell
$env:GAME_PORT = "4000"; npm run play
```

```bash
# macOS / Linux / Git Bash
GAME_PORT=4000 npm run play
```

## Extra flags

`run.mjs` takes a few flags the scripts don't expose. Pass them after a `--` so npm
forwards them along:

| Flag | Effect |
| --- | --- |
| `--no-build` | Skip the rebuild and start from what's already in `dist/` |
| `--no-sandbox` | Don't start the sandbox server |
| `--no-api` | Don't start the API |

```
npm run play -- --no-build --no-api
```

## Accounts, sign-in and URL flags

The live game signs players in through the locally hosted readable FRVR SDK ports
(`window.FRVR.auth` / `FRVR.social`). Each build emits and includes those modules and
the TypeScript Howler port from `public/libs`.

Ads are disabled by default. Set `enabled: true` in `src/config/ads.ts` to opt in; set
it back to `false` to disable all configured ad providers. The Google publisher ID and
provider list can be changed in the same file. The standalone local build continues to
use compatibility stubs and guest play.

### The local account API

`npm run play` starts the API too, and the pages on `:3000` / `:3001` / `:8080` switch the
account features on by themselves. The game servers pass the account calls on to the API, so
nothing else needs setting up. What works:

- **Accounts and names.** The first name a signed-in player picks becomes theirs for good, and guests can't use it.
- **Profiles.** Lifetime, day, week and month stats are saved when a signed-in player dies or leaves. Sandbox lives aren't saved. Socials are set on the profile.
- **Clans.** Create, invite, request, roles, kick, leave and disband. A tribe named after a clan is only open to that clan's members. Nobody can name a tribe `solo`.
- **Top boards.** Week, month and all-time boards for players and clans.
- **Moderation.** Reports, kick, ban, IP ban, shadow, clear, and making or removing mods. A shadowed player's chat only reaches themselves, and they drop off the public top boards. Kicks and bans reach players on every running game server.
- **Join tickets.** `/join` hands out one-use tickets, which the game server checks before it lets a socket in.

Friends themselves still run on FRVR's servers. The API only provides the names and the
friend-request limit.

To make yourself an admin, use a dev token (below) and start with
`API_ADMINS=me@example.com`. Admins get the in-game admin menu, with no `--admin` needed.

For working on the account UI there are a few opt-in switches (localhost only):

| Flag | Effect |
| --- | --- |
| `?api=local` | Turns the account calls on for a page that our servers didn't serve (for example `npm run serve` on `:5173`). They go to the page's own origin. |
| `localStorage.moo_dev_frvr_token` | A JWT used instead of an FRVR token. Its payload's `extra.verified` / `extra.identifier` make you a signed-in, verified player. Example (DevTools console): `localStorage.moo_dev_frvr_token = "x." + btoa(JSON.stringify({extra: {verified: true, identifier: "me@example.com"}})) + ".y"` |
| `?cf=1` | Use Cloudflare's always-pass test captcha before connecting (needs internet). Without it, localhost skips the captcha. |
| `?cf=interactive` | Same, with the test key that always asks for a click, to see the verify dialog. |

The chosen server lives in the URL hash (`#region:name`); the **Invite** button copies
a link to it. Rebound keys are saved in `localStorage.moo_keybinds` (Settings -> Keys).

---

## What changed from 1.9.0 to 1.9.1

### Gameplay & controls

- **Keybinds by item** (Settings → Keys). Binds are now grouped into sections:
  - By position in your bar (as before).
  - By item: primary/secondary weapon, wall, spikes, windmill, pit trap / boost pad, mine / sapling, spawn pad
    and age 7 item. Items you only ever have one of share a row and a key.
  - Menus: Shop `B`, Tribes `T`, Game Menu (always on Esc). Pressing a menu key again closes it.
  - Saved binds carry over, and a new default never takes a key you already use.
- **Typing is safe.** Keys typed into a text field no longer fire hotkeys, and focusing a field lets go of held keys.
- **Touch**
  - Double-tap a bar slot to swing the weapon or place the item.
  - Tap an owned hat or accessory in the shop to wear it.
  - Multi-finger touches use the finger that's on the button.
  - iPads are detected as touch devices.
- **New settings:** Show Grid and Camera Lock. The skin colour is remembered between visits.
- The shop is sorted by price.

### Menu & UI

- **Friends and clans on every site.** They now work on the sandbox too. Presence and invites say which site
  (main game, sandbox, dev) a friend is on, and joining them there opens that site.
- **Account preferences** (Settings): friend notifications, allow friend requests, allow clan invitations.
  Saved on the API; turning one off also hides what's on screen.
- **Clans**
  - Owners can stop (and allow again) requests to join; a closed clan says "Not taking requests to join".
  - Clearer errors for unclean clan names, closed clans and players who don't take invitations.
- **Share links.** Profiles and clans have a **Copy link** (`/player/<name>`, `/clan/<tag>`). Opening one, or
  `?profile=` / `?clan=`, shows that card when the page loads.
- **Discord linking.** `?discord=<code>` (from a Discord bot) asks to link the signed-in account.
- **Reports.** After reporting a player you can say what for: Bot, Hack, Autoheal or Abuse. Staff see the reason,
  and the mod panel shows a hashed last IP instead of the real one.
- **Clearer errors** for names (what it would show as in game, or not allowed), social handles (which one, and
  whether it's the format or the words) and blocked friend requests.
- **Server picking**
  - The server you were auto-placed on is remembered (`moo_auto_server`), so a `#hash` naming it isn't treated as
    your own choice.
  - A selected server may drop off the list for a couple of reloads (a restart, a late heartbeat) before you're moved.
  - Signed-in players move to a members server when one opens up, unless they picked their server themselves.
  - A server that's restarting moves you to another one in the region.
  - Signed-in players get two quiet retries when a connection fails before seeing an error.
- **Join errors** for guests on a VPN and for players kicked a moment ago ("try again in ...").
- **Look.** The title waves letter by letter. New sprites and `main.css` from the live 1.9.1 dump.
- **Sharp text.** When the game canvas renders below the screen's pixel ratio (native resolution off, or a screen
  above 2x), names and chat are drawn on `#textCanvas` at full resolution (up to 4x).
- **Texture pack (dev).** On localhost and dev hosts, Settings has a *Texture pack (dev)* link: replace any hat,
  accessory, weapon, animal or icon image with your own (click a tile, drop images, or import a zip), or export a
  sample zip. Kept in your browser's IndexedDB only. The list is every image in those `public/img` folders.

### Accounts & networking

- **Protocol.** The packet tables, cipher and packet masks are unchanged from 1.9.0. Only the build module changed;
  live servers are joined with the game's own module (see `src/config/protocol.ts`). Built-in fallbacks: sandbox
  `s16nx6` and production `s16nto`. The game regenerates these on every deploy, so they go stale quickly.
- **Friends.** Presence and game invites carry the site (`env`). A friend request is announced once per sender
  (`moo_friend_asks`, kept 30 days), and `/friends/allow` is told who the request is for.
- **Changed packets**
  - Client → server: `R sid 0 reason` adds a reason (1-based) to an earlier report.
  - Client → server: `T [securityFlags, untrustedEvents]`, sent on live servers 5 seconds into a game and every
    minute after. Flags: 1 userscript manager seen, 2 WebSocket patched, 4 canvas/WebGL/rAF patched, 8 paused in
    the debugger. Real values are off by default (`telemetry` in `src/security/options.ts`), so it reports `T 0 0`.
- **Input trust** (off by default, `trustedInputOnly` in `src/security/options.ts`). When on, game input ignores
  script-made key, mouse, touch and click events and counts them, like the live client.

### Backend & tooling

- **API**
  - New: `POST /account/prefs`; `/account` returns `prefs`.
  - New: `POST /clan/requests` (owner only); clans have `closed`.
  - New: `GET|POST /discord/link`. For a Discord bot: `POST /internal/discord/code` with `{ discordId, discord }`
    returns a code to send as `<site>/?discord=<code>` (valid 10 minutes), and
    `GET /internal/discord/player?id=<discordId>` looks up a linked player.
  - `/name` answers `censored` (with `shown`) or `unclean`; `/account/socials` answers `field` and `why`.
  - `/clan/create` answers `unclean`; `/clan/request` answers `closed`; `/clan/invite` answers `no invites`;
    `/friends/allow` answers 403 `closed` when the recipient takes no requests.
  - `/join` answers `locked` (with `seconds`) for 5 minutes after a mod kick (`KICK_LOCK_SECONDS`), and `vpn` for
    guests flagged by the optional `VPN_CHECK_URL`.
  - Reports store their reason; the mod record shows it and hashes the IP (`IP_HASH_SALT`).
  - `/player/<name>` and `/clan/<tag>` redirect to the game page with that card open (on the game servers too).
- **Game server**
  - Forwards report reasons to the API.
  - Shuts down with the "Server is restarting - pick another" reason, which moves players to another server.
  - Blanks guest names containing a word from the live client's own list, on top of the existing filter.
  - Passes `/account/prefs` and `/discord/link` on to the API.
- **Build.** The texture pack's list is generated from `public/img` at build time.

### Known gaps

- **Production protocol fallback.** There's no 1.9.1 production dump yet; the built-in values are only used if the
  game's own module can't be loaded.
- **Discord linking** needs a Discord bot that calls `/internal/discord/code`; none is included.
- **VPN check** only happens with `VPN_CHECK_URL` set.
- **Emerald** unlocks at 20000 weapon XP for signed-in players only. The admin weapon command can also hand it to guests until they switch weapons.
- **Clan raid kills** are always 0: the server doesn't track who killed whom yet.
- **Anti-cheat flags** in the staff panel are always 0.
- The **Crab King, Crab and Yeti** numbers on our server are inferred, not taken from live.

---

## Troubleshooting

**`'npm' is not recognized`** — Node.js isn't installed, or your terminal was open
before you installed it. Open a fresh terminal.

**`Cannot find module 'esbuild'`** — you skipped step 3. Run `npm install`.

**`Cannot find module '.../backend/dist/server.mjs'`** — the backend hasn't been
built. Run `npm run build:backend`, or just use `npm run play`, which builds it for you.

**`EADDRINUSE: address already in use`** — something is already on that port, often a
previous run that didn't shut down. Close the other terminal, or pick a different
port with `GAME_PORT` (see above).

**The page loads but is blank, or looks out of date** — the bundle is stale or the
build failed. Check the terminal for errors, rebuild with `npm run build:game`, then
hard-refresh the browser (Ctrl+Shift+R).

**Changes to `src/` don't show up** — a plain `npm run play` builds once at startup.
Either restart it, or run `npm run watch` alongside it and refresh.

**Nothing works and you want a clean slate** — delete `node_modules/`, `dist/`, and
`backend/dist/`, then `npm install` and `npm run play`.

---
this documentation was made with ai
