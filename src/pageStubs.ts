import { isExtension } from "./assetBase";
import { getFrvrAdsConfig } from "./config/ads";
import { isSandbox } from "./environment";
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
  ads?: { show?: (kind: string, done?: () => void) => Promise<unknown> };
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

const hostname = location.hostname;
const isMoomooIo = hostname.endsWith("moomoo.io");
const isKrunkerIo = hostname.endsWith("krunker.io");
const COOKIEPRO_KEY = isMoomooIo ? "c94e102c-455a-4bf1-82b7-8c7f938301b6" : "15b4472b-823a-468e-b5eb-6eeaca5d6de4";
const TRACKER_CHANNEL = isKrunkerIo ? "krunker_io" : isMoomooIo ? "moomoo_io" : undefined;

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
      consent: { providerName: "cookiepro", config: { websiteKey: COOKIEPRO_KEY } },
      ads: getFrvrAdsConfig(),
      tracker: {
        ...(typeof frvr.config?.tracker === "object" && frvr.config.tracker !== null
          ? frvr.config.tracker
          : {}),
        trackerChannelId: "moomoo_io",
      },
    };
    if (hostname === "localhost") delete frvr.config.consent;
  }
  return frvr;
}

function applyEnvironmentHead(): void {
  if (isExtension()) return;
  const sandbox = isSandbox();
  const ogImage = `https://${sandbox ? "sandbox." : ""}moomoo.io/img/og-image.jpg`;
  document.querySelector('meta[name="robots"]')?.setAttribute("content", sandbox ? "noindex, nofollow" : "index, follow");
  document.querySelector('meta[property="og:image"]')?.setAttribute("content", ogImage);
  document.querySelector('meta[name="twitter:image"]')?.setAttribute("content", ogImage);
}

applyEnvironmentHead();
installFrvrChannel();
configureLocalFrvrSdk(window as FrvrWindow);

async function initializeLocalFrvrSdk(scope: FrvrWindow): Promise<void> {
  const frvr = configureLocalFrvrSdk(scope);
  try {
    if (!scope.frvrSdkInitPromise) {
      scope.frvrSdkInitPromise =
        frvr.initPromise ?? Promise.resolve(frvr.init("prod")).then(() => undefined);
    }

    frvr.tracker?.addExtraFieldFunction?.((fields) => {
      fields.context = "moomoo";
      fields.app_version = "1.9.4";
      if (TRACKER_CHANNEL) fields.channel = TRACKER_CHANNEL;
    });
  } catch {
    console.error("[FRVR] sdk failed init");
  }
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
  frvr.ads ??= {
    show: (_kind, done) => resolved().then(() => done?.()),
  };
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
