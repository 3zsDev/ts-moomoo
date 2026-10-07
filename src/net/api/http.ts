import { apiBase, restApiEnabled } from "../../environment";

const POST_TIMEOUT = 6000;

export class ApiError extends Error {
  public constructor(message: string, public readonly status = 0) {
    super(message);
  }
}

function timeoutSignal(ms: number): AbortSignal | undefined {
  return typeof AbortSignal.timeout === "function" ? AbortSignal.timeout(ms) : undefined;
}

function disabled(): Promise<Response> {
  return Promise.reject(new ApiError("Accounts are unavailable here.", 503));
}

// plain JSON POST against the API host
export function apiPost(path: string, body: unknown, timeout = POST_TIMEOUT): Promise<Response> {
  if (!restApiEnabled()) return disabled();
  return fetch(apiBase() + path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: timeoutSignal(timeout),
  });
}

export function apiGet(path: string, timeout?: number): Promise<Response> {
  if (!restApiEnabled()) return disabled();
  return fetch(apiBase() + path, timeout ? { signal: timeoutSignal(timeout) } : undefined);
}

export function apiGetJson<T>(path: string, timeout?: number): Promise<T | null> {
  return apiGet(path, timeout)
    .then((response) => (response.ok ? (response.json() as Promise<T>) : null))
    .catch(() => null);
}

export function withTimeout<T>(promise: Promise<T>, ms: number, fallback?: T): Promise<T | undefined> {
  return Promise.race([
    promise,
    new Promise<T | undefined>((resolve) => setTimeout(() => resolve(fallback), ms)),
  ]);
}
