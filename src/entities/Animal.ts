import type { GameConfig } from "../config";
import type { AnimalType } from "../data/animals";
import type { ObjectManager } from "../systems/ObjectManager";
import { SwingAnimation } from "./SwingAnimation";
import type { Damageable, DamageOverTime, Interpolated, Positioned, ServerHooks } from "./types";
import { turnToward } from "../utils/angles";
import { getDirection, getDistance } from "../utils/geometry";
import { clamp, randFloat, randInt } from "../utils/math";

export type ScoreAward = (player: Damageable, amount: number) => void;
export class Animal implements Damageable, Interpolated {
  public readonly sid: number;
  public readonly isAI = true;
  public readonly nameIndex: number;

  public x = 0;
  public y = 0;
  public xVel = 0;
  public yVel = 0;
  public dir = 0;
  public zIndex = 0;

  public index = 0;
  public src = "";
  public name?: string;
  public nameScale?: number;
  public spriteMlt?: number;

  public active = false;
  public alive = false;
  public health = 0;
  public maxHealth = 0;
  public scale = 0;
  public speed = 0;
  public turnSpeed = 0;
  public weightM = 1;
  public killScore = 0;
  public dmg?: number;
  public colDmg?: number;
  public hostile?: boolean;
  public dontRun?: boolean;
  public chargePlayer?: boolean;
  public viewRange?: number;
  public hitRange?: number;
  public hitDelay?: number;
  public hitScare?: number;
  public leapForce?: number;
  public noTrap?: boolean;
  public drop?: [string, number];
  public spawnDelay?: number;
  public minSpawnRange?: number;
  public maxSpawnRange?: number;

  private startX: number | null = null;
  private startY: number | null = null;
  public hitWait = 0;
  public waitCount = 1000;
  public moveCount = 0;
  public targetDir = 0;
  public runFrom: Damageable | null = null;
  public chargeTarget: Damageable | null = null;
  public lockMove = false;
  public healCol = 0;
  public dmgOverTime: DamageOverTime = {};

  public spawnCounter = 0;

  public readonly swing: SwingAnimation;

  public visible = false;
  public forcePos = false;
  public t1?: number;
  public t2?: number;
  public x1?: number;
  public y1?: number;
  public x2?: number;
  public y2?: number;
  public d1?: number;
  public d2?: number;
  public dt = 0;

  private dotTimer = 0;

  public constructor(
    sid: number,
    private readonly players: Damageable[],
    private readonly objectManager: ObjectManager,
    private readonly config: GameConfig,
    private readonly awardScore: ScoreAward | null,
    private readonly server: ServerHooks | null = null,
  ) {
    this.sid = sid;
    this.nameIndex = randInt(0, config.cowNames.length - 1);
    this.swing = new SwingAnimation(config.hitReturnRatio);
  }

  public get dirPlus(): number {
    return this.swing.offset;
  }

  public init(x: number, y: number, dir: number, index: number, type: AnimalType): void {
    this.x = x;
    this.y = y;
    this.startX = type.fixedSpawn ? x : null;
    this.startY = type.fixedSpawn ? y : null;
    this.xVel = 0;
    this.yVel = 0;
    this.zIndex = 0;
    this.dir = dir;
    this.index = index;

    this.src = type.src;
    if (type.name) this.name = type.name;
    this.nameScale = type.nameScale;
    this.spriteMlt = type.spriteMlt;

    this.weightM = type.weightM;
    this.speed = type.speed;
    this.killScore = type.killScore;
    this.turnSpeed = type.turnSpeed;
    this.scale = type.scale;
    this.maxHealth = type.health;
    this.health = this.maxHealth;
    this.leapForce = type.leapForce;
    this.chargePlayer = type.chargePlayer;
    this.viewRange = type.viewRange;
    this.drop = type.drop;
    this.dmg = type.dmg;
    this.colDmg = type.colDmg;
    this.hostile = type.hostile;
    this.dontRun = type.dontRun;
    this.hitRange = type.hitRange;
    this.hitDelay = type.hitDelay;
    this.hitScare = type.hitScare;
    this.noTrap = type.noTrap;
    this.spawnDelay = type.spawnDelay;
    this.minSpawnRange = type.minSpawnRange;
    this.maxSpawnRange = type.maxSpawnRange;

    this.hitWait = 0;
    this.waitCount = 1000;
    this.moveCount = 0;
    this.targetDir = 0;
    this.active = true;
    this.alive = true;
    this.runFrom = null;
    this.chargeTarget = null;
    this.dmgOverTime = {};
  }

  public update(delta: number): void {
    if (!this.active) return;

    if (this.spawnCounter) {
      this.spawnCounter -= delta;
      if (this.spawnCounter <= 0) {
        this.spawnCounter = 0;
        this.moveToSpawnPoint();
      }
      return;
    }

    this.tickDamageOverTime(delta);

    let charging = false;
    let speedMultiplier = 1;

    const inRiver =
      !this.zIndex && !this.lockMove &&
      this.y >= this.config.mapScale / 2 - this.config.riverWidth / 2 &&
      this.y <= this.config.mapScale / 2 + this.config.riverWidth / 2;
    if (inRiver) {
      speedMultiplier = 0.33;
      this.xVel += this.config.waterCurrent * delta;
    }

    if (this.lockMove) {
      this.xVel = 0;
      this.yVel = 0;
    } else if (this.waitCount > 0) {
      this.waitCount -= delta;
      if (this.waitCount <= 0) this.pickNextAction();
    } else if (this.moveCount > 0) {
      charging = this.walk(delta, speedMultiplier);
    }

    this.zIndex = 0;
    this.lockMove = false;

    this.integrateMovement(delta);

    const swungThisFrame = this.tickMeleeWindup(delta);
    if (charging || swungThisFrame) this.applyContactDamage(swungThisFrame);

    if (this.xVel) this.xVel *= Math.pow(this.config.playerDecel, delta);
    if (this.yVel) this.yVel *= Math.pow(this.config.playerDecel, delta);

    this.clampToMap();
  }

  private tickDamageOverTime(delta: number): void {
    this.dotTimer -= delta;
    if (this.dotTimer > 0) return;

    if (this.dmgOverTime.dmg) {
      this.changeHealth(-this.dmgOverTime.dmg, this.dmgOverTime.doer ?? undefined);
      this.dmgOverTime.time = (this.dmgOverTime.time ?? 0) - 1;
      if (this.dmgOverTime.time <= 0) this.dmgOverTime.dmg = 0;
    }
    this.dotTimer = 1000;
  }

  private pickNextAction(): void {
    if (!this.chargePlayer) {
      this.moveCount = randInt(4000, 10000);
      this.targetDir = randFloat(-Math.PI, Math.PI);
      return;
    }

    let nearest: Damageable | null = null;
    let nearestDistance = Infinity;
    for (const player of this.players) {
      if (!player.alive || player.skin?.bullRepel) continue;
      const distance = getDistance(this.x, this.y, player.x, player.y);
      if (distance <= (this.viewRange ?? 0) && distance < nearestDistance) {
        nearestDistance = distance;
        nearest = player;
      }
    }

    if (nearest) {
      this.chargeTarget = nearest;
      this.moveCount = randInt(8000, 12000);
    } else {
      this.moveCount = randInt(1000, 2000);
      this.targetDir = randFloat(-Math.PI, Math.PI);
    }
  }

  private walk(delta: number, speedMultiplier: number): boolean {
    let charging = false;
    let speed = this.speed * speedMultiplier;

    const fleeing = this.runFrom?.active && !(this.runFrom.isPlayer && !this.runFrom.alive);
    if (fleeing) {
      this.targetDir = getDirection(this.x, this.y, this.runFrom!.x, this.runFrom!.y);
      speed *= 1.42;
    } else if (this.chargeTarget?.alive) {
      this.targetDir = getDirection(this.chargeTarget.x, this.chargeTarget.y, this.x, this.y);
      speed *= 1.75;
      charging = true;
    }
    if (this.hitWait) speed *= 0.3;

    this.dir = turnToward(this.dir, this.targetDir, this.turnSpeed * delta);

    this.xVel += speed * delta * Math.cos(this.dir);
    this.yVel += speed * delta * Math.sin(this.dir);

    this.moveCount -= delta;
    if (this.moveCount <= 0) {
      this.runFrom = null;
      this.chargeTarget = null;
      this.waitCount = this.hostile ? 1500 : randInt(1500, 6000);
    }
    return charging;
  }

  private integrateMovement(delta: number): void {
    const travel = getDistance(0, 0, this.xVel * delta, this.yVel * delta);
    const steps = clamp(Math.round(travel / 40), 1, 4);
    const stepFraction = 1 / steps;

    for (let step = 0; step < steps; ++step) {
      if (this.xVel) this.x += this.xVel * delta * stepFraction;
      if (this.yVel) this.y += this.yVel * delta * stepFraction;

      for (const cell of this.objectManager.getGridArrays(this.x, this.y, this.scale)) {
        for (const obj of cell) {
          if (obj.active) this.objectManager.checkCollision(this, obj, stepFraction);
        }
      }
    }
  }

  private tickMeleeWindup(delta: number): boolean {
    if (this.hitWait <= 0) return false;
    this.hitWait -= delta;
    if (this.hitWait > 0) return false;

    this.hitWait = 0;
    if (this.leapForce && !randInt(0, 2)) {
      this.xVel += this.leapForce * Math.cos(this.dir);
      this.yVel += this.leapForce * Math.sin(this.dir);
    }

    for (const cell of this.objectManager.getGridArrays(this.x, this.y, this.hitRange ?? 0)) {
      for (const obj of cell) {
        if (!obj.health) continue;
        const distance = getDistance(this.x, this.y, obj.x, obj.y);
        if (distance >= obj.scale + (this.hitRange ?? 0)) continue;
        if (obj.changeHealth(-(this.dmg ?? 0) * 5)) this.objectManager.disableObj(obj);
        this.objectManager.hitObj(obj, getDirection(this.x, this.y, obj.x, obj.y));
      }
    }

    for (const player of this.players) {
      if (player.canSee?.(this)) this.server?.send(player.sid, "J", this.sid);
    }
    return true;
  }

  private applyContactDamage(swungThisFrame: boolean): void {
    for (const player of this.players) {
      if (!player?.alive) continue;
      const distance = getDistance(this.x, this.y, player.x, player.y);

      if (this.hitRange) {
        if (this.hitWait || distance > this.hitRange + player.scale) continue;
        if (!swungThisFrame) {
          this.hitWait = this.hitDelay ?? 0;
          continue;
        }
        const knockDir = getDirection(player.x, player.y, this.x, this.y);
        player.changeHealth(-(this.dmg ?? 0), this);
        player.xVel += 0.6 * Math.cos(knockDir);
        player.yVel += 0.6 * Math.sin(knockDir);
        this.runFrom = null;
        this.chargeTarget = null;
        this.waitCount = 3000;
        this.hitWait = randInt(0, 2) ? 0 : 600;
      } else if (distance <= this.scale + player.scale) {
        const knockDir = getDirection(player.x, player.y, this.x, this.y);
        player.changeHealth(-(this.dmg ?? 0), this);
        player.xVel += 0.55 * Math.cos(knockDir);
        player.yVel += 0.55 * Math.sin(knockDir);
      }
    }
  }

  private clampToMap(): void {
    const r = this.scale;
    if (this.x - r < 0) {
      this.x = r;
      this.xVel = 0;
    } else if (this.x + r > this.config.mapScale) {
      this.x = this.config.mapScale - r;
      this.xVel = 0;
    }
    if (this.y - r < 0) {
      this.y = r;
      this.yVel = 0;
    } else if (this.y + r > this.config.mapScale) {
      this.y = this.config.mapScale - r;
      this.yVel = 0;
    }
  }

  private moveToSpawnPoint(): void {
    if (this.minSpawnRange || this.maxSpawnRange) {
      const min = this.config.mapScale * (this.minSpawnRange ?? 0);
      const max = this.config.mapScale * (this.maxSpawnRange ?? 1);
      this.x = randInt(min, max);
      this.y = randInt(min, max);
    } else {
      this.x = this.startX ?? randInt(0, this.config.mapScale);
      this.y = this.startY ?? randInt(0, this.config.mapScale);
    }
  }

  public changeHealth(amount: number, doer?: unknown, source?: unknown): boolean {
    if (!this.active) return true;

    this.health += amount;

    const attacker = source as Damageable | undefined;
    if (attacker) {
      if (this.hitScare && !randInt(0, this.hitScare)) {
        this.runFrom = attacker;
        this.waitCount = 0;
        this.moveCount = 2000;
      } else if (this.hostile && this.chargePlayer && attacker.isPlayer) {
        this.chargeTarget = attacker;
        this.waitCount = 0;
        this.moveCount = 8000;
      } else if (!this.dontRun) {
        this.runFrom = attacker;
        this.waitCount = 0;
        this.moveCount = 2000;
      }
    }

    if (amount < 0 && this.hitRange && randInt(0, 1)) this.hitWait = 500;

    const killer = doer as Damageable | undefined;
    if (killer?.canSee?.(this) && amount < 0) {
      this.server?.send(killer.sid, "8", Math.round(this.x), Math.round(this.y), Math.round(-amount), 1);
    }

    if (this.health > 0) return true;

    if (this.spawnDelay) {
      this.spawnCounter = this.spawnDelay;
      this.x = -1000000;
      this.y = -1000000;
    } else {
      this.moveToSpawnPoint();
    }

    this.health = this.maxHealth;
    this.runFrom = null;

    if (killer) {
      this.awardScore?.(killer, this.killScore);
      if (this.drop) {
        const [resource, amountDropped] = this.drop;
        killer.addResource?.(this.config.resourceTypes.indexOf(resource as never), amountDropped);
      }
    }
    return true;
  }

  public canSee(target: Positioned | null): boolean {
    if (!target) return false;
    const other = target as Damageable & { noMovTimer?: number };
    if (other.skin?.invisTimer && (other.noMovTimer ?? 0) >= other.skin.invisTimer) return false;

    const dx = Math.abs(target.x - this.x) - target.scale;
    const dy = Math.abs(target.y - this.y) - target.scale;
    return (
      dx <= (this.config.maxScreenWidth / 2) * 1.3 &&
      dy <= (this.config.maxScreenHeight / 2) * 1.3
    );
  }

  public startAnim(): void {
    this.swing.start(600, Math.PI * 0.8);
  }

  public animate(delta: number): void {
    this.swing.update(delta);
  }
}
