import { lerp } from "../utils/math";

export class SwingAnimation {
  public offset = 0;
  public timeLeft = 0;

  private duration = 0;
  private targetAngle = 0;
  private progress = 0;
  private returning = false;

  public constructor(private readonly returnRatio: number) {}

  public start(duration: number, targetAngle: number): void {
    this.duration = duration;
    this.timeLeft = duration;
    this.targetAngle = targetAngle;
    this.progress = 0;
    this.returning = false;
  }

  public update(delta: number): void {
    if (this.timeLeft <= 0) return;
    this.timeLeft -= delta;

    if (this.timeLeft <= 0) {
      this.timeLeft = 0;
      this.offset = 0;
      this.progress = 0;
      this.returning = false;
      return;
    }

    if (!this.returning) {
      this.progress += delta / (this.duration * this.returnRatio);
      this.offset = lerp(0, this.targetAngle, Math.min(1, this.progress));
      if (this.progress >= 1) {
        this.progress = 1;
        this.returning = true;
      }
    } else {
      this.progress -= delta / (this.duration * (1 - this.returnRatio));
      this.offset = lerp(0, this.targetAngle, Math.max(0, this.progress));
    }
  }
}
