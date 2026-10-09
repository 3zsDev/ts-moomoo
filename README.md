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

## What changed from 1.9.1 to 1.9.2

Live updated 1.9.2 in place, without a version bump: a later build (`index-12d386a8.js`, protocol module `s16nz1`)
added the look editor, the new admin panel and a few rendering tweaks. Those are folded in below.

### Gameplay & controls

- **Rebalanced**
  - Crab Shell: reflects 37.5% of damage (was 30%), takes 0.8x damage (was 0.85x), 0.93x speed (was 0.92x).
  - Emerald weapons now also poison, and need 30000 weapon XP (was 20000).
- **Show CPS** (Settings): attack presses in the last second, next to ping and FPS.
- **Keys**
  - With the Game Menu bound to a key, Esc no longer opens it as well (Esc still closes things).
  - In a tribe, your keys keep working while the Tribes window is open.
  - Holding attack on a key and the mouse together: letting go of one keeps attacking until the other is released.
  - Attack packets (`F`) always carry the aim angle now, also when swinging a weapon.
- **Mobile**
  - The shop stays open while you move or attack (the Tribes window still closes).
  - **Aim Follows Movement** (Settings, touch devices only, on by default): turn it off to keep facing where you
    last aimed while walking.

### Menu & UI

- **Settings popups.** Social, Shop and Keys moved out of the Settings page into their own popup (Esc closes it).
  Social has the account preferences and a *My profile* link, and says why they're missing when signed out or on
  sandbox.
- **Customizable shop** (Settings → Shop). Drag items into your order (mouse anywhere on the row, touch by the
  grip), hide items with the eye, Show all / Hide all / Reset, and a **Combined Shop** that shows hats and
  accessories in one list. Kept in `moo_shop`. With one kind all hidden, the shop shows the other without tabs; an
  empty shop says where to change it.
- **Shop clicks.** Equip / Unequip happen on mouse down, and pressing anywhere on an owned item wears it.
- **Anonymous mode** (Settings → Social, signed-in players). Other players see `Anon#<sid>` for your name and no
  clan, on the map and the leaderboard. *Show my own name to me* (on by default) keeps your own name on your screen.
  It can be changed once every 31 seconds while playing; a note counts down.
- **Profiles**
  - Treasure chests no longer count as animals.
  - Opened in game, a profile comes from the game server (`p`), so an anonymous player's profile opens too, without
    clan invite, copy link or staff tools.
- **Edit look** (Settings → Social, or *Edit look* on your own profile; signed-in players). Pick the hat, accessory,
  weapon and variant, and skin colour you're drawn with on your profile page and share card, from what the account
  has earned, with a live preview. Saved through `/account/look`.
- **Admin panel.** Restyled, with dropdowns instead of rows of buttons, in sections (Powers, Travel, World, Give).
  Moderators can open it too, but only get *No collision*. New: *No collision* (walk through objects and players),
  give resources in amounts from 100 to 1,000,000, pick a mob to spawn; *Godlike* is gone (God + Aura does the same).
- **Your clan's tribe.** If it's gone, the Tribes window offers to create it again; naming a tribe after your own clan
  no longer asks the API.
- **Look.** New `main.css` from the live 1.9.2 dump (shop editor, settings popup, CPS; smaller clan tag on the top
  board). The live site now serves its sprites as WebP; ours stay PNG (same pictures).

### Rendering

- **WebGL renderer.** The game is now drawn the way the live client does it: a port of its WebGL renderer
  (`src/render/webgl/`) packs sprites, shapes and text into texture atlas pages and draws them in batches. It's the
  default; the 2D canvas renderer (`src/render/canvas/`) is still there, chosen with `renderer` in
  `src/config/render.ts`. Both draw through the same `Painter` interface (`src/render/painter.ts`), so the game's
  drawing code is shared. See *Rendering* above.
- **WebGL turned off.** The live game stops with "MooMoo needs WebGL, which this browser has turned off." We show an
  alert saying so and carry on with the 2D canvas; `disableFallback: true` in `src/config/render.ts` gives the live
  game's error instead.
- **Moved files.** `src/render/canvas.ts` is now `src/render/surface.ts`, `src/render/shapes/` is now
  `src/render/canvas/shapes/`, and `src/render/context.ts` became the canvas renderer.
- **Resized players** (the admin Size power) are drawn scaled on the client too, not just bigger to the server.
- WebGL circles are drawn at the current scale, so a resized player's body and hands stay sharp.
- New sprite `weapons/bow_1_d.png` (diamond hunting bow).
- On localhost, `?renderer=canvas` / `?renderer=webgl` switches renderer for a quick comparison.

### Accounts & networking

- **Packets.** The code lists grew, which changes the shuffled cipher tables:
  - Client → server `I 1|0`: anonymous mode on / off (sent on join as `M { ..., anon: 1 }` too).
  - Server → client `p sid json`: the profile behind a sid, answering `V`.
- **Protocol fallbacks.** Both sites now serve a build named `s16nz1` (was `s16nys`), each with its own salt and
  `mixKey`; the built-in values are updated for both (only used if the game's own module can't be loaded).
- **FRVR sign-in.** Our port of the FRVR SDK now matches live's auth calls. Password login, sign-up, email codes and
  token refresh all failed before (wrong success codes, missing `loginToFRVR`, refreshing on every token read). This
  also works on a local server: sign in with your FRVR account and the local API takes the token.
- Server list version `1.30`.
- **Local accounts are your MooMoo account.** The local API mirrors the signed-in account from the live API (name,
  role, clan, prefs, stats, look), and looks up profiles, clans and friend names it doesn't have on live. That also
  brings the Friends tab back locally, which needs a name. Profiles call the look `gear`, like live.

### Backend & tooling

- **Game server**
  - Anonymous mode: `Anon#<sid>` and no clan in other players' player data and in the leaderboard; `I` re-sends you
    to everyone, at most once every 30 seconds; it's cleared when you leave.
  - Answers `V` with `p`: the API profile, or `{ name: "Anon#<sid>", anon: true }` for an anonymous player.
  - **World generation** uses the original totals for stone and gold (32 and 7 for the whole map); it had been
    making seven times as many. Trees and bushes stay at the original 9 and 3 per area, and cacti are always the
    largest bush size.
  - **No collision** power (`A noclip 1|0`); moderators may use only that one, admins everything.
  - Each finished life reports what the player owned (hats, accessories, each weapon's best variant) and how they
    looked, for the look editor.
  - **Bot swarms.** At most `GAME_MAX_PER_IP` open sockets (4) and `GAME_JOINS_PER_MINUTE` new ones (12) per
    address; localhost is exempt.
- **API**
  - `POST /account/look` returns the account's earned options, its best life's look and the saved pick; with
    `look` it saves it (400 if it isn't earned). Profiles include it as `gear`, like live. For a real MooMoo
    account it goes to live instead (see *The local account API*).

### Known gaps

- **Emerald** unlocks at 30000 weapon XP for signed-in players only. The admin weapon command can also hand it to guests until they switch weapons.
- **Bot-swarm protection** on live is server-side and not visible in the client; ours is the per-address limits above.

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
