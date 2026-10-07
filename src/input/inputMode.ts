import { findById } from "../utils/dom";
import { touch } from "./aim";

const MOBILE_UA =
  /(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino|android|ipad|playbook|silk/i;

let mobile: boolean | null = null;

export function isMobileDevice(): boolean {
  if (mobile === null) {
    const agent = navigator.userAgent || navigator.vendor || "";
    mobile = MOBILE_UA.test(agent);
  }
  return mobile;
}

export function isUsingTouch(): boolean {
  return touch.usingTouch;
}

export function setUsingTouch(on: boolean): void {
  touch.usingTouch = on;
  findById("menuDialog")?.classList.toggle("touch", on);
}

declare global {
  interface Window {
    setUsingTouch: typeof setUsingTouch;
  }
}

export function initInputMode(): void {
  if (isMobileDevice()) document.body.classList.add("touch");
  setUsingTouch(false);
  window.setUsingTouch = setUsingTouch;
}
