export interface ItemGroup {
  id: number;
  name: string;
  place?: boolean;
  limit?: number;
  sandboxLimit?: number;
  layer: number;
}

export const itemGroups: ItemGroup[] = [
  { id: 0, name: "food", layer: 0 },
  { id: 1, name: "walls", place: true, limit: 30, sandboxLimit: 99, layer: 0 },
  { id: 2, name: "spikes", place: true, limit: 15, layer: 0 },
  { id: 3, name: "mill", place: true, limit: 7, sandboxLimit: 299, layer: 1 },
  { id: 4, name: "mine", place: true, limit: 1, sandboxLimit: 99, layer: 0 },
  { id: 5, name: "trap", place: true, limit: 6, layer: -1 },
  { id: 6, name: "booster", place: true, limit: 12, sandboxLimit: 299, layer: -1 },
  { id: 7, name: "turret", place: true, limit: 2, sandboxLimit: 99, layer: 1 },
  { id: 8, name: "watchtower", place: true, limit: 12, sandboxLimit: 99, layer: 1 },
  { id: 9, name: "buff", place: true, limit: 4, sandboxLimit: 99, layer: -1 },
  { id: 10, name: "spawn", place: true, limit: 1, sandboxLimit: 99, layer: -1 },
  { id: 11, name: "sapling", place: true, limit: 2, sandboxLimit: 99, layer: 0 },
  { id: 12, name: "blocker", place: true, limit: 3, sandboxLimit: 99, layer: -1 },
  { id: 13, name: "teleporter", place: true, limit: 2, sandboxLimit: 299, layer: -1 },
];
