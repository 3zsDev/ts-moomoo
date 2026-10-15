import { assetUrl } from "../assetBase";
import { config } from "../config";
import { Howl } from "../sdk-libs/howler";

type Track = Howl & { isPlaying?: boolean };

export class SoundManager {
  public readonly sounds: Record<string, Track> = {};
  public active = true;

  public constructor(private readonly settings: object) {}

  public play(name: string, volume?: number, loop?: boolean): void {
    if (!volume || !this.active) return;
    let sound = this.sounds[name];
    if (!sound) {
      sound = new Howl({ src: assetUrl(`sound/${name}.mp3`) });
      this.sounds[name] = sound;
    }
    if (loop && sound.isPlaying) return;
    sound.isPlaying = true;
    sound.play();
    sound.volume((volume || 1) * Number((this.settings as { volumeMult?: number }).volumeMult));
    sound.loop(Boolean(loop));
  }

  public toggleMute(name: string, muted: boolean): void {
    this.sounds[name]?.mute(muted);
  }

  public stop(name: string): void {
    const sound = this.sounds[name];
    if (!sound) return;
    sound.stop();
    sound.isPlaying = false;
  }
}

export const soundManager = new SoundManager(config);
