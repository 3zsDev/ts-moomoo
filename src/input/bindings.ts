export const MOVEMENT_KEYS: Record<number, [x: number, y: number]> = {
  87: [0, -1], // W
  38: [0, -1], // up arrow
  83: [0, 1],  // S
  40: [0, 1],  // down arrow
  65: [-1, 0], // A
  37: [-1, 0], // left arrow
  68: [1, 0],  // D
  39: [1, 0],  // right arrow
};

export const KEY_BINDINGS = {
  escape: 27,
  space: 32,
  enter: 13,

  autoGather: 69, // E

  markPosition: 67, // C

  lockAim: 88, // X

  quickFood: 81, // Q

  pingMap: 82, // R

  hotbarStart: 49,
} as const;
