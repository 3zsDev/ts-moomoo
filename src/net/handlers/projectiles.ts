import { projectileManager, projectiles } from "../../game/world";

export function addProjectile(
  x: number, y: number, dir: number, range: number,
  speed: number, typeIndex: number, layer: number, sid: number,
): void {
  const projectile = projectileManager.addProjectile(x, y, dir, range, speed, typeIndex, null, null, layer);
  projectile.sid = sid;
}

export function removeProjectile(sid: number, range: number): void {
  for (const projectile of projectiles) {
    if (projectile.sid === sid) projectile.range = range;
  }
}
