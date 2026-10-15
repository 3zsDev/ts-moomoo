import { resetChevron } from "../layers/telegraphs";
import { clearItemSprites } from "./itemSprites";
import { clearGameObjectSprites } from "./naturalSprites";

export * from "./imageCache";
export * from "./biome";
export { gameObjectTurn, getGameObjectSprite } from "./naturalSprites";
export { getItemSprite } from "./itemSprites";

export function clearSpriteCaches(): void {
  clearGameObjectSprites();
  clearItemSprites();
  resetChevron();
}
