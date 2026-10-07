import { animalTypes } from "../../data/animals";
import type { Animal } from "../../entities/Animal";
import { disc, drawTinted, ring } from "../context";
import { sprites, type LoadedImage } from "../sprites";

const SUBMERGED_TINT = "#0b2a4a";
const SUBMERGED_SCALE = 0.86;

export function renderAnimal(ctx: CanvasRenderingContext2D, animal: Animal): void {
  const image = sprites.animal(animal.src);
  if (!image.isLoaded) return;

  const radius = animal.scale * 1.2 * (animal.spriteMlt ?? 1);
  if (animal.isBoss || animalTypes[animal.index]?.diver) {
    renderDiver(ctx, animal, image, radius, Date.now());
    return;
  }
  ctx.drawImage(image, -radius, -radius, radius * 2, radius * 2);
}

// 1.9 ih: surfaced, diving, submerged and surfacing looks for the crabs
function renderDiver(
  ctx: CanvasRenderingContext2D, animal: Animal, image: LoadedImage, radius: number, now: number,
): void {
  ctx.save();
  const elapsed = now - (animal.stateAt || 0);

  const shadow = (alpha: number, scale: number) => {
    ctx.globalAlpha = alpha;
    drawTinted(ctx, image, -radius * scale, -radius * scale, SUBMERGED_TINT, radius * 2 * scale, radius * 2 * scale);
  };
  const bubbles = (count: number) => {
    ctx.fillStyle = "#ffffff";
    for (let i = 0; i < count; i++) {
      const phase = (now / 900 + i / count) % 1;
      const angle = i * 2.4;
      const distance = radius * (0.3 + (0.5 * ((i * 7) % 5)) / 5);
      ctx.globalAlpha = 0.5 * (1 - phase);
      disc(ctx, Math.cos(angle) * distance, Math.sin(angle) * distance - phase * 30, 7 + 6 * phase);
    }
  };

  if (animal.state === 2) {
    shadow(0.32, SUBMERGED_SCALE);
    bubbles(6);
  } else if (animal.state === 1) {
    const progress = Math.min(1, elapsed / 700);
    const fadeIn = Math.min(1, progress / 0.5);
    const shrink = Math.max(0, (progress - 0.5) / 0.5);
    shadow(0.32 * fadeIn, 1 - (1 - SUBMERGED_SCALE) * shrink);
    if (fadeIn < 1) {
      ctx.globalAlpha = 1 - fadeIn;
      ctx.drawImage(image, -radius, -radius, radius * 2, radius * 2);
    }
  } else if (animal.state === 3) {
    const progress = Math.min(1, elapsed / 1650);
    const rise = Math.min(1, progress / 0.6);
    shadow(0.32 + 0.3 * rise, SUBMERGED_SCALE + (1 - SUBMERGED_SCALE) * rise);
    bubbles(12);
    if (progress > 0.8) {
      ctx.globalAlpha = (progress - 0.8) / 0.2;
      ctx.drawImage(image, -radius, -radius, radius * 2, radius * 2);
    }
  } else {
    ctx.globalAlpha = 0.3;
    ctx.strokeStyle = "#ffffff";
    ring(ctx, 0, 0, radius * (0.92 + 0.05 * Math.sin(now / 300)));
    ctx.globalAlpha = 1;
    ctx.drawImage(image, -radius, -radius, radius * 2, radius * 2);
  }
  ctx.restore();
}
