import { accessoryEffect, type GameConfig, type ResourceType } from "../config";
import type { Cosmetic } from "../data/cosmetics";
import type { Item, ItemData } from "../data/items";
import type { ObjectManager } from "../systems/ObjectManager";
import type { ProjectileManager } from "../systems/ProjectileManager";
import { SwingAnimation } from "./SwingAnimation";
import type { WeaponVariant } from "../data/weaponVariants";
import type { Damageable, DamageOverTime, Interpolated, LifeStats, Positioned, ServerHooks } from "./types";
import { getAngleDist } from "../utils/angles";
import { getDirection, getDistance } from "../utils/geometry";
import { confineToWorld, inFallsWater, inShallows } from "../utils/falls";
import { clamp, fixTo } from "../utils/math";

export type ScoreAward = (player: Player, amount: number, isGold?: boolean) => void;

export interface PlayerUserData {
  name: string;
  skin: number;
}

export type PlayerInitData = [
  id: string, sid: number, name: string,
  x: number, y: number, dir: number,
  health: number, maxHealth: number, scale: number, skinColor: number,
  aura?: number, bossMode?: number, clan?: string | null,
];

// admin powers
export interface PlayerPowers {
  god: boolean;
  invisible: boolean;
  noclip: boolean;
  damage: number;
  speed: number;
  health: number;
  size: number;
}

export function emptyLifeStats(): LifeStats {
  return {
    wood: 0, food: 0, stone: 0, gold: 0,
    damage: 0, animalDamage: 0, healing: 0, animals: 0, bosses: 0, animalKills: {},
  };
}

export class Player implements Damageable, Interpolated {
  public id: string;
  public sid: number;
  public readonly isPlayer = true;

  public name = "unknown";
  public skinColor = 0;
  public team: string | null = null;
  public isOwner = false;
  public isLeader = false;

  public aura = false;
  public bossMode = false;
  public clan: string | null = null;
  public member = false;

  public iconIndex = 0;

  public x = 0;
  public y = 0;
  public xVel = 0;
  public yVel = 0;
  public dir = 0;
  public targetDir = 0;

  public moveDir: number | undefined = undefined;

  public zIndex = 0;
  public lockMove = false;
  public lockDir = false;

  public active = false;
  public alive = false;
  public health = 100;
  public maxHealth = 100;
  public scale = 35;
  public speed = 0.0016;

  public slowMult = 1;
  public weightM = 1;
  public points = 0;
  public kills = 0;
  public pps = 0;

  public age = 1;
  public XP = 0;
  public maxXP = 300;
  public upgradePoints = 0;
  public upgrAge = 2;

  public wood = 0;
  public food = 0;
  public stone = 0;

  public items: number[] = [0, 3, 6, 10];

  public weapons: number[] = [0];
  public weaponIndex = 0;
  public weaponVariant = 0;
  public weaponXP: number[] = [];

  public buildIndex = -1;
  public reloads: Record<number, number> = {};
  public readonly itemCounts: Record<number, number> = {};

  public skinIndex = 0;
  public tailIndex = 0;
  public readonly skins: Record<number, number> = {};
  public readonly tails: Record<number, number> = {};
  public skin: Cosmetic | null = null;
  public tail: Cosmetic | null = null;

  public skinRot = 0;

  public mouseState = 0;
  public gathering = 0;
  public autoGather = 0;
  public dmgOverTime: DamageOverTime = {};
  public healCol = 0;

  public noMovTimer = 0;
  public stats: LifeStats = emptyLifeStats();
  public readonly powers: PlayerPowers = { god: false, invisible: false, noclip: false, damage: 1, speed: 1, health: 1, size: 1 };
  private hitBuffTimer = 0;
  private hitBuffMult = 1;
  private killBuffTimer = 0;
  private killBuffMult = 1;
  private killBuffSpeed = 1;
  private lastHitTime = 0;
  private shameCount = 0;
  private shameTimer = 0;

  public readonly swing: SwingAnimation;

  public chatMessage: string | null = null;
  public chatCountdown = 0;

  public sentTo: Record<string, boolean> = {};

  public visible = false;
  public forcePos = false;
  public settle = false;
  public x1?: number;
  public y1?: number;
  public x2?: number;
  public y2?: number;
  public d1?: number;
  public d2?: number;
  public dt = 0;

  private healthTimer = 0;

  public constructor(
    id: string,
    sid: number,
    private readonly config: GameConfig,
    private readonly projectileManager: ProjectileManager,
    private readonly objectManager: ObjectManager,
    private readonly players: Player[],
    private readonly animals: Damageable[],
    private readonly itemData: ItemData,
    hats: Cosmetic[],
    accessories: Cosmetic[],
    private readonly awardScore: ScoreAward | null = null,
    private readonly server: ServerHooks | null = null,
    private readonly onDeath: (() => void) | null = null,
  ) {
    this.id = id;
    this.sid = sid;
    this.swing = new SwingAnimation(config.hitReturnRatio);

    for (const accessory of accessories) if (accessory.price <= 0 && !accessory.dontSell) this.tails[accessory.id] = 1;
    for (const hat of hats) if (hat.price <= 0 && !hat.dontSell) this.skins[hat.id] = 1;
  }

  public get dirPlus(): number {
    return this.swing.offset;
  }

  public spawn(startWithResources: boolean): void {
    this.active = true;
    this.alive = true;
    this.lockMove = false;
    this.lockDir = false;
    this.chatCountdown = 0;
    this.shameCount = 0;
    this.shameTimer = 0;
    this.sentTo = {};
    this.gathering = 0;
    this.autoGather = 0;
    this.mouseState = 0;
    this.buildIndex = -1;
    this.weaponIndex = 0;
    this.dmgOverTime = {};
    this.noMovTimer = 0;
    this.stats = emptyLifeStats();
    this.hitBuffTimer = 0;
    this.killBuffTimer = 0;

    this.maxXP = 300;
    this.XP = 0;
    this.age = 1;
    this.kills = 0;
    this.upgrAge = 2;
    this.upgradePoints = 0;

    this.x = 0;
    this.y = 0;
    this.zIndex = 0;
    this.xVel = 0;
    this.yVel = 0;
    this.slowMult = 1;
    this.dir = 0;
    this.targetDir = 0;

    this.maxHealth = 100 * this.powers.health;
    this.health = this.maxHealth;
    this.scale = this.config.playerScale * this.powers.size;
    this.speed = this.config.playerSpeed;

    this.moveDir = undefined;
    this.resetResources(startWithResources);

    this.items = [0, 3, 6, 10];
    this.weapons = [0];
    this.weaponXP = [];
    this.reloads = {};
  }

  public resetMoveDir(): void {
    this.moveDir = undefined;
  }

  public resetResources(startWithResources: boolean): void {
    const starting = startWithResources ? 100 : 0;
    this.wood = starting;
    this.food = starting;
    this.stone = starting;
    this.points = starting;
  }

  public setUserData(data: PlayerUserData | null): void {
    if (!data) return;

    const name = String(data.name)
      .slice(0, this.config.maxNameLength)
      .replace(/[^\w:()/? -]+/gim, " ")
      .replace(/[^\x00-\x7F]/g, " ")
      .trim();

    this.name = name.length > 0 ? name : "unknown";
    this.skinColor = this.config.skinColors[data.skin] ? data.skin : 0;
  }

  public getData(): PlayerInitData {
    return [
      this.id, this.sid, this.name,
      fixTo(this.x, 2), fixTo(this.y, 2), fixTo(this.dir, 3),
      this.health, this.maxHealth, this.scale, this.skinColor,
      this.aura ? 1 : 0, this.bossMode ? 1 : 0, this.clan,
    ];
  }

  public setData(data: PlayerInitData): void {
    [this.id, this.sid, this.name, this.x, this.y, this.dir,
      this.health, this.maxHealth, this.scale, this.skinColor] = data;
    this.aura = !!data[10];
    this.bossMode = !!data[11];
    this.clan = data[12] || null;
  }

  public update(delta: number): void {
    if (!this.alive) return;

    if (this.shameTimer > 0) {
      this.shameTimer -= delta;
      if (this.shameTimer <= 0) {
        this.shameTimer = 0;
        this.shameCount = 0;
      }
    }

    this.tickHealth(delta);
    if (!this.alive) return;

    if (this.slowMult < 1) this.slowMult = Math.min(1, this.slowMult + 0.0008 * delta);
    if (this.hitBuffTimer > 0) this.hitBuffTimer -= delta;
    if (this.killBuffTimer > 0) this.killBuffTimer -= delta;

    this.noMovTimer += delta;
    if (this.xVel || this.yVel) this.noMovTimer = 0;

    if (this.lockMove) {
      this.xVel = 0;
      this.yVel = 0;
    } else {
      this.applyInput(delta);
    }

    this.zIndex = 0;
    this.lockMove = false;
    this.healCol = 0;

    this.integrateMovement(delta);
    this.applyFriction(delta);
    this.clampToMap();

    if (this.buildIndex < 0) this.tickWeapon(delta);
  }

  private tickHealth(delta: number): void {
    this.healthTimer -= delta;
    if (this.healthTimer > 0) return;

    const regen = (this.skin?.healthRegen ?? 0) + (this.tail?.healthRegen ?? 0);
    if (regen) this.changeHealth(regen, this);

    if (this.dmgOverTime.dmg) {
      this.changeHealth(-this.dmgOverTime.dmg, this.dmgOverTime.doer ?? undefined);
      this.dmgOverTime.time = (this.dmgOverTime.time ?? 0) - 1;
      if (this.dmgOverTime.time <= 0) this.dmgOverTime.dmg = 0;
    }
    if (this.healCol) this.changeHealth(this.healCol, this);

    this.healthTimer = 1000;
  }

  private applyInput(delta: number): void {
    const effect = accessoryEffect(this.tail);
    const snowFactor = this.skin?.coldM ? 1 : effect?.snowMult ?? this.config.snowSpeed;

    let multiplier =
      (this.buildIndex >= 0 ? 0.5 : 1) *
      (this.itemData.weapons[this.weaponIndex].spdMult ?? 1) *
      (this.skin?.spdMult ?? 1) *
      (this.tail?.spdMult ?? 1) *
      (effect?.spdMult ?? 1) *
      (this.killBuffTimer > 0 ? this.killBuffSpeed : 1) *
      this.powers.speed *
      (this.y <= this.config.snowBiomeTop ? snowFactor : 1) *
      this.slowMult;

    if (!this.zIndex) multiplier *= this.applyWater(delta);

    let dx = this.moveDir != null ? Math.cos(this.moveDir) : 0;
    let dy = this.moveDir != null ? Math.sin(this.moveDir) : 0;
    const length = Math.sqrt(dx * dx + dy * dy);
    if (length !== 0) {
      dx /= length;
      dy /= length;
    }

    if (dx) this.xVel += dx * this.speed * multiplier * delta;
    if (dy) this.yVel += dy * this.speed * multiplier * delta;
  }

  private applyWater(delta: number): number {
    if (inShallows(this.x, this.y)) return 0.75;
    if (this.x < 0) return inFallsWater(this.x, this.y) ? (this.skin?.watrImm ? 0.75 : 0.33) : 1;

    const inRiver =
      this.y >= this.config.mapScale / 2 - this.config.riverWidth / 2 &&
      this.y <= this.config.mapScale / 2 + this.config.riverWidth / 2;
    if (!inRiver) return 1;

    if (this.skin?.watrImm) {
      this.xVel += this.config.waterCurrent * 0.4 * delta;
      return 0.75;
    }
    this.xVel += this.config.waterCurrent * delta;
    return 0.33;
  }

  private integrateMovement(delta: number): void {
    const travel = getDistance(0, 0, this.xVel * delta, this.yVel * delta);
    const steps = clamp(Math.round(travel / 40), 1, 4);
    const stepFraction = 1 / steps;
    const alreadyHit: Record<number, boolean> = {};

    for (let step = 0; step < steps && this.alive; ++step) {
      if (this.xVel) this.x += this.xVel * delta * stepFraction;
      if (this.yVel) this.y += this.yVel * delta * stepFraction;

      if (this.powers.noclip) continue;
      for (const cell of this.objectManager.getGridArrays(this.x, this.y, this.scale)) {
        for (const obj of cell) {
          if (!obj.active || alreadyHit[obj.sid]) continue;
          if (this.objectManager.checkCollision(this, obj, stepFraction)) {
            alreadyHit[obj.sid] = true;
            if (!this.alive) break;
          }
        }
        if (!this.alive) break;
      }
    }

    const selfIndex = this.players.indexOf(this);
    for (let i = selfIndex + 1; i < this.players.length; ++i) {
      const other = this.players[i];
      if (other !== this && other.alive && !this.powers.noclip && !other.powers.noclip) this.objectManager.checkCollision(this, other);
    }
  }

  private applyFriction(delta: number): void {
    if (this.xVel) {
      this.xVel *= Math.pow(this.config.playerDecel, delta);
      if (Math.abs(this.xVel) <= 0.01) this.xVel = 0;
    }
    if (this.yVel) {
      this.yVel *= Math.pow(this.config.playerDecel, delta);
      if (Math.abs(this.yVel) <= 0.01) this.yVel = 0;
    }
  }

  private clampToMap(): void {
    confineToWorld(this, this.config.mapScale);
  }

  private tickWeapon(delta: number): void {
    const weapon = this.itemData.weapons[this.weaponIndex];

    if (this.reloads[this.weaponIndex] > 0) {
      this.reloads[this.weaponIndex] -= delta;
      this.gathering = this.mouseState;
      return;
    }
    if (!this.gathering && !this.autoGather) return;

    let didAct = true;

    if (weapon.gather != null) {
      this.gather();
    } else if (weapon.projectile != null && this.canAfford(weapon, this.skin?.projCost)) {
      this.shoot(weapon.projectile);
    } else {
      didAct = false;
    }

    this.gathering = this.mouseState;
    if (didAct) {
      this.reloads[this.weaponIndex] = (weapon.speed ?? 0) * (this.skin?.atkSpd ?? 1);
    }
  }

  private shoot(projectileIndex: number): void {
    const weapon = this.itemData.weapons[this.weaponIndex];
    this.useRes(weapon, this.skin?.projCost);
    this.noMovTimer = 0;

    const muzzle = this.scale * 2;
    const rangeMult = this.skin?.aMlt ?? 1;
    const type = this.itemData.projectiles[projectileIndex];

    if (weapon.rec) {
      this.xVel -= weapon.rec * Math.cos(this.dir);
      this.yVel -= weapon.rec * Math.sin(this.dir);
    }

    this.projectileManager.addProjectile(
      this.x + muzzle * Math.cos(this.dir),
      this.y + muzzle * Math.sin(this.dir),
      this.dir,
      (type.range ?? 0) * rangeMult,
      (type.speed ?? 0) * rangeMult,
      projectileIndex,
      this,
      null,
      this.zIndex,
    );
  }

  public addWeaponXP(amount: number): void {
    this.weaponXP[this.weaponIndex] = (this.weaponXP[this.weaponIndex] ?? 0) + amount;
  }

  public earnXP(amount: number): void {
    if (this.age >= this.config.maxAge) return;

    this.XP += amount;
    if (this.XP < this.maxXP) {
      this.server?.send(this.id, "T", this.XP);
      return;
    }

    if (this.age < this.config.maxAge) {
      this.age++;
      this.XP = 0;
      this.maxXP *= 1.2;
    } else {
      this.XP = this.maxXP;
    }
    this.upgradePoints++;
    this.server?.send(this.id, "U", this.upgradePoints, this.upgrAge);
    this.server?.send(this.id, "T", this.XP, fixTo(this.maxXP, 1), this.age);
  }

  public addItem(itemId: number): boolean {
    const item = this.itemData.list[itemId];
    if (!item) return false;

    for (let slot = 0; slot < this.items.length; ++slot) {
      if (this.itemData.list[this.items[slot]].group === item.group) {
        if (this.buildIndex === this.items[slot]) this.buildIndex = itemId;
        this.items[slot] = itemId;
        return true;
      }
    }
    this.items.push(itemId);
    return true;
  }

  public addResource(type: number, amount: number, skipXP?: boolean): void {
    if (!skipXP && amount > 0) this.addWeaponXP(amount);
    if (amount > 0) {
      const stat = type === 3 ? "gold" : this.config.resourceTypes[type] as "wood" | "food" | "stone";
      this.stats[stat] += amount;
    }

    if (type === 3) {
      this.awardScore?.(this, amount, true);
      return;
    }
    const name = this.config.resourceTypes[type] as Exclude<ResourceType, "points">;
    this[name] += amount;
    this.server?.send(this.id, "N", name, this[name], 1);
  }

  public changeItemCount(groupId: number, delta: number): void {
    this.itemCounts[groupId] = (this.itemCounts[groupId] ?? 0) + delta;
    this.server?.send(this.id, "S", groupId, this.itemCounts[groupId]);
  }

  public hasRes(item: { req?: (string | number)[] }, costMultiplier?: number): boolean {
    const req = item.req;
    if (!req) return true;
    for (let i = 0; i < req.length; i += 2) {
      const name = req[i] as Exclude<ResourceType, "points">;
      if (this[name] < Math.round((req[i + 1] as number) * (costMultiplier || 1))) return false;
    }
    return true;
  }

  public canAfford(item: { req?: (string | number)[] }, costMultiplier?: number): boolean {
    return this.config.inSandbox || this.hasRes(item, costMultiplier);
  }

  public useRes(item: { req?: (string | number)[] }, costMultiplier?: number): void {
    if (this.config.inSandbox) return;
    const req = item.req;
    if (!req) return;
    for (let i = 0; i < req.length; i += 2) {
      const type = this.config.resourceTypes.indexOf(req[i] as ResourceType);
      this.addResource(type, -Math.round((req[i + 1] as number) * (costMultiplier || 1)));
    }
  }

  public canBuild(item: Item): boolean {
    const limit = this.config.inSandbox
      ? item.group.sandboxLimit ?? Math.max((item.group.limit ?? 0) * 3, 99)
      : item.group.limit;

    if (limit && (this.itemCounts[item.group.id] ?? 0) >= limit) return false;
    return this.canAfford(item);
  }

  public buildItem(item: Item): void {
    const distance = this.scale + item.scale + (item.placeOffset ?? 0);
    const x = this.x + distance * Math.cos(this.dir);
    const y = this.y + distance * Math.sin(this.dir);

    if (!this.canBuild(item)) return;
    if (item.consume && this.skin?.noEat) return;
    if (!item.consume && !this.objectManager.checkItemLocation(x, y, item.scale, 0.6, item.id, false)) return;

    let placed: boolean;

    if (item.consume) {
      placed = this.tryEat(item);
    } else {
      placed = true;
      if (item.group.limit) this.changeItemCount(item.group.id, 1);
      if (item.pps) this.pps += item.pps;
      this.objectManager.add(
        this.objectManager.objects.length, x, y, this.dir, item.scale, item.type ?? null, item, false, this,
      );
    }

    if (placed) {
      this.useRes(item);
      this.buildIndex = -1;
    }
  }

  private tryEat(item: Item): boolean {
    if (this.lastHitTime) {
      const sinceHit = Date.now() - this.lastHitTime;
      this.lastHitTime = 0;
      if (sinceHit <= 120) {
        this.shameCount++;
        if (this.shameCount >= 8) {
          this.shameTimer = 30000;
          this.shameCount = 0;
        }
      } else {
        this.shameCount = Math.max(0, this.shameCount - 2);
      }
    }
    if (this.shameTimer > 0) return false;
    return item.consume!(this) === true;
  }

  public gather(): void {
    const weapon = this.itemData.weapons[this.weaponIndex];
    this.noMovTimer = 0;
    this.slowMult = Math.max(0, this.slowMult - (weapon.hitSlow ?? 0.3));

    const variant = this.config.fetchVariant(this);
    const damageMult = variant.val;
    const range = weapon.range ?? 0;
    const alreadyHit: Record<number, boolean> = {};
    let hitSomething = false;

    for (const cell of this.objectManager.getGridArrays(this.x, this.y, range)) {
      for (const obj of cell) {
        if (!obj.active || obj.dontGather || alreadyHit[obj.sid]) continue;
        if (!obj.visibleToPlayer(this)) continue;

        const distance = getDistance(this.x, this.y, obj.x, obj.y) - obj.scale;
        if (distance > range) continue;
        const angle = getDirection(obj.x, obj.y, this.x, this.y);
        if (getAngleDist(angle, this.dir) > this.config.gatherAngle) continue;

        alreadyHit[obj.sid] = true;

        if (obj.health) {
          const damage = (weapon.dmg ?? 0) * damageMult * (weapon.sDmg ?? 1) * (this.skin?.bDmg ?? 1);
          if (obj.changeHealth(-damage)) {
            const req = obj.req ?? [];
            for (let i = 0; i < req.length; i += 2) {
              this.addResource(this.config.resourceTypes.indexOf(req[i] as ResourceType), req[i + 1] as number);
            }
            this.objectManager.disableObj(obj);
          }
        } else {
          this.earnXP(4 * (weapon.gather ?? 0));

          const bonus = accessoryEffect(this.tail)?.gatherBonus;
          const yieldAmount = (weapon.gather ?? 0) + (obj.type === 3 ? 4 : 0) +
            (bonus && bonus[0] === obj.type ? bonus[1] : 0);
          this.addResource(obj.type ?? 0, yieldAmount);
          if (this.skin?.extraGold) this.addResource(3, 1);
        }

        hitSomething = true;
        this.objectManager.hitObj(obj, angle);
      }
    }

    for (const target of [...this.players, ...this.animals] as Damageable[]) {
      if (target === (this as unknown as Damageable) || !target.alive) continue;
      if (target.team && target.team === this.team) continue;

      const distance = getDistance(this.x, this.y, target.x, target.y) - target.scale * 1.8;
      if (distance > range) continue;
      const angle = getDirection(target.x, target.y, this.x, this.y);
      if (getAngleDist(angle, this.dir) > this.config.gatherAngle) continue;

      this.hitEntity(target, angle, variant);
    }

    this.sendAnimation(hitSomething);
  }

  private hitEntity(target: Damageable, angle: number, variant: WeaponVariant): void {
    const weapon = this.itemData.weapons[this.weaponIndex];
    const damageMult = variant.val;
    const poison = variant.poison === true;

    if (weapon.steal && target.addResource) {
      const stolen = Math.min((target as Player).points ?? 0, weapon.steal);
      this.addResource(3, stolen);
      target.addResource(3, -stolen);
    }

    let multiplier = damageMult;
    if (target.weaponIndex != null) {
      const targetShield = this.itemData.weapons[target.weaponIndex].shield;
      if (targetShield != null && getAngleDist(angle + Math.PI, target.dir) <= this.config.shieldAngle) {
        multiplier = targetShield;
      }
    }

    const baseDamage = weapon.dmg ?? 0;
    const outgoing = baseDamage * (this.skin?.dmgMultO ?? 1) * (this.tail?.dmgMultO ?? 1) * this.outgoingMult();

    const knockback = 0.3 * (target.weightM ?? 1) + (weapon.knock ?? 0);
    target.xVel += knockback * Math.cos(angle);
    target.yVel += knockback * Math.sin(angle);

    if (this.skin?.healD) this.changeHealth(outgoing * multiplier * this.skin.healD, this);
    if (this.tail?.healD) this.changeHealth(outgoing * multiplier * this.tail.healD, this);
    if (variant.lifesteal) this.changeHealth(outgoing * multiplier * variant.lifesteal, this);

    if (target.skin?.dmg) this.changeHealth(-baseDamage * target.skin.dmg, target);
    if (target.tail?.dmg) this.changeHealth(-baseDamage * target.tail.dmg, target);

    if (target.dmgOverTime && !target.skin?.poisonRes) {
      if (this.skin?.poisonDmg) {
        target.dmgOverTime.dmg = this.skin.poisonDmg;
        target.dmgOverTime.time = this.skin.poisonTime ?? 1;
        target.dmgOverTime.doer = this;
      }
      if (poison) {
        target.dmgOverTime.dmg = 5;
        target.dmgOverTime.time = 5;
        target.dmgOverTime.doer = this;
      }
    }

    if (target.isPlayer) this.applyHitEffects(target);

    if (target.skin?.dmgK) {
      this.xVel -= target.skin.dmgK * Math.cos(angle);
      this.yVel -= target.skin.dmgK * Math.sin(angle);
    }

    target.changeHealth(-outgoing * multiplier, this, this);
  }

  private applyHitEffects(target: Damageable): void {
    const effect = accessoryEffect(this.tail);
    if (!effect) return;

    if (effect.hitHeal) this.changeHealth(effect.hitHeal, this);
    if (effect.hitBuff) {
      this.hitBuffTimer = effect.hitBuff.time;
      this.hitBuffMult = effect.hitBuff.dmg;
    }
    const current = target.dmgOverTime;
    if (effect.bleed && current && !((current.dmg ?? 0) > effect.bleed.dmg)) {
      current.dmg = effect.bleed.dmg;
      current.time = effect.bleed.time;
      current.doer = this;
    }
  }

  public outgoingMult(): number {
    return (this.hitBuffTimer > 0 ? this.hitBuffMult : 1) *
      (this.killBuffTimer > 0 ? this.killBuffMult : 1) *
      this.powers.damage;
  }

  public changeHealth(amount: number, doer?: unknown, source?: unknown): boolean {
    if (amount > 0 && this.health >= this.maxHealth) return false;
    if (amount < 0 && this.powers.god) return false;

    if (amount < 0) {
      amount *= this.skin?.dmgMult ?? 1;
      amount *= this.tail?.dmgMult ?? 1;
      this.lastHitTime = Date.now();
    }

    this.health += amount;
    if (this.health > this.maxHealth) {
      amount -= this.health - this.maxHealth;
      this.health = this.maxHealth;
    }
    const dealer = doer as Damageable | undefined;
    if (amount > 0) this.stats.healing += amount;
    else if (dealer?.isPlayer && dealer !== (this as unknown as Damageable) && dealer.stats) {
      dealer.stats.damage -= amount;
    }

    if (this.health <= 0) this.kill(doer as Player | undefined, source);

    for (const player of this.players) {
      if (this.sentTo[player.id]) this.server?.send(player.id, "O", this.sid, this.health);
    }

    const attacker = doer as Damageable | undefined;
    if (attacker?.canSee?.(this) && !(attacker === (this as unknown as Damageable) && amount < 0)) {
      this.server?.send(
        (attacker as Player).id, "8",
        Math.round(this.x), Math.round(this.y), Math.round(-amount), 1,
      );
    }
    return true;
  }

  public kill(killer?: Player, source?: unknown): void {
    if (killer?.isPlayer && killer.alive) {
      killer.kills++;
      const effect = accessoryEffect(killer.tail);
      let reward = killer.skin?.goldSteal ? Math.round(this.points / 2) : Math.round(this.age * 100 * (killer.skin?.kScrM ?? 1));

      if (effect?.leaderKillMult && this.iconIndex === 1) reward *= effect.leaderKillMult;
      const spike = source as { isItem?: boolean; owner?: unknown } | undefined;
      if (effect?.spikeKillMult && spike?.isItem && spike.owner === killer) reward *= effect.spikeKillMult;
      if (effect?.killBuff) {
        killer.killBuffTimer = effect.killBuff.time;
        killer.killBuffMult = effect.killBuff.dmg;
        killer.killBuffSpeed = effect.killBuff.spd;
      }
      this.awardScore?.(killer, reward);
      this.server?.send(killer.id, "N", "kills", killer.kills, 1);
    }

    this.alive = false;
    this.server?.send(this.id, "P");
    this.onDeath?.();
  }

  public sendAnimation(hitSomething: boolean): void {
    for (const player of this.players) {
      if (this.sentTo[player.id] && this.canSee(player)) {
        this.server?.send(player.id, "K", this.sid, hitSomething ? 1 : 0, this.weaponIndex, this.swingSpeed());
      }
    }
  }

  public swingSpeed(): number {
    return fixTo(1 / (this.skin?.atkSpd ?? 1), 2);
  }

  public canSee(target: Positioned | null): boolean {
    if (!target) return false;
    const other = target as Damageable & { noMovTimer?: number; powers?: PlayerPowers };
    if (other !== (this as unknown as Damageable) && other.powers?.invisible) return false;
    if (other.skin?.invisTimer && (other.noMovTimer ?? 0) >= other.skin.invisTimer) return false;

    const dx = Math.abs(target.x - this.x) - target.scale;
    const dy = Math.abs(target.y - this.y) - target.scale;
    return (
      dx <= (this.config.maxScreenWidth / 2) * 1.3 &&
      dy <= (this.config.maxScreenHeight / 2) * 1.3
    );
  }

  public startAnim(didHit: boolean, weaponIndex: number, speedMult?: number): void {
    const duration = (this.itemData.weapons[weaponIndex].speed ?? 300) / (speedMult || 1);
    this.swing.start(duration, didHit ? -this.config.hitAngle : -Math.PI);
  }

  public animate(delta: number): void {
    this.swing.update(delta);
  }
}
