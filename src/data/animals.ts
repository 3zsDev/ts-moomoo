export interface AnimalKind {
  id: number;
  src: string;
  name?: string;
  nameScale?: number;
  spriteMlt?: number;
  scale: number;
  health: number;
  boss?: boolean;
  diver?: boolean;
}

export const animalSprites = [
  "cow_1", "pig_1", "bull_2", "bull_1", "wolf_1", "chicken_1", "enemy",
  "crate_1", "wolf_2", "boar_1", "yeti_1", "crab_1", "sheep_1",
];
