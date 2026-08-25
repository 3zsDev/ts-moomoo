import type { Animal, GameObject, Player } from "../shared";
import type { ClanManager } from "./game/clans";

export interface SimHost {
  readonly players: readonly Player[];
  readonly animals: readonly Animal[];
  readonly clans: ClanManager;

  capacity(): number;
  humanCount(): number;
  takenNames(): Set<string>;
  objectsNear(x: number, y: number, radius: number): GameObject[][];
  structureCounts(): Map<number, number>;

  addHeadlessPlayer(name: string): Player | null;
  removeHeadlessPlayer(player: Player): void;

  spawn(player: Player, name: string, skin: number): void;

  move(player: Player, angle: number | null): void;
  aim(player: Player, angle: number): void;
  attack(player: Player, held: boolean): void;

  selectWeapon(player: Player, weaponId: number): boolean;
  place(player: Player, itemId: number, angle: number): boolean;
  upgrade(player: Player, actionBarIndex: number): void;

  buy(player: Player, id: number, isAccessory: boolean): boolean;
  equip(player: Player, id: number, isAccessory: boolean): boolean;

  say(player: Player, text: string): void;

  createClan(player: Player, name: string): void;
  joinClan(player: Player, clanSid: string): void;
  leaveClan(player: Player): void;
  acceptClanRequest(owner: Player, applicantSid: number): void;
}

export interface SimPlugin {
  tick(delta: number): void;
  makeRoom(): boolean;
  onIncome(player: Player, amount: number): void;
  onChat(from: Player, message: string): void;
  onClanRequest(owner: Player, applicantSid: number): void;
  onCommand(message: string): string | null;
  stats(): Record<string, unknown>;
}

export type SimPluginFactory = (host: SimHost) => SimPlugin;

const NO_PLUGIN: SimPlugin = {
  tick: () => {},
  makeRoom: () => false,
  onIncome: () => {},
  onChat: () => {},
  onClanRequest: () => {},
  onCommand: () => null,
  stats: () => ({ running: false, bots: 0, events: [], roster: [] }),
};

let factory: SimPluginFactory | null = null;

export function registerSimPlugin(next: SimPluginFactory): void {
  factory = next;
}

export function createSimPlugin(host: SimHost): SimPlugin {
  return factory ? factory(host) : NO_PLUGIN;
}
