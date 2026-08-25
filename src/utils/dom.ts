export interface ElementSpec {
  tag?: string;
  id?: string;
  class?: string;
  text?: string;
  html?: string;
  style?: string;
  parent?: HTMLElement;
  children?: HTMLElement[];
  hookTouch?: boolean;
  [key: string]: unknown;
}

const RESERVED_KEYS = new Set([
  "tag", "text", "html", "class", "style", "hookTouch", "parent", "children",
]);

export function createElement(spec: ElementSpec): HTMLElement {
  const el = document.createElement(spec.tag || "div");

  if (spec.text != null) el.textContent = spec.text;
  if (spec.html != null) el.innerHTML = spec.html;
  if (spec.class != null) el.className = spec.class;

  for (const key in spec) {
    if (RESERVED_KEYS.has(key)) continue;
    (el as unknown as Record<string, unknown>)[key] = spec[key];
  }

  if (spec.style) el.style.cssText = spec.style;
  if (spec.hookTouch) hookTouchEvents(el);
  if (spec.children) for (const child of spec.children) el.appendChild(child);
  if (spec.parent) spec.parent.appendChild(el);

  return el;
}

export function removeAllChildren(el: HTMLElement): void {
  while (el.hasChildNodes()) el.removeChild(el.lastChild!);
}

export function containsPoint(el: HTMLElement, pageX: number, pageY: number): boolean {
  const renderRect = el.getBoundingClientRect();
  const left = renderRect.left + window.scrollX;
  const top = renderRect.top + window.scrollY;
  return (
    pageX > left && pageX < left + renderRect.width &&
    pageY > top && pageY < top + renderRect.height
  );
}

export function mousifyTouchEvent(event: TouchEvent): void {
  const touch = event.changedTouches[0];
  const target = event as unknown as Record<string, number>;
  target.screenX = touch.screenX;
  target.screenY = touch.screenY;
  target.clientX = touch.clientX;
  target.clientY = touch.clientY;
  target.pageX = touch.pageX;
  target.pageY = touch.pageY;
}

export function hookTouchEvents(el: HTMLElement, skipPreventDefault = false): void {
  const shouldPreventDefault = !skipPreventDefault;
  let hovering = false;

  const start = (event: TouchEvent) => {
    mousifyTouchEvent(event);
    if (shouldPreventDefault) {
      event.preventDefault();
      event.stopPropagation();
    }
    el.onmouseover?.(event as unknown as MouseEvent);
    hovering = true;
  };

  const move = (event: TouchEvent) => {
    mousifyTouchEvent(event);
    if (shouldPreventDefault) {
      event.preventDefault();
      event.stopPropagation();
    }
    const mouseEvent = event as unknown as MouseEvent;
    const inside = containsPoint(el, mouseEvent.pageX, mouseEvent.pageY);
    if (inside && !hovering) {
      el.onmouseover?.(mouseEvent);
      hovering = true;
    } else if (!inside && hovering) {
      el.onmouseout?.(mouseEvent);
      hovering = false;
    }
  };

  const end = (event: TouchEvent) => {
    mousifyTouchEvent(event);
    if (shouldPreventDefault) {
      event.preventDefault();
      event.stopPropagation();
    }
    if (hovering) {
      el.onclick?.(event as unknown as PointerEvent);
      el.onmouseout?.(event as unknown as MouseEvent);
      hovering = false;
    }
  };

  el.addEventListener("touchstart", start, false);
  el.addEventListener("touchmove", move, false);
  el.addEventListener("touchend", end, false);
  el.addEventListener("touchcancel", end, false);
  el.addEventListener("touchleave", end as EventListener, false);
}

const missingElements = new Map<string, HTMLElement>();

export function byId<T extends HTMLElement = HTMLElement>(id: string, fallbackTag = "div"): T {
  const el = document.getElementById(id);
  if (el) return el as T;

  let placeholder = missingElements.get(id);
  if (!placeholder) {
    console.warn(`Missing element #${id}; using a detached <${fallbackTag}> placeholder.`);
    placeholder = document.createElement(fallbackTag);
    placeholder.id = id;
    missingElements.set(id, placeholder);
  }
  return placeholder as T;
}

export function findById<T extends HTMLElement = HTMLElement>(id: string): T | null {
  return document.getElementById(id) as T | null;
}
