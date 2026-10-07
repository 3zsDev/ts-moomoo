import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));

const GAME_PORT = process.env.GAME_PORT ?? "3000";
const SANDBOX_PORT = process.env.SANDBOX_PORT ?? "3001";
const API_PORT = process.env.API_PORT ?? "8080";

const onlySandbox = process.argv.includes("--sandbox");
const wsOnly = process.argv.includes("--ws");
const withGame = !onlySandbox;
const withSandbox = onlySandbox || !process.argv.includes("--no-sandbox");
const withApi = !onlySandbox && !wsOnly && !process.argv.includes("--no-api");
const skipBuild = process.argv.includes("--no-build");

/** @type {import("node:child_process").ChildProcess[]} */
const children = [];

function run(label, file, options = {}) {
  const child = spawn(process.execPath, [file, ...(wsOnly ? ["--ws"] : [])], {
    cwd: root,
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env, ...options.env },
  });

  const prefix = (stream) => (chunk) => {
    for (const line of String(chunk).split("\n")) {
      if (line.trim()) stream.write(`[${label}] ${line}\n`);
    }
  };
  child.stdout.on("data", prefix(process.stdout));
  child.stderr.on("data", prefix(process.stderr));

  child.on("exit", (code) => {
    if (code !== 0 && code !== null) {
      console.error(`[${label}] exited with code ${code}`);
      shutdown(code);
    }
  });

  children.push(child);
  return child;
}

function once(label, file, args = []) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [file, ...args], { cwd: root, stdio: "inherit" });
    child.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`${label} failed`))));
  });
}

let shuttingDown = false;
function shutdown(code = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const child of children) child.kill();
  setTimeout(() => process.exit(code), 200).unref();
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));

if (!skipBuild) {
  await once("client build", path.join(root, "build.mjs"), [wsOnly ? "--ext" : "--game"]);
  await once("backend build", path.join(root, "backend/build.mjs"));
}

const server = path.join(root, "backend/dist/server.mjs");

if (withGame) {
  run("game", server, {
    env: {
      GAME_PORT,
      GAME_NAME: "1",
      GAME_SANDBOX: "0",
      GAME_API: withApi ? "1" : "0",
      GAME_PEER_URL: `http://localhost:${SANDBOX_PORT}/`,
    },
  });
}

if (withSandbox) {
  run("sandbox", server, {
    env: {
      GAME_PORT: SANDBOX_PORT,
      GAME_NAME: "sandbox",
      GAME_SANDBOX: "1",
      GAME_API: withApi ? "1" : "0",
      GAME_PEER_URL: `http://localhost:${GAME_PORT}/`,
    },
  });
}

if (withApi) run("api", path.join(root, "api/server.mjs"));

console.log("");
if (wsOnly) {
  if (withGame) console.log(`  game ws     ws://localhost:${GAME_PORT}`);
  if (withSandbox) console.log(`  sandbox ws  ws://localhost:${SANDBOX_PORT}`);
} else {
  if (withGame) console.log(`  play at     http://localhost:${GAME_PORT}`);
  if (withSandbox) console.log(`  sandbox at  http://localhost:${SANDBOX_PORT}`);
  if (withApi) console.log(`  api at      http://localhost:${API_PORT}`);
}
console.log("");
