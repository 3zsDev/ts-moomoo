import { config } from "../config";
import type { AnimalKind } from "../data/animals";
import { SwingAnimation } from "./SwingAnimation";
import type { Interpolated } from "./types";

export class Animal implements Interpolated {
  public sid: number;
  public readonly isAI = true;

  public x = 0;
  public y = 0;
  public dir = 0;

  public index = 0;
  public src = "";
  public name?: string;
  public nameScale?: number;
  public spriteMlt?: number;
  public scale = 0;

  public health = 0;
  public maxHealth = 0;
  public active = false;
  public alive = false;

  public state = 0;
  public stateAt = 0;
  public isBoss = false;

  public readonly swing = new SwingAnimation(config.hitReturnRatio);

  public visible = false;
  public forcePos = false;
  public x1?: number;
  public y1?: number;
  public x2?: number;
  public y2?: number;
  public d1?: number;
  public d2?: number;
  public dt = 0;
  public settle = false;

  public constructor(sid: number) {
    this.sid = sid;
  }

  public get dirPlus(): number {
    return this.swing.offset;
  }

  public init(x: number, y: number, dir: number, index: number, kind: AnimalKind): void {
    this.x = x;
    this.y = y;
    this.dir = dir;
    this.index = index;
    this.src = kind.src;
    this.name = kind.name;
    this.scale = kind.scale;
    this.spriteMlt = kind.spriteMlt;
    this.nameScale = kind.nameScale;
    this.maxHealth = kind.health;
    this.health = this.maxHealth;
    this.active = true;
    this.alive = true;
    this.swing.reset();
  }

  public startAnim(): void {
    this.swing.start(600, Math.PI * 0.8);
  }

  public animate(delta: number): void {
    this.swing.update(delta);
  }
}
