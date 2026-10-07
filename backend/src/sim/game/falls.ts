import { serverConfig } from "../../config";
import {
  type Animal, type AnimalController, type AnimalManager, AnimalState, config, confineToWorld,
  type Damageable, getDirection, getDistance, inFallsWater, type Player, randFloat, randInt,
  ServerPacket, type ServerHooks, turnToward,
} from "../../shared";

const CRAB_KING = 11;
const CRAB = 13;
const CRABLING = 14;
const CRAB_SHELL = 61;

const Telegraph = { Splash: 0, Ring: 1, DiveSplash: 2, Slam: 3, Dash: 4 } as const;

const DIVE_TIME = 700;
const SURFACE_TIME = 1650;

const SLAM_WINDUP = 700;
const DASH_WINDUP = 900;
const DASH_SPEED = 1.6;
const DASH_WIDTH = 200;
const DASH_MAX = 1400;
const SUBMERGED_TIME = 2200;
const SUBMERGED_SPEED = 0.9;
const EMERGE_RADIUS = 420;
const DIVE_INTERVAL = 22000;
const ATTACK_COOLDOWN = 1400;
const IDLE_HEAL = 0.02;
const MAX_SUMMONED = 8;

const RESIDENT_CRABS = 3;
const RESIDENT_CRABLINGS = 4;
const RESIDENT_RESPAWN = 20000;
const DIVER_GIVE_UP = 2500;

export interface FallsHost {
  readonly players: readonly Player[];
  readonly animalManager: AnimalManager;
  readonly hooks: ServerHooks;
}

const falls = config.secretPool;

function randomPoolPoint(margin: number, skipLair = false): [number, number] {
  const pools = skipLair ? falls.pool.slice(1) : falls.pool;
  const [px, py, radius] = pools[randInt(0, pools.length - 1)];
  const angle = randFloat(0, Math.PI * 2);
  const distance = Math.sqrt(Math.random()) * Math.max(0, radius - margin);
  return [px + Math.cos(angle) * distance, py + Math.sin(angle) * distance];
}

function inTheFalls(target: Damageable): boolean {
  return target.x < 0 || inFallsWater(target.x, target.y);
}

export class FallsDirector {
  public readonly crabKillers = new Set<number>();
  private crabKing: Animal | null = null;

  public constructor(private readonly host: FallsHost) {}

  public spawn(): void {
    const [lairX, lairY] = falls.pool[0];
    const king = this.host.animalManager.spawn(lairX, lairY, Math.PI, CRAB_KING);
    king.spawnDelay = serverConfig.crabKingRespawn;
    king.controller = new CrabKingBrain(this, king);
    this.crabKing = king;

    for (let i = 0; i < RESIDENT_CRABS + RESIDENT_CRABLINGS; i++) {
      const type = i < RESIDENT_CRABS ? CRAB : CRABLING;
      const [x, y] = randomPoolPoint(100, true);
      const crab = this.host.animalManager.spawn(x, y, randFloat(0, Math.PI * 2), type);
      crab.spawnDelay = RESIDENT_RESPAWN;
      crab.spawnPoint = () => randomPoolPoint(100, true);
      crab.controller = new DiverBrain(this);
      crab.setState(AnimalState.Submerged);
    }
  }

  public summon(type: number, x: number, y: number): void {
    const summoned = this.host.animalManager.animals.filter(
      (animal) => animal.active && animal.despawnOnDeath && animal.diver,
    ).length;
    if (summoned >= MAX_SUMMONED) return;

    this.telegraph(Telegraph.DiveSplash, x, y, 90, 600);
    const crab = this.host.animalManager.spawn(x, y, randFloat(0, Math.PI * 2), type);
    crab.despawnOnDeath = true;
    const brain = new DiverBrain(this);
    crab.controller = brain;
    brain.surface(crab, null);
  }

  public telegraph(kind: number, x: number, y: number, r: number, duration: number, x2?: number, y2?: number): void {
    const area = { x, y, scale: r + Math.max(Math.abs((x2 ?? x) - x), Math.abs((y2 ?? y) - y)) };
    const args = x2 === undefined ? [kind, x, y, r, duration] : [kind, x, y, r, duration, x2, y2 ?? y];
    for (const player of this.host.players) {
      if (player.alive && player.canSee(area)) {
        this.host.hooks.send(player.id, ServerPacket.BossTelegraph, ...args.map(Math.round));
      }
    }
  }

  public animate(animal: Animal): void {
    for (const player of this.host.players) {
      if (player.alive && player.canSee(animal)) this.host.hooks.send(player.id, ServerPacket.AnimateAI, animal.sid);
    }
  }

  public nearestTarget(from: Animal, range: number): Player | null {
    let best: Player | null = null;
    let bestDistance = range;
    for (const player of this.host.players) {
      if (!player.alive || player.powers.invisible || !inTheFalls(player)) continue;
      const distance = getDistance(from.x, from.y, player.x, player.y);
      if (distance < bestDistance) {
        bestDistance = distance;
        best = player;
      }
    }
    return best;
  }

  public hurtAround(from: Animal, x: number, y: number, radius: number, damage: number, knock: number): void {
    for (const player of this.host.players) {
      if (!player.alive) continue;
      const distance = getDistance(x, y, player.x, player.y);
      if (distance > radius + player.scale) continue;
      this.hurt(from, player, damage, getDirection(player.x, player.y, x, y), knock);
    }
  }

  public hurt(from: Animal, player: Player, damage: number, dir: number, knock: number): void {
    player.changeHealth(-damage, from);
    player.xVel += knock * Math.cos(dir);
    player.yVel += knock * Math.sin(dir);
  }

  public crabKingKilled(killer: Damageable | undefined): void {
    const player = killer as Player | undefined;
    if (!player?.isPlayer) return;

    this.crabKillers.add(player.sid);
    if (!player.skins[CRAB_SHELL]) {
      player.skins[CRAB_SHELL] = 1;
      this.host.hooks.send(player.id, ServerPacket.UpdateStoreItems, 0, CRAB_SHELL, 0);
    }
  }

  public forgetPlayer(sid: number): void {
    this.crabKillers.delete(sid);
  }

  public get boss(): Animal | null {
    return this.crabKing;
  }

  public get players(): readonly Player[] {
    return this.host.players;
  }
}

type BossPhase = "idle" | "slam" | "dashWindup" | "dash" | "dive";

class CrabKingBrain implements AnimalController {
  private phase: BossPhase = "idle";
  private timer = 0;
  private cooldown = ATTACK_COOLDOWN;
  private diveTimer = DIVE_INTERVAL;
  private nextThreshold = 0.75;

  private dashDir = 0;
  private dashLeft = 0;
  private readonly dashHit = new Set<Player>();
  private emergeX = 0;
  private emergeY = 0;

  public constructor(private readonly director: FallsDirector, boss: Animal) {
    boss.setState(AnimalState.Surfaced);
  }

  public update(boss: Animal, delta: number): boolean {
    boss.hitWait = 0;
    boss.xVel = 0;
    boss.yVel = 0;

    switch (this.phase) {
      case "idle": this.idle(boss, delta); break;
      case "slam": this.slam(boss, delta); break;
      case "dashWindup": this.dashWindup(boss, delta); break;
      case "dash": this.dash(boss, delta); break;
      case "dive": this.dive(boss, delta); break;
    }
    return true;
  }

  public onDeath(boss: Animal, killer: Damageable | undefined): void {
    this.director.crabKingKilled(killer);
    this.phase = "idle";
    this.cooldown = ATTACK_COOLDOWN;
    this.diveTimer = DIVE_INTERVAL;
    this.nextThreshold = 0.75;
    boss.setState(AnimalState.Surfaced);
  }

  private idle(boss: Animal, delta: number): void {
    const target = this.director.nearestTarget(boss, boss.viewRange ?? 1800);
    this.cooldown -= delta;

    if (!target) {
      boss.health = Math.min(boss.maxHealth, boss.health + boss.maxHealth * IDLE_HEAL * (delta / 1000));
      const [lairX, lairY] = falls.pool[0];
      if (getDistance(boss.x, boss.y, lairX, lairY) > 60) this.walk(boss, lairX, lairY, delta, 1);
      return;
    }

    this.diveTimer -= delta;
    const distance = getDistance(boss.x, boss.y, target.x, target.y);
    const healthLeft = boss.health / boss.maxHealth;

    if (this.cooldown <= 0 && (this.diveTimer <= 0 || healthLeft <= this.nextThreshold)) {
      while (this.nextThreshold > 0 && healthLeft <= this.nextThreshold) this.nextThreshold -= 0.25;
      this.startDive(boss, target);
    } else if (this.cooldown <= 0 && distance <= (boss.hitRange ?? 400) + target.scale) {
      this.phase = "slam";
      this.timer = boss.hitDelay ?? SLAM_WINDUP;
      this.director.telegraph(Telegraph.Slam, boss.x, boss.y, boss.hitRange ?? 400, this.timer);
    } else if (this.cooldown <= 0 && distance < DASH_MAX + 200) {
      this.startDash(boss, target, distance);
    } else {
      this.walk(boss, target.x, target.y, delta, 1.75);
    }
  }

  private walk(boss: Animal, x: number, y: number, delta: number, speedMult: number): void {
    boss.dir = turnToward(boss.dir, getDirection(x, y, boss.x, boss.y), boss.turnSpeed * delta);
    const speed = boss.speed * speedMult * 200;
    boss.xVel = speed * Math.cos(boss.dir);
    boss.yVel = speed * Math.sin(boss.dir);
  }

  private slam(boss: Animal, delta: number): void {
    this.timer -= delta;
    if (this.timer > 0) return;

    this.director.animate(boss);
    this.director.hurtAround(boss, boss.x, boss.y, boss.hitRange ?? 400, boss.dmg ?? 45, 1);
    this.endAttack();
  }

  private startDash(boss: Animal, target: Player, distance: number): void {
    this.dashDir = getDirection(target.x, target.y, boss.x, boss.y);
    const end = {
      x: boss.x + Math.cos(this.dashDir) * Math.min(distance + 300, DASH_MAX),
      y: boss.y + Math.sin(this.dashDir) * Math.min(distance + 300, DASH_MAX),
      scale: boss.scale, xVel: 0, yVel: 0,
    };
    confineToWorld(end, config.mapScale, true);

    this.dashLeft = getDistance(boss.x, boss.y, end.x, end.y);
    this.dashDir = getDirection(end.x, end.y, boss.x, boss.y);
    boss.dir = this.dashDir;
    this.dashHit.clear();
    this.phase = "dashWindup";
    this.timer = DASH_WINDUP;
    this.director.telegraph(Telegraph.Dash, boss.x, boss.y, DASH_WIDTH, DASH_WINDUP, end.x, end.y);
  }

  private dashWindup(boss: Animal, delta: number): void {
    this.timer -= delta;
    if (this.timer <= 0) this.phase = "dash";
  }

  private dash(boss: Animal, delta: number): void {
    const step = Math.min(this.dashLeft, DASH_SPEED * delta);
    this.dashLeft -= step;
    boss.xVel = (step / delta) * Math.cos(this.dashDir);
    boss.yVel = (step / delta) * Math.sin(this.dashDir);

    for (const player of this.director.players) {
      if (!player.alive || this.dashHit.has(player)) continue;
      if (getDistance(boss.x, boss.y, player.x, player.y) > boss.scale + player.scale) continue;
      this.dashHit.add(player);
      this.director.hurt(boss, player, boss.dmg ?? 45, getDirection(player.x, player.y, boss.x, boss.y), 1.2);
    }

    if (this.dashLeft <= 0) this.endAttack();
  }

  private startDive(boss: Animal, target: Player): void {
    this.phase = "dive";
    this.timer = DIVE_TIME + SUBMERGED_TIME + SURFACE_TIME;
    boss.setState(AnimalState.Diving);

    const emerge = { x: target.x, y: target.y, scale: boss.scale, xVel: 0, yVel: 0 };
    confineToWorld(emerge, config.mapScale, true);
    this.emergeX = emerge.x;
    this.emergeY = emerge.y;
    this.director.telegraph(Telegraph.Ring, this.emergeX, this.emergeY, EMERGE_RADIUS, this.timer);
  }

  private dive(boss: Animal, delta: number): void {
    this.timer -= delta;

    if (boss.state === AnimalState.Diving && this.timer <= SUBMERGED_TIME + SURFACE_TIME) {
      boss.setState(AnimalState.Submerged);
      this.summonCrabs(boss);
    }
    if (boss.state === AnimalState.Submerged) {
      const distance = getDistance(boss.x, boss.y, this.emergeX, this.emergeY);
      if (distance > 1) {
        const step = Math.min(distance, SUBMERGED_SPEED * delta);
        boss.dir = getDirection(this.emergeX, this.emergeY, boss.x, boss.y);
        boss.xVel = (step / delta) * Math.cos(boss.dir);
        boss.yVel = (step / delta) * Math.sin(boss.dir);
      }
      if (this.timer <= SURFACE_TIME) boss.setState(AnimalState.Surfacing);
    }
    if (this.timer > 0) return;

    boss.setState(AnimalState.Surfaced);
    this.director.telegraph(Telegraph.Splash, boss.x, boss.y, EMERGE_RADIUS, 0);
    this.director.hurtAround(boss, boss.x, boss.y, EMERGE_RADIUS, (boss.dmg ?? 45) * 1.5, 1.4);
    this.diveTimer = DIVE_INTERVAL;
    this.endAttack();
  }

  private summonCrabs(boss: Animal): void {
    const missing = 1 - boss.health / boss.maxHealth;
    const crabs = 1 + Math.floor(missing * 3);
    const crablings = 2 + Math.floor(missing * 4);
    for (let i = 0; i < crabs + crablings; i++) {
      const [x, y] = randomPoolPoint(120);
      this.director.summon(i < crabs ? CRAB : CRABLING, x, y);
    }
  }

  private endAttack(): void {
    this.phase = "idle";
    this.cooldown = ATTACK_COOLDOWN;
  }
}

class DiverBrain implements AnimalController {
  private timer = 0;
  private lostFor = 0;

  public constructor(private readonly director: FallsDirector) {}

  public surface(crab: Animal, target: Player | null): void {
    crab.setState(AnimalState.Surfacing);
    crab.chargeTarget = target;
    this.timer = SURFACE_TIME;
  }

  public update(crab: Animal, delta: number): boolean {
    switch (crab.state) {
      case AnimalState.Submerged: {
        const target = this.director.nearestTarget(crab, crab.viewRange ?? 4000);
        if (target) {
          this.surface(crab, target);
        } else {
          if (!randInt(0, 40)) crab.targetDir = randFloat(-Math.PI, Math.PI);
          crab.dir = turnToward(crab.dir, crab.targetDir, crab.turnSpeed * delta);
          crab.xVel = 0.05 * Math.cos(crab.dir);
          crab.yVel = 0.05 * Math.sin(crab.dir);
        }
        return true;
      }

      case AnimalState.Surfacing:
        crab.xVel = 0;
        crab.yVel = 0;
        this.timer -= delta;
        if (this.timer <= 0) {
          crab.setState(AnimalState.Surfaced);
          this.lostFor = 0;
          crab.chargeTarget ??= this.director.nearestTarget(crab, crab.viewRange ?? 4000);
          crab.waitCount = 0;
          crab.moveCount = randInt(8000, 12000);
        }
        return true;

      case AnimalState.Diving:
        crab.xVel = 0;
        crab.yVel = 0;
        this.timer -= delta;
        if (this.timer <= 0) crab.setState(AnimalState.Submerged);
        return true;
    }

    const target = crab.chargeTarget;
    if (target && (!target.alive || !inTheFalls(target))) crab.chargeTarget = null;

    if (crab.chargeTarget) {
      this.lostFor = 0;
    } else {
      this.lostFor += delta;
      if (this.lostFor >= DIVER_GIVE_UP) {
        crab.setState(AnimalState.Diving);
        crab.runFrom = null;
        this.timer = DIVE_TIME;
        return true;
      }
    }
    return false;
  }
}
