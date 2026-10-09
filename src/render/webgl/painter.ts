import type { LabelPiece, Painter, PainterImage, TextStyle } from "../painter";
import { packColor, parseColor, type Rgba } from "./color";
import { FRAGMENT_SHADER, VERTEX_SHADER } from "./shaders";

const MAX_QUADS = 8192;
const VERTEX_BYTES = 24;
const VERTEX_FLOATS = VERTEX_BYTES / 4;
const MAX_PAGES = 4;
const PADDING = 2;
const CACHE_LIMIT = 1500;
const SHAPE_RADIUS = 128;
const FONT = "Hammersmith One";
const GLYPH_SIZES = [32, 64];

const WHITE: Rgba = [1, 1, 1, 1];

export interface WebGLPainterOptions {
  overlay?: boolean;
  maxPages?: number;
  pageSize?: number;
}

interface Region {
  page: number;
  u0: number;
  v0: number;
  u1: number;
  v1: number;
}

interface Skyline {
  x: number;
  y: number;
  w: number;
}

interface Page {
  texture: WebGLTexture;
  skyline: Skyline[];
  top: number;
  used: number;
}

interface Cached {
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
}

interface Glyph extends Cached {
  advance: number;
  pad: number;
}

interface LabelSprite extends Cached {
  textWidth: number;
  pad: number;
}

export interface WebGLPainter extends Painter {
  drawCalls: number;
  atlasResets: number;
  contextRestores: number;
  atlasInfo(): { pageSize: number; pages: { areaUsed: number; heightReached: number }[]; sprites: number };
}

export function createWebGLPainter(target: HTMLCanvasElement, options: WebGLPainterOptions = {}): WebGLPainter | null {
  const maxPages = Math.max(1, Math.min(MAX_PAGES, options.maxPages ?? MAX_PAGES));
  const gl = target.getContext("webgl", {
    alpha: Boolean(options.overlay),
    antialias: false,
    premultipliedAlpha: true,
    powerPreference: "high-performance",
  });
  if (!gl) return null;

  const pageSize = Math.min(options.pageSize ?? 2048, gl.getParameter(gl.MAX_TEXTURE_SIZE) as number);

  let resolutionUniform: WebGLUniformLocation | null = null;

  const vertexData = new ArrayBuffer(MAX_QUADS * 4 * VERTEX_BYTES);
  const floats = new Float32Array(vertexData);
  const words = new Uint32Array(vertexData);
  let quads = 0;
  let frameDrawCalls = 0;

  let sprites = new Map<PainterImage, Region>();
  let pages: Page[] = [];
  let white: Region = { page: 0, u0: 0, v0: 0, u1: 0, v1: 0 };

  let a = 1;
  let b = 0;
  let c = 0;
  let d = 1;
  let e = 0;
  let f = 0;
  const stack: (number | string)[] = [];

  let pixelScale = 1;

  function setup(): void {
    const compile = (type: number, source: string) => {
      const shader = gl!.createShader(type)!;
      gl!.shaderSource(shader, source);
      gl!.compileShader(shader);
      return shader;
    };
    const program = gl!.createProgram()!;
    gl!.attachShader(program, compile(gl!.VERTEX_SHADER, VERTEX_SHADER));
    gl!.attachShader(program, compile(gl!.FRAGMENT_SHADER, FRAGMENT_SHADER));
    gl!.linkProgram(program);
    gl!.useProgram(program);
    resolutionUniform = gl!.getUniformLocation(program, "uResolution");

    gl!.bindBuffer(gl!.ARRAY_BUFFER, gl!.createBuffer());
    gl!.bufferData(gl!.ARRAY_BUFFER, vertexData.byteLength, gl!.DYNAMIC_DRAW);

    const pos = gl!.getAttribLocation(program, "aPos");
    const uv = gl!.getAttribLocation(program, "aUv");
    const color = gl!.getAttribLocation(program, "aColor");
    const page = gl!.getAttribLocation(program, "aPage");
    for (const location of [pos, uv, color, page]) gl!.enableVertexAttribArray(location);
    gl!.vertexAttribPointer(pos, 2, gl!.FLOAT, false, VERTEX_BYTES, 0);
    gl!.vertexAttribPointer(uv, 2, gl!.FLOAT, false, VERTEX_BYTES, 8);
    gl!.vertexAttribPointer(color, 4, gl!.UNSIGNED_BYTE, true, VERTEX_BYTES, 16);
    gl!.vertexAttribPointer(page, 1, gl!.FLOAT, false, VERTEX_BYTES, 20);
    for (let i = 0; i < MAX_PAGES; i++) gl!.uniform1i(gl!.getUniformLocation(program, `uPage${i}`), i);

    const indices = new Uint16Array(MAX_QUADS * 6);
    for (let i = 0, v = 0; i < indices.length; i += 6, v += 4) {
      indices[i] = v;
      indices[i + 1] = v + 1;
      indices[i + 2] = v + 2;
      indices[i + 3] = v;
      indices[i + 4] = v + 2;
      indices[i + 5] = v + 3;
    }
    gl!.bindBuffer(gl!.ELEMENT_ARRAY_BUFFER, gl!.createBuffer());
    gl!.bufferData(gl!.ELEMENT_ARRAY_BUFFER, indices, gl!.STATIC_DRAW);

    gl!.pixelStorei(gl!.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
    pages = [];
    addPage();
    gl!.enable(gl!.BLEND);
    gl!.blendFunc(gl!.ONE, gl!.ONE_MINUS_SRC_ALPHA);
    gl!.disable(gl!.DEPTH_TEST);
    resetAtlas();
    gl!.uniform2f(resolutionUniform, target.width, target.height);
    gl!.viewport(0, 0, target.width, target.height);
  }

  function addPage(): void {
    const unit = pages.length;
    const texture = gl!.createTexture()!;
    gl!.activeTexture(gl!.TEXTURE0 + unit);
    gl!.bindTexture(gl!.TEXTURE_2D, texture);
    gl!.texImage2D(gl!.TEXTURE_2D, 0, gl!.RGBA, pageSize, pageSize, 0, gl!.RGBA, gl!.UNSIGNED_BYTE, null);
    gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_MIN_FILTER, gl!.LINEAR);
    gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_MAG_FILTER, gl!.LINEAR);
    gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_WRAP_S, gl!.CLAMP_TO_EDGE);
    gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_WRAP_T, gl!.CLAMP_TO_EDGE);
    pages.push({ texture, skyline: [{ x: 0, y: 0, w: pageSize }], top: 0, used: 0 });
    for (let rest = unit + 1; rest < MAX_PAGES; rest++) {
      gl!.activeTexture(gl!.TEXTURE0 + rest);
      gl!.bindTexture(gl!.TEXTURE_2D, texture);
    }
  }

  function resetAtlas(): void {
    sprites = new Map();
    for (const page of pages) {
      page.skyline = [{ x: 0, y: 0, w: pageSize }];
      page.top = 0;
      page.used = 0;
    }
    const block = document.createElement("canvas");
    block.width = block.height = 4;
    const bctx = block.getContext("2d")!;
    bctx.fillStyle = "#fff";
    bctx.fillRect(0, 0, 4, 4);
    const region = upload(block)!;
    const u = (region.u0 + region.u1) / 2;
    const v = (region.v0 + region.v1) / 2;
    white = { page: region.page, u0: u, v0: v, u1: u, v1: v };
  }

  function pack(page: Page, width: number, height: number): { x: number; y: number } | null {
    const w = width + PADDING * 2;
    const h = height + PADDING * 2;
    const skyline = page.skyline;
    let best = -1;
    let bestY = Infinity;
    let bestX = 0;
    for (let i = 0; i < skyline.length; i++) {
      const x = skyline[i].x;
      if (x + w > pageSize) break;
      let y = 0;
      for (let j = i, covered = 0; covered < w; j++) {
        y = Math.max(y, skyline[j].y);
        covered += skyline[j].w;
      }
      if (y + h <= pageSize && y < bestY) {
        bestY = y;
        best = i;
        bestX = x;
      }
    }
    if (best < 0) return null;

    const right = bestX + w;
    let end = best;
    while (end < skyline.length && skyline[end].x + skyline[end].w <= right) end++;
    const placed = { x: bestX, y: bestY + h, w };
    if (end < skyline.length && skyline[end].x < right) {
      const partial = skyline[end];
      skyline.splice(best, end - best + 1, placed, { x: right, y: partial.y, w: partial.x + partial.w - right });
    } else {
      skyline.splice(best, end - best, placed);
    }
    page.top = Math.max(page.top, bestY + h);
    page.used += w * h;
    return { x: bestX + PADDING, y: bestY + PADDING };
  }

  let zeros = new Uint8Array(0);
  function clearPadding(x: number, y: number, width: number, height: number): void {
    const size = Math.max(width, height) + PADDING * 2;
    if (zeros.length < size * PADDING * 4) zeros = new Uint8Array(size * PADDING * 4);
    const put = (px: number, py: number, w: number, h: number) => {
      gl!.texSubImage2D(gl!.TEXTURE_2D, 0, px, py, w, h, gl!.RGBA, gl!.UNSIGNED_BYTE, zeros.subarray(0, w * h * 4));
    };
    put(x - PADDING, y - PADDING, width + PADDING * 2, PADDING);
    put(x - PADDING, y + height, width + PADDING * 2, PADDING);
    put(x - PADDING, y, PADDING, height);
    put(x + width, y, PADDING, height);
  }

  function upload(source: PainterImage): Region | null {
    const width = source.width;
    const height = source.height;
    if (!width || !height || width + PADDING * 2 > pageSize || height + PADDING * 2 > pageSize) return null;

    let page = -1;
    let spot: { x: number; y: number } | null = null;
    for (let i = 0; i < pages.length && !spot; i++) {
      spot = pack(pages[i], width, height);
      if (spot) page = i;
    }
    if (!spot && pages.length < maxPages) {
      addPage();
      page = pages.length - 1;
      spot = pack(pages[page], width, height);
    }
    if (!spot) {
      flush();
      resetAtlas();
      painter.atlasResets++;
      return upload(source);
    }

    gl!.activeTexture(gl!.TEXTURE0 + page);
    clearPadding(spot.x, spot.y, width, height);
    try {
      gl!.texSubImage2D(gl!.TEXTURE_2D, 0, spot.x, spot.y, gl!.RGBA, gl!.UNSIGNED_BYTE, source);
    } catch (error) {
      markUnreadable(source, error);
      return null;
    }
    const region: Region = {
      page,
      u0: spot.x / pageSize,
      v0: spot.y / pageSize,
      u1: (spot.x + width) / pageSize,
      v1: (spot.y + height) / pageSize,
    };
    sprites.set(source, region);
    return region;
  }

  const standIns = new WeakMap<PainterImage, { stand: HTMLImageElement | null }>();
  function markUnreadable(source: PainterImage, error: unknown): void {
    const entry = { stand: null as HTMLImageElement | null };
    standIns.set(source, entry);
    const src = source instanceof HTMLImageElement ? source.src : "";
    console.warn(`[gl2d] can't draw ${src || "a source"}: ${(error as Error)?.message}`);
    if (!src || (source as HTMLImageElement).crossOrigin) return;
    const retry = new Image();
    retry.crossOrigin = "anonymous";
    retry.onload = () => {
      entry.stand = retry;
    };
    retry.src = src;
  }

  function regionOf(source: PainterImage): Region | null {
    const region = sprites.get(source);
    if (region) return region;
    const standIn = standIns.get(source);
    if (standIn) return standIn.stand ? sprites.get(standIn.stand) ?? upload(standIn.stand) : null;
    return upload(source);
  }

  function flush(): void {
    if (!quads) return;
    gl!.bufferSubData(gl!.ARRAY_BUFFER, 0, new Uint8Array(vertexData, 0, quads * 4 * VERTEX_BYTES));
    gl!.drawElements(gl!.TRIANGLES, quads * 6, gl!.UNSIGNED_SHORT, 0);
    quads = 0;
    frameDrawCalls++;
  }

  function vertex(offset: number, x: number, y: number, u: number, v: number, color: number, page: number): void {
    floats[offset] = a * x + c * y + e;
    floats[offset + 1] = b * x + d * y + f;
    floats[offset + 2] = u;
    floats[offset + 3] = v;
    words[offset + 4] = color;
    floats[offset + 5] = page;
  }

  function quad(region: Region, x: number, y: number, width: number, height: number, color: number): void {
    if (quads === MAX_QUADS) flush();
    const right = x + width;
    const bottom = y + height;
    let offset = quads * 4 * VERTEX_FLOATS;
    vertex(offset, x, y, region.u0, region.v0, color, region.page);
    offset += VERTEX_FLOATS;
    vertex(offset, right, y, region.u1, region.v0, color, region.page);
    offset += VERTEX_FLOATS;
    vertex(offset, right, bottom, region.u1, region.v1, color, region.page);
    offset += VERTEX_FLOATS;
    vertex(offset, x, bottom, region.u0, region.v1, color, region.page);
    quads++;
  }

  function solidQuad(points: number[], color: number): void {
    if (quads === MAX_QUADS) flush();
    let offset = quads * 4 * VERTEX_FLOATS;
    for (let i = 0; i < 8; i += 2) {
      vertex(offset, points[i], points[i + 1], white.u0, white.v0, color, white.page);
      offset += VERTEX_FLOATS;
    }
    quads++;
  }

  const cache = new Map<string, Cached>();
  function cached<T extends Cached>(key: string, width: number, height: number, draw: (ctx: CanvasRenderingContext2D) => void): T {
    let entry = cache.get(key) as T | undefined;
    if (entry) return entry;
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.ceil(width * pixelScale));
    canvas.height = Math.max(1, Math.ceil(height * pixelScale));
    const ctx = canvas.getContext("2d")!;
    ctx.scale(pixelScale, pixelScale);
    draw(ctx);
    entry = { canvas, width, height } as T;
    if (cache.size >= CACHE_LIMIT) {
      const oldest = cache.keys().next().value!;
      sprites.delete(cache.get(oldest)!.canvas);
      cache.delete(oldest);
    }
    cache.set(key, entry);
    return entry;
  }

  function drawCached(entry: Cached, x: number, y: number, width: number, height: number, color: string): void {
    const region = regionOf(entry.canvas);
    if (region) quad(region, x, y, width, height, packColor(parseColor(color), painter.globalAlpha));
  }

  function snapX(x: number): number {
    return b === 0 && c === 0 && a !== 0 ? (Math.round(a * x + e) - e) / a : x;
  }
  function snapY(y: number): number {
    return b === 0 && c === 0 && d !== 0 ? (Math.round(d * y + f) - f) / d : y;
  }

  function glyphSize(size: number): number {
    return Number.isInteger(size) && size <= 64 ? size : size <= 40 ? GLYPH_SIZES[0] : GLYPH_SIZES[1];
  }

  let measurer: CanvasRenderingContext2D | null = null;
  function glyph(char: string, size: number, outline: number): Glyph {
    const key = `f|${size}|${outline}|${char}`;
    const existing = cache.get(key) as Glyph | undefined;
    if (existing) return existing;
    measurer ??= document.createElement("canvas").getContext("2d")!;
    measurer.font = `${size}px ${FONT}`;
    const advance = measurer.measureText(char).width;
    const pad = Math.ceil(outline / 2) + 2;
    const width = Math.ceil((advance + pad * 2) * pixelScale) / pixelScale;
    const height = Math.ceil((size * 1.4 + pad * 2) * pixelScale) / pixelScale;
    const entry = cached<Glyph>(key, width, height, (ctx) => {
      ctx.font = `${size}px ${FONT}`;
      ctx.textBaseline = "middle";
      ctx.textAlign = "left";
      if (outline) {
        ctx.lineJoin = "round";
        ctx.lineWidth = outline;
        ctx.strokeStyle = "#fff";
        ctx.strokeText(char, pad, height / 2);
      } else {
        ctx.fillStyle = "#fff";
        ctx.fillText(char, pad, height / 2);
      }
    });
    entry.advance = advance;
    entry.pad = pad;
    return entry;
  }

  function drawGlyphs(value: string, x: number, y: number, size: number, scale: number, outline: number, color: string): void {
    const packed = packColor(parseColor(color), painter.globalAlpha);
    const axisAligned = b === 0 && c === 0 && a !== 0 && d !== 0;
    const snap = (value: number, factor: number) => (axisAligned ? Math.round(value * factor) / factor : value);
    const left = snapX(x);
    const middle = snapY(y);
    let pen = 0;
    for (const char of value) {
      const entry = glyph(char, size, outline);
      const region = regionOf(entry.canvas);
      if (region) {
        quad(
          region,
          left + snap(pen - entry.pad * scale, a),
          middle - snap((entry.height * scale) / 2, d),
          entry.width * scale, entry.height * scale, packed,
        );
      }
      pen += entry.advance * scale;
    }
  }

  function labelSprite(pieces: LabelPiece[], style: { outline?: string; outlineWidth?: number }): LabelSprite {
    const outline = style.outline ? style.outlineWidth ?? 8 : 0;
    let key = `l|${style.outline ?? ""}|${outline}`;
    for (const piece of pieces) key += `|${piece.size}|${piece.color}|${piece.text}`;
    const existing = cache.get(key) as LabelSprite | undefined;
    if (existing) return existing;

    measurer ??= document.createElement("canvas").getContext("2d")!;
    let textWidth = 0;
    let tallest = 0;
    const widths = pieces.map((piece) => {
      measurer!.font = `${piece.size}px ${FONT}`;
      const width = measurer!.measureText(piece.text).width;
      textWidth += width;
      tallest = Math.max(tallest, piece.size);
      return width;
    });
    const pad = Math.ceil(outline / 2) + 2;
    const width = Math.ceil((textWidth + pad * 2) * pixelScale) / pixelScale;
    const height = Math.ceil((tallest * 1.4 + pad * 2) * pixelScale) / pixelScale;
    const entry = cached<LabelSprite>(key, width, height, (ctx) => {
      ctx.textBaseline = "middle";
      ctx.textAlign = "left";
      ctx.lineJoin = "round";
      for (let pass = outline ? 0 : 1; pass < 2; pass++) {
        let left = pad;
        pieces.forEach((piece, i) => {
          ctx.font = `${piece.size}px ${FONT}`;
          if (pass === 0) {
            ctx.lineWidth = outline;
            ctx.strokeStyle = style.outline!;
            ctx.strokeText(piece.text, left, height / 2);
          } else {
            ctx.fillStyle = piece.color;
            ctx.fillText(piece.text, left, height / 2);
          }
          left += widths[i];
        });
      }
    });
    entry.textWidth = textWidth;
    entry.pad = pad;
    return entry;
  }

  const painter: WebGLPainter = {
    kind: "webgl",
    globalAlpha: 1,
    fillStyle: "#000",
    strokeStyle: "#000",
    lineWidth: 1,
    drawCalls: 0,
    atlasResets: 0,
    contextRestores: 0,

    save() {
      stack.push(a, b, c, d, e, f, painter.fillStyle, painter.strokeStyle, painter.lineWidth, painter.globalAlpha);
    },
    restore() {
      if (!stack.length) return;
      painter.globalAlpha = stack.pop() as number;
      painter.lineWidth = stack.pop() as number;
      painter.strokeStyle = stack.pop() as string;
      painter.fillStyle = stack.pop() as string;
      f = stack.pop() as number;
      e = stack.pop() as number;
      d = stack.pop() as number;
      c = stack.pop() as number;
      b = stack.pop() as number;
      a = stack.pop() as number;
    },
    translate(x, y) {
      e += a * x + c * y;
      f += b * x + d * y;
    },
    rotate(angle) {
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      const na = a * cos + c * sin;
      const nb = b * cos + d * sin;
      c = c * cos - a * sin;
      d = d * cos - b * sin;
      a = na;
      b = nb;
    },
    scale(x, y) {
      a *= x;
      b *= x;
      c *= y;
      d *= y;
    },
    setTransform(na, nb, nc, nd, ne, nf) {
      a = na;
      b = nb;
      c = nc;
      d = nd;
      e = ne;
      f = nf;
    },
    resize(scale) {
      flush();
      pixelScale = scale;
      cache.clear();
      gl.viewport(0, 0, target.width, target.height);
      gl.uniform2f(resolutionUniform, target.width, target.height);
    },

    fillRect(x, y, width, height) {
      quad(white, x, y, width, height, packColor(parseColor(painter.fillStyle), painter.globalAlpha));
    },

    drawImage(image, x, y, width, height) {
      const region = regionOf(image);
      if (region) quad(region, x, y, width ?? image.width, height ?? image.height, packColor(WHITE, painter.globalAlpha));
    },

    drawTinted(image, x, y, color, width, height) {
      const region = regionOf(image);
      if (region) quad(region, x, y, width ?? image.width, height ?? image.height, packColor(parseColor(color), painter.globalAlpha));
    },

    line(x1, y1, x2, y2) {
      const half = painter.lineWidth / 2;
      const color = packColor(parseColor(painter.strokeStyle), painter.globalAlpha);
      if (x1 === x2) quad(white, x1 - half, Math.min(y1, y2), painter.lineWidth, Math.abs(y2 - y1), color);
      else if (y1 === y2) quad(white, Math.min(x1, x2), y1 - half, Math.abs(x2 - x1), painter.lineWidth, color);
      else {
        painter.save();
        painter.translate(x1, y1);
        painter.rotate(Math.atan2(y2 - y1, x2 - x1));
        quad(white, 0, -half, Math.hypot(x2 - x1, y2 - y1), painter.lineWidth, color);
        painter.restore();
      }
    },

    circle(x, y, radius, fill, stroke) {
      const extra = Math.round((Math.hypot(a, b) / pixelScale) * 100) / 100;
      const zoom = Math.abs(extra - 1) < 0.01 ? 1 : extra;
      const r = Math.round(radius * zoom * 100) / 100;
      if (fill) {
        const size = (r + 1) * 2;
        const sprite = cached(`cf|${r}`, size, size, (ctx) => {
          ctx.fillStyle = "#fff";
          ctx.beginPath();
          ctx.arc(size / 2, size / 2, r, 0, Math.PI * 2);
          ctx.fill();
        });
        const drawn = size / zoom;
        drawCached(sprite, x - drawn / 2, y - drawn / 2, drawn, drawn, painter.fillStyle);
      }
      if (stroke) {
        const width = Math.round(painter.lineWidth * zoom * 100) / 100;
        const size = (r + width / 2 + 1) * 2;
        const sprite = cached(`cs|${r}|${width}`, size, size, (ctx) => {
          ctx.strokeStyle = "#fff";
          ctx.lineWidth = width;
          ctx.beginPath();
          ctx.arc(size / 2, size / 2, r, 0, Math.PI * 2);
          ctx.stroke();
        });
        const drawn = size / zoom;
        drawCached(sprite, x - drawn / 2, y - drawn / 2, drawn, drawn, painter.strokeStyle);
      }
    },

    disc(x, y, radius) {
      const size = SHAPE_RADIUS * 2 + 2;
      const sprite = cached("cb", size, size, (ctx) => {
        ctx.fillStyle = "#fff";
        ctx.beginPath();
        ctx.arc(size / 2, size / 2, SHAPE_RADIUS, 0, Math.PI * 2);
        ctx.fill();
      });
      const scale = radius / SHAPE_RADIUS;
      drawCached(sprite, x - (size / 2) * scale, y - (size / 2) * scale, size * scale, size * scale, painter.fillStyle);
    },

    polyDisc(x, y, radius) {
      const color = packColor(parseColor(painter.fillStyle), painter.globalAlpha);
      const segments = Math.max(24, Math.min(256, Math.round(radius / 8)));
      let px = x + radius;
      let py = y;
      for (let i = 1; i <= segments; i++) {
        const angle = (i / segments) * Math.PI * 2;
        const nx = x + Math.cos(angle) * radius;
        const ny = y + Math.sin(angle) * radius;
        solidQuad([x, y, px, py, nx, ny, x, y], color);
        px = nx;
        py = ny;
      }
    },

    ring(x, y, radius) {
      const size = SHAPE_RADIUS * 2 + 8;
      const sprite = cached("rb", size, size, (ctx) => {
        ctx.strokeStyle = "#fff";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(size / 2, size / 2, SHAPE_RADIUS, 0, Math.PI * 2);
        ctx.stroke();
      });
      const scale = radius / SHAPE_RADIUS;
      drawCached(sprite, x - (size / 2) * scale, y - (size / 2) * scale, size * scale, size * scale, painter.strokeStyle);
    },

    fillRoundRect(x, y, width, height, radius) {
      if (width <= 0 || height <= 0) return;
      radius = Math.min(radius, width / 2, height / 2);
      if (radius <= 0) {
        painter.fillRect(x, y, width, height);
        return;
      }
      const color = painter.fillStyle;
      const capWidth = radius + 1;
      const sprite = cached(`r|${height}|${radius}|${color}`, capWidth * 2, height, (ctx) => {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(radius, 0);
        ctx.arcTo(capWidth * 2, 0, capWidth * 2, height, radius);
        ctx.arcTo(capWidth * 2, height, 0, height, radius);
        ctx.arcTo(0, height, 0, 0, radius);
        ctx.arcTo(0, 0, capWidth * 2, 0, radius);
        ctx.closePath();
        ctx.fill();
      });
      const region = regionOf(sprite.canvas);
      if (!region) return;
      const tint = packColor(WHITE, painter.globalAlpha);
      const mid = (region.u0 + region.u1) / 2;
      quad({ page: region.page, u0: region.u0, v0: region.v0, u1: mid, v1: region.v1 }, x, y, radius, height, tint);
      quad({ page: region.page, u0: mid, v0: region.v0, u1: region.u1, v1: region.v1 }, x + width - radius, y, radius, height, tint);
      if (width > radius * 2) {
        quad(white, x + radius, y, width - radius * 2, height, packColor(parseColor(color), painter.globalAlpha));
      }
    },

    glow(x, y, outer, inner, color) {
      const sprite = cached(`g|${outer}|${inner}|${color}`, outer * 2, outer * 2, (ctx) => {
        const rgba = parseColor(color);
        const rgb = `${Math.round(rgba[0] * 255)},${Math.round(rgba[1] * 255)},${Math.round(rgba[2] * 255)}`;
        const gradient = ctx.createRadialGradient(outer, outer, inner, outer, outer, outer);
        gradient.addColorStop(0, `rgba(${rgb},1)`);
        gradient.addColorStop(1, `rgba(${rgb},0)`);
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(outer, outer, outer, 0, Math.PI * 2);
        ctx.fill();
      });
      painter.drawImage(sprite.canvas, x - outer, y - outer, outer * 2, outer * 2);
    },

    measureText(value, size) {
      const raster = glyphSize(size);
      let width = 0;
      for (const char of value) width += glyph(char, raster, 0).advance;
      return width * (size / raster);
    },

    text(value, x, y, size, style: TextStyle) {
      value = String(value);
      const raster = glyphSize(size);
      const scale = size / raster;
      const width = painter.measureText(value, size);
      const left = x - width / 2;
      if (style.outline) {
        const outline = Math.round(((style.outlineWidth ?? 8) / scale) * 2) / 2;
        drawGlyphs(value, left, y, raster, scale, outline, style.outline);
      }
      drawGlyphs(value, left, y, raster, scale, 0, style.color);
      return width;
    },

    measureLabel(pieces, style = {}) {
      return labelSprite(pieces, style).textWidth;
    },

    label(pieces, x, y, style = {}) {
      const sprite = labelSprite(pieces, style);
      painter.drawImage(
        sprite.canvas,
        snapX(x - sprite.textWidth / 2 - sprite.pad), snapY(y - sprite.height / 2),
        sprite.width, sprite.height,
      );
      return sprite.textWidth;
    },

    clear() {
      quads = 0;
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
    },

    endFrame() {
      flush();
      painter.drawCalls = frameDrawCalls;
      frameDrawCalls = 0;
    },

    atlasInfo() {
      return {
        pageSize,
        pages: pages.map((page) => ({
          areaUsed: Math.round((page.used / (pageSize * pageSize)) * 100),
          heightReached: Math.round((page.top / pageSize) * 100),
        })),
        sprites: sprites.size,
      };
    },
  };

  target.addEventListener("webglcontextlost", (event) => {
    event.preventDefault();
    quads = 0;
  });
  target.addEventListener("webglcontextrestored", () => {
    setup();
    painter.contextRestores++;
  });

  setup();
  return painter;
}
