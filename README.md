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

This downloads esbuild and TypeScript into a `node_modules/` folder. It only needs
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
| **API** | `api/` | The server-list / matchmaking service. Also serves the built client as a normal web page. |
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
| `API_URL` | `http://localhost:8080` | Where the server sends its heartbeats |
| `PUBLIC_DIR` | `dist/game` | Folder to serve static files from |

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
