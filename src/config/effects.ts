import { world } from "./world";

// all effects are serverside, only description changes were updated for client
export interface AccessoryEffect {
  snowMult?: number;
  spdMult?: number;
  gatherBonus?: [number, number];
  cowRewardMult?: number;
  leaderKillMult?: number;
  spikeKillMult?: number;
  projDmgMult?: number;
  hitHeal?: number;
  bleed?: { dmg: number; time: number };
  hitBuff?: { dmg: number; time: number };
  killBuff?: { dmg: number; spd: number; time: number };
}

export const accessoryEffects: Record<number, AccessoryEffect> = {
  12: { snowMult: 1 - (1 - world.snowSpeed) / 2 },
  6: { snowMult: 1 },
  9: { gatherBonus: [0, 1] },
  10: { gatherBonus: [2, 1] },
  3: { gatherBonus: [1, 1] },
  8: { cowRewardMult: 1.5 },
  4: { leaderKillMult: 3 },
  5: { spdMult: 1.05 },
  2: { hitBuff: { dmg: 1.05, time: 5000 } },
  1: { killBuff: { dmg: 1.05, spd: 1.15, time: 10000 } },
  7: { spikeKillMult: 2 },
  14: { hitHeal: 3 },
  15: { projDmgMult: 0.75 },
  20: { bleed: { dmg: 4, time: 2 } },
};

export function accessoryEffect(tail: { id: number } | null | undefined): AccessoryEffect | undefined {
  return tail ? accessoryEffects[tail.id] : undefined;
}
