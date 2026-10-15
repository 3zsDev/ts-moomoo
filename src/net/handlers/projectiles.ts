import { projectileManager, projectiles } from "../../game/world";

let windowFocused = true;
window.addEventListener("blur", () => {
  windowFocused = false;
});
window.addEventListener("focus", () => {
  windowFocused = true;
});

export function addProjectile(
  x: number, y: number, dir: number, range: number,
  speed: number, typeIndex: number, layer: number, sid: number,
): void {
  if (!windowFocused) return;
  const projectile = projectileManager.addProjectile(x, y, dir, range, speed, typeIndex, null, null, layer);
  projectile.sid = sid;
}

export function removeProjectile(sid: number, range: number): void {
  for (const projectile of projectiles) {
    if (projectile.sid === sid) projectile.range = range;
  }
}
