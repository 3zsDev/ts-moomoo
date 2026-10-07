import { getFrvrAdsConfig } from "./config/ads";
import "./sdk-libs/frvr-sdk.js";
import { installFrvrChannel } from "./sdk-libs/frvr-channel-web.js";
import "./sdk-libs/howler.js";

const noop = (): void => {};
const resolved = (): Promise<void> => Promise.resolve();

interface FrvrRuntime {
  config?: Record<string, unknown>;
  init?: (environment: string) => Promise<unknown> | unknown;
  initPromise?: Promise<void>;
  tracker?: {
    addExtraFieldFunction?: (callback: (fields: Record<string, unknown>) => void) => void;
    levelStart?: (level: string) => void;
    levelEnd?: (level: string) => void;
  };
  ads?: { show?: (kind: string) => Promise<unknown> };
  profile?: { name?: () => string };
  channelCharacteristics?: { allowNavigation?: boolean };
  bootstrapper?: {
    init?: () => Promise<unknown> | unknown;
    complete?: () => Promise<unknown> | unknown;
  };
}

interface FrvrWindow extends Window {
  FRVR?: FrvrRuntime;
  frvrSdkInitPromise?: Promise<unknown>;
  frvrSdkLoadPromise?: Promise<void>;
  frvrSdkLoadError?: string;
}

function hasFrvrInit(
  frvr: FrvrRuntime | undefined,
): frvr is FrvrRuntime & { init: (environment: string) => Promise<unknown> | unknown } {
  return typeof frvr?.init === "function";
}

function configureLocalFrvrSdk(
  scope: FrvrWindow,
): FrvrRuntime & { init: (environment: string) => Promise<unknown> | unknown } {
  const frvr = scope.FRVR;
  if (!hasFrvrInit(frvr)) {
    throw new Error("The local FRVR SDK did not initialize.");
  }

  if (!frvr.initPromise) {
    frvr.config = {
      ...frvr.config,
      gameId: "moomoo",
      ads: getFrvrAdsConfig(),
      tracker: {
        ...(typeof frvr.config?.tracker === "object" && frvr.config.tracker !== null
          ? frvr.config.tracker
          : {}),
        trackerChannelId: "moomoo_io",
      },
    };
  }
  return frvr;
}

installFrvrChannel();
configureLocalFrvrSdk(window as FrvrWindow);

async function initializeLocalFrvrSdk(scope: FrvrWindow): Promise<void> {
  const frvr = configureLocalFrvrSdk(scope);
  if (!scope.frvrSdkInitPromise) {
    scope.frvrSdkInitPromise =
      frvr.initPromise ?? Promise.resolve(frvr.init("production")).then(() => undefined);
  }

  frvr.tracker?.addExtraFieldFunction?.((fields) => {
    fields.context = "moomoo";
    fields.app_version = "1.9.0";
    fields.channel = "moomoo_io";
  });
  await scope.frvrSdkInitPromise;
  if (!frvr.bootstrapper?.init) {
    throw new Error("The local FRVR channel bootstrapper is unavailable.");
  }
  scope.frvrSdkInitPromise = Promise.resolve(frvr.bootstrapper.init());
  await scope.frvrSdkInitPromise;
  await frvr.bootstrapper.complete?.();
}

export async function initializeFrvrSdk(): Promise<void> {
  const scope = window as FrvrWindow;
  try {
    scope.frvrSdkLoadPromise ??= initializeLocalFrvrSdk(scope);
    await scope.frvrSdkLoadPromise;
    delete scope.frvrSdkLoadError;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    scope.frvrSdkLoadError = message;
    console.error("[FRVR] local SDK initialization failed", error);
    installPageStubs();
  }
}

export function installPageStubs(): void {
  const scope = window as FrvrWindow;
  const frvr = scope.FRVR ?? {};
  frvr.config ??= {};
  frvr.init ??= noop;
  frvr.tracker = {
    addExtraFieldFunction: noop,
    levelStart: noop,
    levelEnd: noop,
    ...frvr.tracker,
  };
  frvr.ads ??= { show: resolved };
  frvr.profile ??= { name: () => "" };
  frvr.channelCharacteristics ??= { allowNavigation: true };
  frvr.bootstrapper = {
    init: resolved,
    complete: resolved,
    ...frvr.bootstrapper,
  };
  scope.FRVR = frvr;
  scope.frvrSdkInitPromise ??= resolved();
}
