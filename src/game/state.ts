import { config } from "../config";
import type { Player } from "../entities/Player";

export interface Alliance {
  sid: string;
  name?: string;
}

export interface JoinRequest {
  sid: number;
  name: string;
}

export interface MapMarker {
  x: number;
  y: number;
}

export const state = {
  me: null as Player | null,

  myPlayerId: null as string | null,

  inGame: false,

  firstLoad: true,

  delta: 0,
  now: Date.now(),
  lastFrame: Date.now(),

  lastAngleSend: 0,

  cameraX: config.mapScale / 2,
  cameraY: config.mapScale / 2,

  alliances: [] as Alliance[],

  allianceMembers: [] as (string | number)[],
  joinRequests: [] as JoinRequest[],

  minimapPositions: [] as number[],
  deathMarker: null as MapMarker | null,
  playerMarker: null as MapMarker | null,

  upgradeChoices: [] as number[],

  ping: 0,

  deathTextSize: 99999,

  waterPhase: 1,
  waterDirection: 0,
};

export function resetSession(): void {
  state.me = null;
  state.inGame = false;
  state.alliances = [];
  state.allianceMembers = [];
  state.joinRequests = [];
  state.minimapPositions = [];
  state.upgradeChoices = [];
}
