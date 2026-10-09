import { protection } from "./options";

let untrusted = 0;

export function isTrustedEvent(event: Event): boolean {
  return typeof event.isTrusted === "boolean" ? event.isTrusted : true;
}

export function trusted<E extends Event>(handler: (event: E) => void): (event: E) => void {
  return (event: E) => {
    if (!protection.trustedInputOnly || !(event instanceof Event) || isTrustedEvent(event)) handler(event);
    else untrusted++;
  };
}

export function untrustedEventCount(): number {
  return protection.telemetry ? untrusted : 0;
}

export function ignoreSyntheticClicks(): void {
  if (!protection.trustedInputOnly) return;
  document.addEventListener("click", (event) => {
    if (isTrustedEvent(event)) return;
    const target = event.target;
    if (target instanceof HTMLAnchorElement && target.download) return;
    if (target instanceof HTMLInputElement && target.type === "file") return;
    untrusted++;
    event.stopImmediatePropagation();
    event.preventDefault();
  }, true);
}
