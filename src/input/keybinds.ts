import { loadSetting, saveSetting } from "../utils/storage";

export type ActionId =
  | "moveUp" | "moveLeft" | "moveDown" | "moveRight"
  | "attack" | "autoGather" | "food" | "lockDir" | "mapPing" | "mapMarker"
  | `slot${number}`;

export interface KeyAction {
  id: ActionId;
  label: string;
  key: number;
  slot?: number;
}

const STORAGE_KEY = "moo_keybinds";

export const KEY_ACTIONS: KeyAction[] = [
  { id: "moveUp", label: "Move Up", key: 87 },
  { id: "moveLeft", label: "Move Left", key: 65 },
  { id: "moveDown", label: "Move Down", key: 83 },
  { id: "moveRight", label: "Move Right", key: 68 },
  { id: "attack", label: "Gather/Attack", key: 32 },
  { id: "autoGather", label: "Auto Attack", key: 69 },
  { id: "food", label: "Quick Select Food", key: 81 },
  { id: "lockDir", label: "Lock Rotation", key: 88 },
  { id: "mapPing", label: "Ping Minimap", key: 82 },
  { id: "mapMarker", label: "Add Map Marker", key: 67 },
];
for (let slot = 0; slot < 9; slot++) {
  KEY_ACTIONS.push({ id: `slot${slot}`, label: `Select Item ${slot + 1}`, key: 49 + slot, slot });
}

const MOVE_VECTORS: Partial<Record<ActionId, [x: number, y: number]>> = {
  moveUp: [0, -1],
  moveDown: [0, 1],
  moveLeft: [-1, 0],
  moveRight: [1, 0],
};

const ARROW_KEYS: Record<number, [number, number]> = {
  38: [0, -1],
  40: [0, 1],
  37: [-1, 0],
  39: [1, 0],
};

const RESERVED_KEYS = new Set([13, 27, 9, 91, 92, 93]);

const KEY_NAMES: Record<number, string> = {
  8: "Backspace", 16: "Shift", 17: "Ctrl", 18: "Alt", 20: "Caps", 32: "Space", 33: "PgUp", 34: "PgDn",
  35: "End", 36: "Home", 37: "Left", 38: "Up", 39: "Right", 40: "Down", 45: "Ins", 46: "Del",
  186: ";", 187: "=", 188: ",", 189: "-", 190: ".", 191: "/", 192: "`", 219: "[", 220: "\\", 221: "]", 222: "'",
};

export function keyName(code: number): string {
  if (code === 0) return "None";
  if (KEY_NAMES[code]) return KEY_NAMES[code];
  if ((code >= 48 && code <= 57) || (code >= 65 && code <= 90)) return String.fromCharCode(code);
  if (code >= 96 && code <= 105) return `Num ${code - 96}`;
  if (code >= 112 && code <= 123) return `F${code - 111}`;
  return `Key ${code}`;
}

let bound: Partial<Record<ActionId, number>> = {};
let byKey: Record<number, KeyAction> = {};
let moveKeys: Record<number, [number, number]> = {};
let capture: KeyAction | null = null;
const listeners: ((bindingsChanged: boolean) => void)[] = [];

function rebuild(): void {
  byKey = {};
  moveKeys = { ...ARROW_KEYS };
  for (const action of KEY_ACTIONS) {
    const code = bound[action.id];
    if (!code) continue;
    byKey[code] = action;
    const vector = MOVE_VECTORS[action.id];
    if (vector) moveKeys[code] = vector;
  }
}

function load(): void {
  let stored: Record<string, unknown> = {};
  try {
    stored = JSON.parse(loadSetting(STORAGE_KEY) || "{}") || {};
  } catch {}

  bound = {};
  for (const action of KEY_ACTIONS) {
    const value = stored[action.id];
    bound[action.id] = typeof value === "number" && !RESERVED_KEYS.has(value) ? value : action.key;
  }
  rebuild();
}

function save(): void {
  saveSetting(STORAGE_KEY, JSON.stringify(bound));
}

function changed(bindingsChanged: boolean): void {
  for (const listener of listeners) listener(bindingsChanged);
}

export function actionFor(code: number): KeyAction | undefined {
  return byKey[code];
}

export function movementKeys(): Record<number, [number, number]> {
  return moveKeys;
}

export function boundKeyName(id: ActionId): string {
  return keyName(bound[id] ?? 0);
}

export function capturingAction(): KeyAction | null {
  return capture;
}

export function isCapturingKey(): boolean {
  return capture !== null;
}

export function toggleCapture(action: KeyAction): void {
  capture = capture === action ? null : action;
  changed(false);
}

export function resetKeybinds(): void {
  capture = null;
  for (const action of KEY_ACTIONS) bound[action.id] = action.key;
  rebuild();
  save();
  changed(true);
}

export function onKeybindsChange(listener: (bindingsChanged: boolean) => void): void {
  listeners.push(listener);
}

function onCaptureKey(event: KeyboardEvent): void {
  if (!capture) return;
  const code = event.which || event.keyCode || 0;
  event.preventDefault();
  event.stopImmediatePropagation();

  let rebound = false;
  if (code === 27) {
    capture = null;
  } else if (code && !RESERVED_KEYS.has(code)) {
    for (const action of KEY_ACTIONS) if (bound[action.id] === code) bound[action.id] = 0;
    bound[capture.id] = code;
    capture = null;
    rebuild();
    save();
    rebound = true;
  }
  changed(rebound);
}

load();
window.addEventListener("keydown", onCaptureKey, true);
