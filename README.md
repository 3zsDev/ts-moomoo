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

## What changed from 1.8.2 to 1.9.0

### Gameplay

- **New hats**
  - Scout Hat (#59): 3500 gold, 1.08x speed, takes 1.12x damage.
  - Frost Helm (#60): 7000 gold, no snow slowdown, 0.94x speed, takes 0.88x damage.
  - Crab Shell (#61): can't be bought; dropped by the Crab King. Reflects 30% of damage, takes 0.85x damage, 0.92x speed.
- **Accessory effects** (`src/config/effects.ts`). Capes and tails that used to be cosmetic now do something:
  - Snowball / Winter Cape: less or no snow slowdown.
  - Tree / Stone / Cookie Cape: +1 resource per hit.
  - Cow Cape: 1.5x from cows.
  - Skull Cape: 3x gold for killing the kill leader.
  - Dash Cape: 1.05x speed.
  - Dragon Cape: 1.05x damage for 5s after hitting a player.
  - Super Cape: buff after a kill.
  - Troll Cape: 2x gold for spike kills.
  - Thorns: heal on hit.
  - Blockades: 0.75x projectile damage.
  - Devils Tail: bleed.
- **Emerald weapon variant** (id 4, `_e` sprites). 1.18x damage, 15% lifesteal, members only; XP alone never unlocks it.
- **New animals**
  - Boar (9) and Yeti (10).
  - Sheep (12).
  - Crab King boss (11), Crab (13) and Crabling (14).
  - Animals now have dive/surface states. They can't be hit or deal damage while under water.
- **The Falls.** A new area west of the map: gorge, pools and waterfall.
  - Water slows you down.
  - You can't build there.
  - It hides you and your teammates from the minimap.
  - The Crab King lives there, with attack telegraphs: splash, ring, dive, slam and dash.
- **Combat and controls**
  - Swing speed is synced with the gather animation.
  - New on-screen auto-attack button.
  - Lock rotation is reported to the server.
  - The alive player with the most kills gets a skull icon.

### Menu & UI

- **Main menu.** Rebuilt into views: Play, How to, Settings, Friends, Clan, Top.
  - Skin colour picker popover.
  - Reserved and permanent names.
  - New region/server dropdowns: fill colour, "Full" tag, shield on members-only servers.
  - The Invite button copies a `#region:name` link.
- **New cards**
  - Sign-in by email code or password.
  - Player profiles with stats, periods, playtime and socials.
  - Clans: create, invite, request, roles, kick, leave, disband.
  - Friends: requests, presence, game invites.
  - Generic confirm card.
- **Top leaderboard.** Week/month/all-time boards for players and clans, plus a rotating "of the week" spotlight under the menu.
- **Captcha.** The Cloudflare Turnstile check now runs in a modal, with retry and blocked states. Signed-in players skip it.
- **In-game menu.** Opened with the Menu button or Esc; tabs for Settings, Friends, Clan and Report.
  - Admins also get an admin menu: powers, size/damage/speed/health, spawn, teleport, give items.
- **In-game leaderboard**
  - Role and friend badges.
  - Crab King killer badge.
  - Skull for dead players.
  - Clickable `[tribe:CLAN]` tags.
  - Shown while the button is held.
- **Settings**
  - Ping display with colour tiers.
  - Show FPS.
  - Account preferences.
  - Native resolution on by default, capped at 2x.
- **Keybinds.** Fully rebindable (Settings → Keys); arrow keys always move.
- **Mobile.** Joysticks (nipplejs) and automatic touch/mouse detection.
- **Look.** Floating animated title; dynamic full-screen viewport instead of a letterboxed 1920×1080.
  - Material Icons are served locally.
  - `main.css` is now minified.

### Accounts & networking

- **FRVR SDK port.** Ported to TypeScript (`src/sdk-libs`) and built into `public/libs`. Ads are off by default (`src/config/ads.ts`).
- **REST layer.** New in `src/net/api/`: `/join` tickets, `/account`, `/name`, `/profile`, `/clan/*`, `/top`, friends helpers.
- **New packets**
  - Client → server: `R` report, `A` admin command, `V` request player stats.
  - Server → client: `W` boss telegraph, `F` player stats.
- **Changed packets**
  - `a` players: positions, attributes and hidden lists.
  - `I` animals: adds state, direction ×100 and a hidden list.
  - `C` sends the numeric sid.
  - `G` leaderboard: by sid, with roles, dead, crab-killer and clan/tribe tag lists.
  - `K` gather: adds swing speed.
  - Player data: adds aura, boss mode and clan.
- **Cipher.** New full shuffled mode, an optional build salt, and an optional pinned mode with XOR masks.
- **Connecting.** Join ticket (`tk:`) or captcha (`cf:`) in `?token=`, and a build id `?b=` off localhost.
  - Close codes 4001–4004.
- **Server browser.** Rewritten.
  - Per-region ping, region names, members-only servers.
  - Staff can join full servers.
  - Selection lives in the URL hash.
  - Password support removed.

### Backend & tooling

- **Game server.** Speaks the 1.9 packet formats.
  - The Crab King and crabs are run by `backend/src/sim/game/falls.ts`.
  - Admin commands live in `backend/src/sim/game/admin.ts` (`--admin` / `GAME_ADMIN=1`).
  - Live player stats are streamed once a second.
  - New spawns: sheep, boars, one yeti.
  - Account support:
    - Checks join tickets before the handshake.
    - Locks signed-in players to their account name and clan.
    - Sends leaderboard roles, dead players, and clan and tribe tags.
    - Saves stats for each life.
    - Forwards reports.
    - Applies kicks, bans and shadows from the API.
    - Staff see everyone on the minimap and can join full servers.
  - Sends `B` with a reason before turning a player away, so "server is full" shows instead of "Invalid Connection".
  - Counts down `Z` "Server restarting" on SIGTERM.
  - Lock rotation (`K 0`) no longer switches auto-gather off.
  - Item upgrades respect `allowAllUpgrades`.
  - Chat is filtered.
- **API.** Rebuilt from a bare server list into the full account API (see *The local account API* above).
- **Extension build.** Redirects live CSS, images and fonts to `public/`.
- **New assets.** Animal, hat and emerald weapon sprites, plus PWA/OG images.
- **New `npm run diff:live` script.** Plus the `nipplejs` dependency.

### Removed

- The fixed key map (`src/input/bindings.ts`), the old `<select>` server list (`src/ui/menu/serverList.ts`) and `public/css/overrides.css`.
- Party-key prompts, server passwords, the Krunker promo banner, and the old guide/setup cards.

### Known gaps

- The **Show Grid** checkbox is in the page, but nothing reads it yet.
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
