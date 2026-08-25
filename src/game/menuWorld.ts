import { config } from "../config";
import { itemData } from "../data/items";
import { objectManager } from "./world";

const TREE = 0;
const BUSH = 1;
const ROCK = 2;

export function createBackgroundMenu(): void {
  const center = config.mapScale / 2;

  const scenery: Array<[number, number, number, number]> = [
    [0, 200, config.treeScales[3], TREE],
    [0, -480, config.treeScales[3], TREE],
    [300, 450, config.treeScales[3], TREE],
    [-950, -130, config.treeScales[2], TREE],
    [-750, -400, config.treeScales[3], TREE],
    [-700, 400, config.treeScales[2], TREE],
    [800, -200, config.treeScales[3], TREE],
    [-260, 340, config.bushScales[2], BUSH],
    [760, 310, config.bushScales[2], BUSH],
    [-800, 100, config.bushScales[2], BUSH],
    [-400, -450, config.rockScales[2], ROCK],
  ];

  let sid = 0;
  for (const [dx, dy, scale, type] of scenery) {
    objectManager.add(sid++, center + dx, center + dy, 0, scale, type);
  }

  const windmill = itemData.list[10];
  const mine = itemData.list[4];
  objectManager.add(sid++, center - 800, center + 300, 0, mine.scale, mine.id, windmill);
  objectManager.add(sid++, center + 650, center - 390, 0, mine.scale, mine.id, windmill);
}
