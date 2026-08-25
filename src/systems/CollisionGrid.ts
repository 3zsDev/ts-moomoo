import type { GameObject } from "../entities/GameObject";
import { clamp } from "../utils/math";

export class CollisionGrid {
  private readonly cells: Record<string, GameObject[]> = {};
  private readonly cellSize: number;

  public constructor(private readonly mapScale: number, private readonly size: number) {
    this.cellSize = mapScale / size;
  }

  public add(obj: GameObject): void {
    const x = clamp(obj.x, 0, this.mapScale);
    const y = clamp(obj.y, 0, this.mapScale);

    for (let gx = 0; gx < this.size; ++gx) {
      const cellLeft = gx * this.cellSize;
      for (let gy = 0; gy < this.size; ++gy) {
        const cellTop = gy * this.cellSize;
        const overlaps =
          x + obj.scale >= cellLeft && x - obj.scale <= cellLeft + this.cellSize &&
          y + obj.scale >= cellTop && y - obj.scale <= cellTop + this.cellSize;
        if (!overlaps) continue;

        const key = `${gx}_${gy}`;
        (this.cells[key] ||= []).push(obj);
        obj.gridLocations.push(key);
      }
    }
  }

  public remove(obj: GameObject): void {
    for (const key of obj.gridLocations) {
      const cell = this.cells[key];
      if (!cell) continue;
      const index = cell.indexOf(obj);
      if (index >= 0) cell.splice(index, 1);
    }
    obj.gridLocations.length = 0;
  }

  public query(x: number, y: number, radius: number): GameObject[][] {
    const gx = Math.floor(x / this.cellSize);
    const gy = Math.floor(y / this.cellSize);
    const result: GameObject[][] = [];

    const push = (cx: number, cy: number) => {
      const cell = this.cells[`${cx}_${cy}`];
      if (cell) result.push(cell);
    };

    push(gx, gy);

    const reachesRight = x + radius >= (gx + 1) * this.cellSize;
    const reachesLeft = gx > 0 && x - radius <= gx * this.cellSize;
    const reachesDown = y + radius >= (gy + 1) * this.cellSize;
    const reachesUp = gy > 0 && y - radius <= gy * this.cellSize;

    if (reachesRight) {
      push(gx + 1, gy);
      if (reachesUp) push(gx + 1, gy - 1);
      else if (reachesDown) push(gx + 1, gy + 1);
    }
    if (reachesLeft) {
      push(gx - 1, gy);
      if (reachesUp) push(gx - 1, gy - 1);
      else if (reachesDown) push(gx - 1, gy + 1);
    }
    if (reachesDown) push(gx, gy + 1);
    if (reachesUp) push(gx, gy - 1);

    return result;
  }
}
