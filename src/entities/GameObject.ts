import type { Item, ItemGroup } from "../data/items";

export interface GameObjectOwner {
  sid: number;
  team?: string | null;
  pps?: number;
  changeItemCount?(groupId: number, delta: number): void;
}

export class GameObject {
  public sid: number;

  public x = 0;
  public y = 0;
  public dir = 0;
  public scale = 0;

  public xWiggle = 0;
  public yWiggle = 0;

  public active = false;
  public type: number | null = null;
  public id: number | null = null;
  public isItem = false;
  public group: ItemGroup | null = null;
  public name?: string;
  public owner: GameObjectOwner | null = null;

  public layer = 2;
  public zIndex = 0;

  public health = 0;
  public req?: (string | number)[];

  public colDiv = 1;
  public blocker?: number;
  public weightM?: number;
  public ignoreCollision?: boolean;
  public dontGather?: boolean;
  public hideFromEnemy?: boolean;
  public friction?: number;
  public projDmg?: boolean;
  public dmg?: number;
  public pDmg?: number;
  public pps?: number;
  public turnSpeed?: number;
  public trap?: boolean;
  public healCol?: number;
  public teleport?: boolean;
  public boostSpeed?: number;
  public spawnPoint?: boolean;

  public doUpdate?: boolean;
  public projectile?: number;
  public shootRange?: number;
  public shootRate?: number;
  public shootCount = 0;

  public sentTo: Record<number, boolean> = {};

  public gridLocations: string[] = [];

  public constructor(sid: number) {
    this.sid = sid;
  }

  public init(
    x: number,
    y: number,
    dir: number,
    scale: number,
    type: number | null,
    item?: Partial<Item> | null,
    owner?: GameObjectOwner | null,
  ): void {
    const data = (item || {}) as Partial<Item> & { dontGather?: boolean; friction?: number };

    this.sentTo = {};
    this.gridLocations = [];
    this.active = true;

    this.x = x;
    this.y = y;
    this.dir = dir;
    this.xWiggle = 0;
    this.yWiggle = 0;
    this.scale = scale;
    this.type = type;

    this.id = data.id ?? null;
    this.owner = owner ?? null;
    this.name = data.name;
    this.isItem = this.id != null;
    this.group = data.group ?? null;
    this.health = data.health ?? 0;

    this.layer = 2;
    if (this.group != null) this.layer = this.group.layer;
    else if (this.type === 0) this.layer = 3;
    else if (this.type === 2) this.layer = 0;

    this.colDiv = data.colDiv ?? 1;
    this.blocker = data.blocker;
    this.ignoreCollision = data.ignoreCollision;
    this.dontGather = data.dontGather;
    this.hideFromEnemy = data.hideFromEnemy;
    this.friction = data.friction;
    this.projDmg = data.projDmg;
    this.dmg = data.dmg;
    this.pDmg = data.pDmg;
    this.pps = data.pps;
    this.zIndex = data.zIndex ?? 0;
    this.turnSpeed = data.turnSpeed;
    this.req = data.req as (string | number)[] | undefined;
    this.trap = data.trap;
    this.healCol = data.healCol;
    this.teleport = data.teleport;
    this.boostSpeed = data.boostSpeed;
    this.doUpdate = data.doUpdate;
    this.projectile = data.projectile;
    this.shootRange = data.shootRange;
    this.shootRate = data.shootRate;
    this.shootCount = data.shootRate ?? 0;
    this.spawnPoint = data.spawnPoint;
  }

  public changeHealth(amount: number): boolean {
    this.health += amount;
    return this.health <= 0;
  }

  public getScale(multiplier = 1, ignoreColDiv?: boolean): number {
    const naturalShrink = this.isItem || this.type === 2 || this.type === 3 ? 1 : 0.6 * multiplier;
    return this.scale * naturalShrink * (ignoreColDiv ? 1 : this.colDiv);
  }

  public visibleToPlayer(viewer: GameObjectOwner): boolean {
    if (!this.hideFromEnemy) return true;
    if (!this.owner) return false;
    return this.owner === viewer || (!!this.owner.team && viewer.team === this.owner.team);
  }

  public update(delta: number): void {
    if (!this.active) return;
    if (this.xWiggle) this.xWiggle *= Math.pow(0.99, delta);
    if (this.yWiggle) this.yWiggle *= Math.pow(0.99, delta);
    if (this.turnSpeed) this.dir += this.turnSpeed * delta;
  }
}
