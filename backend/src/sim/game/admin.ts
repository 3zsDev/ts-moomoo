import { config, itemData, type MsgPackValue, type Player, ServerPacket, weaponVariants } from "../../shared";
import type { AnimalManager } from "../animals";
import type { ClanManager } from "./clans";

export interface AdminHost {
  readonly players: readonly Player[];
  readonly animals: AnimalManager["animals"];
  readonly animalManager: AnimalManager;
  readonly clans: ClanManager;

  refreshPlayer(player: Player): void;
  setDive(player: Player, dive: number, diveMs: number): void;
  findPlayer(sid: number): Player | undefined;
  sendTo(player: Player, packet: string, ...args: MsgPackValue[]): void;
}

const MAX_SPAWN = 20;
const MULT_LIMITS: Record<string, [number, number]> = {
  size: [0.5, 3],
  power: [1, 100],
  speed: [1, 20],
  health: [1, 20],
};

function finite(value: MsgPackValue | undefined, fallback = 0): number {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function teleport(player: Player, x: number, y: number): void {
  player.x = x;
  player.y = y;
  player.xVel = 0;
  player.yVel = 0;
}

const MOD_COMMANDS = new Set(["noclip"]);

export interface AdminState {
  god: boolean;
  aura: boolean;
  boss: boolean;
  invisible: boolean;
  noclip: boolean;
  disguised: boolean;
  morph: number;
  dive: number;
  size: number;
  power: number;
  speed: number;
  health: number;
}

export interface AdminWorld {
  tribes: string[];
  mobs: { type: number; name: string }[];
  animalKinds: { id: number; name: string; src: string }[];
}

export function adminState(player: Player): AdminState {
  return {
    god: player.powers.god,
    aura: player.aura,
    boss: player.bossMode,
    invisible: player.powers.invisible,
    noclip: player.powers.noclip,
    disguised: player.disguised,
    morph: player.morph,
    dive: player.dive,
    size: player.powers.size,
    power: player.powers.damage,
    speed: player.powers.speed,
    health: player.powers.health,
  };
}

function kindName(kind: { name?: string; src: string }): string {
  if (kind.name) return kind.name;
  const base = kind.src.replace(/_\d+$/, "");
  return base.charAt(0).toUpperCase() + base.slice(1);
}

export function adminWorld(host: AdminHost): AdminWorld {
  const types = host.animalManager.animalTypes;
  const mobs = new Map<number, string>();
  for (const animal of host.animals) {
    const type = types[animal.index];
    if (!animal.active || animal.spawnCounter || !type?.name || mobs.has(animal.index)) continue;
    mobs.set(animal.index, animal.name || type.name);
  }
  return {
    tribes: host.clans.clans.map((clan) => clan.sid),
    mobs: [...mobs].sort((a, b) => a[0] - b[0]).map(([type, name]) => ({ type, name })),
    animalKinds: types.map((type) => ({ id: type.id, name: kindName(type), src: type.src })),
  };
}

export function canRunAdminCommand(role: string | null | undefined, command: MsgPackValue | undefined): boolean {
  return role === "admin" || (role === "mod" && MOD_COMMANDS.has(String(command ?? "")));
}

export function runAdminCommand(host: AdminHost, player: Player, args: MsgPackValue[]): void {
  const command = String(args[0] ?? "");
  const on = !!finite(args[1]);

  switch (command) {
    case "god":
      player.powers.god = on;
      return;

    case "invisible":
      player.powers.invisible = on;
      player.invisible = on;
      host.refreshPlayer(player);
      return;

    case "aura":
      player.aura = on;
      host.refreshPlayer(player);
      return;

    case "morph": {
      const kind = finite(args[1], -1);
      player.morph = host.animalManager.animalTypes[kind] ? kind : -1;
      host.refreshPlayer(player);
      return;
    }

    case "dive":
      host.setDive(player, Math.min(3, Math.max(0, Math.round(finite(args[1])))), Math.max(0, finite(args[2])));
      return;

    case "disguise":
      player.disguised = on;
      host.refreshPlayer(player);
      return;

    case "noclip":
      player.powers.noclip = on;
      return;

    case "boss":
      player.bossMode = on;
      host.refreshPlayer(player);
      return;

    case "size":
    case "power":
    case "speed":
    case "health": {
      const [min, max] = MULT_LIMITS[command];
      const value = Math.min(max, Math.max(min, finite(args[1], 1)));
      if (command === "power") player.powers.damage = value;
      else if (command === "speed") player.powers.speed = value;
      else if (command === "size") {
        player.powers.size = value;
        player.scale = config.playerScale * value;
        host.refreshPlayer(player);
      } else {
        player.powers.health = value;
        player.maxHealth = 100 * value;
        player.health = player.maxHealth;
        host.refreshPlayer(player);
      }
      return;
    }

    case "spawn": {
      const type = finite(args[1], -1);
      if (!host.animalManager.animalTypes[type]) return;
      const count = Math.min(MAX_SPAWN, Math.max(1, finite(args[2], 1)));
      for (let i = 0; i < count; i++) {
        const distance = player.scale + 200 + i * 40;
        const animal = host.animalManager.spawn(
          player.x + distance * Math.cos(player.dir), player.y + distance * Math.sin(player.dir),
          player.dir, type,
        );
        animal.despawnOnDeath = true;
      }
      return;
    }

    case "tp":
      teleport(player, finite(args[1], player.x), finite(args[2], player.y));
      return;

    case "gotomob": {
      const type = finite(args[1], -1);
      const mob = host.animals.find((animal) => animal.active && animal.index === type && !animal.spawnCounter);
      if (mob) teleport(player, mob.x, mob.y + mob.scale + player.scale + 60);
      return;
    }

    case "goto": {
      const target = host.findPlayer(finite(args[1], -1));
      if (target?.alive) teleport(player, target.x, target.y + target.scale + player.scale);
      return;
    }

    case "summon": {
      const target = host.findPlayer(finite(args[1], -1));
      if (target?.alive) teleport(target, player.x, player.y + target.scale + player.scale);
      return;
    }

    case "weapon": {
      const weapon = itemData.weapons[finite(args[1], -1)];
      const receiver = recipient(host, player, args[3]);
      if (!weapon || !receiver) return;
      const variant = weaponVariants[finite(args[2])] ?? weaponVariants[0];

      receiver.weapons[weapon.type] = weapon.id;
      receiver.weaponXP[weapon.id] = Math.max(receiver.weaponXP[weapon.id] ?? 0, variant.xp);
      if (receiver.weaponIndex === weapon.id || weapon.type === 0) {
        receiver.weaponIndex = weapon.id;
        receiver.weaponVariant = config.fetchVariant(receiver).id;
        if (variant.membersOnly && !receiver.member) receiver.weaponVariant = variant.id;
      }
      host.sendTo(receiver, ServerPacket.UpdateItems, receiver.weapons, 1);
      return;
    }

    case "item": {
      const item = itemData.list[finite(args[1], -1)];
      const receiver = recipient(host, player, args[3]);
      if (!item || !receiver) return;
      receiver.addItem(item.id);
      host.sendTo(receiver, ServerPacket.UpdateItems, receiver.items, 0);
      return;
    }

    case "give": {
      const type = finite(args[1], -1);
      const receiver = recipient(host, player, args[3]);
      if (type < 0 || type > 3 || !receiver) return;
      receiver.addResource(type, Math.min(1e6, Math.max(0, finite(args[2]))), true);
      return;
    }

    case "deltribe":
      host.clans.deleteClan(String(args[1] ?? ""));
      return;
  }
}

function recipient(host: AdminHost, self: Player, target: MsgPackValue | undefined): Player | null {
  if (target === undefined || target === null) return self;
  const player = host.findPlayer(finite(target, -1));
  return player?.alive ? player : null;
}
