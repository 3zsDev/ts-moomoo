const TAMPERED = 0xa5;
const BUNDLE_TIMEOUT = 4000;
const fnToString = Function.prototype.toString;

const guarded: Function[] = [];

let bundle: { digest: Uint8Array; text: string } | null | undefined;

const bundleUrl = import.meta.url || (document.currentScript as HTMLScriptElement | null)?.src || "";

export const bundleReady: Promise<void> = (async () => {
  try {
    if (!bundleUrl) return;
    const source = fetch(bundleUrl, { cache: "force-cache" }).then((response) => response.arrayBuffer());
    const timeout = new Promise<null>((resolve) => setTimeout(resolve, BUNDLE_TIMEOUT, null));
    const bytes = await Promise.race([source, timeout]);
    if (!bytes) return;
    bundle = {
      digest: new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)).subarray(0, 16),
      text: new TextDecoder().decode(bytes),
    };
  } catch {}
})().finally(() => {
  if (bundle === undefined) bundle = null;
});

export function bundleSettled(): boolean {
  return bundle !== undefined;
}

export function bundleName(): string {
  return (/([\w-]+)\.js(?:[?#]|$)/.exec(bundleUrl) || [])[1] || "";
}

export function guard(...functions: Function[]): void {
  guarded.push(...functions);
}

function sealName(): string | null {
  for (const script of document.querySelectorAll<HTMLScriptElement>('script[type="importmap"]')) {
    try {
      const path = JSON.parse(script.textContent ?? "")?.imports?.["moomoo-seal"];
      const name = typeof path === "string" ? /([0-9a-f]{32})\.js$/.exec(path)?.[1] : null;
      if (name) return name;
    } catch {
      // ignore malformed import maps
    }
  }
  return null;
}

export function computeSeal(functions: Function[]): Uint8Array | null {
  try {
    const name = sealName();
    if (!name || !bundle) return null;
    const seal = new Uint8Array(16);
    for (let i = 0; i < seal.length; i++) seal[i] = parseInt(name.substr(i * 2, 2), 16);

    const { digest, text } = bundle;
    const intact = functions.concat(guarded).every((fn) => text.indexOf(fnToString.call(fn)) !== -1);
    for (let i = 0; i < seal.length; i++) seal[i] ^= digest[i] ^ (intact ? 0 : TAMPERED);
    return seal;
  } catch {
    return null;
  }
}

export function hashSeal(seal: Uint8Array, salt: number): number {
  let hash = (2166136261 ^ salt) >>> 0;
  for (let i = 0; i < seal.length; i++) hash = Math.imul(hash ^ seal[i], 16777619);
  hash ^= hash >>> 15;
  hash = Math.imul(hash, 739982445);
  hash ^= hash >>> 12;
  return hash >>> 0;
}
