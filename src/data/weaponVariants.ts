export interface WeaponVariant {
  id: number;

  src: string;
  xp: number;
  val: number;
  poison?: boolean;
  lifesteal?: number;
  membersOnly?: boolean;
}

export const weaponVariants: WeaponVariant[] = [
  { id: 0, src: "", xp: 0, val: 1 },
  { id: 1, src: "_g", xp: 3000, val: 1.1 },
  { id: 2, src: "_d", xp: 7000, val: 1.18 },
  { id: 3, src: "_r", xp: 12000, val: 1.18, poison: true },
  { id: 4, src: "_e", xp: 30000, val: 1.18, poison: true, lifesteal: 0.15, membersOnly: true },
];

interface VariantHolder {
  weaponIndex: number;
  weaponXP: number[];
  member?: boolean;
}

// emerald is members only, signed in players unlock it with xp like the rest
export const unlockableVariants = weaponVariants.filter((variant) => !variant.membersOnly);

export function fetchVariant(holder: VariantHolder): WeaponVariant {
  const xp = holder.weaponXP[holder.weaponIndex] || 0;
  const variants = holder.member ? weaponVariants : unlockableVariants;
  for (let i = variants.length - 1; i >= 0; --i) {
    if (xp >= variants[i].xp) return variants[i];
  }
  return weaponVariants[0];
}
