import { BLOCK_SIZE, DIGEST_SIZE, sha256 } from "./sha256";

export function hmacSha256(key: Uint8Array, message: Uint8Array): Uint8Array {
  const normalizedKey = key.length > BLOCK_SIZE ? sha256(key) : key;

  const paddedKey = new Uint8Array(BLOCK_SIZE);
  paddedKey.set(normalizedKey);

  const inner = new Uint8Array(BLOCK_SIZE + message.length);
  const outer = new Uint8Array(BLOCK_SIZE + DIGEST_SIZE);
  for (let i = 0; i < BLOCK_SIZE; i++) {
    inner[i] = paddedKey[i] ^ 0x36;
    outer[i] = paddedKey[i] ^ 0x5c;
  }

  inner.set(message, BLOCK_SIZE);
  outer.set(sha256(inner), BLOCK_SIZE);
  return sha256(outer);
}
