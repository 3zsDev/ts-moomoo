import { config } from "../../config";
import { itemData } from "../../data/items";
import { findObjectBySid } from "../../game/lookups";
import { state } from "../../game/state";
import { objectManager } from "../../game/world";

export function loadGameObject(data: number[]): void {
  for (let i = 0; i < data.length; i += 8) {
    objectManager.add(
      data[i], data[i + 1], data[i + 2], data[i + 3], data[i + 4], data[i + 5],
      itemData.list[data[i + 6]],
      true,
      data[i + 7] >= 0 ? { sid: data[i + 7] } : null,
    );
  }
}

export function killObject(sid: number): void {
  objectManager.disableBySid(sid);
}

export function killObjects(ownerSid: number): void {
  if (state.me) objectManager.removeAllItems(ownerSid);
}

export function wiggleGameObject(dir: number, sid: number): void {
  const obj = findObjectBySid(sid);
  if (!obj) return;
  obj.xWiggle += config.gatherWiggle * Math.cos(dir);
  obj.yWiggle += config.gatherWiggle * Math.sin(dir);
}

export function shootTurret(sid: number, dir: number): void {
  const obj = findObjectBySid(sid);
  if (!obj) return;
  obj.dir = dir;
  obj.xWiggle += config.gatherWiggle * Math.cos(dir + Math.PI);
  obj.yWiggle += config.gatherWiggle * Math.sin(dir + Math.PI);
}
