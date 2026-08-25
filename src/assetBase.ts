const BRIDGE_ATTRIBUTE = "tsmoomooAssets";

let base: string | null = null;

function assetBase(): string {
  if (base !== null) return base;

  const injected = document.documentElement.dataset[BRIDGE_ATTRIBUTE];
  base = injected && injected.length > 0 ? injected : "./";
  return base;
}

export function assetUrl(path: string): string {
  return assetBase() + path;
}

export function isExtension(): boolean {
  return assetBase() !== "./";
}
