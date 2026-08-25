import type { GameConfig } from "../config";
import type { ItemData } from "../data/items";
import { Projectile } from "../entities/Projectile";
import type { Damageable, ServerHooks } from "../entities/types";
import type { ObjectManager } from "./ObjectManager";

export class ProjectileManager {
  public constructor(
    readonly projectiles: Projectile[],
    private readonly players: Damageable[],
    private readonly animals: Damageable[],
    private readonly objectManager: ObjectManager,
    private readonly itemData: ItemData,
    private readonly config: GameConfig,
    private readonly server: ServerHooks | null = null,
  ) {}

  public addProjectile(
    x: number,
    y: number,
    dir: number,
    range: number,
    speed: number,
    typeIndex: number,
    owner: Damageable | null,
    ignoreObj?: number | null,
    layer?: number,
  ): Projectile {
    const type = this.itemData.projectiles[typeIndex];

    let projectile = this.projectiles.find((p) => !p.active);
    if (!projectile) {
      projectile = new Projectile(
        this.players, this.animals, this.objectManager,
        this.itemData, this.config, this.server,
      );
      projectile.sid = this.projectiles.length;
      this.projectiles.push(projectile);
    }

    projectile.init(typeIndex, x, y, dir, speed, type.dmg, range, type.scale, owner);
    projectile.ignoreObj = ignoreObj ?? null;
    projectile.layer = layer ?? type.layer;
    projectile.src = type.src;
    return projectile;
  }
}
