import path from "node:path";
import { fileURLToPath } from "node:url";

const bundleDir = path.dirname(fileURLToPath(import.meta.url));

const flags = new Set(process.argv.slice(2));

export const serverConfig = {
  port: Number(process.env.GAME_PORT ?? 3000),
  host: process.env.GAME_HOST ?? "0.0.0.0",
  publicDir: path.resolve(bundleDir, process.env.PUBLIC_DIR ?? "../../dist/game"),
  playerCapacity: Number(process.env.GAME_CAPACITY ?? 40),
  region: process.env.GAME_REGION ?? "0",
  name: process.env.GAME_NAME ?? "1",
  apiUrl: process.env.API_URL ?? "http://localhost:8080",

  sandbox: process.env.GAME_SANDBOX === "1",
  wsOnly: flags.has("--ws") || process.env.GAME_WS_ONLY === "1",
  peerUrl: process.env.GAME_PEER_URL ?? "",
  heartbeatInterval: 5000,
  maxPacketsPerSecond: 120,
  maxPacketBytes: 4096,
  animals: [
    { type: 0, count: 14, band: "any" },      // cow
    { type: 1, count: 10, band: "any" },      // pig
    { type: 2, count: 6, band: "desert" },    // bull
    { type: 3, count: 3, band: "desert" },    // bully
    { type: 4, count: 8, band: "snow" },      // wolf
    { type: 5, count: 2, band: "any" },       // duck
  ] as Array<{ type: number; count: number; band: "any" | "snow" | "desert" | "grass" }>,
  turretProjectileSpeed: 1.5,
};

export type ServerConfig = typeof serverConfig;
