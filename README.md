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

The local server browser also lists live MooMoo shards. Selecting one connects
through the local backend and uses the regular live-server sign-in or captcha
requirements; the local simulation remains available in the same list.

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
| `GAME_MAX_PER_IP` | `4` | Open sockets allowed per address (localhost is exempt) |
| `GAME_JOINS_PER_MINUTE` | `12` | New sockets allowed per address per minute (localhost is exempt) |
| `API_DATA` | `api/data/db.json` | Where the API saves accounts, clans and stats |
| `API_ADMINS` | — | Comma-separated emails or account ids that are always admins |
| `API_MIRROR` | `https://api-prod2.moomoo.io` | The real MooMoo API that signed-in accounts are mirrored from (name, role, clan, prefs, stats), and that profiles, clans and friend names not found locally are looked up on. `off` turns it off |
| `API_JWKS_URL` | — | JWKS for checking account token signatures. Without it tokens are only decoded, which is fine locally but **must be set on a public server** |
| `TURNSTILE_SECRET` | — | Cloudflare Turnstile secret. Without it captcha tokens aren't checked |
| `API_BUNDLE` | — | Name of the client bundle that's live (e.g. `index-5a0cba0c`). Open pages whose own hashed bundle differs show the update notice. Our `bundle.js` isn't hashed, so leave it unset locally |
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

## Rendering

The game canvas is drawn by one of two renderers, picked in `src/config/render.ts`:

| `renderer` | What it is |
| --- | --- |
| `"webgl"` (default) | `src/render/webgl/`: a port of the live client's WebGL renderer. Sprites, shapes and text are packed into texture atlas pages and drawn in batches. Falls back to the canvas if the browser has WebGL turned off (see `disableFallback`). |
| `"canvas"` | `src/render/canvas/`: the browser's 2D canvas. |

Both implement the `Painter` interface in `src/render/painter.ts`, which is what the game's drawing code
(`src/render/layers/`, `src/render/draw/`) calls, so the two always draw the same thing. The minimap and the
offscreen sprite builders (`src/render/sprites/`) use plain 2D canvases with either renderer, as the live game does.
With WebGL turned off, the live game stops with "MooMoo needs WebGL, which this browser has turned off."
By default we show an alert saying so and carry on with the canvas; set `disableFallback: true` in the same file
to get the live game's error instead.

Changing the renderer needs a page reload. On localhost, `?renderer=canvas` or `?renderer=webgl` overrides the
config for a quick comparison, and `window.__painter` is the active renderer (`__painter.atlasInfo()` on WebGL).

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

- **Your MooMoo account.** Signing in with your FRVR account brings your real MooMoo account with it: the API shows
  your token to the live API and copies back your name, role, clan and prefs, and your profile shows your live stats,
  socials and look. It's refreshed every minute or so while you play (stats every 5 minutes). Players and clans that
  only exist on live open from the live API too, and so do friends' names. A token live turns down (a dev token, say)
  just gets a local-only account. `API_MIRROR=off` turns all of this off.
- **Same clan, friends and settings.** For a real MooMoo account, everything you do with your clan (create, invite,
  ask to join, answer, ranks, kick, leave, disband, open/close), friend requests, and your prefs, socials and look
  go to the live API with your own token, so they change your real account, the same as on moomoo.io. A dev token's
  account uses local clans instead. Stats are the exception: games on your own server are never sent to live.
- **Top boards** (week, month, all-time, and the top player on the menu) are the live game's. The local boards only
  show when live can't be reached or `API_MIRROR=off`.
- **Accounts and names.** Without the mirror, the first name a signed-in player picks becomes theirs for good, and
  guests can't use it.
- **Profiles.** Lifetime, day, week and month stats are saved when a signed-in player dies or leaves. Sandbox lives aren't saved. Socials are set on the profile.
- **Clans.** Create, invite, request, roles, kick, leave and disband. A tribe named after a clan is only open to that clan's members. Nobody can name a tribe `solo`.
- **Top boards.** Week, month and all-time boards for players and clans.
- **Moderation.** Reports, kick, ban, IP ban, shadow, clear, and making or removing mods. A shadowed player's chat only reaches themselves, and they drop off the public top boards. Kicks and bans reach players on every running game server.
- **Join tickets.** `/join` hands out one-use tickets, which the game server checks before it lets a socket in.

Friends themselves still run on FRVR's servers. The API only provides the names and the
friend-request limit.

To make yourself an admin on your own server, start it with `API_ADMINS=you@example.com` (your FRVR email, or a
dev token's `identifier`, below). Admins get the in-game admin menu, with no `--admin` needed. A role given here
(`API_ADMINS`, or *Make mod* in the staff tools) stays put; otherwise your role follows your live account.
None of this changes anything on the real MooMoo servers.

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

## What changed from 1.9.2 to 1.9.3

Ported from the live 1.9.3 build (`index-5a0cba0c.js`, protocol modules `s16o49` on moomoo.io and `s16o48` on the
sandbox). Live images were only re-encoded, so `public/img` is unchanged.

### Gameplay

- **Yeti rebalanced:** 27.5 damage (was 25), 4160 health (was 3200), 3600 kill score (was 4500), drops 640 food
  (was 800), and comes back 5 minutes after it dies (`spawnDelay`). The local 60s Yeti respawn override is gone.
- Non-boss divers fade in faster when they surface (550ms, from 35%); bosses are unchanged.
- The Falls pool check uses the full pool radius (was 90%).
- **Touch:** a joystick can no longer get stuck held. It's let go when the window loses focus, the tab is hidden,
  or no finger is left in its zone. Errors in a joystick handler no longer break the controls.
- Pressing **/** in game opens chat with `/` typed.

### Messages, friends and clans

- **Live page stream.** The page keeps a connection to the API (`/page/stream`, signed in with a short-lived
  `/page/ticket`). It carries friend and clan presence, messages, invites, live player counts for the server list,
  "Crab King has fallen" / "clan took the top" notes from other servers, page notices and update notices.
- **Whispers.** Friends have a **Message** button that opens a whisper card with the conversation so far. In game:
  `/w <friend> <message>`, `/r <message>` to answer the last whisper, `/c <message>` for clan chat. Chat allows 240
  characters for a `/` command (30 otherwise).
- **Clan chat** in the clan card, plus an **In a game now** list of clanmates with Join and Invite.
- **In-game message toasts** (top of the screen, with a reply button). They can be turned off separately for friends
  and for the clan (Settings → Social → *Show Friend/Clan Messages In Game*). Unread messages light up the Friends and
  Clan dots.
- **Friends** show "in a game" from our own servers as well as FRVR presence. In a game, **Invite** goes through the
  API (once per 30s per friend), and incoming invites can be joined from the banner.
- **Clan card** for officers and owners has **Clan / Members / Manage** tabs. Manage lists join requests (or says
  nobody's asking), invites still waiting (with **Cancel**), and the invite box. Past members are no longer listed.
  Inviting someone twice, or someone who already asked to join, says so.
- **Profiles** show "In game now on <server>" with a **Join** button.
- **Top boards** gain a **Right now** tab (live scores in games now, from `/top-now`), refresh while you watch, and
  cache for 4 seconds instead of a minute.

### Page & updates

- **Update notice.** When a newer build is live, a bar offers a reload. It never interrupts a game, and a hidden tab
  reloads by itself (at most once every 5 minutes). Our own build is `bundle.js`, which has no version hash, so this
  stays off unless the API is told a bundle name (`API_BUNDLE`, or `POST /internal/bundle`).
- **Page notices** (`POST /internal/notice {text, minutes}`) show a banner on every open page.
- **"Game updated"** from a server (new packet `r`): a reload countdown, or "it reloads after this life".
  "Game updated - please reload" now reloads automatically when allowed.
- **Restarts.** A restart more than a minute away shows "Server restarting in N minutes" for 15 seconds instead
  of a running countdown. Servers that are restarting carry `restartAt` and drop out of the server list unless
  nothing else is left. A guest who loses a game to a restart can rejoin without the captcha for 5 minutes.
- **Join errors:** `captcha` (a new captcha is shown), `hosting` (server networks can't join as a guest) and
  `banned` (with the date it ends).
- Server list version `1.31`.

### Staff

- Moderators get the admin button too, with a smaller panel: **No collision** and a **Live** feed. Admins keep the
  full panel, which now also ends with the Live feed.
- **Live feed:** reports (with reason and number of reporters) and anti-cheat flags as they happen, with **View**
  (profile, or a guest record) and **Go** (join their server).
- **Messages** in the staff panel: what a player has said in games, clan chat and whispers (`/mod/messages`),
  marking shadowed lines.

### Networking & security

- **Protocol fallbacks:** moomoo.io and the sandbox now serve different builds (`s16o49` and `s16o48`), each with
  its own salt and `mixKey`. The built-in values are updated for both and checked against the live wasm.
- **Cipher tables:** pinned tables shuffle only the first 39 server codes (22 client codes). Newer codes (`q`, `r`)
  get hashed slots after them.
- **Telemetry** (`T`) is no longer sent on a timer. The server sends a challenge `q [seed, probes]`, and the client
  answers `T [flags, untrustedEvents, probeMask, seal, seed]`. Probes only run when `protection.telemetry` is on
  (`src/security/options.ts`); otherwise the mask is null.
- **Seal.** Live now proves which client bundle is running: a SHA-256 of its own bundle, mixed with the
  `moomoo-seal` name from the import map. Depending on the server it's reported in `T`, or mixed into the packet
  key. This port computes the seal honestly over its own bundle and does not imitate the official one. Live
  shards that only report the seal still accept it; any that mix it into the key will refuse this client.
- The connect URL carries `&u=<bundle>` next to `b=`.

### Backend & API

- **Game server**
  - The heartbeat sends who's playing (`players: [{account, name, score, anon, shadow}]`) and `restartAt`.
    When a shutdown starts it beats right away and keeps beating through the countdown.
  - Reports each chat line, Crab King kills and clan-top changes to the API.
  - Proxies the new API routes, and streams `/page/stream` through.
- **API**
  - New:
    - `/page/ticket`, `/page/stream`, `/page/friends`
    - `/invite`
    - `/chat/clan`, `/chat/whisper`, `/chat/history`
    - `/clan/online`, `/clan/uninvite`
    - `/mod/messages`, `/top-now`
    - `/internal/chat`, `/internal/event`, `/internal/flags`, `/internal/notice`, `/internal/bundle`
  - Account prefs gain `clanChat` and `whispers`.
  - Mod verdicts can expire (`until`).
  - Chat, presence and invites are local only: they aren't relayed to live, even for a mirrored account.
    Clans and prefs still go to live as before.

### Parity fixes (full audit against live 1.9.3)

The whole live 1.9.3 client (game code, network prelude, page, CSS, texture pack, assets) was compared with the port
function by function. Everything below was found missing or different and now matches live.

- **Gameplay & sim**
  - Projectiles that destroy a structure lower its owner's item count.
  - A projectile layer of 0 falls back to the type's layer (turret shots).
  - Sandbox still needs the ammo resources to shoot (it just doesn't take them).
  - `randFloat` keeps live's `+1` range, which also sets natural sprite rotation.
  - The wiggle packet `L` rounds its direction to 1 decimal.
  - Config `animalCount` is 8.
  - The name filter has bad-words v3's `qweir`.
- **Input**
  - Any mouse button attacks.
  - Held keys are forgotten when a game starts, and when the game menu or admin panel is toggled.
  - Selecting an item sends nil, not `false`, for the weapon flag.
  - Projectiles are ignored while the window is unfocused.
  - Touching any hooked button switches to touch mode.
  - Mobile detection includes live's UA-prefix test.
- **Joining**
  - The follow bonus applies straight away, and your own player only starts with resources when you have it.
  - A captcha token is used once per connect attempt.
  - The full-server check also runs on retries.
  - The menu shows the real "no servers" reason.
  - The leave-page prompt and `levelStart` fire when joining, not on spawn.
- **Rendering**
  - Name tags are one label with a shared outline.
  - Damage numbers, the boss name and chat-bubble measuring use the high-DPI text layer.
  - Only trees get round outline joins.
  - Animal sprites warm up while idle, and the crown and skull icons load with the menu.
  - Leaving a game keeps the last world on the menu without the river.
- **Menus & cards**
  - Ping/FPS/CPS show from the join request on.
  - The OneTrust button hides while playing.
  - Ads refresh on death.
  - Escape follows the in-game flag.
  - The Friends tab shows without a claimed name.
  - The sign-in button always shows to signed-out players.
  - Profile live stats unsubscribe (`V -1`) and reset on leave; a dropped connection leaves an open profile up.
  - Clan network errors say so.
  - Deep links work if the page already loaded.
  - The anonymous-mode packet (`I`) needs a pinned connection.
- **Trusted input**: hover handlers, the account card, and the profile and clan cards go through `trusted()`. With
  `trustedInputOnly` on, calls without a real event are dropped, as live does.
- **Network**
  - Live's socket close messages are used (4003 is "Sign in to play on this server").
  - msgpack matches the library live bundles: int64, any ArrayBuffer view as bin, the timestamp ext, ext formats, and errors for trailing bytes and bad map keys.
- **Page**
  - The FRVR bootstrap: cookiepro consent key per host, `init("prod")`, the tracker channel per host, and adsbygoogle provider config. The port's ads switch stays off.
  - `manifest.json` and `docs/versions.txt` added.
  - The robots and og:image tags and the protocol import map follow prod or sandbox.
  - Dead `.min.js` and `assets/` tags removed.
  - The texture-pack list matches live's 194 entries.
- **Globals**: `showPreAd`, `requestAnimFrame`, `openLink`, `aJoinReq`, `kickFromClan`, `sendJoin`,
  `leaveAlliance`, `createAlliance`, `storeBuy`, `storeEquip`, `showItemInfo`, `Math.lerpAngle`, live's `roundRect` and
  `loadedScript`.
- **Dev tools**
  - On localhost, `?atlas=<pageSize>x<maxPages>` sets the WebGL atlas size.
  - `__painter.pageOf()` and `__painter.dumpAtlas()` added.
- **Sound manager** (`src/audio/sounds.ts`): live's Howler wrapper. Live never plays anything, but it stops `menu` on join.

Deliberately left different:
- Live bugs: menu-background bushes that never draw, and controls staying live after death.
- Self-hosting: share links use your own host, and other query flags survive the server hash.
- Emoji are drawn whole, not split into halves.
- Emerald stays members-only.
- The nipplejs 1.0.4 adapter stays.

### Known gaps

- **Seal mode 2** (seal mixed into the packet key) on a live shard will refuse this client; see *Seal* above.
- **Emerald** unlocks at 30000 weapon XP for signed-in players only. The admin weapon command can also hand it to guests until they switch weapons.
- **Bot-swarm protection** on live is server-side and not visible in the client; ours is the per-address limits.

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
