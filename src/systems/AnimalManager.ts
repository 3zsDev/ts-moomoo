import type { GameConfig } from "../config";
import { animalTypes, type AnimalType } from "../data/animals";
import { Animal, type ScoreAward } from "../entities/Animal";
import type { Damageable, ServerHooks } from "../entities/types";
import type { ObjectManager } from "./ObjectManager";

export class AnimalManager {
  public readonly animalTypes: AnimalType[] = animalTypes;

  public constructor(
    readonly animals: Animal[],
    private readonly players: Damageable[],
    private readonly objectManager: ObjectManager,
    private readonly config: GameConfig,
    private readonly awardScore: ScoreAward | null = null,
    private readonly server: ServerHooks | null = null,
  ) {}

  public spawn(x: number, y: number, dir: number, typeIndex: number): Animal {
    const type = this.animalTypes[typeIndex];
    if (!type) {
      console.error("missing animal type", typeIndex);
      return this.spawn(x, y, dir, 0);
    }

    let animal = this.animals.find((a) => !a.active);
    if (!animal) {
      animal = new Animal(
        this.animals.length, this.players, this.objectManager,
        this.config, this.awardScore, this.server,
      );
      this.animals.push(animal);
    }

    animal.init(x, y, dir, typeIndex, type);
    return animal;
  }
}
