import { assetUrl } from "../../assetBase";
import { ICON_NAMES } from "../../data/assets";

export interface LoadedImage extends HTMLImageElement {
  isLoaded?: boolean;
}

const cache: Record<string, LoadedImage> = {};

export function loadImage(path: string): LoadedImage {
  const cached = cache[path];
  if (cached) return cached;

  const image = new Image() as LoadedImage;
  image.addEventListener("load", () => {
    image.isLoaded = true;
  });
  image.src = path;
  cache[path] = image;
  return image;
}

let imageOverride: ((path: string) => string | undefined) | null = null;

export function setImageOverride(lookup: ((path: string) => string | undefined) | null): void {
  imageOverride = lookup;
}

export function imageUrl(path: string): string {
  return imageOverride?.(path) ?? assetUrl(`img/${path}`);
}

export const sprites = {
  weapon: (name: string) => loadImage(imageUrl(`weapons/${name}.png`)),
  hat: (id: number | string) => loadImage(imageUrl(`hats/hat_${id}.png`)),
  accessory: (id: number | string) => loadImage(imageUrl(`accessories/access_${id}.png`)),
  animal: (name: string) => loadImage(imageUrl(`animals/${name}.png`)),
  icon: (name: string) => loadImage(imageUrl(`icons/${name}.png`)),
};

export const icons = {
  get crown() {
    return sprites.icon("crown");
  },
};

const NAME_TAG_ICONS: ReadonlyArray<string | null> = [
  null, "skull", "crown_gold", "crown_silver", "crown_bronze",
  "skull_crown_gold", "skull_crown_silver", "skull_crown_bronze",
];

export function nameTagIcon(iconIndex: number): LoadedImage | null {
  const name = NAME_TAG_ICONS[iconIndex];
  return name ? sprites.icon(name) : null;
}

export function preloadIcons(): void {
  for (const name of ICON_NAMES) sprites.icon(name);
}

export function warmAnimalSprites(kinds: ReadonlyArray<{ src?: string } | null | undefined>): void {
  for (const kind of kinds) {
    if (kind?.src) sprites.animal(kind.src);
  }
}
