import type { ResourceType } from "../../config";
import { itemGroups, type ItemGroup } from "./groups";

export interface Consumer {
  health: number;
  changeHealth(amount: number, doer?: unknown): boolean;
  dmgOverTime: { dmg?: number; time?: number; doer?: unknown };
}

export interface Item {
  id: number;
  group: ItemGroup;
  name: string;
  desc: string;
  req: (ResourceType | number)[];
  age?: number;
  pre?: number;
  type?: number;

  scale: number;
  holdOffset: number;
  placeOffset?: number;
  spritePadding?: number;
  iconLineMult?: number;

  health?: number;
  dmg?: number;
  pDmg?: number;
  projDmg?: boolean;
  pps?: number;
  turnSpeed?: number;
  colDiv?: number;
  ignoreCollision?: boolean;
  hideFromEnemy?: boolean;
  trap?: boolean;
  boostSpeed?: number;
  healCol?: number;
  teleport?: boolean;
  spawnPoint?: boolean;
  blocker?: number;
  zIndex?: number;

  doUpdate?: boolean;
  projectile?: number;
  shootRange?: number;
  shootRate?: number;

  consume?: (target: Consumer) => boolean;
}

const definitions: Omit<Item, "id">[] = [
  {
    group: itemGroups[0], name: "apple", desc: "restores 20 health when consumed",
    req: ["food", 10], scale: 22, holdOffset: 15,
    consume: (p) => p.changeHealth(20, p),
  },
  {
    age: 3, group: itemGroups[0], name: "cookie", desc: "restores 40 health when consumed",
    req: ["food", 15], scale: 27, holdOffset: 15,
    consume: (p) => p.changeHealth(40, p),
  },
  {
    age: 7, group: itemGroups[0], name: "cheese",
    desc: "restores 30 health and another 50 over 5 seconds",
    req: ["food", 25], scale: 27, holdOffset: 15,
    consume: (p) => {
      if (p.changeHealth(30, p) || p.health < 100) {
        p.dmgOverTime.dmg = -10;
        p.dmgOverTime.doer = p;
        p.dmgOverTime.time = 5;
        return true;
      }
      return false;
    },
  },

  {
    group: itemGroups[1], name: "wood wall", desc: "provides protection for your village",
    req: ["wood", 10], projDmg: true, health: 380, scale: 50, holdOffset: 20, placeOffset: -5,
  },
  {
    age: 3, group: itemGroups[1], name: "stone wall", desc: "provides improved protection for your village",
    req: ["stone", 25], health: 900, scale: 50, holdOffset: 20, placeOffset: -5,
  },
  {
    age: 7, pre: 1, group: itemGroups[1], name: "castle wall", desc: "provides powerful protection for your village",
    req: ["stone", 35], health: 1500, scale: 52, holdOffset: 20, placeOffset: -5,
  },

  {
    group: itemGroups[2], name: "spikes", desc: "damages enemies when they touch them",
    req: ["wood", 20, "stone", 5], health: 400, dmg: 20,
    scale: 49, spritePadding: -23, holdOffset: 8, placeOffset: -5,
  },
  {
    age: 5, group: itemGroups[2], name: "greater spikes", desc: "damages enemies when they touch them",
    req: ["wood", 30, "stone", 10], health: 500, dmg: 35,
    scale: 52, spritePadding: -23, holdOffset: 8, placeOffset: -5,
  },
  {
    age: 9, pre: 1, group: itemGroups[2], name: "poison spikes", desc: "poisons enemies when they touch them",
    req: ["wood", 35, "stone", 15], health: 600, dmg: 30, pDmg: 5,
    scale: 52, spritePadding: -23, holdOffset: 8, placeOffset: -5,
  },
  {
    age: 9, pre: 2, group: itemGroups[2], name: "spinning spikes", desc: "damages enemies when they touch them",
    req: ["wood", 30, "stone", 20], health: 500, dmg: 45, turnSpeed: 0.003,
    scale: 52, spritePadding: -23, holdOffset: 8, placeOffset: -5,
  },

  {
    group: itemGroups[3], name: "windmill", desc: "generates gold over time",
    req: ["wood", 50, "stone", 10], health: 400, pps: 1, turnSpeed: 0.0016,
    spritePadding: 25, iconLineMult: 12, scale: 45, holdOffset: 20, placeOffset: 5,
  },
  {
    age: 5, pre: 1, group: itemGroups[3], name: "faster windmill", desc: "generates more gold over time",
    req: ["wood", 60, "stone", 20], health: 500, pps: 1.5, turnSpeed: 0.0025,
    spritePadding: 25, iconLineMult: 12, scale: 47, holdOffset: 20, placeOffset: 5,
  },
  {
    age: 8, pre: 1, group: itemGroups[3], name: "power mill", desc: "generates more gold over time",
    req: ["wood", 100, "stone", 50], health: 800, pps: 2, turnSpeed: 0.005,
    spritePadding: 25, iconLineMult: 12, scale: 47, holdOffset: 20, placeOffset: 5,
  },

  {
    age: 5, group: itemGroups[4], type: 2, name: "mine", desc: "allows you to mine stone",
    req: ["wood", 20, "stone", 100], iconLineMult: 12, scale: 65, holdOffset: 20, placeOffset: 0,
  },
  {
    age: 5, group: itemGroups[11], type: 0, name: "sapling", desc: "allows you to farm wood",
    req: ["wood", 150], iconLineMult: 12, colDiv: 0.5, scale: 110, holdOffset: 50, placeOffset: -15,
  },

  {
    age: 4, group: itemGroups[5], name: "pit trap", desc: "pit that traps enemies if they walk over it",
    req: ["wood", 30, "stone", 30], trap: true, ignoreCollision: true, hideFromEnemy: true,
    health: 500, colDiv: 0.2, scale: 50, holdOffset: 20, placeOffset: -5,
  },
  {
    age: 4, group: itemGroups[6], name: "boost pad", desc: "provides boost when stepped on",
    req: ["stone", 20, "wood", 5], ignoreCollision: true, boostSpeed: 1.5,
    health: 150, colDiv: 0.7, scale: 45, holdOffset: 20, placeOffset: -5,
  },
  {
    age: 7, group: itemGroups[7], doUpdate: true, name: "turret",
    desc: "defensive structure that shoots at enemies",
    req: ["wood", 200, "stone", 150], health: 800,
    projectile: 1, shootRange: 700, shootRate: 2200, scale: 43, holdOffset: 20, placeOffset: -5,
  },
  {
    age: 7, group: itemGroups[8], name: "platform", desc: "platform to shoot over walls and cross over water",
    req: ["wood", 20], ignoreCollision: true, zIndex: 1,
    health: 300, scale: 43, holdOffset: 20, placeOffset: -5,
  },
  {
    age: 7, group: itemGroups[9], name: "healing pad", desc: "standing on it will slowly heal you",
    req: ["wood", 30, "food", 10], ignoreCollision: true, healCol: 15,
    health: 400, colDiv: 0.7, scale: 45, holdOffset: 20, placeOffset: -5,
  },
  {
    age: 9, group: itemGroups[10], name: "spawn pad",
    desc: "you will spawn here when you die but it will dissapear",
    req: ["wood", 100, "stone", 100], health: 400, ignoreCollision: true, spawnPoint: true,
    scale: 45, holdOffset: 20, placeOffset: -5,
  },
  {
    age: 7, group: itemGroups[12], name: "blocker", desc: "blocks building in radius",
    req: ["wood", 30, "stone", 25], ignoreCollision: true, blocker: 300,
    health: 400, colDiv: 0.7, scale: 45, holdOffset: 20, placeOffset: -5,
  },
  {
    age: 7, group: itemGroups[13], name: "teleporter", desc: "teleports you to a random point on the map",
    req: ["wood", 60, "stone", 60], ignoreCollision: true, teleport: true,
    health: 200, colDiv: 0.7, scale: 45, holdOffset: 20, placeOffset: -5,
  },
];

export const items: Item[] = definitions.map((item, index) => ({ ...item, id: index }));

for (const item of items) {
  if (item.pre != null) item.pre = item.id - item.pre;
}
