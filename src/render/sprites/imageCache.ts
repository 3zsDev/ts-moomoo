import { assetUrl } from "../../assetBase";

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

export const sprites = {
  weapon: (name: string) => loadImage(assetUrl(`img/weapons/${name}.png`)),
  hat: (id: number | string) => loadImage(assetUrl(`img/hats/hat_${id}.png`)),
  accessory: (id: number | string) => loadImage(assetUrl(`img/accessories/access_${id}.png`)),
  animal: (name: string) => loadImage(assetUrl(`img/animals/${name}.png`)),
  icon: (name: string) => loadImage(assetUrl(`img/icons/${name}.png`)),
};

export const icons = {
  crown: sprites.icon("crown"),
  skull: sprites.icon("skull"),
};
