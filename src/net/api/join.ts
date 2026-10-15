import { apiBase, isLocal, isSandbox, restApiEnabled } from "../../environment";
import { privacy } from "../../config/privacy";
import { loadSetting, removeSetting, saveSetting } from "../../utils/storage";
import { accessToken, freshAccessToken, isVerified } from "./auth";
import { apiPost, apiPostTo, withTimeout } from "./http";

export const SIGN_IN_REQUIRED = "Sign in to play on this server";
export const LIVE_SIGN_IN_REQUIRED = "Sign in to play live servers from a local build";
export const CAPTCHA_NEEDED = "captcha needed";

const DEVICE_ID_KEY = "moo_did";
const NOTICE_WINDOW = 3 * 60 * 1000;
const REJOIN_WINDOW = 5 * 60 * 1000;
const YEAR = 365 * 24 * 60 * 60 * 1000;

interface JoinResponse {
  ticket?: string;
  did?: string;
  error?: string;
  seconds?: number;
  until?: number;
}

function forgetDeviceId(): void {
  removeSetting(DEVICE_ID_KEY);
  try {
    if (!document.cookie.includes(`${DEVICE_ID_KEY}=`)) return;
    const expire = `${DEVICE_ID_KEY}=; Max-Age=0; path=/`;
    document.cookie = expire;
    document.cookie = `${expire}; domain=${location.hostname}`;
    document.cookie = `${expire}; domain=.${location.hostname.split(".").slice(-2).join(".")}`;
  } catch {}
}

function deviceId(): string | null {
  if (!privacy.noBan) return loadSetting(DEVICE_ID_KEY);
  forgetDeviceId();
  return null;
}

if (privacy.noBan) forgetDeviceId();

let lastShutdownNotice = 0;
let guestRejoinUntil = 0;

export function noteShutdownNotice(active: boolean): void {
  lastShutdownNotice = active ? Date.now() : 0;
}

export function allowGuestRejoin(reachedServer: boolean): void {
  if (reachedServer && !isVerified() && Date.now() - lastShutdownNotice < NOTICE_WINDOW) {
    guestRejoinUntil = Date.now() + REJOIN_WINDOW;
  }
}

export function clearGuestRejoin(): void {
  guestRejoinUntil = 0;
}

export function guestRejoinAllowed(): boolean {
  return !isVerified() && Date.now() < guestRejoinUntil && Boolean(deviceId());
}

function bannedMessage(until?: number): string {
  const dated = typeof until === "number" && until > 0 && until - Date.now() < YEAR;
  return dated
    ? `Banned until ${new Date(until).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}`
    : "Banned";
}

function apiForHost(host: string): string {
  if (isSandbox()) return "https://api-sandbox2.moomoo.io";
  if (host.startsWith("sandbox")) return "https://api-sandbox2.moomoo.io";
  if (host.startsWith("dev")) return "https://api-dev.moomoo.io";
  return "https://api-prod2.moomoo.io";
}

export async function joinTicket(host: string, captchaToken: string | null, live = false): Promise<string | null> {
  if (!live && !restApiEnabled()) {
    console.info("[join] REST API disabled; using available captcha token", {
      hasCaptchaToken: captchaToken !== null,
    });
    return captchaToken;
  }

  const captcha = captchaToken?.startsWith("cf:") ? captchaToken.slice(3) : undefined;

  await withTimeout(freshAccessToken(), 5000);
  const auth = accessToken() ?? undefined;
  if (live && !auth) throw new Error(LIVE_SIGN_IN_REQUIRED);
  const rejoin = !live && !captcha && !auth && guestRejoinAllowed();
  if (!live && !captcha && !auth && !rejoin) {
    console.warn("[join] no captcha or account credential is available", {
      apiHost: new URL(apiBase()).host,
      gameHost: host,
    });
    return captchaToken;
  }

  let response: Response;
  try {
    console.info("[join] requesting server ticket", {
      apiHost: new URL(apiBase()).host,
      gameHost: host,
      hasCaptcha: Boolean(captcha),
      hasAccountCredential: Boolean(auth),
      guestRejoin: rejoin,
    });
    const body = {
      captcha,
      auth,
      did: deviceId() || undefined,
      host: live ? host : isLocal() ? "localhost" : host,
    };
    response = live
      ? await apiPostTo(apiForHost(host), "/join", body, 8000)
      : await apiPost("/join", body, 8000);
  } catch {
    console.error("[join] server ticket request failed; falling back to captcha token", {
      apiHost: new URL(apiBase()).host,
      gameHost: host,
      hasCaptcha: Boolean(captcha),
      hasAccountCredential: Boolean(auth),
    });
    return captchaToken;
  }

  if (response.status === 403 || response.status === 429) {
    console.warn("[join] server ticket request was rejected", { status: response.status });
    const data: JoinResponse = await response.json().catch(() => ({}));
    if (data.error === "auth") throw new Error(SIGN_IN_REQUIRED);
    if (data.error === "captcha" && rejoin) throw new Error(CAPTCHA_NEEDED);
    if (data.error === "vpn") throw new Error("VPNs and proxies can't join as a guest - turn it off or sign in");
    if (data.error === "hosting") {
      throw new Error("VPNs, proxies and server networks can't join as a guest - turn it off or sign in");
    }
    if (data.error === "banned") throw new Error(bannedMessage(data.until));
    if (data.error === "locked") {
      const seconds = data.seconds || 60;
      const wait = seconds >= 120 ? `${Math.ceil(seconds / 60)} minutes` : `${seconds} seconds`;
      throw new Error(`You were removed from the game - try again in ${wait}`);
    }
    throw new Error(response.status === 429 ? "Too many attempts - try again soon" : "Invalid Connection");
  }
  if (!response.ok) {
    console.warn("[join] server ticket request returned an error; falling back to captcha token", {
      status: response.status,
    });
    return captchaToken;
  }

  const data: JoinResponse = await response.json().catch(() => ({}));
  if (data.did && !privacy.noBan) saveSetting(DEVICE_ID_KEY, data.did);
  if (rejoin) clearGuestRejoin();
  console.info("[join] server ticket response received", {
    hasTicket: Boolean(data.ticket),
    hasDeviceId: Boolean(data.did),
  });
  return data.ticket ? `tk:${data.ticket}` : captchaToken;
}
