# npm scripts

A quick tour of everything in `package.json` → `scripts`. Run them with `npm run <name>`.

## Just want to play?

```
npm run play
```

That builds the client + backend, starts a normal server, a sandbox server, and the
API/server-list, then prints the URLs. Ctrl+C stops all of them.

---

## Building

| Script | What it does |
| --- | --- |
| `build` | Runs `build.mjs` with no flags: builds **both** the standalone game (`dist/game/`) and the Chrome extension (`dist/extension/`), minified. |
| `build:game` | Standalone web build only → `dist/game/` (`index.html`, `bundle.js`, plus everything in `public/`). |
| `build:ext` | Chrome extension only → `dist/extension/`. Also writes `manifest.json` and `rules.json` (the rules block moomoo.io's own bundle so ours can take over). Load it via `chrome://extensions` → *Load unpacked*. |
| `build:backend` | Bundles the game server (`backend/src/index.ts`) → `backend/dist/server.mjs`. |
| `build:all` | `build` + `build:backend` — everything, in one go. |

## Developing

| Script | What it does |
| --- | --- |
| `watch` | Rebuilds the game bundle whenever a source file changes. Dev mode: sourcemaps on, no minification, extension not built. |
| `serve` | Same as `watch`, but also serves `dist/game/` on <http://localhost:5173> via esbuild's dev server. |
| `typecheck` | `tsc --noEmit` over the client, then over `backend/tsconfig.json`. No output files — purely a type check. |

## Running

| Script | What it does |
| --- | --- |
| `play` | The all-in-one launcher (`run.mjs`). Builds the game + backend, then starts: game server on `:3000`, sandbox on `:3001`, API on `:8080`. |
| `sandbox` | Sandbox server only, on `:3001`. No normal server, no API. |
| `ws` | WebSocket-only mode: builds the **extension** instead of the web build and starts the servers with no static file serving (`ws://localhost:3000` / `:3001`). Use this when you play through the extension on the real moomoo.io page and just need a local server to connect to. |
| `backend` | Starts an already-built backend directly (`backend/dist/server.mjs`) — no build step, no sandbox, no API. Configure it with env vars. |
| `api` | Starts the API / server-list service on `:8080` (`api/server.mjs`). It also serves `dist/game/` as static files and tracks server heartbeats from `api/servers.json`. |

## Useful environment variables

`run.mjs` and the servers read these, so you can override ports without editing code:

- `GAME_PORT` (default `3000`), `SANDBOX_PORT` (`3001`), `API_PORT` (`8080`)
- `GAME_HOST` / `API_HOST` (default `0.0.0.0`)
- `GAME_NAME`, `GAME_REGION`, `GAME_CAPACITY` — how the server identifies itself to the server list
- `GAME_SANDBOX=1` — run as a sandbox server
- `GAME_WS_ONLY=1` — same as passing `--ws`
- `PUBLIC_DIR` — where static files are served from

## Extra flags (pass after `--`)

`run.mjs` accepts a few flags the scripts don't expose, e.g. `npm run play -- --no-build`
to skip the rebuild, `--no-sandbox`, or `--no-api`.

---
this documentation was made with ai
