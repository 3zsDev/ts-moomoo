import { isLocal } from "../../environment";
import { loadSetting } from "../../utils/storage";

export interface CodeSession {
  resend(): Promise<unknown>;
  continue(code: string): Promise<unknown>;
}

export interface FrvrAuth {
  isLoggedIn(): boolean;
  isVerified(): boolean;
  getAccessToken(): string | null;
  getFreshAccessToken?(): Promise<string | null>;
  getFRVRID?(): string | null;
  logout(): Promise<unknown> | void;
  addStatusChangeListener?(listener: () => void): void;
  authenticatedFetch?(url: string, init: RequestInit): Promise<Response>;
  requestEmailLoginCode?(email: string): Promise<CodeSession>;
  requestEmailRegisterCode?(email: string): Promise<CodeSession>;
  loginToFRVR?(options: { platform: string; credentials: { email: string; password: string } }): Promise<unknown>;
  registerOnFRVR?(options: { email: string; password: string }): Promise<unknown>;
}

interface FrvrScope {
  FRVR?: {
    auth?: FrvrAuth;
    tracker?: { levelStart?(level: string): void };
  };
  frvrSdkInitPromise?: Promise<unknown>;
  frvrSdkLoadError?: string;
}

const DEV_TOKEN_KEY = "moo_dev_frvr_token";

export type AuthErrorKind = "expired" | "other-method" | undefined;

export class AuthError extends Error {
  public constructor(message: string, public readonly kind?: AuthErrorKind) {
    super(message);
  }
}

const listeners: (() => void)[] = [];

export function frvrAuth(): FrvrAuth | null {
  return (window as unknown as FrvrScope).FRVR?.auth ?? null;
}

export function trackGameStart(): void {
  (window as unknown as FrvrScope).FRVR?.tracker?.levelStart?.("game_start");
}

function devToken(): string | null {
  return isLocal() ? loadSetting(DEV_TOKEN_KEY) : null;
}

interface TokenPayload {
  extra?: { verified?: boolean; identifier?: string };
}

function decodeToken(token: string | null): TokenPayload | null {
  if (!token) return null;
  try {
    let body = String(token).split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    while (body.length % 4) body += "=";
    const payload = JSON.parse(atob(body));
    return payload && typeof payload === "object" ? payload : null;
  } catch {
    return null;
  }
}

function emitChange(): void {
  for (const listener of listeners) {
    try {
      listener();
    } catch (error) {
      console.error(error);
    }
  }
}

function errorType(error: unknown): string {
  return (error as { type?: string } | null)?.type ?? "";
}

function commonError(error: unknown): AuthError | null {
  switch (errorType(error)) {
    case "networkError":
      return new AuthError("Network error. Try again.");
    case "accountNotActive":
      return new AuthError("This account is not active.");
    default:
      return null;
  }
}

function requireAuth(): FrvrAuth {
  const auth = frvrAuth();
  const sdkError = (window as unknown as FrvrScope).frvrSdkLoadError;
  if (sdkError) throw new AuthError(`Sign-in is unavailable: ${sdkError}`);
  if (!auth?.requestEmailLoginCode) throw new AuthError("Sign-in is unavailable right now.");
  return auth;
}

export function accessToken(): string | null {
  const dev = devToken();
  if (dev) return dev;
  try {
    const auth = frvrAuth();
    return (auth?.isLoggedIn() && auth.getAccessToken()) || null;
  } catch {
    return null;
  }
}

export async function freshAccessToken(): Promise<string | null> {
  const dev = devToken();
  if (dev) return dev;
  const auth = frvrAuth();
  try {
    if (auth?.isLoggedIn() && auth.getFreshAccessToken) return await auth.getFreshAccessToken();
  } catch {}
  return accessToken();
}

export function isVerified(): boolean {
  const dev = devToken();
  if (dev) return Boolean(decodeToken(dev)?.extra?.verified);
  try {
    const auth = frvrAuth();
    return Boolean(auth?.isLoggedIn() && auth.isVerified());
  } catch {
    return false;
  }
}

export function accountEmail(): string {
  const identifier = decodeToken(accessToken())?.extra?.identifier;
  return typeof identifier === "string" ? identifier : "";
}

export function isSignedIn(): boolean {
  return Boolean(accountEmail()) || isVerified();
}

export function signInAvailable(): boolean {
  return Boolean(devToken() || frvrAuth()?.requestEmailLoginCode || (window as unknown as FrvrScope).frvrSdkLoadError);
}

export function onAuthChange(listener: () => void): void {
  listeners.push(listener);
}

export function signOut(): Promise<void> {
  const auth = frvrAuth();
  return Promise.resolve(auth ? auth.logout() : undefined)
    .catch(() => {})
    .then(emitChange);
}

export async function requestCode(email: string): Promise<CodeSession> {
  const auth = requireAuth();
  try {
    return await auth.requestEmailLoginCode!(email);
  } catch (error) {
    const common = commonError(error);
    if (common) throw common;
    if (errorType(error) === "registrationConflict") {
      throw new AuthError("This account signs in with a password.", "other-method");
    }
  }

  try {
    if (!auth.requestEmailRegisterCode) throw new Error("no register");
    return await auth.requestEmailRegisterCode(email);
  } catch (error) {
    const common = commonError(error);
    if (common) throw common;
    if (errorType(error) === "registrationConflict") {
      throw new AuthError("This account signs in with a password.", "other-method");
    }
    throw new AuthError("Couldn't send a code to that email.");
  }
}

export async function resendCode(session: CodeSession): Promise<void> {
  try {
    await session.resend();
  } catch (error) {
    throw commonError(error) ?? new AuthError("Code expired. Send a new one.", "expired");
  }
}

export async function submitCode(session: CodeSession, code: string): Promise<void> {
  try {
    await session.continue(code);
  } catch (error) {
    const common = commonError(error);
    if (common) throw common;
    if (errorType(error) === "serverError") throw new AuthError("Code expired. Send a new one.", "expired");
    throw new AuthError("Wrong or expired code.");
  }
  emitChange();
}

export async function passwordLogin(email: string, password: string): Promise<void> {
  const auth = requireAuth();
  try {
    if (!auth.loginToFRVR) throw new AuthError("Sign-in is unavailable right now.");
    await auth.loginToFRVR({ platform: "frvr", credentials: { email, password } });
  } catch (error) {
    throw commonError(error) ?? (error instanceof Error ? error : new AuthError("Email or password incorrect."));
  }
  emitChange();
}

export async function passwordRegister(email: string, password: string): Promise<void> {
  const auth = requireAuth();
  try {
    if (!auth.registerOnFRVR) throw new AuthError("Sign-in is unavailable right now.");
    await auth.registerOnFRVR({ email, password });
  } catch (error) {
    const common = commonError(error);
    if (common) throw common;
    if (errorType(error) === "registrationConflict") {
      throw new AuthError("Email already registered. Log in instead.");
    }
    throw error instanceof Error ? error : new AuthError("Check your email and password.");
  }
  emitChange();
}

// hook frvr sdk
export function initAuth(): void {
  const attach = () => {
    frvrAuth()?.addStatusChangeListener?.(emitChange);
    emitChange();
  };

  const ready = (window as unknown as FrvrScope).frvrSdkInitPromise;
  if (ready && typeof ready.then === "function") ready.then(attach, attach);
  else attach();
}
