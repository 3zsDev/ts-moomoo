import { assetUrl, isExtension } from "../assetBase";

export async function installPageShell(): Promise<void> {
  if (!isExtension()) return;

  let html: string;
  try {
    html = await fetch(assetUrl("index.html")).then((response) => response.text());
  } catch {
    console.error("[ts-moomoo] could not load the page shell; keeping the site's markup");
    return;
  }

  const shell = new DOMParser().parseFromString(html, "text/html");
  for (const script of shell.querySelectorAll("script")) script.remove();

  if (shell.title) document.title = shell.title;

  const nodes = Array.from(shell.body.childNodes, (node) => document.importNode(node, true));
  document.body.replaceChildren(...nodes);
}
