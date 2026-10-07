import { createPublicKey, verify } from "node:crypto";

const JWKS_URL = process.env.API_JWKS_URL ?? "";
const KEY_TTL = 10 * 60 * 1000;

export const signaturesChecked = Boolean(JWKS_URL);

const ADMINS = new Set(
  (process.env.API_ADMINS ?? "")
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean),
);

let keys = new Map();
let keysAt = 0;

function decodePart(part) {
  return JSON.parse(Buffer.from(part.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8"));
}

async function publicKey(kid) {
  if (!keys.size || Date.now() - keysAt > KEY_TTL || (kid && !keys.has(kid))) {
    const response = await fetch(JWKS_URL, { signal: AbortSignal.timeout(5000) });
    const { keys: list = [] } = await response.json();
    keys = new Map(list.map((jwk) => [jwk.kid ?? "", createPublicKey({ key: jwk, format: "jwk" })]));
    keysAt = Date.now();
  }
  return keys.get(kid ?? "") ?? (keys.size === 1 ? [...keys.values()][0] : null);
}

async function signatureValid(parts, header) {
  const key = await publicKey(header.kid);
  if (!key) return false;

  const data = Buffer.from(`${parts[0]}.${parts[1]}`);
  const signature = Buffer.from(parts[2].replace(/-/g, "+").replace(/_/g, "/"), "base64");

  if (header.alg === "RS256") return verify("RSA-SHA256", data, key, signature);
  if (header.alg === "ES256") return verify("sha256", data, { key, dsaEncoding: "ieee-p1363" }, signature);
  return false;
}

export async function readAuth(token) {
  if (typeof token !== "string") return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;

  let header = {};
  let payload;
  try {
    header = decodePart(parts[0]);
  } catch {}
  try {
    payload = decodePart(parts[1]);
  } catch {
    return null;
  }
  if (!payload || typeof payload !== "object") return null;
  if (typeof payload.exp === "number" && payload.exp * 1000 < Date.now()) return null;

  if (signaturesChecked) {
    try {
      if (!(await signatureValid(parts, header))) return null;
    } catch {
      return null;
    }
  }

  const email = typeof payload.extra?.identifier === "string" ? payload.extra.identifier.toLowerCase() : null;
  const id = payload.sub != null ? String(payload.sub) : email ? `email:${email}` : null;
  if (!id) return null;

  const verified = payload.extra?.verified === true || (payload.user != null && payload.user.verified !== false);
  return { id, email, verified };
}

export function isListedAdmin(identity) {
  return ADMINS.has(identity.id.toLowerCase()) || (identity.email != null && ADMINS.has(identity.email));
}
