import type { GameConfig } from "../config";
import type { Item } from "../data/items";
import { GameObject, type GameObjectOwner } from "../entities/GameObject";
import type { Damageable, ServerHooks } from "../entities/types";
import { getDirection, getDistance } from "../utils/geometry";
import { randInt } from "../utils/math";
import { CollisionGrid } from "./CollisionGrid";

export interface Collider extends Damageable {
  noTrap?: boolean;
  healCol?: number;
  colDmg?: number;
}

export class ObjectManager {
  public readonly objects: GameObject[];
  public readonly updateObjects: GameObject[] = [];

  private readonly grid: CollisionGrid;

  public constructor(
    objects: GameObject[],
    private readonly config: GameConfig,
    private readonly players: Damageable[] = [],
    private readonly server: ServerHooks | null = null,
  ) {
    this.objects = objects;
    this.grid = new CollisionGrid(config.mapScale, config.colGrid);
  }

  public getGridArrays(x: number, y: number, radius: number): GameObject[][] {
    return this.grid.query(x, y, radius);
  }

  public add(
    sid: number,
    x: number,
    y: number,
    dir: number,
    scale: number,
    type: number | null,
    item?: Partial<Item> | null,
    setSid?: boolean,
    owner?: GameObjectOwner | null,
  ): GameObject {
    let obj = this.objects.find((o) => o.sid === sid) ?? this.objects.find((o) => !o.active);
    if (!obj) {
      obj = new GameObject(sid);
      this.objects.push(obj);
    }
    if (setSid) obj.sid = sid;

    obj.init(x, y, dir, scale, type, item, owner);

    if (this.server) {
      this.grid.add(obj);
      if (obj.doUpdate) this.updateObjects.push(obj);
    }
    return obj;
  }

  public disableObj(obj: GameObject): void {
    obj.active = false;
    if (!this.server) return;

    if (obj.owner && obj.pps) obj.owner.pps = (obj.owner.pps ?? 0) - obj.pps;
    this.grid.remove(obj);
    const index = this.updateObjects.indexOf(obj);
    if (index >= 0) this.updateObjects.splice(index, 1);
  }

  public disableBySid(sid: number): void {
    const obj = this.objects.find((o) => o.sid === sid);
    if (obj) this.disableObj(obj);
  }

  public removeAllItems(ownerSid: number, server?: ServerHooks | null): void {
    for (const obj of this.objects) {
      if (obj.active && obj.owner && obj.owner.sid === ownerSid) this.disableObj(obj);
    }
    server?.broadcast("R", ownerSid);
  }

  public fetchSpawnObj(ownerSid: number): [number, number] | null {
    for (const obj of this.objects) {
      if (!obj.active || !obj.owner || obj.owner.sid !== ownerSid || !obj.spawnPoint) continue;
      const position: [number, number] = [obj.x, obj.y];
      this.disableObj(obj);
      this.server?.broadcast("Q", obj.sid);
      if (obj.group) obj.owner.changeItemCount?.(obj.group.id, -1);
      return position;
    }
    return null;
  }

  public checkItemLocation(
    x: number,
    y: number,
    scale: number,
    scaleMultiplier: number,
    itemId: number,
    isConsumable: boolean,
  ): boolean {
    for (const other of this.objects) {
      if (!other.active) continue;
      const radius = other.blocker ?? other.getScale(scaleMultiplier, other.isItem);
      if (getDistance(x, y, other.x, other.y) < scale + radius) return false;
    }

    const riverTop = this.config.mapScale / 2 - this.config.riverWidth / 2;
    const riverBottom = this.config.mapScale / 2 + this.config.riverWidth / 2;
    const inRiver = y >= riverTop && y <= riverBottom;

    // nothing can be built in falls
    if (!isConsumable && x < 0) return false;
    return !(!isConsumable && itemId !== 18 && inRiver);
  }

  public hitObj(obj: GameObject, dir: number): void {
    if (!this.server) return;
    for (const player of this.players) {
      if (!player.active) continue;
      if (obj.sentTo[player.sid]) {
        if (obj.active) {
          if (player.canSee?.(obj)) this.server.send(player.sid, "L", dir, obj.sid);
        } else {
          this.server.send(player.sid, "Q", obj.sid);
        }
      }
      if (!obj.active && obj.owner === (player as unknown as GameObjectOwner) && obj.group) {
        (player as unknown as GameObjectOwner).changeItemCount?.(obj.group.id, -1);
      }
    }
  }

  public checkCollision(mover: Collider, other: GameObject | Collider, stepFraction = 1): boolean {
    const dx = mover.x - other.x;
    const dy = mover.y - other.y;
    let combined = mover.scale + other.scale;

    if (Math.abs(dx) > combined && Math.abs(dy) > combined) return false;

    const otherRadius = "getScale" in other && typeof other.getScale === "function"
      ? other.getScale()
      : other.scale;
    combined = mover.scale + otherRadius;

    const overlap = Math.sqrt(dx * dx + dy * dy) - combined;
    if (overlap > 0) return false;

    const obj = other as GameObject;

    if (obj.ignoreCollision) this.applyPassThroughEffect(mover, obj, stepFraction);
    else this.separateAndDamage(mover, other, obj, overlap, combined);

    if ((obj.zIndex ?? 0) > (mover.zIndex ?? 0)) mover.zIndex = obj.zIndex ?? 0;
    return true;
  }

  private applyPassThroughEffect(mover: Collider, obj: GameObject, stepFraction: number): void {
    const sameTeam = !!obj.owner?.team && obj.owner.team === mover.team;

    if (obj.trap && !mover.noTrap && obj.owner !== (mover as unknown as GameObjectOwner) && !sameTeam) {
      mover.lockMove = true;

      obj.hideFromEnemy = false;
    } else if (obj.boostSpeed) {
      const push = stepFraction * obj.boostSpeed * (obj.weightM ?? 1);
      mover.xVel += push * Math.cos(obj.dir);
      mover.yVel += push * Math.sin(obj.dir);
    } else if (obj.healCol) {
      mover.healCol = obj.healCol;
    } else if (obj.teleport) {
      mover.x = randInt(0, this.config.mapScale);
      mover.y = randInt(0, this.config.mapScale);
    }
  }

  private separateAndDamage(
    mover: Collider,
    other: GameObject | Collider,
    obj: GameObject,
    overlap: number,
    combined: number,
  ): void {
    const pushDir = getDirection(mover.x, mover.y, other.x, other.y);

    if ((other as Collider).isPlayer) {
      const half = (overlap * -1) / 2;
      mover.x += half * Math.cos(pushDir);
      mover.y += half * Math.sin(pushDir);
      other.x -= half * Math.cos(pushDir);
      other.y -= half * Math.sin(pushDir);
    } else {
      mover.x = other.x + combined * Math.cos(pushDir);
      mover.y = other.y + combined * Math.sin(pushDir);
      mover.xVel *= 0.75;
      mover.yVel *= 0.75;
    }

    const sameTeam = !!obj.owner?.team && obj.owner.team === mover.team;
    if (!obj.dmg || obj.owner === (mover as unknown as GameObjectOwner) || sameTeam) return;

    mover.changeHealth(-obj.dmg, obj.owner, obj);

    const knockback = 1.5 * (obj.weightM ?? 1);
    mover.xVel += knockback * Math.cos(pushDir);
    mover.yVel += knockback * Math.sin(pushDir);

    if (obj.pDmg && !mover.skin?.poisonRes && mover.dmgOverTime) {
      mover.dmgOverTime.dmg = obj.pDmg;
      mover.dmgOverTime.time = 5;
      mover.dmgOverTime.doer = obj.owner as unknown as Damageable;
    }

    if (mover.colDmg && obj.health) {
      if (obj.changeHealth(-mover.colDmg)) this.disableObj(obj);
      this.hitObj(obj, getDirection(mover.x, mover.y, obj.x, obj.y));
    }
  }
}
