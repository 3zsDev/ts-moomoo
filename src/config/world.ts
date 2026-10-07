export const world = {
  mapScale: 14400,
  colGrid: 10,
  collisionDepth: 6,

  snowBiomeTop: 2400,
  snowSpeed: 0.75,

  riverWidth: 724,
  riverPadding: 114,
  waterCurrent: 0.0011,
  waveSpeed: 0.0001,
  waveMax: 1.3,
  // new boss fight area
  secretPool: {
    gorgeX0: -1500,
    gorgeHalf: 520,
    pool: [
      [-2500, 7200, 1150],
      [-3300, 6750, 750],
      [-3200, 7750, 700],
      [-1700, 6900, 600],
      [-1800, 7550, 600],
    ] as [number, number, number][],
    waterfall: { x: -3860, y: 7250, half: 210 },
    shallows: { start: -1500, end: 320 },
  },
};

export const worldGen = {
  areaCount: 7,
  treesPerArea: 9,
  bushesPerArea: 3,
  totalRocks: 32,
  goldOres: 7,
  treeScales: [150, 160, 165, 175],
  bushScales: [80, 85, 95],
  rockScales: [80, 85, 90],
};
