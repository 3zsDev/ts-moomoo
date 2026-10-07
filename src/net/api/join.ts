import { apiBase, isLocal, restApiEnabled } from "../../environment";
import { loadSetting, saveSetting } from "../../utils/storage";
import { accessToken, freshAccessToken } from "./auth";
import { apiPost, withTimeout } from "./http";

export const SIGN_IN_REQUIRED = "Sign in to play on this server";

const DEVICE_ID_KEY = "moo_did";

interface JoinResponse {
  ticket?: string;
  did?: string;
  error?: string;
}

export async function joinTicket(host: string, captchaToken: string | null): Promise<string | null> {
  if (!restApiEnabled()) {
    console.info("[join] REST API disabled; using available captcha token", {
      hasCaptchaToken: captchaToken !== null,
    });
    return captchaToken;
  }

  const captcha = captchaToken?.startsWith("cf:") ? captchaToken.slice(3) : undefined;

  await withTimeout(freshAccessToken(), 5000);
  const auth = accessToken() ?? undefined;
  if (!captcha && !auth) {
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
    });
    response = await apiPost(
      "/join",
      {
        captcha,
        auth,
        did: loadSetting(DEVICE_ID_KEY) || undefined,
        host: isLocal() ? "localhost" : host,
      },
      8000,
    );
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
    throw new Error(response.status === 429 ? "Too many attempts - try again soon" : "Invalid Connection");
  }
  if (!response.ok) {
    console.warn("[join] server ticket request returned an error; falling back to captcha token", {
      status: response.status,
    });
    return captchaToken;
  }

  const data: JoinResponse = await response.json().catch(() => ({}));
  if (data.did) saveSetting(DEVICE_ID_KEY, data.did);
  console.info("[join] server ticket response received", {
    hasTicket: Boolean(data.ticket),
    hasDeviceId: Boolean(data.did),
  });
  return data.ticket ? `tk:${data.ticket}` : captchaToken;
}
