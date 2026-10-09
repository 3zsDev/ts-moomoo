const MIRROR = (process.env.API_MIRROR ?? "https://api-prod2.moomoo.io").replace(/\/+$/, "");
export const mirrorEnabled = MIRROR !== "" && MIRROR !== "off";
export const mirrorUrl = mirrorEnabled ? MIRROR : "";

const ACCOUNT_TTL = 60 * 1000;
const PROFILE_TTL = 5 * 60 * 1000;
const TIMEOUT = 5000;

const PROFILE_KEYS = [
  "kills", "deaths", "damage", "healing", "wood", "food", "stone", "gold", "animalKills", "animalDamage",
  "bestScore", "maxKills", "lives", "playtime", "periods", "socials", "gear", "joined",
];

const accountChecks = new Map();

const HEADERS = { "User-Agent": "ts-moomoo-local-api/1.0", Accept: "application/json" };
let lastProblem = "";

function problem(text) {
  if (text === lastProblem) return;
  lastProblem = text;
  console.warn(`[mirror] ${text}`);
}

async function call(method, path, body) {
  try {
    const response = await fetch(MIRROR + path, {
      method,
      headers: body ? { ...HEADERS, "Content-Type": "application/json" } : HEADERS,
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(TIMEOUT),
    });
    const json = (response.headers.get("content-type") ?? "").includes("application/json");
    if (!json) problem(`${MIRROR} answered ${path.split("?")[0]} with ${response.status} (not the API; blocked?)`);
    else if (response.ok) lastProblem = "";
    const parsed = json ? await response.json().catch(() => null) : null;
    return { status: response.status, json, data: response.ok ? parsed : null, body: parsed };
  } catch (error) {
    problem(`can't reach ${MIRROR}: ${error.message}`);
    return { status: 0, json: false, data: null, body: null };
  }
}

export async function liveGet(path) {
  if (!mirrorEnabled) return null;
  const { data } = await call("GET", path);
  return data;
}

export async function livePost(path, body) {
  if (!mirrorEnabled) return null;
  const { data } = await call("POST", path, body);
  return data;
}

export function liveAccepts(auth) {
  return mirrorEnabled && accountChecks.get(auth)?.valid === true;
}

export async function forward(path, body) {
  const { status, body: answer } = await call("POST", path, body);
  accountChecks.delete(body?.auth);
  if (!status || answer === null) return { status: 502, body: { error: "unavailable" } };
  return { status, body: answer };
}

export async function syncAccount(store, user, auth) {
  if (!mirrorEnabled) return true;
  const last = accountChecks.get(auth);
  if (last && Date.now() - last.at < ACCOUNT_TTL) return last.valid;

  const { status, json, data } = await call("POST", "/account", { auth });
  if (!json) return false;
  const valid = status !== 401;
  if (accountChecks.size > 5000) accountChecks.clear();
  accountChecks.set(auth, { at: Date.now(), valid });
  if (!valid) problem("the live API turned down a sign-in token; that account stays local-only");
  if (!data) return valid;

  if (typeof data.name === "string" && data.name !== user.name) {
    const holder = store.userByName(data.name);
    if (holder && holder !== user) holder.name = null;
    user.name = data.name;
  }
  if (!user.roleLocal) user.role = data.role === "admin" || data.role === "mod" ? data.role : null;
  user.liveClan = data.clan?.name ? { name: String(data.clan.name), role: String(data.clan.role ?? "member") } : null;
  if (data.prefs && typeof data.prefs === "object") user.prefs = { ...user.prefs, ...data.prefs };
  user.mirroredAt = Date.now();

  if (user.name && (!user.live || Date.now() - (user.live.at ?? 0) > PROFILE_TTL)) {
    const profile = await liveGet(`/profile?name=${encodeURIComponent(user.name)}`);
    if (profile) {
      const live = { at: Date.now() };
      for (const key of PROFILE_KEYS) if (profile[key] !== undefined) live[key] = profile[key];
      user.live = live;
    }
  }
  store.save();
  return valid;
}

export function liveProfileOf(user) {
  if (!user.live) return null;
  const out = {};
  for (const key of PROFILE_KEYS) if (user.live[key] !== undefined) out[key] = user.live[key];
  return out;
}
