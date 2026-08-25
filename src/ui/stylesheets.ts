import { assetUrl, isExtension } from "../assetBase";

const SHEETS = [
  "css/main.css",
  "css/material-icons.css",
  "css/hammersmith-one.css",
  "css/overrides.css",
];

export async function injectStylesheets(): Promise<void> {
  if (!isExtension()) return;

  const sources = await Promise.all(
    SHEETS.map(async (sheet) => {
      try {
        const text = await fetch(assetUrl(sheet)).then((response) => response.text());
        return rewriteUrls(text);
      } catch {
        console.error(`[ts-moomoo] could not load ${sheet}`);
        return "";
      }
    }),
  );

  for (const css of sources) {
    if (!css) continue;
    const style = document.createElement("style");
    style.textContent = css;
    document.head.appendChild(style);
  }
}

function rewriteUrls(css: string): string {
  return css.replace(/url\(\s*['"]?([^'")]+)['"]?\s*\)/g, (match, ref: string) => {
    const target = ref.trim();
    if (/^(https?:|data:)/.test(target)) return match;
    return `url("${assetUrl(resolveFromCssDir(target))}")`;
  });
}

function resolveFromCssDir(ref: string): string {
  return new URL(ref, "https://ts-moomoo.invalid/css/").pathname.replace(/^\/+/, "");
}
