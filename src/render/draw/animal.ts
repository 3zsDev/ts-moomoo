import type { Animal } from "../../entities/Animal";
import { sprites } from "../sprites";

export function renderAnimal(ctx: CanvasRenderingContext2D, animal: Animal): void {
  const image = sprites.animal(animal.src);
  if (!image.isLoaded) return;

  const radius = animal.scale * 1.2 * (animal.spriteMlt ?? 1);
  ctx.drawImage(image, -radius, -radius, radius * 2, radius * 2);
}
