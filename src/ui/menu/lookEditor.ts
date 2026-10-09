import { config } from "../../config";
import { accessories } from "../../data/cosmetics/accessories";
import { hats } from "../../data/cosmetics/hats";
import { weapons } from "../../data/items";
import { weaponVariants } from "../../data/weaponVariants";
import { account, fetchProfile, lookRequest, type Look, type Profile } from "../../net/api";
import { imageUrl } from "../../render/sprites/imageCache";
import { byId, createElement, removeAllChildren } from "../../utils/dom";
import { kFormat } from "../../utils/math";
import { selectedSkinColor } from "./skinPicker";

type Slot = "hat" | "acc" | "weapon" | "color";
type Choice = [value: number, image: string | null, label: string, swatch?: string];

const VARIANT_NAMES = ["Normal", "Gold", "Diamond", "Ruby", "Emerald"];

const editor = byId("lookEditor");

function svgImage(path: string, x: number, y: number, w: number, h: number): string {
  return `<image href="${imageUrl(path)}" x="${x}" y="${y}" width="${w}" height="${h}"/>`;
}

export function lookSvg(look: Look): string {
  const weapon = weapons[look.weapon] ?? weapons[0];
  const variant = (weaponVariants[look.variant] ?? weaponVariants[0]).src;
  const hat = hats.find((h) => h.id === look.hat);
  const acc = accessories.find((a) => a.id === look.acc);
  const color = config.skinColors[look.color] ?? config.skinColors[0];
  const scale = config.playerScale;
  const leftAngle = (Math.PI / 4) * (weapon.armS ?? 1);
  const rightAngle = -leftAngle * (weapon.hndS ?? 1);
  const rightDist = scale * (weapon.hndD ?? 1);

  const hand = (x: number, y: number, r: number) =>
    `<circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="${r}" fill="${color}" stroke="#525252" stroke-width="5.5"/>`;
  const weaponImage = svgImage(
    `weapons/${weapon.src}${variant}.png`,
    scale + weapon.xOff - weapon.length / 2,
    weapon.yOff - weapon.width / 2,
    weapon.length,
    weapon.width,
  );

  return (
    '<svg viewBox="-125 -125 250 250" xmlns="http://www.w3.org/2000/svg"><g transform="rotate(-90)">' +
    (acc
      ? `<g transform="translate(${-20 - (acc.xOff ?? 0)} 0)">` +
        svgImage(`accessories/access_${acc.id}.png`, -acc.scale / 2, -acc.scale / 2, acc.scale, acc.scale) +
        "</g>"
      : "") +
    (weapon.aboveHand ? "" : weaponImage) +
    hand(scale * Math.cos(leftAngle), scale * Math.sin(leftAngle), 14) +
    hand(rightDist * Math.cos(rightAngle), rightDist * Math.sin(rightAngle), 14) +
    (weapon.aboveHand ? weaponImage : "") +
    hand(0, 0, scale) +
    (hat
      ? '<g transform="rotate(90)">' +
        svgImage(`hats/hat_${hat.id}.png`, -hat.scale / 2, -hat.scale / 2, hat.scale, hat.scale) +
        (hat.topSprite ? svgImage(`hats/hat_${hat.id}_top.png`, -hat.scale / 2, -hat.scale / 2, hat.scale, hat.scale) : "") +
        "</g>"
      : "") +
    "</g></svg>"
  );
}

export function renderLookEditor(onClose: () => void): void {
  removeAllChildren(editor);
  createElement({ class: "menuText", text: "Loading...", parent: editor });

  Promise.all([
    lookRequest(),
    account.name ? fetchProfile(account.name).catch(() => null) : Promise.resolve(null),
  ])
    .then(([data, profileData]) => {
      const profile: Partial<Profile> = profileData ?? {};
      const options = data.options ?? { hats: [0], accs: [0], weapons: { 0: 0 } };
      const look: Look = { hat: 0, acc: 0, weapon: 0, variant: 0, color: selectedSkinColor || 0, ...(data.look ?? data.best ?? {}) };
      let status = "";
      let open: Slot | null = null;

      const draw = (): void => {
        removeAllChildren(editor);

        const preview = createElement({ class: "lookPreview", parent: editor });
        createElement({ class: "lookFigure", html: lookSvg(look), parent: preview });
        const info = createElement({ class: "lookInfo", parent: preview });
        const name = createElement({ class: "lookName", parent: info });
        if (profile.clan) createElement({ tag: "span", class: "lookClan", text: `[${profile.clan.name}] `, parent: name });
        createElement({ tag: "span", text: profile.name ?? account.name ?? "", parent: name });
        const kills = profile.kills ?? 0;
        for (const [label, value] of [
          ["Kills", kFormat(kills) || "0"],
          ["K/D", profile.deaths ? (kills / profile.deaths).toFixed(2) : String(kills)],
          ["Best score", kFormat(Math.round(profile.bestScore ?? 0)) || "0"],
          ["Played", `${((profile.playtime ?? 0) / 3600000).toFixed(1)}h`],
        ]) {
          const row = createElement({ class: "lookStat", parent: info });
          createElement({ tag: "span", text: label, parent: row });
          createElement({ tag: "b", text: value, parent: row });
        }
        createElement({
          class: "lookNote",
          parent: editor,
          text: "How you are drawn on your profile page and share card. Pick from what you have earned.",
        });

        const pick = createElement({ class: "lookPick", parent: editor });
        const slots = createElement({ class: "lookSlots", parent: pick });

        const slot = (title: string, key: Slot, choices: Choice[], custom?: (list: HTMLElement) => void): void => {
          const current = choices.find((choice) => choice[0] === look[key]) ?? choices[0];
          const button = createElement({
            class: `lookSlot${open === key ? " open" : ""}`,
            parent: slots,
            onclick: () => {
              open = open === key ? null : key;
              draw();
            },
          });
          button.title = title + (current?.[2] ? `: ${current[2]}` : "");
          const face = createElement({ class: "lookFace", parent: button });
          if (current?.[3]) face.style.cssText = `background-color:${current[3]};border-radius:50%;width:30px;height:30px`;
          else if (current?.[1]) createElement({ tag: "img", src: current[1], parent: face });
          else face.textContent = title;
          createElement({ tag: "i", class: "material-icons lookChevron", html: "&#xE5CF;", parent: button });
          if (open !== key) return;

          const list = createElement({ class: `lookList${choices[0]?.[3] ? " swatches" : ""}`, parent: pick });
          if (custom) {
            custom(list);
            return;
          }
          for (const choice of choices) {
            const on = look[key] === choice[0];
            const item = createElement({
              class: `lookItem${on ? " on" : ""}`,
              parent: list,
              onclick: () => {
                look[key] = choice[0];
                if (key === "weapon") look.variant = Math.min(look.variant, options.weapons[look.weapon] ?? 0);
                open = null;
                status = "";
                draw();
              },
            });
            const icon = createElement({ class: "lookIcon", parent: item });
            if (choice[3]) icon.style.cssText = `background-color:${choice[3]};border-radius:50%`;
            else if (choice[1]) createElement({ tag: "img", src: choice[1], parent: icon });
            if (!choice[3]) createElement({ tag: "span", text: choice[2], parent: item });
            if (on) createElement({ tag: "i", class: "material-icons lookTick", html: "&#xE5CA;", parent: item });
          }
        };

        slot("Hat", "hat", options.hats.flatMap((id): Choice[] => {
          if (!id) return [[0, null, "No hat"]];
          const hat = hats.find((h) => h.id === id);
          return hat ? [[id, imageUrl(`hats/hat_${id}${hat.topSprite ? "_p" : ""}.png`), hat.name]] : [];
        }));
        slot("Accessory", "acc", options.accs.flatMap((id): Choice[] => {
          if (!id) return [[0, null, "No accessory"]];
          const acc = accessories.find((a) => a.id === id);
          return acc ? [[id, imageUrl(`accessories/access_${id}.png`), acc.name]] : [];
        }));

        const variantSrc = (weaponVariants[look.variant] ?? weaponVariants[0]).src;
        const owned = Object.keys(options.weapons).map(Number).filter((id) => weapons[id]);
        slot(
          "Weapon",
          "weapon",
          owned.map((id): Choice => [id, imageUrl(`weapons/${weapons[id].src}${id === look.weapon ? variantSrc : ""}.png`), weapons[id].name]),
          (list) => {
            for (const id of owned) {
              const row = createElement({ class: `lookItem lookWeapon${id === look.weapon ? " on" : ""}`, parent: list });
              createElement({ tag: "span", text: weapons[id].name, parent: row });
              const variants = createElement({ class: "lookVariants", parent: row });
              for (const variant of weaponVariants.filter((v) => v.id <= (options.weapons[id] ?? 0))) {
                const on = id === look.weapon && variant.id === look.variant;
                const button = createElement({
                  class: `lookVariant${on ? " on" : ""}`,
                  parent: variants,
                  onclick: () => {
                    look.weapon = id;
                    look.variant = variant.id;
                    open = null;
                    status = "";
                    draw();
                  },
                });
                button.title = `${VARIANT_NAMES[variant.id] ?? ""} ${weapons[id].name}`;
                const img = createElement({ tag: "img", src: imageUrl(`weapons/${weapons[id].src}${variant.src}.png`), parent: button }) as HTMLImageElement;
                img.onerror = () => {
                  img.onerror = null;
                  img.src = imageUrl(`weapons/${weapons[id].src}.png`);
                };
              }
            }
          },
        );
        slot("Colour", "color", config.skinColors.map((colour, index): Choice => [index, null, "", colour]));

        const buttons = createElement({ class: "lookButtons", parent: editor });
        createElement({
          class: "staffAction friendly",
          text: "Save",
          parent: buttons,
          onclick: () => {
            lookRequest({ ...look })
              .then(
                () => { status = "Saved"; },
                (error: Error) => { status = error.message; },
              )
              .then(draw);
          },
        });
        createElement({ class: "staffAction", text: "Close", parent: buttons, onclick: onClose });
        if (status) createElement({ tag: "span", class: "lookStatus", text: status, parent: buttons });
      };

      draw();
    })
    .catch((error: Error) => {
      removeAllChildren(editor);
      createElement({ class: "menuText", text: error.message, parent: editor });
    });
}

