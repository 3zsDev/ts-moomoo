export interface WeaponVariant {
  id: number;

  src: string;
  xp: number;
  val: number;
  poison?: boolean;
}

export const weaponVariants: WeaponVariant[] = [
  { id: 0, src: "", xp: 0, val: 1 },
  { id: 1, src: "_g", xp: 3000, val: 1.1 },
  { id: 2, src: "_d", xp: 7000, val: 1.18 },
  { id: 3, src: "_r", xp: 12000, val: 1.18, poison: true },
];

interface VariantHolder {
  weaponIndex: number;
  weaponXP: number[];
}

export function fetchVariant(holder: VariantHolder): WeaponVariant {
  const xp = holder.weaponXP[holder.weaponIndex] || 0;
  for (let i = weaponVariants.length - 1; i >= 0; --i) {
    if (xp >= weaponVariants[i].xp) return weaponVariants[i];
  }
  return weaponVariants[0];
}
