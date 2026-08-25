class FloatingText {
  public x = 0;
  public y = 0;
  public color = "#fff";
  public text = "";

  public life = 0;

  public speed = 0;

  public scale = 0;
  private startScale = 0;
  private maxScale = 0;

  private scaleSpeed = 0.7;

  public init(x: number, y: number, scale: number, speed: number, life: number, text: string, color: string): void {
    this.x = x;
    this.y = y;
    this.color = color;
    this.scale = scale;
    this.startScale = scale;
    this.maxScale = scale * 1.5;
    this.scaleSpeed = 0.7;
    this.speed = speed;
    this.life = life;
    this.text = text;
  }

  public update(delta: number): void {
    if (!this.life) return;

    this.life = Math.max(0, this.life - delta);
    this.y -= this.speed * delta;
    this.scale += this.scaleSpeed * delta;

    if (this.scale >= this.maxScale) {
      this.scale = this.maxScale;
      this.scaleSpeed *= -1;
    } else if (this.scale <= this.startScale) {
      this.scale = this.startScale;
      this.scaleSpeed = 0;
    }
  }

  public render(ctx: CanvasRenderingContext2D, cameraX: number, cameraY: number): void {
    ctx.fillStyle = this.color;
    ctx.font = `${this.scale}px Hammersmith One`;
    ctx.fillText(this.text, this.x - cameraX, this.y - cameraY);
  }
}

export class TextManager {
  private readonly texts: FloatingText[] = [];

  public update(delta: number, ctx: CanvasRenderingContext2D, cameraX: number, cameraY: number): void {
    ctx.textBaseline = "middle";
    ctx.textAlign = "center";
    for (const text of this.texts) {
      if (!text.life) continue;
      text.update(delta);
      text.render(ctx, cameraX, cameraY);
    }
  }

  public showText(
    x: number, y: number,
    scale: number, speed: number, life: number,
    text: string, color: string,
  ): void {
    let entry = this.texts.find((t) => !t.life);
    if (!entry) {
      entry = new FloatingText();
      this.texts.push(entry);
    }
    entry.init(x, y, scale, speed, life, text, color);
  }
}
