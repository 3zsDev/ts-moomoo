import { TAU } from "../../utils/math";
import type { LabelPiece, Painter, PainterImage, TextStyle } from "../painter";
import { renderRoundRect } from "./shapes";

const FONT = "Hammersmith One";

function transparent(color: string): string {
  if (color.startsWith("#") && (color.length === 7 || color.length === 4)) {
    const full = color.length === 4
      ? "#" + color[1] + color[1] + color[2] + color[2] + color[3] + color[3]
      : color;
    return `rgba(${parseInt(full.slice(1, 3), 16)},${parseInt(full.slice(3, 5), 16)},${parseInt(full.slice(5, 7), 16)},0)`;
  }
  return "rgba(255,255,255,0)";
}

const tintCache = new WeakMap<PainterImage, Map<string, HTMLCanvasElement>>();

function tinted(image: PainterImage, color: string): HTMLCanvasElement {
  let byColor = tintCache.get(image);
  if (!byColor) {
    byColor = new Map();
    tintCache.set(image, byColor);
  }
  let canvas = byColor.get(color);
  if (!canvas) {
    canvas = document.createElement("canvas");
    canvas.width = image.width;
    canvas.height = image.height;
    const tctx = canvas.getContext("2d")!;
    tctx.drawImage(image, 0, 0);
    tctx.globalCompositeOperation = "multiply";
    tctx.fillStyle = color;
    tctx.fillRect(0, 0, canvas.width, canvas.height);
    tctx.globalCompositeOperation = "destination-in";
    tctx.drawImage(image, 0, 0);
    byColor.set(color, canvas);
  }
  return canvas;
}

export function createCanvasPainter(target: HTMLCanvasElement): Painter {
  const ctx = target.getContext("2d")!;

  const setFont = (size: number) => {
    ctx.font = `${size}px ${FONT}`;
  };

  const painter: Painter = {
    kind: "canvas",

    get globalAlpha() {
      return ctx.globalAlpha;
    },
    set globalAlpha(value: number) {
      ctx.globalAlpha = value;
    },
    get fillStyle() {
      return ctx.fillStyle as string;
    },
    set fillStyle(value: string) {
      ctx.fillStyle = value;
    },
    get strokeStyle() {
      return ctx.strokeStyle as string;
    },
    set strokeStyle(value: string) {
      ctx.strokeStyle = value;
    },
    get lineWidth() {
      return ctx.lineWidth;
    },
    set lineWidth(value: number) {
      ctx.lineWidth = value;
    },

    save: () => ctx.save(),
    restore: () => ctx.restore(),
    translate: (x, y) => ctx.translate(x, y),
    rotate: (angle) => ctx.rotate(angle),
    scale: (x, y) => ctx.scale(x, y),
    setTransform: (a, b, c, d, e, f) => ctx.setTransform(a, b, c, d, e, f),
    resize: () => {},

    fillRect: (x, y, width, height) => ctx.fillRect(x, y, width, height),

    fillRoundRect(x, y, width, height, radius) {
      if (width <= 0 || height <= 0) return;
      renderRoundRect(ctx, x, y, width, height, radius);
      ctx.fill();
    },

    drawImage(image, x, y, width, height) {
      if (width === undefined || height === undefined) ctx.drawImage(image, x, y);
      else ctx.drawImage(image, x, y, width, height);
    },

    drawTinted(image, x, y, color, width, height) {
      if (!image.width || !image.height) return;
      ctx.drawImage(tinted(image, color), x, y, width ?? image.width, height ?? image.height);
    },

    line(x1, y1, x2, y2) {
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    },

    circle(x, y, radius, fill, stroke) {
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, TAU);
      if (fill) ctx.fill();
      if (stroke) ctx.stroke();
    },

    disc(x, y, radius) {
      if (radius <= 0) return;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, TAU);
      ctx.fill();
    },

    polyDisc(x, y, radius) {
      painter.disc(x, y, radius);
    },

    ring(x, y, radius) {
      if (radius <= 0) return;
      ctx.save();
      ctx.lineWidth = (3 * radius) / 128;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, TAU);
      ctx.stroke();
      ctx.restore();
    },

    glow(x, y, outer, inner, color) {
      const gradient = ctx.createRadialGradient(x, y, inner, x, y, outer);
      gradient.addColorStop(0, color);
      gradient.addColorStop(1, transparent(color));
      ctx.save();
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(x, y, outer, 0, TAU);
      ctx.fill();
      ctx.restore();
    },

    measureText(value, size) {
      setFont(size);
      return ctx.measureText(value).width;
    },

    text(value, x, y, size, style: TextStyle) {
      setFont(size);
      ctx.textBaseline = "middle";
      ctx.textAlign = "center";
      if (style.outline) {
        ctx.lineJoin = "round";
        ctx.lineWidth = style.outlineWidth ?? 8;
        ctx.strokeStyle = style.outline;
        ctx.strokeText(value, x, y);
      }
      ctx.fillStyle = style.color;
      ctx.fillText(value, x, y);
      return ctx.measureText(value).width;
    },

    measureLabel(pieces: LabelPiece[]) {
      let width = 0;
      for (const piece of pieces) width += painter.measureText(piece.text, piece.size);
      return width;
    },

    label(pieces, x, y, style = {}) {
      const width = painter.measureLabel(pieces, style);
      ctx.textBaseline = "middle";
      ctx.textAlign = "left";
      ctx.lineJoin = "round";
      for (const pass of style.outline ? [0, 1] : [1]) {
        let left = x - width / 2;
        for (const piece of pieces) {
          setFont(piece.size);
          if (pass === 0) {
            ctx.lineWidth = style.outlineWidth ?? 8;
            ctx.strokeStyle = style.outline!;
            ctx.strokeText(piece.text, left, y);
          } else {
            ctx.fillStyle = piece.color;
            ctx.fillText(piece.text, left, y);
          }
          left += ctx.measureText(piece.text).width;
        }
      }
      return width;
    },

    clear() {
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, target.width, target.height);
      ctx.restore();
    },

    endFrame: () => {},
  };
  return painter;
}
