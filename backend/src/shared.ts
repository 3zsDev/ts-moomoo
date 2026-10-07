// could copy everything from the clientside over but im lazy, best to just reuse, if you want to bring them all over you can do that as well
export { config, endpoints, type GameConfig, type ResourceType } from "../../src/config";
export { forceSandbox } from "../../src/environment";
export { animalTypes, type AnimalType } from "../../src/data/animals";
export { accessories, findAccessory, findHat, hats, type Cosmetic } from "../../src/data/cosmetics";
export { itemData, type Item, type ItemGroup, type Weapon } from "../../src/data/items";

export { Animal, AnimalState, type AnimalController } from "../../src/entities/Animal";
export { GameObject, type GameObjectOwner } from "../../src/entities/GameObject";
export { Player, type PlayerInitData, type PlayerUserData } from "../../src/entities/Player";
export { weaponVariants } from "../../src/data/weaponVariants";
export { Projectile } from "../../src/entities/Projectile";
export type { Damageable, Positioned, ServerHooks } from "../../src/entities/types";

export { AnimalManager } from "../../src/systems/AnimalManager";
export { ObjectManager } from "../../src/systems/ObjectManager";
export { ProjectileManager } from "../../src/systems/ProjectileManager";

export { hexToBytes, hmacSha256 } from "../../src/net/crypto";
export { decode, encode, type MsgPackValue } from "../../src/net/msgpack";
export {
  buildCipherTables, ClientPacket, FULL_SHUFFLED_MODE, MAC_LENGTH, ServerPacket, SHUFFLED_MODE,
  type CipherTables, type ClientPacketType, type ServerPacketType,
} from "../../src/net/protocol";

export { getAngleDist, lerpAngle, turnToward } from "../../src/utils/angles";
export { confineToWorld, inFallsPool, inFallsWater } from "../../src/utils/falls";
export { getDistance, getDirection } from "../../src/utils/geometry";
export { clamp, fixTo, lerp, randFloat, randInt, TAU } from "../../src/utils/math";
