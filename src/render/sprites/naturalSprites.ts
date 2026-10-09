import { outlineWidth, paletteColors } from "../../config";
import type { GameObject } from "../../entities/GameObject";
import { randInt, TAU } from "../../utils/math";
import { renderBlob, renderCircle, renderStar } from "../canvas/shapes";
import { Biome, biomeAt } from "./biome";

const cache: Record<string, HTMLCanvasElement> = {};

export function getGameObjectSprite(obj: GameObject): HTMLCanvasElement {
  const biome = biomeAt(obj.y);
  const key = `${obj.type}_${obj.scale}_${biome}`;

  const cached = cache[key];
  if (cached) return cached;

  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = obj.scale * 2.1 + outlineWidth;

  const ctx = canvas.getContext("2d")!;
  ctx.translate(canvas.width / 2, canvas.height / 2);

  ctx.rotate(Math.random() * Math.PI);
  ctx.strokeStyle = paletteColors.outline;
  ctx.lineWidth = outlineWidth;
  ctx.lineJoin = "round";

  switch (obj.type) {
    case 0:
      renderTree(ctx, obj, biome);
      break;
    case 1:
      renderBush(ctx, obj, biome);
      break;
    case 2:
    case 3:
      renderRock(ctx, obj, biome);
      break;
  }

  cache[key] = canvas;
  return canvas;
}

function renderTree(ctx: CanvasRenderingContext2D, obj: GameObject, biome: Biome): void {
  const points = obj.sid % 2 === 0 ? 5 : 7;

  for (let layer = 0; layer < 2; ++layer) {
    const radius = obj.scale * (layer ? 0.5 : 1);
    renderStar(ctx, points, radius, radius * 0.7);
    ctx.fillStyle = biome
      ? layer ? "#fff" : "#e3f1f4"
      : layer ? "#b4db62" : "#9ebf57";
    ctx.fill();
    if (!layer) ctx.stroke();
  }
}

function renderBush(ctx: CanvasRenderingContext2D, obj: GameObject, biome: Biome): void {
  if (biome === Biome.Desert) {
    ctx.fillStyle = "#606060";
    renderStar(ctx, 6, obj.scale * 0.3, obj.scale * 0.71);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#89a54c";
    renderCircle(ctx, 0, 0, obj.scale * 0.55);
    ctx.fillStyle = "#a5c65b";
    renderCircle(ctx, 0, 0, obj.scale * 0.3, true);
    return;
  }

  renderBlob(ctx, 6, obj.scale, obj.scale * 0.7);
  ctx.fillStyle = biome ? "#e3f1f4" : "#89a54c";
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = biome ? "#6a64af" : "#c15555";
  const berries = 4;
  const step = TAU / berries;
  for (let i = 0; i < berries; ++i) {
    const distance = randInt(obj.scale / 3.5, obj.scale / 2.3);
    renderCircle(ctx, distance * Math.cos(step * i), distance * Math.sin(step * i), randInt(10, 12));
  }
}

function renderRock(ctx: CanvasRenderingContext2D, obj: GameObject, biome: Biome): void {
  const isGold = obj.type === 3;

  ctx.fillStyle = isGold ? "#e0c655" : biome === Biome.Desert ? "#938d77" : "#939393";
  renderStar(ctx, 3, obj.scale, obj.scale);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = isGold ? "#ebdca3" : biome === Biome.Desert ? "#b2ab90" : "#bcbcbc";
  renderStar(ctx, 3, obj.scale * 0.55, obj.scale * 0.65);
  ctx.fill();
}
