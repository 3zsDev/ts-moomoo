import { outlineWidth, paletteColors } from "../../config";
import { itemData, items, type Item } from "../../data/items";
import type { GameObject } from "../../entities/GameObject";
import { randInt, TAU } from "../../utils/math";
import { renderCircle, renderLeaf, renderRect, renderRectCircle, renderStar, renderTriangle } from "../shapes";

const cache: HTMLCanvasElement[] = [];

export function getItemSprite(item: Item | GameObject, forIcon = false): HTMLCanvasElement {
  const definition = "isItem" in item ? items[(item as GameObject).id ?? 0] : (item as Item);

  if (!forIcon) {
    const cached = cache[definition.id];
    if (cached) return cached;
  }

  const canvas = document.createElement("canvas");
  canvas.width = canvas.height =
    definition.scale * 2.5 + outlineWidth + (itemData.list[definition.id].spritePadding ?? 0);

  const ctx = canvas.getContext("2d")!;
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate(forIcon ? 0 : Math.PI / 2);
  ctx.strokeStyle = paletteColors.outline;
  ctx.lineWidth = outlineWidth * (forIcon ? canvas.width / 81 : 1);

  renderItem(ctx, definition);

  if (!forIcon) cache[definition.id] = canvas;
  return canvas;
}

function renderItem(ctx: CanvasRenderingContext2D, item: Item): void {
  const scale = item.scale;

  switch (item.name) {
    case "apple": {
      ctx.fillStyle = "#c15555";
      renderCircle(ctx, 0, 0, scale);
      ctx.fillStyle = "#89a54c";
      const stalkAngle = -(Math.PI / 2);
      renderLeaf(ctx, scale * Math.cos(stalkAngle), scale * Math.sin(stalkAngle), 25, stalkAngle + Math.PI / 2);
      return;
    }

    case "cookie":
      ctx.fillStyle = "#cca861";
      renderCircle(ctx, 0, 0, scale);
      ctx.fillStyle = "#937c4b";
      speckle(ctx, scale);
      return;

    case "cheese":
      ctx.fillStyle = "#f4f3ac";
      renderCircle(ctx, 0, 0, scale);
      ctx.fillStyle = "#c3c28b";
      speckle(ctx, scale);
      return;

    case "wood wall":
    case "stone wall":
    case "castle wall": {
      const isCastle = item.name === "castle wall";
      const isWood = item.name === "wood wall";
      const sides = isCastle ? 4 : 3;

      ctx.fillStyle = isCastle ? "#83898e" : isWood ? "#a5974c" : "#939393";
      renderStar(ctx, sides, scale * 1.1, scale * 1.1);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = isCastle ? "#9da4aa" : isWood ? "#c9b758" : "#bcbcbc";
      renderStar(ctx, sides, scale * 0.65, scale * 0.65);
      ctx.fill();
      return;
    }

    case "spikes":
    case "greater spikes":
    case "poison spikes":
    case "spinning spikes": {
      const hubRadius = scale * 0.6;
      ctx.fillStyle = item.name === "poison spikes" ? "#7b935d" : "#939393";
      renderStar(ctx, item.name === "spikes" ? 5 : 6, scale, hubRadius);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#a5974c";
      renderCircle(ctx, 0, 0, hubRadius);
      ctx.fillStyle = "#c9b758";
      renderCircle(ctx, 0, 0, hubRadius / 2, true);
      return;
    }

    case "windmill":
    case "faster windmill":
    case "power mill":
      ctx.fillStyle = "#a5974c";
      renderCircle(ctx, 0, 0, scale);
      ctx.fillStyle = "#c9b758";
      renderRectCircle(ctx, 0, 0, scale * 1.5, 29, 4);
      ctx.fillStyle = "#a5974c";
      renderCircle(ctx, 0, 0, scale * 0.5);
      return;

    case "mine":
      ctx.fillStyle = "#939393";
      renderStar(ctx, 3, scale, scale);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#bcbcbc";
      renderStar(ctx, 3, scale * 0.55, scale * 0.65);
      ctx.fill();
      return;

    case "sapling":

      for (let layer = 0; layer < 2; ++layer) {
        const radius = scale * (layer ? 0.5 : 1);
        renderStar(ctx, 7, radius, radius * 0.7);
        ctx.fillStyle = layer ? "#b4db62" : "#9ebf57";
        ctx.fill();
        if (!layer) ctx.stroke();
      }
      return;

    case "pit trap":
      ctx.fillStyle = "#a5974c";
      renderStar(ctx, 3, scale * 1.1, scale * 1.1);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = paletteColors.outline;
      renderStar(ctx, 3, scale * 0.65, scale * 0.65);
      ctx.fill();
      return;

    case "boost pad":
      ctx.fillStyle = "#7e7f82";
      renderRect(ctx, 0, 0, scale * 2, scale * 2);
      ctx.fillStyle = "#dbd97d";
      renderTriangle(ctx, scale);
      return;

    case "turret": {
      ctx.fillStyle = "#a5974c";
      renderCircle(ctx, 0, 0, scale);
      ctx.fillStyle = "#939393";
      const barrelLength = 50;
      renderRect(ctx, 0, -barrelLength / 2, scale * 0.9, barrelLength);
      renderCircle(ctx, 0, 0, scale * 0.6);
      return;
    }

    case "platform": {
      ctx.fillStyle = "#cebd5f";
      const planks = 4;
      const total = scale * 2;
      const plankWidth = total / planks;
      let x = -(scale / 2);
      for (let i = 0; i < planks; ++i) {
        renderRect(ctx, x - plankWidth / 2, 0, plankWidth, scale * 2);
        x += total / planks;
      }
      return;
    }

    case "healing pad":
      ctx.fillStyle = "#7e7f82";
      renderRect(ctx, 0, 0, scale * 2, scale * 2);
      ctx.fillStyle = "#db6e6e";
      renderRectCircle(ctx, 0, 0, scale * 0.65, 20, 4, true);
      return;

    case "spawn pad":
      ctx.fillStyle = "#7e7f82";
      renderRect(ctx, 0, 0, scale * 2, scale * 2);
      ctx.fillStyle = "#71aad6";
      renderCircle(ctx, 0, 0, scale * 0.6);
      return;

    case "blocker":
      ctx.fillStyle = "#7e7f82";
      renderCircle(ctx, 0, 0, scale);
      ctx.rotate(Math.PI / 4);
      ctx.fillStyle = "#db6e6e";
      renderRectCircle(ctx, 0, 0, scale * 0.65, 20, 4, true);
      return;

    case "teleporter":
      ctx.fillStyle = "#7e7f82";
      renderCircle(ctx, 0, 0, scale);
      ctx.rotate(Math.PI / 4);
      ctx.fillStyle = "#d76edb";
      renderCircle(ctx, 0, 0, scale * 0.5, true);
      return;
  }
}

function speckle(ctx: CanvasRenderingContext2D, scale: number): void {
  const count = 4;
  const step = TAU / count;
  for (let i = 0; i < count; ++i) {
    const distance = randInt(scale / 2.5, scale / 1.7);
    renderCircle(ctx, distance * Math.cos(step * i), distance * Math.sin(step * i), randInt(4, 5), true);
  }
}
