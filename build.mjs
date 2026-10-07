import * as esbuild from "esbuild";
import { cp, mkdir, readdir, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const dist = path.join(root, "dist");
const gameDir = path.join(dist, "game");
const extensionDir = path.join(dist, "extension");
const sdkPortDir = path.join(root, "public", "libs");

const watch = process.argv.includes("--watch");
const serve = process.argv.includes("--serve");
const devMode = watch || serve;

const wantGame = process.argv.includes("--game") || process.argv.includes("--no-extension");
const wantExtension = process.argv.includes("--ext");
const wantBoth = !wantGame && !wantExtension;

const makeGame = devMode || wantGame || wantBoth;
const makeExtension = !devMode && (wantExtension || wantBoth);

const VERSION = "1.4.8";
const DEV_PORT = 5173;

const MATCHES = [
  "https://moomoo.io/*",
  "https://*.moomoo.io/*",
  "https://sandbox.moomoo.io/*",
];

const BLOCK_RULES = [
  {
    id: 1,
    priority: 1,
    action: { type: "block" },
    condition: {
      urlFilter: "||moomoo.io^",
      resourceTypes: [
        "script",
        "stylesheet",
        "image",
        "font",
        "media",
        "object",
        "sub_frame",
        "ping",
        "csp_report",
      ],
    },
  },
  {
    id: 2,
    priority: 2,
    action: { type: "allow" },
    condition: {
      urlFilter: "||moomoo.io/p/",
      resourceTypes: ["script"],
    },
  },
];

const REDIRECT_TYPES = ["stylesheet", "image", "font", "media"];
const REDIRECT_EXT = /\.(?:css|png|jpe?g|gif|webp|svg|ico|woff2?|ttf|otf|mp3|ogg|wav)$/i;
const FIRST_REDIRECT_ID = 100;

async function listFiles(dir, base = dir) {
  if (!existsSync(dir)) return [];
  const out = [];
  for (const ent of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) out.push(...(await listFiles(full, base)));
    else out.push(path.relative(base, full).split(path.sep).join("/"));
  }
  return out;
}

async function redirectRules() {
  const files = (await listFiles(path.join(root, "public"))).filter((file) => REDIRECT_EXT.test(file));
  return files.map((file, index) => ({
    id: FIRST_REDIRECT_ID + index,
    priority: 3,
    action: { type: "redirect", redirect: { extensionPath: "/" + file } },
    condition: { urlFilter: `||moomoo.io/${file}^`, resourceTypes: REDIRECT_TYPES },
  }));
}

const MANIFEST = {
  manifest_version: 3,
  name: "ts-moomoo",
  version: VERSION,
  description: "A TypeScript port of the MooMoo.io clientside.",
  permissions: ["declarativeNetRequest"],
  host_permissions: MATCHES,
  declarative_net_request: {
    rule_resources: [{ id: "block-page-bundle", enabled: true, path: "rules.json" }],
  },
  web_accessible_resources: [
    {
      resources: ["index.html", "css/*", "css/fonts/*", "img/*", "img/*/*", "fonts/*", "libs/*", "p/*"],
      matches: MATCHES,
    },
  ],
  content_scripts: [
    {
      matches: MATCHES,
      js: ["assetBridge.js"],
      run_at: "document_start",
      world: "ISOLATED",
    },
    {
      matches: MATCHES,
      js: ["bundle.js"],
      run_at: "document_start",
      world: "MAIN",
    },
  ],
};

/** @type {import("esbuild").BuildOptions} */
const shared = {
  entryPoints: [path.join(root, "src/main.ts")],
  bundle: true,
  platform: "browser",
  target: "es2022",
  legalComments: "none",
  logLevel: "info",
};

async function copyStatic(target) {
  await mkdir(target, { recursive: true });
  await cp(path.join(root, "index.html"), path.join(target, "index.html"));
  const publicDir = path.join(root, "public");
  if (existsSync(publicDir)) await cp(publicDir, target, { recursive: true });
}

async function buildSdkTypeScriptPorts() {
  await mkdir(sdkPortDir, { recursive: true });
  await Promise.all([
    esbuild.build({
      entryPoints: [path.join(root, "src/sdk-libs/frvr-sdk.ts")],
      outfile: path.join(sdkPortDir, "frvr-sdk.js"),
      bundle: true,
      platform: "browser",
      target: "es2022",
      format: "esm",
      sourcemap: false,
      minify: false,
      legalComments: "inline",
      logLevel: "info",
    }),
    esbuild.build({
      entryPoints: [path.join(root, "src/sdk-libs/frvr-channel-web.ts")],
      outfile: path.join(sdkPortDir, "frvr-channel-web.js"),
      bundle: true,
      platform: "browser",
      target: "es2022",
      format: "esm",
      sourcemap: false,
      minify: false,
      legalComments: "inline",
      logLevel: "info",
    }),
    esbuild.build({
      entryPoints: [path.join(root, "src/sdk-libs/howler.ts")],
      outfile: path.join(sdkPortDir, "howler.core.js"),
      bundle: true,
      platform: "browser",
      target: "es2022",
      format: "esm",
      sourcemap: false,
      minify: false,
      legalComments: "inline",
      logLevel: "info",
    }),
  ]);
}

async function buildStandalone() {
  await copyStatic(gameDir);

  const options = {
    ...shared,
    outfile: path.join(gameDir, "bundle.js"),
    format: "esm",
    sourcemap: devMode,
    minify: !devMode,
  };

  if (!devMode) {
    await esbuild.build(options);
    return null;
  }

  const ctx = await esbuild.context(options);
  await ctx.watch();
  return ctx;
}

async function buildExtension() {
  await copyStatic(extensionDir);

  await esbuild.build({
    ...shared,
    outfile: path.join(extensionDir, "bundle.js"),
    format: "iife",
    sourcemap: false,
    minify: true,
  });

  await esbuild.build({
    ...shared,
    entryPoints: [path.join(root, "src/extension/assetBridge.ts")],
    outfile: path.join(extensionDir, "assetBridge.js"),
    format: "iife",
    sourcemap: false,
    minify: true,
  });

  await writeFile(path.join(extensionDir, "rules.json"), JSON.stringify([...BLOCK_RULES, ...(await redirectRules())], null, 2));
  await writeFile(path.join(extensionDir, "manifest.json"), JSON.stringify(MANIFEST, null, 2));
}

if (makeGame) await rm(gameDir, { recursive: true, force: true });
if (makeExtension) await rm(extensionDir, { recursive: true, force: true });

await buildSdkTypeScriptPorts();

const ctx = makeGame ? await buildStandalone() : null;
if (makeExtension) await buildExtension();

if (serve) {
  const { host, port } = await ctx.serve({ servedir: gameDir, port: DEV_PORT });
  console.log(`\n  ts-moomoo on http://${host === "0.0.0.0" ? "localhost" : host}:${port}\n`);
} else if (watch) {
  console.log("\n  watching for changes...\n");
} else {
  console.log("");
  if (makeGame) console.log("  game:       dist/game/");
  if (makeExtension) console.log("  extension:  dist/extension/  (chrome://extensions -> Load unpacked)");
  console.log("");
}
