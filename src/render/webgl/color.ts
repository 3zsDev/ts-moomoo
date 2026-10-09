export type Rgba = [number, number, number, number];

const cache = new Map<string, Rgba>();
let resolver: CanvasRenderingContext2D | null = null;

export function parseColor(color: string): Rgba {
  let rgba = cache.get(color);
  if (rgba) return rgba;

  let match: RegExpExecArray | null;
  if ((match = /^#([0-9a-f]{3})$/i.exec(color))) {
    const hex = match[1];
    rgba = [
      parseInt(hex[0] + hex[0], 16) / 255, parseInt(hex[1] + hex[1], 16) / 255, parseInt(hex[2] + hex[2], 16) / 255, 1,
    ];
  } else if ((match = /^#([0-9a-f]{6})$/i.exec(color))) {
    const value = parseInt(match[1], 16);
    rgba = [(value >> 16) / 255, ((value >> 8) & 255) / 255, (value & 255) / 255, 1];
  } else if ((match = /^rgba?\(([^)]+)\)$/i.exec(color))) {
    const parts = match[1].split(",").map(Number);
    rgba = [parts[0] / 255, parts[1] / 255, parts[2] / 255, parts.length > 3 ? parts[3] : 1];
  } else {
    resolver ??= document.createElement("canvas").getContext("2d")!;
    resolver.fillStyle = "#000";
    resolver.fillStyle = color;
    const normalised = resolver.fillStyle as string;
    rgba = normalised === color ? [0, 0, 0, 1] : parseColor(normalised);
  }
  cache.set(color, rgba);
  return rgba;
}

// premultiplied
export function packColor(rgba: Rgba, alpha: number): number {
  const a = rgba[3] * alpha;
  return (
    (Math.round(a * 255) << 24) |
    (Math.round(rgba[2] * a * 255) << 16) |
    (Math.round(rgba[1] * a * 255) << 8) |
    Math.round(rgba[0] * a * 255)
  ) >>> 0;
}
