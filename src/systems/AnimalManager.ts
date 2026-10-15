import type { AnimalKind } from "../data/animals";
import { Animal } from "../entities/Animal";

// 1.9.4: the kinds table the server sends with the setup packet, and the display animals spawned from it
export class AnimalManager {
  public kinds: AnimalKind[] = [];

  public constructor(readonly animals: Animal[]) {}

  public setKinds(list: AnimalKind[] | null | undefined): void {
    this.kinds = [];
    for (const kind of list ?? []) {
      if (kind && typeof kind.id === "number") this.kinds[kind.id] = kind;
    }
  }

  public kind(id: number): AnimalKind | null {
    return this.kinds[id] ?? null;
  }

  public spawn(x: number, y: number, dir: number, index: number): Animal | null {
    const kind = this.kind(index);
    if (!kind) return null;

    let animal = this.animals.find((a) => !a.active);
    if (!animal) {
      animal = new Animal(this.animals.length);
      this.animals.push(animal);
    }

    animal.init(x, y, dir, index, kind);
    return animal;
  }
}
