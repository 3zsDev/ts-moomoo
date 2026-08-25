import type { GameConfig } from "../config";
import type { ItemData } from "../data/items";
import type { ObjectManager } from "../systems/ObjectManager";
import type { GameObject } from "./GameObject";
import type { Damageable, ServerHooks } from "./types";
import { getAngleDist } from "../utils/angles";
import { getDistance, lineInRect } from "../utils/geometry";
import { fixTo } from "../utils/math";

export class Projectile {
  public sid = 0;
  public active = false;

  public indx = 0;
  public x = 0;
  public y = 0;
  public dir = 0;
  public speed = 0;
  public dmg = 0;
  public scale = 0;
  public range = 0;
  public layer = 0;
  public src?: string;
  public owner: Damageable | null = null;
  public ignoreObj?: number | null;

  private skipMovement = true;
  private sentTo: Record<number, boolean> = {};

  public constructor(
    private readonly players: Damageable[],
    private readonly animals: Damageable[],
    private readonly objectManager: ObjectManager,
    private readonly itemData: ItemData,
    private readonly config: GameConfig,
    private readonly server: ServerHooks | null = null,
  ) {}

  public init(
    indx: number,
    x: number,
    y: number,
    dir: number,
    speed: number,
    dmg: number,
    range: number,
    scale: number,
    owner: Damageable | null,
  ): void {
    this.active = true;
    this.indx = indx;
    this.x = x;
    this.y = y;
    this.dir = dir;
    this.skipMovement = true;
    this.speed = speed;
    this.dmg = dmg;
    this.scale = scale;
    this.range = range;
    this.owner = owner;
    if (this.server) this.sentTo = {};
  }

  public update(delta: number): void {
    if (!this.active) return;

    let step = this.speed * delta;

    if (this.skipMovement) {
      this.skipMovement = false;
    } else {
      this.x += step * Math.cos(this.dir);
      this.y += step * Math.sin(this.dir);
      this.range -= step;
      if (this.range <= 0) {
        this.x += this.range * Math.cos(this.dir);
        this.y += this.range * Math.sin(this.dir);
        step = 1;
        this.range = 0;
        this.active = false;
      }
    }

    if (this.server) this.resolveHits(step);
  }

  private resolveHits(step: number): void {
    const server = this.server!;
    const endX = this.x + step * Math.cos(this.dir);
    const endY = this.y + step * Math.sin(this.dir);

    for (const player of this.players) {
      if (!this.sentTo[player.sid] && player.canSee?.(this)) {
        this.sentTo[player.sid] = true;
        server.send(
          player.sid, "X",
          fixTo(this.x, 1), fixTo(this.y, 1), fixTo(this.dir, 2),
          fixTo(this.range, 1), this.speed, this.indx, this.layer, this.sid,
        );
      }
    }

    const candidates: Array<Damageable | GameObject> = [];

    for (const entity of [...this.players, ...this.animals]) {
      if (!entity.alive || entity === this.owner) continue;
      if (this.owner?.team && entity.team === this.owner.team) continue;
      const hit = lineInRect(
        entity.x - entity.scale, entity.y - entity.scale,
        entity.x + entity.scale, entity.y + entity.scale,
        this.x, this.y, endX, endY,
      );
      if (hit) candidates.push(entity);
    }

    for (const cell of this.objectManager.getGridArrays(this.x, this.y, this.scale)) {
      for (const obj of cell) {
        if (!obj.active || this.ignoreObj === obj.sid) continue;
        if (this.layer > obj.layer || obj.ignoreCollision) continue;
        if (candidates.includes(obj)) continue;
        const radius = obj.getScale();
        const hit = lineInRect(
          obj.x - radius, obj.y - radius, obj.x + radius, obj.y + radius,
          this.x, this.y, endX, endY,
        );
        if (hit) candidates.push(obj);
      }
    }

    if (candidates.length === 0) return;

    let closest: Damageable | GameObject | null = null;
    let closestDistance = Infinity;
    for (const candidate of candidates) {
      const distance = getDistance(this.x, this.y, candidate.x, candidate.y);
      if (distance < closestDistance) {
        closestDistance = distance;
        closest = candidate;
      }
    }
    if (!closest) return;

    const entity = closest as Damageable;
    if (entity.isPlayer || entity.isAI) {
      const knockback = 0.3 * (entity.weightM ?? 1);
      entity.xVel += knockback * Math.cos(this.dir);
      entity.yVel += knockback * Math.sin(this.dir);

      const shield = entity.weaponIndex != null ? this.itemData.weapons[entity.weaponIndex].shield : undefined;
      const blocking = shield != null &&
        getAngleDist(this.dir + Math.PI, entity.dir) <= this.config.shieldAngle;
      if (!blocking) entity.changeHealth(-this.dmg, this.owner, this.owner);
    } else {
      const obj = closest as GameObject;
      if (obj.projDmg && obj.health && obj.changeHealth(-this.dmg)) {
        this.objectManager.disableObj(obj);
      }
      for (const player of this.players) {
        if (!player.active) continue;
        if (obj.sentTo[player.sid]) {
          if (obj.active) {
            if (player.canSee?.(obj)) server.send(player.sid, "L", fixTo(this.dir, 2), obj.sid);
          } else {
            server.send(player.sid, "Q", obj.sid);
          }
        }
      }
    }

    this.active = false;
    for (const player of this.players) {
      if (this.sentTo[player.sid]) {
        server.send(player.sid, "Y", this.sid, fixTo(closestDistance, 1));
      }
    }
  }
}
