import type { Cosmetic } from "../data/cosmetics";

export interface Positioned {
  x: number;
  y: number;
  scale: number;
}

export interface DamageOverTime {
  dmg?: number;
  time?: number;
  doer?: Damageable | null;
}

export interface LifeStats {
  wood: number;
  food: number;
  stone: number;
  gold: number;
  damage: number;
  animalDamage: number;
  healing: number;
  animals: number;
  bosses: number;
  animalKills: Record<number, number>;
}

export interface Damageable extends Positioned {
  sid: number;
  active: boolean;
  alive?: boolean;
  health: number;
  maxHealth?: number;
  xVel: number;
  yVel: number;
  dir: number;
  team?: string | null;
  weightM?: number;
  isPlayer?: boolean;
  isAI?: boolean;
  skin?: Cosmetic | null;
  tail?: Cosmetic | null;
  dmgOverTime?: DamageOverTime;
  lockMove?: boolean;
  noTrap?: boolean;
  zIndex?: number;
  colDmg?: number;
  healCol?: number;
  weaponIndex?: number;
  stats?: LifeStats;
  outgoingMult?(): number;
  changeHealth(amount: number, doer?: unknown, source?: unknown): boolean;
  canSee?(other: Positioned | null): boolean;
  addResource?(type: number, amount: number, ignoreXP?: boolean): void;
}

export interface ServerHooks {
  send(playerId: string | number, packet: string, ...args: unknown[]): void;
  broadcast(packet: string, ...args: unknown[]): void;
}

export interface Interpolated {
  visible: boolean;

  forcePos: boolean;
  x1?: number;
  y1?: number;
  x2?: number;
  y2?: number;
  d1?: number;
  d2?: number;
  dt: number;
  settle: boolean;
}
