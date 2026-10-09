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
  apiEnabled: process.env.GAME_API !== "0",
  internalKey: process.env.INTERNAL_KEY ?? "",
  requireTicket: process.env.GAME_REQUIRE_TICKET === "1",
  membersOnly: process.env.GAME_MEMBERS_ONLY === "1",
  shutdownNotice: Number(process.env.GAME_SHUTDOWN_NOTICE ?? 0),
  reservedRefresh: 30000,

  sandbox: process.env.GAME_SANDBOX === "1",
  localAdmin: flags.has("--admin") || process.env.GAME_ADMIN === "1",
  wsOnly: flags.has("--ws") || process.env.GAME_WS_ONLY === "1",
  peerUrl: process.env.GAME_PEER_URL ?? "",
  heartbeatInterval: 5000,
  maxPacketsPerSecond: 120,
  maxSocketsPerIp: Number(process.env.GAME_MAX_PER_IP ?? 4),
  maxJoinsPerMinute: Number(process.env.GAME_JOINS_PER_MINUTE ?? 12),
  maxPacketBytes: 4096,
  animals: [
    { type: 0, count: 14, band: "any" },      // cow
    { type: 1, count: 10, band: "any" },      // pig
    { type: 2, count: 6, band: "desert" },    // bull
    { type: 3, count: 3, band: "desert" },    // bully
    { type: 4, count: 8, band: "snow" },      // wolf
    { type: 5, count: 2, band: "any" },       // duck
    { type: 12, count: 8, band: "snow" },     // sheep
    { type: 9, count: 6, band: "grass" },     // boar
    { type: 10, count: 1, band: "snow" },     // yeti, one per server
  ] as Array<{ type: number; count: number; band: "any" | "snow" | "desert" | "grass" }>,
  turretProjectileSpeed: 1.5,
  yetiRespawn: 60000,
  crabKingRespawn: 600000,
  statsInterval: 1000,
};

export type ServerConfig = typeof serverConfig;
