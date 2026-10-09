import { listAssetPaths } from "../data/assets";
import { assetUrl } from "../assetBase";
import { isDev, isLocal } from "../environment";
import { setImageOverride } from "../render/sprites";
import { byId, createElement, removeAllChildren } from "../utils/dom";

const SECTIONS: [folder: string, title: string][] = [
  ["hats", "Hats"],
  ["accessories", "Accessories"],
  ["weapons", "Weapons"],
  ["animals", "Animals"],
  ["icons", "Icons"],
];
const IMAGE_FILE = /\.(png|jpe?g|webp|gif)$/i;
const MAX_BYTES = 2 * 1024 * 1024;
const DB_NAME = "moo_textures";
const DB_STORE = "files";

const README = `MooMoo.io texture pack (dev)

Edit any of these images and drop the zip (or single images) on the
Texture pack panel in Settings. Keep the folders and file names: a file
the game doesn't have is left out. Images only, 2MB each at most. A pack
is kept in your browser and only you see it.
`;

declare const __TEXTURES__: string[] | undefined;

const TEXTURES =
  typeof __TEXTURES__ !== "undefined"
    ? __TEXTURES__
    : listAssetPaths()
      .map((path) => path.replace(/^img\//, ""))
      .filter((path) => SECTIONS.some(([folder]) => path.startsWith(`${folder}/`)))
      .sort();

const replaced: Record<string, string> = {};
let onTexturesChanged: () => void = () => {};

export function texturePackEnabled(): boolean {
  return isDev() || isLocal();
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(DB_STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function withStore<T>(mode: IDBTransactionMode, work: (store: IDBObjectStore) => T): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(DB_STORE, mode);
        const result = work(tx.objectStore(DB_STORE));
        tx.oncomplete = () => resolve(result);
        tx.onerror = tx.onabort = () => reject(tx.error);
      }),
  );
}

function setUrl(path: string, blob: Blob | null): void {
  if (replaced[path]) URL.revokeObjectURL(replaced[path]);
  if (blob) replaced[path] = URL.createObjectURL(blob);
  else delete replaced[path];
}

function save(changes: [string, Blob | null][]): Promise<void> {
  if (!changes.length) return Promise.resolve();
  return withStore("readwrite", (store) => {
    for (const [path, blob] of changes) {
      if (blob) store.put(blob, path);
      else store.delete(path);
    }
  }).then(() => {
    for (const [path, blob] of changes) setUrl(path, blob);
    onTexturesChanged();
  });
}

function texturePathFor(fileName: string): string | null {
  const parts = String(fileName).replace(/\\/g, "/").split("/").filter(Boolean);
  const lastTwo = parts.slice(-2).join("/").toLowerCase();
  if (TEXTURES.includes(lastTwo)) return lastTwo;
  const base = (parts[parts.length - 1] || "").toLowerCase();
  const matches = TEXTURES.filter((path) => path.split("/")[1] === base);
  return matches.length === 1 ? matches[0] : null;
}

function mimeFor(name: string): string {
  const ext = (IMAGE_FILE.exec(name) || [])[1] || "";
  return "image/" + (ext.toLowerCase() === "jpg" ? "jpeg" : ext.toLowerCase());
}


const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) crc = CRC_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function inflateRaw(bytes: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([bytes as BlobPart]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  return new Response(stream).arrayBuffer().then((buffer) => new Uint8Array(buffer));
}

interface ZipEntry {
  name: string;
  size: number;
  bytes(): Promise<Uint8Array>;
}

function readZip(buffer: ArrayBuffer): ZipEntry[] {
  const view = new DataView(buffer);
  const data = new Uint8Array(buffer);

  let end = -1;
  for (let i = data.length - 22; i >= 0 && i > data.length - 66000; i--) {
    if (view.getUint32(i, true) === 0x06054b50) {
      end = i;
      break;
    }
  }
  if (end < 0) throw new Error("not a zip");

  const count = view.getUint16(end + 10, true);
  let p = view.getUint32(end + 16, true);
  const entries: ZipEntry[] = [];
  for (let i = 0; i < count && p + 46 <= data.length && view.getUint32(p, true) === 0x02014b50; i++) {
    const method = view.getUint16(p + 10, true);
    const packed = view.getUint32(p + 20, true);
    const size = view.getUint32(p + 24, true);
    const nameLength = view.getUint16(p + 28, true);
    const local = view.getUint32(p + 42, true);
    const name = new TextDecoder().decode(data.subarray(p + 46, p + 46 + nameLength));
    p += 46 + nameLength + view.getUint16(p + 30, true) + view.getUint16(p + 32, true);
    if (name.endsWith("/")) continue;

    entries.push({
      name,
      size,
      bytes: () => {
        const start = local + 30 + view.getUint16(local + 26, true) + view.getUint16(local + 28, true);
        const body = data.subarray(start, start + packed);
        if (method === 0) return Promise.resolve(body);
        if (method === 8) return inflateRaw(body);
        return Promise.reject(new Error("compression"));
      },
    });
  }
  return entries;
}

function writeZip(files: { name: string; bytes: Uint8Array }[]): Blob {
  const parts: BlobPart[] = [];
  const central: BlobPart[] = [];
  let offset = 0;

  for (const file of files) {
    const name = new TextEncoder().encode(file.name);
    const crc = crc32(file.bytes);

    const local = new DataView(new ArrayBuffer(30));
    local.setUint32(0, 0x04034b50, true);
    local.setUint16(4, 20, true);
    local.setUint32(14, crc, true);
    local.setUint32(18, file.bytes.length, true);
    local.setUint32(22, file.bytes.length, true);
    local.setUint16(26, name.length, true);

    const header = new DataView(new ArrayBuffer(46));
    header.setUint32(0, 0x02014b50, true);
    header.setUint16(4, 20, true);
    header.setUint16(6, 20, true);
    header.setUint32(16, crc, true);
    header.setUint32(20, file.bytes.length, true);
    header.setUint32(24, file.bytes.length, true);
    header.setUint16(28, name.length, true);
    header.setUint32(42, offset, true);

    parts.push(local.buffer, name, file.bytes as BlobPart);
    central.push(header.buffer, name);
    offset += 30 + name.length + file.bytes.length;
  }

  const centralSize = central.reduce((sum, part) => sum + ((part as ArrayBuffer).byteLength ?? 0), 0);
  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true);
  end.setUint16(8, files.length, true);
  end.setUint16(10, files.length, true);
  end.setUint32(12, centralSize, true);
  end.setUint32(16, offset, true);
  return new Blob([...parts, ...central, end.buffer], { type: "application/zip" });
}

function importZip(file: Blob): Promise<string> {
  return file.arrayBuffer().then((buffer) => {
    const matched: [string, ZipEntry][] = [];
    let skipped = 0;
    for (const entry of readZip(buffer)) {
      const path = IMAGE_FILE.test(entry.name) && entry.size <= MAX_BYTES ? texturePathFor(entry.name) : null;
      if (path) matched.push([path, entry]);
      else if (!/readme/i.test(entry.name)) skipped++;
    }

    return Promise.all(
      matched.map(([path, entry]) =>
        entry.bytes().then((bytes): [string, Blob] => [path, new Blob([bytes as BlobPart], { type: mimeFor(entry.name) })]),
      ),
    ).then((changes) =>
      save(changes).then(() => {
        const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;
        return `${plural(changes.length, "texture")} replaced` +
          (skipped ? ` (${plural(skipped, "file")} not a texture of the game's, left out)` : "");
      }),
    );
  });
}

function replaceOne(path: string, file: File): Promise<void> {
  if (!IMAGE_FILE.test(file.name) && !/^image\//.test(file.type)) return Promise.reject(new Error("That isn't an image"));
  if (file.size > MAX_BYTES) return Promise.reject(new Error("Too big (2MB at most)"));
  return save([[path, file]]);
}

function download(blob: Blob, name: string): void {
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(link.href), 10000);
}

function exportSample(): Promise<void> {
  return Promise.all(
    TEXTURES.map((path) =>
      fetch(replaced[path] || assetUrl(`img/${path}`))
        .then((response) => response.arrayBuffer())
        .then((buffer) => ({ name: path, bytes: new Uint8Array(buffer) }))
        .catch(() => null),
    ),
  ).then((files) => {
    const zip = writeZip([
      { name: "README.txt", bytes: new TextEncoder().encode(README) },
      ...files.filter((file) => file !== null),
    ]);
    download(zip, "moomoo-textures.zip");
  });
}

let card: HTMLElement | null = null;
let status: HTMLElement | null = null;

function say(text: string): void {
  if (status) status.textContent = text || "";
}

function failed(error: unknown): void {
  say((error as Error)?.message || "That didn't work");
}

function pickFile(accept: string, then: (file: File) => void): void {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = accept;
  input.onchange = () => {
    if (input.files?.[0]) then(input.files[0]);
  };
  input.click();
}

function renderPanel(): void {
  if (!card) return;
  const body = card.querySelector<HTMLElement>("#textureBody")!;
  const scroll = body.scrollTop;
  removeAllChildren(body);

  for (const [folder, title] of SECTIONS) {
    const paths = TEXTURES.filter((path) => path.split("/")[0] === folder);
    if (!paths.length) continue;
    const mine = paths.filter((path) => replaced[path]).length;
    createElement({ class: "profileSectionTitle", text: title + (mine ? ` - ${mine} replaced` : ""), parent: body });

    const grid = createElement({ class: "textureGrid", parent: body });
    for (const path of paths) {
      const tile = createElement({ class: "textureTile" + (replaced[path] ? " mine" : ""), parent: grid });
      tile.title = path + (replaced[path] ? " (yours: click the x to put the game's back)" : " - drop an image here, or click to pick one");
      tile.dataset.path = path;

      const image = createElement({ tag: "img", parent: tile }) as HTMLImageElement;
      image.loading = "lazy";
      image.draggable = false;
      image.src = replaced[path] || assetUrl(`img/${path}`);
      createElement({ tag: "span", text: path.split("/")[1].replace(/\.\w+$/, ""), parent: tile });

      tile.onclick = () => {
        pickFile("image/*", (file) => {
          replaceOne(path, file).then(() => say(`${path} replaced`)).catch(failed);
        });
      };

      if (replaced[path]) {
        const reset = createElement({ class: "textureReset", text: "×", parent: tile });
        reset.title = "Put the game's back";
        reset.onclick = (event) => {
          event.stopPropagation();
          save([[path, null]]).then(() => say(`${path} back to the game's`)).catch(failed);
        };
      }
    }
  }
  body.scrollTop = scroll;
}

function clearHover(except?: Element | null): void {
  card?.querySelectorAll(".textureTile.over").forEach((tile) => {
    if (tile !== except) tile.classList.remove("over");
  });
}

function buildPanel(): void {
  card = byId("textureCard");
  card.querySelector(".menuHeader")!.textContent = "Texture pack";
  status = card.querySelector("#textureStatus");

  const bar = card.querySelector<HTMLElement>("#textureBar")!;
  const button = (label: string, run: () => void, kind?: string) =>
    createElement({ class: "friendAction" + (kind ? ` ${kind}` : ""), text: label, parent: bar, onclick: run });

  button("Import zip", () => {
    pickFile(".zip,application/zip", (file) => {
      say("Reading...");
      importZip(file).then(say).catch(failed);
    });
  }, "go");
  button("Export sample zip", () => {
    say("Packing...");
    exportSample().then(() => say("Saved moomoo-textures.zip")).catch(failed);
  });
  button("Clear all", () => {
    save(Object.keys(replaced).map((path): [string, null] => [path, null]))
      .then(() => say("Back to the game's textures"))
      .catch(failed);
  });

  card.querySelector<HTMLElement>("#textureClose")!.onclick = () => {
    card!.style.display = "none";
  };

  card.addEventListener("dragover", (event) => {
    event.preventDefault();
    const tile = (event.target as Element).closest?.(".textureTile") ?? null;
    clearHover(tile);
    tile?.classList.add("over");
  });
  card.addEventListener("dragleave", (event) => {
    if (!card!.contains(event.relatedTarget as Node)) clearHover();
  });
  card.addEventListener("drop", (event) => {
    event.preventDefault();
    clearHover();
    const files = Array.from(event.dataTransfer?.files ?? []);
    if (!files.length) return;

    const zip = files.find((file) => /\.zip$/i.test(file.name));
    if (zip) {
      say("Reading...");
      importZip(zip).then(say).catch(failed);
      return;
    }

    const tile = (event.target as Element).closest?.<HTMLElement>(".textureTile");
    Promise.all(
      files.map((file) => {
        const path = files.length === 1 && tile ? tile.dataset.path! : texturePathFor(file.name);
        return path ? replaceOne(path, file).then(() => 1) : Promise.resolve(0);
      }),
    )
      .then((done) => {
        const count = done.reduce<number>((sum, n) => sum + n, 0);
        say(count
          ? `${count} texture${count === 1 ? "" : "s"} replaced`
          : "Drop an image on the texture it replaces (or name it like the game's file)");
      })
      .catch(failed);
  });
}

export function openTexturePanel(): void {
  if (!card) buildPanel();
  renderPanel();
  say("Drop a .zip here, or an image on the texture it replaces.");
  card!.style.display = "block";
}

export function initTexturePack(texturesChanged: () => void): void {
  if (!texturePackEnabled() || typeof indexedDB === "undefined") return;

  onTexturesChanged = () => {
    renderPanel();
    texturesChanged();
  };
  setImageOverride((path) => replaced[path]);

  const link = byId("textureLink");
  link.style.display = "block";
  link.onclick = openTexturePanel;

  withStore("readonly", (store) => ({ keys: store.getAllKeys(), values: store.getAll() }))
    .then(({ keys, values }) => {
      keys.result.forEach((key, index) => {
        if (TEXTURES.includes(String(key))) setUrl(String(key), values.result[index] as Blob);
      });
      if (Object.keys(replaced).length) onTexturesChanged();
    })
    .catch(() => {});
}
