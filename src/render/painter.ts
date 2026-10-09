// since game now uses webgl, this is the new api for swapping between canvas and webgl
export type PainterImage = HTMLImageElement | HTMLCanvasElement;

export interface TextStyle {
  color: string;
  outline?: string;
  outlineWidth?: number;
}

export interface LabelPiece {
  text: string;
  size: number;
  color: string;
}

export interface Painter {
  readonly kind: "canvas" | "webgl";

  globalAlpha: number;
  fillStyle: string;
  strokeStyle: string;
  lineWidth: number;

  save(): void;
  restore(): void;
  translate(x: number, y: number): void;
  rotate(angle: number): void;
  scale(x: number, y: number): void;
  setTransform(a: number, b: number, c: number, d: number, e: number, f: number): void;
  resize(pixelScale: number): void;

  fillRect(x: number, y: number, width: number, height: number): void;
  fillRoundRect(x: number, y: number, width: number, height: number, radius: number): void;
  drawImage(image: PainterImage, x: number, y: number, width?: number, height?: number): void;
  drawTinted(image: PainterImage, x: number, y: number, color: string, width?: number, height?: number): void;
  line(x1: number, y1: number, x2: number, y2: number): void;
  circle(x: number, y: number, radius: number, fill: boolean, stroke: boolean): void;
  disc(x: number, y: number, radius: number): void;
  polyDisc(x: number, y: number, radius: number): void;
  ring(x: number, y: number, radius: number): void;
  glow(x: number, y: number, outer: number, inner: number, color: string): void;

  text(value: string, x: number, y: number, size: number, style: TextStyle): number;
  measureText(value: string, size: number): number;
  label(pieces: LabelPiece[], x: number, y: number, style?: { outline?: string; outlineWidth?: number }): number;
  measureLabel(pieces: LabelPiece[], style?: { outline?: string; outlineWidth?: number }): number;

  clear(): void;
  endFrame(): void;
}
