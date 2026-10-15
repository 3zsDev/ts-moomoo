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
dev token's `identifier`, below). Admins and mods get the staff page (below), with no `--admin` needed. A role given here
(`API_ADMINS`, or *Make mod* in the staff tools) stays put; otherwise your role follows your live account.
None of this changes anything on the real MooMoo servers.

### The staff page

Live 1.9.4 moved staff tools out of the game onto a separate staff page. Live's is private, so this repo has its own,
built from `src/staff/` into `dist/game/staff/` and served at `/staff/...` by both the API and the game servers.
A staff account's `/account` reply carries its address (`/staff/<id>.<hash>/`). The game opens it once per
session when you sign in and aren't in a game, the same as live. You can also bookmark it.

The page uses the game's sign-in, so sign in on the game page first. Tabs:

| Tab | What it does |
| --- | --- |
| **Live** | Reports and anti-cheat flags as they happen. **View** opens the player. |
| **Servers** | Every server and who's on it. Click a player to target them. Admins can restart a server in N seconds. |
| **Admin** | Run the old panel's commands on the targeted player: god, aura, boss, invisible, no collision, disguise, morph into an animal, dive, size/damage/speed/health, travel (places, bosses, go to / summon a player), spawn animals, delete a tribe, give weapons, items and resources. Mods only get **No collision**. |
| **Player** | Look someone up by name or id: reports, flags, verdict, last session (hashed IP), what they've said. Kick, ban, shadow or clear (with reason, length and IP). Admins can make or remove mods. |
| **Notices** | Admins: show a notice banner on every open page for N minutes. |

All of it goes through the API's staff routes (`/mod/servers`, `/mod/admin`, `/mod/world`, `/mod/notice`,
`/mod/restart`, plus the existing `/mod/*`). The API passes admin commands to the right game server's
`/internal/admin`. Roles are checked on the server.

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

## What changed from 1.9.3 to 1.9.4

Ported from the live 1.9.4 build (`index-45e2f6ff.js`, protocol module `s16od8` on both moomoo.io and the sandbox).
Where live removed something from the client, the port removes it too.

### Gameplay & rendering

- **Animals come from the server.** The client no longer simulates animals. It only draws them:
  - The animal types (name, sprite, scale, boss, diver, ...) arrive in the setup packet.
  - Each update carries 8 fields per animal: sid, type, x, y, direction, health, name and state.
  - The simulation moved into the game server (`backend/src/sim/animals/`).
- **New player states** in the player data:
  - **morph:** drawn as an animal type.
  - **dive:** drawn as a dark disc under the water. The new packet `m` sets it.
  - **invisible:** drawn at half opacity.
  - **disguised:** shows their clan as the tribe.
  
  Our server sends the defaults. The staff page's Admin tab can morph, dive or disguise a player.
- **Crowns.** The top three get gold, silver and bronze crowns:
  - **Name tags:** the icon comes from `iconIndex` (skull, crowns, skull crowns).
  - **Leaderboard:** a crowned badge comes from a new 7th packet argument.
  - **Our server** crowns the top three scorers in the current game. Live doesn't show how it picks them.
  - Six new icons are in `img/icons/`.
- **Stable shapes.** Trees, bushes, rocks and food items are now shaped by a seeded random generator: one seed per
  page, mixed with each object's key. Each resource's rotation is fixed per sid.
- **Graphics recover after the tab was hidden.** After at least a second hidden, or a back/forward-cache restore, the
  sprite caches are cleared and both WebGL painters `rebuild()` their atlases.
- **Action bar** squeezes into up to 3 rows of smaller slots when it doesn't fit (`#actionBar.packed`).

### Menus

- **Top boards:** a Players / Clans switch next to the week / month / all-time tabs, and crowns instead of "1." to
  "3.". The **Right now** tab is gone, and so is the API's `/top-now`.
- **Admin panel removed.** The in-game admin/mod panel and the staff Live feed are gone, as on live, where staff now use
  a separate page. A staff account whose `/account` reply has a `staffPage` (`/staff/<id>.<hash>/`) is sent there once
  per session when not in a game. This repo has its own staff page; see *The staff page*. The profile card's staff tools are unchanged.
- **Keybinds** can gain actions at runtime (`addKeyActions`, keeping saved binds). Actions can have their own
  `run()`. Live doesn't use it yet.

### Networking

- **Protocol:** both sites now serve `s16od8`, with their own salts (production `1830113564`, sandbox `369627087`).
  The built-in `mixKey` fallbacks are updated and checked against the live wasm.
- **New server packet `m`**, after `r` in the code list, so it gets a hashed slot in the pinned tables (checked
  against live).
- The other network-code changes in 1.9.4 are obfuscation only.

### Page

- Version 1.9.4, a `#topKinds` element, live's new CSS rules, and the texture-pack list with the new icons.

### Staff page (new)

Live moved staff tools to a private page. This repo now has its own; see *The staff page*. It's built from
`src/staff/` into `dist/game/staff/` and served at `/staff/...` by the API and the game servers.

### Backend & API

- **API**
  - `/account` includes `staffPage` for admins and mods.
  - New staff routes:
    - `/mod/servers`: servers and their players, with sids.
    - `/mod/admin`: run an admin command on a player. `["state"]` only reads their current powers.
    - `/mod/world`: tribes, bosses alive and animal types.
    - `/mod/notice`: show a page notice on every open page.
    - `/mod/restart`: restart a server in N seconds.
  - Roles are checked on the server: mods may only use `noclip`; notices, restarts and the world lists are admin-only.
- **Game server**
  - Sends the animal types in the setup data, the 8-field animal update, packet `m`, player data fields 13-16, and
    the leaderboard's crowns.
  - The animal simulation lives in `backend/src/sim/animals/`.
  - New admin commands: `morph <type|-1>`, `dive <0-3> <ms>` and `disguise <0|1>`.
  - New internal routes `/internal/admin` and `/internal/world` for the staff routes. Each admin command is logged.
  - Heartbeat players carry their `sid`.
- **`run.mjs`** passes the API's address to the game servers, so a custom `API_PORT` works without also setting
  `API_URL`.

### Extension

- **Version 1.4.9.**
- **Live's own files are blocked even with a service worker installed.** Live's FRVR library installs a service worker
  on moomoo.io. Once it's there it fetches the page's files itself, and those fetches got past the block rules, so
  live's bundle, CSS and images loaded alongside ours. Now:
  - `moomoo.io/assets/`, `moomoo.io/libs/` and `moomoo.io/service-worker.js` are blocked for every request type.
  - The extension removes any moomoo.io service worker and its caches when the page starts. If the worker was already
    serving that page, it reloads once.

### Fixes

- A morphed player's dive keeps live's slower surfacing until the server sends a dive packet.
- An animal type sent with `spriteMlt: 0` is drawn at normal size instead of invisible.

### Client config

- `noBan` in `src/config/privacy.ts` (default `false`). When it's on, the client deletes the `moo_did` device id
  (from storage and any cookie of that name), never sends it to `/join`, and ignores a new one. Bans and guest
  rejoins can't be tied to the browser that way. Guests lose the captcha-free rejoin after a restart, and live
  servers may ask for the captcha more often.

### Known gaps

- **Admin commands** have no in-game button any more (matching live). They're on the staff page instead.
- **Seal mode 2** (seal mixed into the packet key) on a live shard will refuse this client, because the port
  computes its seal honestly over its own bundle.
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
