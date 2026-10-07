// ============================================================================
// FRVR SDK · channel-web bundle · v11.31.0 (build 1790842899326)
// ============================================================================

export enum Env {
  PRODUCTION = 'production',
  BETA = 'beta',
  DEVELOPMENT = 'development',
}

export enum AdType {
  REWARD = 'reward',
  AD = 'ad',
  INTERSTITIAL = 'interstitial',
  BANNER = 'banner',
  DEFAULT = 'default',
}

export enum AdFinishedStatus {
  SUCCESS = 'success',
  TIMED_OUT = 'timedOut',
  ERROR = 'error',
  DISMISSED = 'dismissed',
  USER_INPUT = 'userInput',
  SKIPPED = 'skipped',
}

export enum AdError {
  UNKNOWN = 'unknown',
  TIMED_OUT = 'timedOut',
  NOFILL = 'nofill',
  CLOSE = 'close',
  ERROR = 'error',
  AD_BLOCKED = 'adBlocked',
}

export enum AdSuccess {
  COMPLETED = 'completed',
  SUCCESS = 'success',
}

export enum Platform {
  WEB = 'web',
  FACEBOOK_INSTANT = 'facebook-instant',
  FACEBOOK_WEB = 'facebook-web',
  GOOGLE_INTERNAL = 'google-internal',
  SAMSUNG_INSTANT = 'samsung-instant',
  MICROSOFT = 'microsoft',
  DISCORD = 'discord',
  CRAZYGAMES = 'crazygames',
  FRVR_EMBED = 'frvr-embed',
  MSPWA = 'mspwa',
}

export enum LifecycleSuspendReason {
  DEFAULT = 'default',
  PARENT_UI = 'parentUi',
  CHANNEL = 'channel',
  GAME = 'game',
}

export enum IAPErrorCode {
  UNKNOWN = 'UNKNOWN',
  INVALID_PARAM = 'INVALID_PARAM',
  ALREADY_OWNED = 'ALREADY_OWNED',
  HELD_BY_ECONOMY = 'HELD_BY_ECONOMY',
  POPUP_BLOCKED = 'POPUP_BLOCKED',
  CANCELLED_BY_USER = 'CANCELLED_BY_USER',
  PRODUCT_UNKNOWN = 'IAPPurchaseErrorUnknownProduct',
}

export enum ConsentPurpose {
  None = 0,
  P1StoreInformationOnADevice = 1 << 0,
  P2SelectBasicAds = 1 << 1,
  P3PersonalizedAdsProfile = 1 << 2,
  P4PersonalizedAds = 1 << 3,
  P5PersonalizedContentProfile = 1 << 4,
  P6PersonalizedContent = 1 << 5,
  P7MeasureAdPerformance = 1 << 6,
  P8MeasureContentPerformance = 1 << 7,
  P9MarketResearchForAudienceInsights = 1 << 8,
  P10DevelopAndImproveProducts = 1 << 9,
  All = 0x7fe,
}

export const CURRENCY_EXPONENTS: Record<string, number> = {
  // zero-decimal
  BIF: 0, CLP: 0, DJF: 0, GNF: 0, ISK: 0, JPY: 0, KMF: 0, KRW: 0,
  PYG: 0, RWF: 0, UGX: 0, UYI: 0, VND: 0, VUV: 0, XAF: 0, XOF: 0,
  XPF: 0, XPT: 0, XSU: 0, XUA: 0, XTS: 0, XBA: 0, XBB: 0, XBC: 0,
  XBD: 0, XDR: 0, XFU: 0,
  // three-decimal
  BHD: 3, IQD: 3, JOD: 3, KWD: 3, LYD: 3, OMR: 3, TND: 3,
  // everything else is 2
};

export function currencyExponent(currency: string): number {
  return CURRENCY_EXPONENTS[currency] ?? 2;
}

export function convertToPriceValue(amount: number, currency: string): number {
  const exp = CURRENCY_EXPONENTS[currency];
  if (exp == null) {
    console.warn(`Unexpected currency ${currency}`);
    return amount;
  }
  return amount / Math.pow(10, exp);
}

export interface Logger {
  debug(...args: unknown[]): void;
  log(...args: unknown[]): void;
  info(...args: unknown[]): void;
  warn(...args: unknown[]): void;
  error(...args: unknown[]): void;
}

export const emptyLogger: Logger = {
  debug: () => {},
  log: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
};

export interface Tracker {
  logEvent(name: string, data?: Record<string, unknown>): void;
  reportUse(...args: unknown[]): void;
}

export interface AdTracker {
  requestingAd(): void;
  receivedAdResponse(status: AdFinishedStatus, detail?: unknown): void;
  finishedAd(status: AdFinishedStatus): void;
  willShowAd(visible: boolean): void;
}

export interface AdProvider {
  getName(): string;
  getType(): AdType;
  isReady(): boolean;
  useManualControl(): boolean;
  init(config: unknown, adTracker: AdTracker, container: unknown): Promise<void>;
  show(): Promise<{ success: boolean; code: string; message?: string }>;
  hide(): void;
}

export interface IAPProduct {
  sku: string;
  name: string;
  price: number;
  currency: string;
  priceMinor?: number;
  currencyCode?: string;
  imageUrl?: string;
  taxIncluded?: boolean;
  type?: string;
}

export interface IAPPurchase {
  channelId: string;
  productId: string;
  purchaseId: string;
  transactionId: string;
  transactionReceipt: Record<string, unknown>;
  gameId: string;
  frvrId?: string;
  channelData?: Record<string, unknown>;
}

export interface ChannelCharacteristics {
  [key: string]: unknown;
  hasDedicatedLoadingScreen?: boolean;
  allowExternalLinks?: boolean;
  allowInternalLinks?: boolean;
  allowNavigation?: boolean;
  allowSendBeacon?: boolean;
}

export const defaultCharacteristics: ChannelCharacteristics = {
  hasDedicatedLoadingScreen: false,
};

export const delay = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

export function isIframed(win: Window = window): boolean {
  try {
    return win.self !== win.top;
  } catch {
    return true;
  }
}

export function isMobileIOS(): boolean {
  return /(ipod|iphone|ipad)/i.test(navigator.userAgent) ||
    (/(Macintosh)/i.test(navigator.userAgent) && 'ontouchend' in document);
}

export function isAndroid(): boolean {
  return /(android)/i.test(navigator.userAgent) &&
    !/(Windows)/i.test(navigator.userAgent);
}

export function formatCurrency(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
      currencyDisplay: 'narrowSymbol',
    }).format(amount);
  } catch {
    try {
      return new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency,
      }).format(amount);
    } catch {
      return `${currency} ${amount}`;
    }
  }
}

export class ChannelWebBootstrapper {
  constructor(private readonly logger: Logger) {}

  async init(): Promise<void> {}

  setProgress(progress: number): void {
    const pct = (100 * progress).toFixed(1);
    this.logger.log(`[channel-web] progress: ${pct}%`);
  }

  async complete(): Promise<void> {
    this.logger.log('[channel-web] complete');
  }
}

export class AdsByGoogleScriptLoader {
  static readonly CHANNEL_IDS: Record<string, number> = {
    web: 0xf86468ab,
    microsoft: 0x1275c8717,
  };

  placementId?: string;
  channel?: string;
  readyPromise: Promise<boolean>;

  constructor(
    srcOrFactory: string | (() => Promise<{ src?: string; channel?: string }>),
    channel: string,
    enabled = false,
  ) {
    if (typeof srcOrFactory === 'function') {
      this.channel = channel;
      this.readyPromise = this.loadScriptAsync(srcOrFactory, channel, enabled);
    } else {
      this.readyPromise = this.loadScriptAsync(
        () => Promise.resolve({ src: srcOrFactory, channel }),
        channel,
        enabled,
      );
    }
  }

  private async loadScriptAsync(
    factory: () => Promise<{ src?: string; channel?: string }>,
    channel: string,
    enabled: boolean,
  ): Promise<boolean> {
    try {
      const cfg = await factory();
      this.placementId = cfg.src ?? 'adsbygoogle';
      this.channel = channel;
      if (cfg.channel) this.customChannelId = cfg.channel;
      return this.loadScript(enabled);
    } catch (err) {
      console.warn('[adsbygoogle] failed to load script', err);
      return false;
    }
  }

  customChannelId?: string;

  private loadScript(enabled: boolean): Promise<boolean> {
    const script = document.createElement('script');
    script.async = true;
    script.setAttribute('data-ad-client', this.placementId!.toString());
    script.setAttribute('data-ad-frequency-hint', '30s');
    if (enabled) script.setAttribute('data-adbreak-test', 'on');

    const promise = new Promise<boolean>((resolve) => {
      script.onload = async () => {
        await this.preload();
        resolve(true);
      };
      script.onerror = () => resolve(false);
    });

    const channelId = this.getChannelId();
    if (channelId) script.setAttribute('data-ad-channel', channelId.toString());
    script.src =
      'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js';
    (document.head || document.documentElement || document.body).appendChild(
      script,
    );
    return promise;
  }

  private getChannelId(): number | undefined {
    if (this.customChannelId) return this.customChannelId as unknown as number;
    if (this.channel && this.channel in AdsByGoogleScriptLoader.CHANNEL_IDS) {
      return AdsByGoogleScriptLoader.CHANNEL_IDS[this.channel];
    }
    return 0x7aee0894;
  }

  preload(): Promise<boolean> {
    return new Promise((resolve) => {
      (window as any).adsbygoogle.push({
        preloadAdBreaks: 'on',
        onReady: () => resolve(true),
      });
    });
  }
}

export class ElementWaiter {
  private observer: MutationObserver | null = null;
  private timeoutId: number | null = null;

  wait<T>(fn: () => T | null, timeoutMs = 30_000): Promise<T> {
    return new Promise((resolve, reject) => {
      const immediate = fn();
      if (immediate) return resolve(immediate);
      this.timeoutId = window.setTimeout(() => {
        this.disconnect();
        reject(new Error('Element not found within timeout'));
      }, timeoutMs);
      this.observer = new MutationObserver(() => {
        const found = fn();
        if (found) {
          this.disconnect();
          resolve(found);
        }
      });
      this.observer.observe(document.body, { childList: true, subtree: true });
    });
  }

  disconnect(): void {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
  }
}

export class ViewportObserver {
  private observer: IntersectionObserver | null = null;
  private interval: number | null = null;
  private isVisible = false;

  constructor(
    private readonly getElement: () => HTMLElement | null,
    private readonly onVisibilityChange: (visible: boolean) => void,
  ) {
    const el = getElement();
    if (el) {
      this.element = el;
      this.setupObserver();
    } else {
      this.interval = window.setInterval(() => {
        const found = getElement();
        if (found) {
          if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
          }
          this.element = found;
          this.setupObserver();
        }
      }, 1000);
    }
  }

  private element: HTMLElement | null = null;

  private setupObserver(): void {
    if (!this.element) return;
    if (typeof window.IntersectionObserver === 'function') {
      this.observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !this.isVisible) {
            this.onVisibilityChange(true);
            this.isVisible = true;
          } else if (!entry.isIntersecting && this.isVisible) {
            this.onVisibilityChange(false);
            this.isVisible = false;
          }
        });
      });
      this.observer.observe(this.element);
    } else {
      this.interval = window.setInterval(() => {
        if (!this.element) return;
        const rect = this.element.getBoundingClientRect();
        const visible =
          rect.top < window.innerHeight &&
          rect.bottom > 0 &&
          rect.left < window.innerWidth &&
          rect.right > 0;
        if (visible && !this.isVisible) {
          this.onVisibilityChange(true);
          this.isVisible = true;
        } else if (!visible && this.isVisible) {
          this.onVisibilityChange(false);
          this.isVisible = false;
        }
      }, 1000);
    }
  }

  disconnect(): void {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }
}

export class AdsByGoogleBannerProvider implements AdProvider {
  private isReadyFlag = false;
  private banners: any[] = [];
  private bannerElements = new Map<string, HTMLElement>();
  private elementWaiters = new Map<string, ElementWaiter>();
  private viewportObservers = new Map<string, ViewportObserver>();

  constructor(
    private readonly preloader: AdsByGoogleScriptLoader,
    private readonly logger: Logger,
  ) {}

  getName(): string {
    return 'AdsByGoogleBannerProvider';
  }

  getType(): AdType {
    return AdType.BANNER;
  }

  isReady(): boolean {
    return this.isReadyFlag;
  }

  useManualControl(): boolean {
    return false;
  }

  async init(config: any, _tracker: AdTracker, _container: unknown): Promise<void> {
    const cfg = config?.adsConfig;
    this.banners = cfg?.banners || [];
    this.logger.debug(
      '[adsbygoogle] AdsByGoogleBannerProvider checking if ready',
      this.isReadyFlag,
      this.banners.length,
    );
    this.preloader.readyPromise
      .then((ready) => {
        this.isReadyFlag = ready;
        this.logger.debug(
          '[adsbygoogle] AdsByGoogleBannerProvider ready changed',
          this.isReadyFlag,
          this.banners.length,
        );
        if (ready && this.banners.length > 0) this.registerBanners();
      })
      .catch((err) => {
        this.logger.warn('[adsbygoogle] AdsByGoogleBannerProvider init error', err);
      });
  }

  private registerBanners(): void {
    this.banners.forEach((banner) => {
      if (this.bannerElements.has(banner.adUnitId)) return;
      const waiter = new ElementWaiter();
      this.elementWaiters.set(banner.adUnitId, waiter);
      this.logger.debug(
        `[adsbygoogle] Registering banner ${banner.adUnitId} (element ${
          banner.targetElementId ?? banner.adUnitId
        })`,
      );
      waiter
        .wait(() => {
          if (banner.targetElementId)
            return document.getElementById(banner.targetElementId);
          return (
            document.getElementById(banner.adUnitId) ||
            document.querySelector(`[data-ad-unit-id="${banner.adUnitId}"]`)
          );
        })
        .then((el) => {
          this.logger.debug(
            `[adsbygoogle] Element found for banner ${banner.adUnitId}, setting up viewport observer`,
          );
          const observer = new ViewportObserver(
            () => {
              if (banner.targetElementId)
                return document.getElementById(banner.targetElementId);
              return (
                (document.getElementById(banner.adUnitId) as HTMLElement) ||
                (document.querySelector(
                  `[data-ad-unit-id="${banner.adUnitId}"]`,
                ) as HTMLElement)
              );
            },
            (visible) => {
              if (!visible) return;
              const target = banner.targetElementId
                ? document.getElementById(banner.targetElementId)
                : (document.getElementById(banner.adUnitId) as HTMLElement) ||
                  (document.querySelector(
                    `[data-ad-unit-id="${banner.adUnitId}"]`,
                  ) as HTMLElement);
              if (target && !this.bannerElements.has(banner.adUnitId)) {
                this.logger.debug(
                  `[adsbygoogle] Banner ${banner.adUnitId} became visible, creating ad`,
                );
                this.createAndInsertAd(banner, target);
              }
            },
          );
          this.viewportObservers.set(banner.adUnitId, observer);
        })
        .catch((err) => {
          this.logger.warn(
            `[adsbygoogle] Failed to find target element for banner ${banner.adUnitId}:`,
            err,
          );
        });
    });
  }

  private createAndInsertAd(banner: any, target: HTMLElement): void {
    if (this.bannerElements.has(banner.adUnitId)) return;
    const selector = `[data-ad-unit-id="${banner.adUnitId}"]`;
    let width = banner.width;
    let height = banner.height;
    if (banner.width === undefined || banner.height === undefined) {
      const m = /^(\d+)x(\d+)$/.exec(banner.size);
      if (m) {
        width = banner.width ?? parseInt(m[1], 10);
        height = banner.height ?? parseInt(m[2], 10);
      }
    }
    if (typeof document !== 'undefined' && width && height) {
      const styleId = `adslot-style-${banner.adUnitId}`;
      if (!document.getElementById(styleId)) {
        const style = document.createElement('style');
        style.id = styleId;
        style.type = 'text/css';
        style.textContent = `${selector} { width: ${width}px; height: ${height}px; }\n        `;
        document.head.appendChild(style);
      }
    }
    const ad = document.createElement('ins');
    ad.className = `adsbygoogle${selector}`;
    ad.style.display = 'inline-block';
    ad.setAttribute('data-ad-client', (this.preloader as any).placementId);
    ad.setAttribute('data-ad-slot', banner.adUnitId);
    ad.setAttribute('data-ad-format', `${banner.size}`);
    if (banner.size === 'auto') {
      ad.setAttribute('data-full-width-responsive', 'true');
    }
    const channel = (this.preloader as any).getChannelId?.();
    if (channel) ad.setAttribute('data-ad-channel', channel.toString());
    target.appendChild(ad);
    this.bannerElements.set(banner.adUnitId, ad);
    try {
      ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({});
    } catch (err) {
      console.warn(`[adsbygoogle] Failed to push ad for ${banner.adUnitId}:`, err);
    }
  }

  async show(): Promise<{ success: boolean; code: string }> {
    this.bannerElements.forEach((el) => {
      el.style.display = 'inline-block';
    });
    return Promise.resolve({ success: true, code: AdSuccess.COMPLETED });
  }

  hide(): void {
    this.bannerElements.forEach((el) => {
      el.style.display = 'none';
    });
  }
}

export class AdsByGoogleAdProvider implements AdProvider {
  private ready = false;

  constructor(
    private readonly name: string,
    private readonly type: AdType,
    private readonly displayName: string,
    private readonly preloader: AdsByGoogleScriptLoader,
    private readonly logger: Logger,
  ) {}

  getName(): string {
    return this.name;
  }

  getType(): AdType {
    return this.type;
  }

  isReady(): boolean {
    return this.ready;
  }

  useManualControl(): boolean {
    return false;
  }

  async init(_config: unknown, _tracker: AdTracker, adTracker: AdTracker): Promise<void> {
    this.adTracker = adTracker;
    this.preloader.readyPromise
      .then((r) => {
        this.ready = r;
      })
      .catch((err) => {
        this.logger.error('[adsbygoogle] AdsByGoogleProvider init error', err);
      });
  }

  private adTracker!: AdTracker;

  show(): Promise<{ success: boolean; code: string; message?: string }> {
    if (!this.ready) {
      return Promise.resolve({
        success: false,
        code: AdError.NOFILL,
        message: 'Not ready',
      });
    }
    this.adTracker.willShowAd(false);
    return new Promise((resolve) => {
      const opts: any = {
        type: this.type,
        adBreakDone: (info: any) => resolve(this.mapAdBreakResult(info)),
      };
      if (this.type === AdType.REWARD) {
        opts.beforeReward = (grant: () => void) => grant();
        opts.afterReward = () => {};
        opts.adDismissed = () => {};
      }
      (window as any).adsbygoogle.push(opts);
    });
  }

  private mapAdBreakResult(info: any): { success: boolean; code: string; message?: string } {
    switch (info.breakStatus) {
      case 'timedOut':
        this.adTracker.finishedAd(AdFinishedStatus.TIMED_OUT);
        return { success: false, code: AdError.TIMED_OUT, message: 'Ad timed out' };
      case 'error':
      case 'noAdPreloaded':
      case 'notReady':
        this.adTracker.finishedAd(AdFinishedStatus.ERROR);
        return { success: false, code: AdError.NOFILL, message: 'No ad preloaded' };
      case 'frequencyCapped':
        this.adTracker.finishedAd(AdFinishedStatus.DISMISSED);
        return { success: false, code: AdError.CLOSE, message: 'Frequency capped' };
      case 'ignored':
      case 'other':
        this.adTracker.finishedAd(AdFinishedStatus.SUCCESS);
        return { success: true, code: AdSuccess.COMPLETED };
      case 'viewed':
        this.adTracker.finishedAd(AdFinishedStatus.USER_INPUT);
        return { success: true, code: AdSuccess.COMPLETED };
      case 'dismissed':
        this.adTracker.finishedAd(AdFinishedStatus.DISMISSED);
        this.preloader.preload();
        return { success: false, code: AdError.CLOSE, message: 'Ad dismissed' };
      case 'noAdPreloaded2':
        this.adTracker.finishedAd(AdFinishedStatus.DISMISSED);
        return { success: false, code: AdError.NOFILL, message: 'Not ready' };
      default:
        this.adTracker.finishedAd(AdFinishedStatus.ERROR);
        return { success: false, code: AdError.NOFILL, message: 'Ad error' };
    }
  }

  hide(): void {}
}

export class MetapixelAnalyticsProvider {
  private static CONSENT_FLAGS =
    ConsentPurpose.P4PersonalizedAds |
    ConsentPurpose.P2SelectBasicAds |
    ConsentPurpose.P7MeasureAdPerformance;

  private announced = false;

  constructor(
    private readonly pixelId: string,
    private readonly logger: Logger,
  ) {}

  async init(consentProvider: {
    onConsentChanged(cb: (consents: number, li: number) => void): void;
  }): Promise<void> {
    this.addFacebookMetaPixelQueue();
    consentProvider.onConsentChanged((consents) => {
      if ((consents & MetapixelAnalyticsProvider.CONSENT_FLAGS) ===
          MetapixelAnalyticsProvider.CONSENT_FLAGS) {
        this.injectFacebookMetaPixelLoader();
      }
    });
  }

  getName(): string {
    return 'metapixel-analytics';
  }

  track(event: string, _props: unknown, payload?: any, _ctx?: unknown): void {
    switch (event) {
      case 'page_loading':
        this.fbqTrack('PageView');
        break;
      case 'purchase':
        this.fbqTrack('Purchase', {
          currency: payload.currencyCode,
          value: payload.priceValue,
        });
        break;
    }
  }

  private fbqTrack(event: string, params?: unknown): void {
    if ((window as any).fbq) {
      if (!this.announced) {
        this.logger.debug('[metapixel-analytics] tracking fbq event', 'init', this.pixelId);
        (window as any).fbq('init', this.pixelId);
        this.announced = true;
      }
      this.logger.debug('[metapixel-analytics] tracking fbq event', event, params);
      if (params !== undefined) (window as any).fbq('track', event, params);
      else (window as any).fbq('track', event);
    } else {
      this.logger.error('[metapixel-analytics] window.fbq not found, enqueueing event');
    }
  }

  private addFacebookMetaPixelQueue(): void {
    if ((window as any).fbq) return;
    this.logger.debug('[metapixel-analytics] installing metapixel queue');
    this.appendScript(
      `
    !function(f,b,e,v,n,t,s)
    {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
    n.callMethod.apply(n,arguments):n.queue.push(arguments)};
    if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
    n.queue=[];}(window, document,'script',
    'https://connect.facebook.net/en_US/fbevents.js');
    `,
    );
  }

  private injectFacebookMetaPixelLoader(): void {
    if (this.scriptIsLoaded) return;
    this.logger.debug('[metapixel-analytics] installing metapixel loader');
    this.appendScript(`
    !function(f,b,e,v,n,t,s)
    {t=b.createElement(e);t.async=!0;
    t.src=v;s=b.getElementsByTagName(e)[0];
    s.parentNode.insertBefore(t,s)}(window, document,'script',
    'https://connect.facebook.net/en_US/fbevents.js');
    `);
    this.scriptIsLoaded = true;
  }

  private scriptIsLoaded = false;

  private appendScript(src: string): void {
    const script = document.createElement('script');
    const text = document.createTextNode(src);
    script.appendChild(text);
    window.document.getElementsByTagName('script')[0].appendChild(script);
  }
}

export class PlayerStorageClient {
  private baseUrl: string;

  constructor(
    baseUrl: string,
    private readonly auth: { authenticatedFetch: typeof fetch } | undefined,
    private readonly logger?: Logger,
  ) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
  }

  async getQuery(keys?: string, gameId?: string, keyList?: string): Promise<any> {
    const params = new URLSearchParams();
    if (keys !== undefined) params.set('keys', keys ?? '');
    if (gameId !== undefined) params.set('gameId', gameId ?? '');
    if (keyList !== undefined) params.set('keyList', keyList ?? '');
    const res = await this.auth?.authenticatedFetch(
      `${this.baseUrl}/player/query?${params.toString()}`,
      { method: 'GET', headers: { 'Content-Type': 'application/json' } },
    );
    if (!res?.ok) throw new PlayerStorageError(res!);
    return res.json();
  }

  async getAllPlayerObjects(userId: string, gameId: string, keys?: string): Promise<any> {
    const params = new URLSearchParams();
    if (keys !== undefined) params.set('keys', keys ?? '');
    const res = await this.auth?.authenticatedFetch(
      `${this.baseUrl}/player/${userId}/${gameId}?${params.toString()}`,
      { method: 'GET', headers: { 'Content-Type': 'application/json' } },
    );
    if (!res?.ok) throw new PlayerStorageError(res!);
    return res.json();
  }

  async getPlayerSummary(userId: string, gameId: string): Promise<{ exists: boolean }> {
    const res = await this.auth?.authenticatedFetch(
      `${this.baseUrl}/player/${userId}/${gameId}?summary=true`,
      { method: 'GET', headers: { 'Content-Type': 'application/json' } },
    );
    if (!res?.ok) throw new PlayerStorageError(res!);
    const body = await res.json();
    if (typeof body?.exists === 'boolean') return { exists: body.exists };
    if (Array.isArray(body?.items)) return { exists: body.items.length > 0 };
    throw new PlayerStorageError(res!);
  }

  async upsertItem(userId: string, gameId: string, key: string, value: unknown): Promise<void> {
    const res = await this.auth?.authenticatedFetch(
      `${this.baseUrl}/player/${userId}/${gameId}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value }),
      },
    );
    if (!res?.ok) throw new PlayerStorageError(res!);
  }

  async deletePlayerObject(userId: string, gameId: string, key: string, value: unknown): Promise<void> {
    const res = await this.auth?.authenticatedFetch(
      `${this.baseUrl}/player/${userId}/${gameId}/${key}`,
      {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(value),
      },
    );
    if (!res?.ok) throw new PlayerStorageError(res!);
  }
}

export class PlayerStorageError extends Error {
  readonly status: number;
  constructor(response: Response) {
    super(response.statusText);
    this.status = response.status;
  }
}

export enum CachePolicy {
  HIGHEST = 'highest',
  LATEST = 'latest',
}

export class LeaderboardEntry {
  id: string;
  score?: number;
  constructor(data: any) {
    this.id = data.id;
    Object.assign(this, data);
  }
}

export class Tournament {
  id: string;
  contextId?: string;
  endTime?: number;
  startTime?: number;
  refreshInterval: number;
  title: string;
  payload: unknown;
  offset: unknown;
  count: number;
  players?: unknown;
  type?: string;
  constructor(data: any) {
    this.id = data.id;
    this.contextId = data.contextID;
    if (data.endTime) this.endTime = data.endTime;
    if (data.startTime) this.startTime = data.startTime;
    this.refreshInterval = data.refreshInterval;
    this.title = data.title;
    this.payload = data.payload;
    this.offset = data.offset;
    this.count = data.count;
    if (data.players) this.players = data.players;
    if (data.type) this.type = data.type;
  }
}

export class LeaderboardClient {
  private apiUrl!: string;
  private gameId!: string;
  private channel!: string;
  private leaderboards: Record<string, { scores: Record<string, number> }> = {};

  constructor(private readonly env: Env) {}

  init(gameId: string, env: Env): void {
    this.apiUrl =
      {
        [Env.PRODUCTION]: 'https://crucible.frvr.com',
        [Env.BETA]: 'https://staging.crucible.frvr.com',
        [Env.DEVELOPMENT]: 'https://staging.crucible.frvr.com',
      }[env];
    this.gameId = gameId;
    this.leaderboards = {};
  }

  setChannel(channel: string): void {
    this.channel = channel;
  }

  async create(
    type: string,
    opts: { id?: string; title: string; endTime?: number; refreshInterval?: number; payload?: unknown; sortOrder?: string },
  ): Promise<string> {
    const url = `${this.apiUrl}/v1/leaderboards`;
    const body: Record<string, unknown> = {
      game: this.gameId,
      title: opts.title,
      endTime: opts.endTime,
      refreshInterval: opts.refreshInterval,
      type: type || 'default',
      data: opts.payload,
      sortOrder: opts.sortOrder || 'HIGHER_IS_BETTER',
    };
    if (opts.id) body.id = opts.id;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    if (!res.ok) throw new LeaderboardError(json.error);
    return json.id;
  }

  async getLeaderboard(
    id: string,
    count = 30,
    offset = 0,
    cachePolicy = CachePolicy.HIGHEST,
  ): Promise<Tournament> {
    const url = `${this.apiUrl}/v1/leaderboards/${this.gameId}/${id}`;
    const params = { count: count.toString(), offset: offset.toString() };
    const res = await fetch(`${url}?${new URLSearchParams(params)}`);
    const json = await res.json();
    if (!res.ok) throw new LeaderboardError(json.error);
    json.payload = json.data;
    if (json.players) {
      json.players = json.players.map((p: any) => {
        const entry = new LeaderboardEntry(p);
        entry.score = this.getCachedScore(id, entry.id as string, entry.score!, cachePolicy);
        return entry;
      });
    }
    return new Tournament(json);
  }

  async getLeaderboardEntry(
    id: string,
    playerId: string,
    cachePolicy = CachePolicy.HIGHEST,
  ): Promise<LeaderboardEntry> {
    const url = `${this.apiUrl}/v1/leaderboards/${this.gameId}/${id}/${playerId}`;
    const params = { platform: this.channel };
    const res = await fetch(`${url}?${new URLSearchParams(params)}`);
    const json = await res.json();
    if (!res.ok) throw new LeaderboardError(json.error);
    json.payload = json.data;
    json.score = this.getCachedScore(id, playerId, json.score, cachePolicy);
    return new LeaderboardEntry(json);
  }

  async postScore(
    leaderboardId: string,
    playerId: string,
    score: number,
    name?: string,
    payload?: unknown,
    cachePolicy = CachePolicy.HIGHEST,
  ): Promise<any> {
    this.applyStatus(leaderboardId, playerId, score, cachePolicy);
    const url = `${this.apiUrl}/v1/leaderboards/${this.gameId}/${leaderboardId}`;
    const body: Record<string, unknown> = {
      id: playerId,
      score,
      platform: this.channel,
      disableSortOrder: cachePolicy === CachePolicy.LATEST,
    };
    if (name) body.name = name;
    if (payload) body.extra = payload;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    if (!res.ok) throw new LeaderboardError(json.error);
    return json;
  }

  async getAllLeaderboardsIdsOfType(opts: any): Promise<string[]> {
    return (await this.getAllLeaderboardsOfType({ ...opts, verbose: false })).ids || [];
  }

  async getAllLeaderboardsDataOfType(opts: any): Promise<Tournament[]> {
    return (await this.getAllLeaderboardsOfType({ ...opts, verbose: true })).leaderboards || [];
  }

  async getAllLeaderboardsOfType(opts: any): Promise<any> {
    const url = `${this.apiUrl}/v1/leaderboards/${this.gameId}/${opts.playerId}`;
    const params: Record<string, string> = {
      type: opts.type,
      platform: this.channel,
      sortOrder: opts.sortOrder || 'LATEST',
      sortBy: opts.sortBy || 'created',
      count: (opts.count || 30).toString(),
      offset: (opts.offset || 0).toString(),
      verbose: opts.verbose ? 'true' : 'false',
    };
    const res = await fetch(`${url}?${new URLSearchParams(params)}`);
    const json = await res.json();
    if (!res.ok) throw new LeaderboardError(json.error);
    return json;
  }

  async getLeaderboardEntries(
    leaderboardId: string,
    players: string[],
    cachePolicy = CachePolicy.HIGHEST,
  ): Promise<LeaderboardEntry[]> {
    if (!players.length) return [];
    const url = `${this.apiUrl}/v1/leaderboards/${this.gameId}/${leaderboardId}/entries`;
    const params = { platform: this.channel, players: players.join(',') };
    const res = await fetch(`${url}?${new URLSearchParams(params)}`);
    const json = await res.json();
    if (!res.ok) throw new LeaderboardError(json.error);
    return (json?.items || []).map((e: any) => {
      e.payload = e.data;
      e.score = this.getCachedScore(leaderboardId, e.id, e.score, cachePolicy);
      return new LeaderboardEntry(e);
    });
  }

  async getLeaderboardTimeline(opts: {
    leaderboardId: string;
    interval: number;
    minScore: number;
    maxScore: number;
    limit?: number;
    page?: number;
  }): Promise<LeaderboardEntry[]> {
    const url = `${this.apiUrl}/v1/leaderboards/${this.gameId}/${opts.leaderboardId}/timeline`;
    const params: Record<string, string | undefined> = {
      platform: this.channel,
      interval: opts.interval.toString(),
      minInterval: opts.minScore.toString(),
      maxInterval: opts.maxScore.toString(),
      entries: opts.limit?.toString(),
      page: opts.page?.toString(),
    };
    const search = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v !== undefined) search.set(k, v);
    const res = await fetch(`${url}?${search}`);
    const json = await res.json();
    if (!res.ok) throw new LeaderboardError(json.error);
    return (json?.items || []).map((e: any) => new LeaderboardEntry(e));
  }

  private buildScoreCache(id: string): { scores: Record<string, number> } {
    if (!this.leaderboards[id]) this.leaderboards[id] = { scores: {} };
    return this.leaderboards[id];
  }

  private getCachedScore(
    leaderboardId: string,
    playerId: string,
    score: number,
    policy?: CachePolicy,
  ): number {
    const cache = this.buildScoreCache(leaderboardId);
    const prev = cache.scores[playerId];
    if (!policy) throw new Error('Somehow, we are missing cache policy!');
    switch (policy) {
      case CachePolicy.HIGHEST:
        score = Math.max(prev ?? 0, score);
        cache.scores[playerId] = score;
        break;
      case CachePolicy.LATEST:
        score = prev ?? score;
        break;
    }
    return score;
  }

  private applyStatus(
    leaderboardId: string,
    playerId: string,
    score: number,
    policy?: CachePolicy,
  ): void {
    const cache = this.buildScoreCache(leaderboardId);
    const prev = cache.scores[playerId];
    if (!policy) throw new Error('Somehow, we are missing cache policy!');
    switch (policy) {
      case CachePolicy.HIGHEST:
        score = Math.max(prev ?? 0, score);
        break;
      case CachePolicy.LATEST:
        break;
    }
    cache.scores[playerId] = score;
  }
}

export class LeaderboardError extends Error {
  constructor(
    public readonly code: string,
    message?: string,
  ) {
    super(message ?? code);
  }
}

class ChannelLeaderboardProvider {
  private readonly client: LeaderboardClient;

  constructor(
    private readonly env: Env,
    private readonly channel: string,
    private readonly auth: any,
  ) {
    this.client = new LeaderboardClient(env);
    this.client.setChannel(channel);
  }

  init(gameId: string, env: Env): void {
    this.client.init(gameId, env);
    this.client.setChannel(this.channel);
  }

  isSupported(): boolean {
    return true;
  }

  getLeaderboardEntries(id: string, players: string[], policy: CachePolicy): Promise<LeaderboardEntry[]> {
    return this.client.getLeaderboardEntries(id, players, policy);
  }

  getLeaderboardEntry(id: string, playerId: string, policy: CachePolicy): Promise<LeaderboardEntry> {
    return this.client.getLeaderboardEntry(id, playerId, policy);
  }

  getLeaderboard(id: string, count: number, offset: number, policy: CachePolicy): Promise<Tournament> {
    return this.client.getLeaderboard(id, count, offset, policy);
  }

  async postScore(id: string, score: number, extra?: unknown): Promise<unknown> {
    const playerId = this.auth?.getFRVRID?.();
    if (!playerId) throw new Error('Cannot post a leaderboard score without an authenticated FRVR ID');
    return this.client.postScore(id, playerId, score, undefined, extra);
  }

  create(id: string | undefined, options: any): Promise<string> {
    return this.client.create(options?.type ?? 'default', { ...options, id });
  }

  getTimelineEntries(options: any): Promise<LeaderboardEntry[]> {
    return this.client.getLeaderboardTimeline(options);
  }
}

export interface ConsentProvider {
  init(config?: unknown): Promise<void>;
  getName(): string;
  onConsentChanged(cb: (consents: number, li: number) => void): void;
  hasConsentForAny(bits: number, fallback?: number): boolean;
  hasConsentForAll(bits: number, fallback?: number): boolean;
  getConsents(): number;
  getLegitimateInterests(): number;
  hasLoaded(): boolean;
  isConsentEditable(): boolean;
  showConsentPreferences(): void;
  isReady(): boolean;
}

export const noopConsentProvider: ConsentProvider = {
  async init() {},
  getName: () => 'NoopConsentProvider',
  onConsentChanged() {},
  hasConsentForAny: () => false,
  hasConsentForAll: () => false,
  getConsents: () => ConsentPurpose.None,
  getLegitimateInterests: () => ConsentPurpose.None,
  hasLoaded: () => false,
  isConsentEditable: () => false,
  showConsentPreferences() {},
  isReady: () => false,
};

export class TcfV2ConsentProvider implements ConsentProvider {
  private consentsBitSet = ConsentPurpose.None;
  private legitimateInterestsBitSet = ConsentPurpose.None;
  private loaded = false;
  private googleFcInjected = false;
  private inheritedCmp = false;
  private noCmpFallbackApplied = false;
  private onConsentChangedHandlers: Array<(c: number, l: number) => void> = [];
  private noCmpFallbackTimer?: number;

  constructor(
    private readonly config: any,
    private readonly logger: Logger,
  ) {
    this.installInheritedTcfApi();
  }

  private bitsFromConsents(consents: Record<string, boolean>): number {
    let bits = 0;
    for (const key in consents) if (consents[key]) bits |= 1 << Number(key);
    return bits;
  }

  private setupTcfApiListener(): void {
    if (!(window as any).__tcfapi) return;
    this.logger.log(`${this.getName()}::onLoad()`);
    const callback = (data: any, success: boolean) => {
      if (!success || (data.eventStatus !== 'tcloaded' && data.eventStatus !== 'useractioncomplete')) return;
      this.loaded = true;
      this.noCmpFallbackApplied = false;
      this.consentsBitSet = this.bitsFromConsents(data.purpose?.consents ?? {});
      this.legitimateInterestsBitSet = this.bitsFromConsents(data.purpose?.legitimateInterests ?? {});
      this.dispatchConsentChanged(this.consentsBitSet, this.legitimateInterestsBitSet);
    };
    (window as any).__tcfapi('addEventListener', 2, callback);
  }

  private dispatchConsentChanged(consents: number, li: number): void {
    for (let i = 0; i < this.onConsentChangedHandlers.length; i++) {
      this.onConsentChangedHandlers[i](consents, li);
    }
  }

  hasLoaded(): boolean {
    return this.loaded;
  }

  isConsentEditable(): boolean {
    return !this.inheritedCmp && !this.noCmpFallbackApplied;
  }

  async init(config?: unknown): Promise<void> {
    const cfg = config as any;
    const googleFcPropertyId = cfg?.googleFcPropertyId;
    if (!(window as any).__tcfapi) {
      if (this.installInheritedTcfApi()) {
        this.logger.log(`${this.getName()}::inherited CMP from an ancestor frame`);
      } else if (googleFcPropertyId) {
        this.injectGoogleFundingChoices(googleFcPropertyId);
      } else {
        this.scheduleNoCmpFallback();
      }
    }
    this.waitForTcfApi();
  }

  private installInheritedTcfApi(): boolean {
    let found: Window | null = null;
    let w: Window | null = window;
    while (w) {
      try {
        if ((w as any).frames['__tcfapiLocator']) {
          found = w;
          break;
        }
      } catch {
      }
      if (w === window.top) break;
      w = (w.parent as Window) === w ? null : (w.parent as Window);
    }
    if (!found || found === window) return false;
    const callbacks: Record<string, (res: any, ok: boolean) => void> = {};
    let callId = 0;
    window.addEventListener(
      'message',
      (event) => {
        let data = event.data;
        if (typeof data === 'string') {
          try {
            data = JSON.parse(data);
          } catch {
            return;
          }
        }
        const call = data && data.__tcfapiCall;
        const cb = call && callbacks[call.callId];
        if (cb) {
          cb(call.returnValue, call.success);
          if (call.command !== 'addEventListener') delete callbacks[call.callId];
        }
      },
      false,
    );
    (window as any).__tcfapi = (command: string, version: number, cb: any, parameter: any) => {
      callId += 1;
      const id = `__tcfapiReturn${callId}`;
      callbacks[id] = cb;
      (found as any).postMessage(
        { __tcfapiCall: { command, version, callId: id, parameter } },
        '*',
      );
    };
    this.inheritedCmp = true;
    return true;
  }

  private waitForTcfApi(): void {
    let delay = 1;
    const check = () => {
      if ((window as any).__tcfapi) this.setupTcfApiListener();
      else {
        setTimeout(check, delay);
        delay *= 2;
        if (delay > 4000) delay = 4000;
      }
    };
    check();
  }

  private injectGoogleFundingChoices(propertyId: string): void {
    this.logger.log(`${this.getName()}::injecting Google Funding Choices for ${propertyId}`);
    this.googleFcInjected = true;
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://fundingchoicesmessages.google.com/i/${propertyId}?ers=1`;
    script.onerror = () => {
      this.logger.warn(`${this.getName()}::Google Funding Choices script failed to load`);
      this.scheduleNoCmpFallback();
    };
    document.head.appendChild(script);
    this.signalGooglefcPresent();
  }

  private signalGooglefcPresent(): void {
    if ((window as any).googlefc?.present) return;
    if (!document.body) {
      setTimeout(() => this.signalGooglefcPresent(), 0);
      return;
    }
    const div = document.createElement('div');
    div.style.width = '0';
    div.style.height = '0';
    div.style.display = 'none';
    div.id = 'googlefcPresent';
    document.body.appendChild(div);
  }

  private scheduleNoCmpFallback(timeout = 5000): void {
    if (this.noCmpFallbackTimer !== undefined || this.loaded) return;
    this.noCmpFallbackTimer = window.setTimeout(() => {
      if (this.loaded || (window as any).__tcfapi) return;
      this.logger.warn(`${this.getName()}::no CMP present, falling back to consent-to-all`);
      this.noCmpFallbackApplied = true;
      this.loaded = true;
      this.consentsBitSet = ConsentPurpose.All;
      this.legitimateInterestsBitSet = ConsentPurpose.All;
      this.dispatchConsentChanged(this.consentsBitSet, this.legitimateInterestsBitSet);
    }, timeout);
  }

  showConsentPreferences(): void {
    if (this.inheritedCmp) {
      this.logger.warn(`${this.getName()}::consentToTerms(NoOpImpl)`);
      return;
    }
    if (this.googleFcInjected || (window as any).googlefc) {
      const fc = ((window as any).googlefc = (window as any).googlefc ?? {});
      fc.callbackQueue = fc.callbackQueue ?? [];
      fc.callbackQueue.push({
        CONSENT_DATA_READY: () => fc.showRevocationMessage?.(),
      });
      return;
    }
    this.logger.warn(`${this.getName()}::consentToTerms(owned by the embedding page)`);
  }

  isReady(): boolean {
    return true;
  }

  onConsentChanged(cb: (c: number, l: number) => void): void {
    this.onConsentChangedHandlers.push(cb);
    if (this.loaded) cb(this.consentsBitSet, this.legitimateInterestsBitSet);
  }

  hasConsentForAny(bits: number, _fallback = ConsentPurpose.None): boolean {
    return this.hasLoaded() && (this.consentsBitSet & bits) !== 0;
  }

  hasConsentForAll(bits: number, _fallback = ConsentPurpose.None): boolean {
    return this.hasLoaded() && (this.consentsBitSet & bits) === bits;
  }

  getConsents(): number {
    return this.consentsBitSet;
  }

  getLegitimateInterests(): number {
    return this.legitimateInterestsBitSet;
  }

  getName(): string {
    return 'TcfV2ConsentProvider';
  }
}

export class CookieproConsentProvider extends TcfV2ConsentProvider {
  private cookieproLoaded = false;
  constructor(config: any, logger: Logger) {
    super(config, logger);
  }
  override getName(): string {
    return 'CookieproConsentProvider';
  }
  override async init(config: any): Promise<void> {
    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = 'https://cookie-cdn.cookiepro.com/scripttemplates/otSDKStub.js';
    script.setAttribute('data-domain-script', config.websiteKey);
    script.async = true;
    script.defer = true;
    script.onload = () => {
      if (!this.cookieproLoaded) {
        this.cookieproLoaded = true;
        (this as any).waitForTcfApi?.();
      }
    };
    document.head.appendChild(script);
    const inline = document.createElement('script');
    inline.type = 'text/javascript';
    inline.textContent = 'function OptanonWrapper() { }';
    document.head.appendChild(inline);
    const style = document.createElement('style');
    style.setAttribute('type', 'text/css');
    style.textContent = 'div#ot-sdk-btn-floating { display: none !important; }';
    document.head.appendChild(style);
  }
  override showConsentPreferences(): void {
    if (this.hasLoaded()) (window as any).OneTrust?.ToggleInfoDisplay();
  }
}

interface IAPErrorOptions {
  cause?: unknown;
}

export class IAPError extends Error {
  cause?: unknown;
  constructor(
    message?: string,
    options?: IAPErrorOptions,
    public readonly code: IAPErrorCode = IAPErrorCode.UNKNOWN,
  ) {
    super(message);
    this.cause = options?.cause;
  }
}

export class IAPPurchaseErrorCancelledByUser extends IAPError {
  constructor(msg = 'Purchase cancelled by user', opts?: IAPErrorOptions) {
    super(msg, opts, IAPErrorCode.CANCELLED_BY_USER);
    this.name = 'IAPPurchaseErrorCancelledByUser';
  }
}

export class IAPPurchaseErrorAlreadyOwned extends IAPError {
  constructor(msg = 'Purchase already owned', opts?: IAPErrorOptions) {
    super(msg, opts, IAPErrorCode.ALREADY_OWNED);
  }
}

export class IAPPurchaseErrorPopupBlocked extends IAPError {
  readonly maybePaid = true;
  constructor(msg = 'The payment window was blocked by the browser', opts?: IAPErrorOptions) {
    super(msg, opts, IAPErrorCode.POPUP_BLOCKED);
    this.name = 'IAPPurchaseErrorPopupBlocked';
  }
}

export class IAPPurchaseErrorPending extends IAPError {
  constructor(msg = 'Payment received; the purchase is still being confirmed', opts?: IAPErrorOptions) {
    super(msg, opts, IAPErrorCode.HELD_BY_ECONOMY);
  }
}

interface ReadyManager {
  _isReady: boolean;
  states: Record<string, boolean>;
  updateIsReady(): void;
}

export class WebIAPReadyManager implements ReadyManager {
  _isReady = false;
  states: Record<string, boolean> = {};
  constructor(
    private readonly requiredStates: string[],
    private readonly handler: (ready: boolean) => void,
  ) {
    for (const s of requiredStates) this.states[s] = false;
    this.updateIsReady();
  }
  updateIsReady(): void {
    const prev = this._isReady;
    this._isReady = this.requiredStates.every((s) => this.states[s]);
    if (prev !== this._isReady) this.handler(this._isReady);
  }
  setState(state: string, value: boolean): void {
    this.states[state] = value;
    this.updateIsReady();
  }
  getState(state: string): boolean | undefined {
    return this.states[state];
  }
  get isReady(): boolean {
    return this._isReady;
  }
}

export class XsollaIAPProvider {
  name = 'web-xsolla';
  private products: any[] = [];
  private backfilled: any[] = [];
  private isReadyFlag = false;
  private catalogLoaded = false;
  private popupInFlight = false;
  private paystationLoadingPromise: Promise<void> | null = null;

  constructor(
    private readonly serviceClient: any,
    private readonly auth: any,
    private readonly gameId: string,
    private readonly logger: Logger,
  ) {}

  getName(): string {
    return this.name;
  }
  getDisplayName(): string {
    return 'Xsolla';
  }

  async init(): Promise<void> {
    this.auth.onAuthChanged((loggedIn: boolean) => {
      if (loggedIn && !this.catalogLoaded) this.loadCatalog();
    });
    await this.loadCatalog();
  }

  async configure(): Promise<void> {}

  async loadCatalog(): Promise<void> {
    try {
      const products = await this.serviceClient.getXsollaProducts();
      this.products = products ?? [];
      this.catalogLoaded = true;
      this.updateIsReady(this.catalogProducts().length > 0);
    } catch (err) {
      this.logger.error('[web-xsolla] failed to load catalog', err);
    }
  }

  isReady(): boolean {
    return this.isReadyFlag;
  }

  onIsReadyChanged(cb: (ready: boolean) => void): void {
    this.onIsReadyChangedHandler = cb;
  }
  private onIsReadyChangedHandler?: (ready: boolean) => void;

  private updateIsReady(ready: boolean): void {
    this.isReadyFlag = ready;
    this.onIsReadyChangedHandler?.(ready);
  }

  addProducts(products: any[]): void {
    this.backfilled = mergeProducts(this.backfilled, products);
    this.updateIsReady(this.catalogProducts().length > 0);
  }

  catalogProducts(): any[] {
    return mergeProductsDistinct(this.products, this.backfilled);
  }

  getSkus(): Record<string, { label: string; storeId: string }> {
    const out: Record<string, { label: string; storeId: string }> = {};
    for (const p of this.catalogProducts()) out[p.sku] = { label: p.name, storeId: p.sku };
    return out;
  }

  getProductById(sku: string): any {
    const p = this.catalogProducts().find((x) => x.sku === sku);
    if (!p) return null;
    return {
      price: formatCurrency(p.priceMinor, p.currency),
      priceValue: String(p.priceMinor),
      currencyCode: p.currency,
      label: p.name,
      trackingName: p.sku,
    };
  }

  async purchase(sku: string, opts: any = {}): Promise<IAPPurchase> {
    if (typeof window === 'undefined') throw new IAPError('[web-xsolla] needs a browser');
    if (this.popupInFlight) throw new IAPError('[web-xsolla] another payment is already in progress');
    this.popupInFlight = true;
    try {
      const provided = opts.provider_data;
      let purchaseId: string;
      let paymentUrl: string;
      if (provided) {
        purchaseId = String(opts.iap_transaction_id ?? sku);
        paymentUrl = opts.payment_url;
      } else {
        const quantity = opts.quantity ?? 1;
        const productId = this.products.find((p) => p.sku === sku)?._id ?? sku;
        const order = await this.serviceClient.createXsollaPaymentUrl({
          products: [{ productId, quantity }],
          metadata: { ...opts, returnUrl: stripTokenFromUrl() },
        });
        purchaseId = order.purchaseId;
        paymentUrl = order.payment_url;
      }
      const accessToken = new URL(paymentUrl).searchParams.get('access_token');
      if (!accessToken) throw new IAPError('[web-xsolla] payment url missing access_token');
      await this.loadPayStation();
      const widget = (window as any).XPayStationWidget;
      if (!widget) throw new IAPError('[web-xsolla] Pay Station widget unavailable');
      return await new Promise<IAPPurchase>((resolve, reject) => {
        let settled = false;
        const closeLightbox = () => {
          const el = document.querySelector('.xpaystation-widget-lightbox');
          if (el) (el as HTMLElement).remove();
        };
        const cleanup = () => {
          if (timeout) clearTimeout(timeout);
          widget.off();
          if (messageListener) window.removeEventListener('message', messageListener);
          closeLightbox();
        };
        const timeout = setTimeout(() => {
          if (settled) return;
          settled = true;
          cleanup();
          reject(new IAPError('[web-xsolla] paystation popup timed out'));
        }, 900_000);

        widget.show();
        closeLightbox();
        widget.on(widget.eventTypes.CLOSE, () => {
          if (settled) return;
          settled = true;
          clearTimeout(timeout);
          (async () => {
            if (opts.settle) await opts.settle();
            else if (!provided) await waitForSettlement(() => this.getXsollaTransaction(purchaseId), 'web-xsolla', this.logger);
          })()
            .then(() => {
              resolve({
                channelId: this.name,
                productId: sku,
                purchaseId,
                transactionId: purchaseId,
                transactionReceipt: { transactionId: purchaseId },
                gameId: this.gameId,
              });
            })
            .catch(reject);
        });
        const onCancel = () => {
          if (settled) return;
          settled = true;
          cleanup();
          reject(new IAPPurchaseErrorCancelledByUser());
        };
        widget.on(widget.eventTypes.CLOSE_LIGHTBOX, onCancel);
        widget.on(widget.eventTypes.POPUP_BLOCKED, onCancel);
        const messageListener = (event: MessageEvent) => {
          let payload: any;
          try {
            payload =
              typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
          } catch {
            return;
          }
          if (payload?.type === 'CLOSE') onCancel();
        };
        window.addEventListener('message', messageListener);
        widget.init({
          access_token: accessToken,
          sandbox: paymentUrl.includes('sandbox'),
          lightbox: {
            width: '630px',
            height: '740px',
            zIndex: 2_000_000_000,
            spinner: 'round',
          },
        });
        widget.open();
      });
    } finally {
      this.popupInFlight = false;
    }
  }

  private loadPayStation(): Promise<void> {
    if ((window as any).XPayStationWidget) return Promise.resolve();
    if (this.paystationLoadingPromise) return this.paystationLoadingPromise;
    this.paystationLoadingPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.async = true;
      script.src = 'https://static.xsolla.com/embed/paystation/1.0.7/widget.min.js';
      script.addEventListener('load', () => resolve());
      script.addEventListener('error', () => {
        this.paystationLoadingPromise = null;
        reject(new IAPError('[web-xsolla] failed to load Pay Station script'));
      });
      document.head.appendChild(script);
    });
    return this.paystationLoadingPromise;
  }

  private async getXsollaTransaction(id: string): Promise<'settled' | 'pending' | 'failed'> {
    const tx = await this.serviceClient.getXsollaTransaction(id);
    return mapTransactionStatus(tx?.status);
  }

  async consumePurchase(purchase: IAPPurchase): Promise<void> {
    const id = purchase.purchaseId ?? (purchase as any).id;
    await this.serviceClient.consumeXsollaTransaction(id);
  }

  async getPurchasesToRecover(): Promise<IAPPurchase[]> {
    if (!canFetchPurchases(this.auth)) return [];
    const txs = await this.serviceClient.listXsollaTransactions().catch(() => []);
    const skuByProductId = new Map(this.products.map((p) => [p._id, p.sku]));
    return (txs ?? [])
      .filter((t: any) => t.status === 'SUCCESS' && !t.order)
      .map((t: any) => ({
        channelId: this.name,
        productId: skuByProductId.get(t.products[0]?.productId) ?? t.products[0]?.productId ?? '',
        purchaseId: t._id,
        transactionId: t._id,
        transactionReceipt: { transactionId: t._id },
        gameId: this.gameId,
      }));
  }
}

const MS = 1_800_000; // 30 min
const STRIPE_CHECKOUT_SCRIPT = 'https://js.stripe.com/dahlia/stripe.js';
const STRIPE_ALREADY_OWNED = 'PUR-UserAlreadyOwnsContent';

function loadStripeCheckoutScript(): Promise<any> {
  return new Promise((resolve) => {
    const existing = (window as any).__stripe;
    if (existing) return resolve(existing);
    const script = document.createElement('script');
    script.async = true;
    script.src = STRIPE_CHECKOUT_SCRIPT;
    script.addEventListener('load', () => resolve((window as any).__stripe ?? null));
    script.addEventListener('error', () => {
      script.remove();
      resolve(null);
    });
    document.head.appendChild(script);
  });
}

const FRVR_EMBED_NAMESPACE = 'frvr-embed';
const DEFAULT_PARENT_ORIGINS = [
  'https://frvr.com',
  'https://beta.frvr.com',
  'https://staging.frvr.com',
  'https://crucible.frvr.com',
];

export class FrvrEmbedBridgeError extends Error {
  constructor(msg: string, public readonly code?: string) {
    super(msg);
    Object.setPrototypeOf(this, FrvrEmbedBridgeError.prototype);
  }
}

export class FrvrEmbedBridge {
  private nextId = 1;
  private pending = new Map<number, { resolve: (v: any) => void; reject: (e: any) => void; timer?: number }>();
  private listeners = new Map<string, Set<(data: any) => void>>();
  private installed = false;
  private parentOrigins: string[];
  private lockedOrigin?: string;
  private readyPromise?: Promise<{ capabilities: string[] }>;
  private readyInfo?: { capabilities: string[] };
  private logger?: Logger;

  constructor(config?: { parentOrigins?: string[] }) {
    this.parentOrigins = [...DEFAULT_PARENT_ORIGINS];
    this.setConfig(config);
  }

  setLogger(logger: Logger): void {
    this.logger = logger;
  }

  setConfig(config?: { parentOrigins?: string[] }): void {
    if (config?.parentOrigins?.length) this.parentOrigins = [...config.parentOrigins];
  }

  isAvailable(): boolean {
    return isIframed();
  }

  ready(): Promise<{ capabilities: string[] }> {
    if (!this.readyPromise) {
      this.readyPromise = this.doReady()
        .then((info) => {
          this.readyInfo = info;
          return info;
        })
        .catch((err) => {
          this.readyPromise = undefined;
          throw err;
        });
    }
    return this.readyPromise;
  }

  hasCapability(name: string): boolean {
    return !!this.readyInfo?.capabilities?.includes(name);
  }

  async request<T = any>(method: string, params?: unknown, timeoutMs = 5000): Promise<T> {
    if (!this.isAvailable()) {
      throw new FrvrEmbedBridgeError(`[frvr-embed] bridge unavailable for ${method}`);
    }
    this.install();
    const id = this.nextId++;
    return new Promise<T>((resolve, reject) => {
      const pending = { resolve, reject, timer: undefined as number | undefined };
      if (timeoutMs > 0) {
        pending.timer = window.setTimeout(() => {
          this.pending.delete(id);
          reject(new FrvrEmbedBridgeError(`[frvr-embed] request ${method} timed out after ${timeoutMs}ms`));
        }, timeoutMs);
      }
      this.pending.set(id, pending);
      this.post({ ns: FRVR_EMBED_NAMESPACE, kind: 'request', id, method, params });
    });
  }

  notify(method: string, params?: unknown): void {
    if (!this.isAvailable()) return;
    this.install();
    this.post({ ns: FRVR_EMBED_NAMESPACE, kind: 'request', id: 0, method, params });
  }

  on(event: string, cb: (data: any) => void): void {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event)!.add(cb);
    this.install();
  }

  off(event: string, cb: (data: any) => void): void {
    this.listeners.get(event)?.delete(cb);
  }

  private getTargetOrigins(): string[] {
    if (this.lockedOrigin) return [this.lockedOrigin];
    const referrer = this.getReferrerOrigin();
    if (referrer && this.parentOrigins.includes(referrer)) return [referrer];
    return this.parentOrigins;
  }

  private getReferrerOrigin(): string | undefined {
    try {
      return document.referrer ? new URL(document.referrer).origin : undefined;
    } catch {
      return undefined;
    }
  }

  private post(message: unknown): void {
    try {
      for (const origin of this.getTargetOrigins()) {
        window.parent.postMessage(message, origin);
      }
    } catch (err) {
      this.logger?.error('[frvr-embed] failed to post bridge message', err);
      const p = this.pending.get((message as any).id);
      if (p) {
        this.pending.delete((message as any).id);
        clearTimeout(p.timer);
        p.reject(new FrvrEmbedBridgeError(`[frvr-embed] failed to post ${(message as any).method}`));
      }
    }
  }

  private install(): void {
    if (this.installed) return;
    this.installed = true;
    window.addEventListener('message', (event) => this.handleMessage(event));
  }

  private isTrustedSender(event: MessageEvent): boolean {
    if (event.source !== window.parent) return false;
    if (this.lockedOrigin) return event.origin === this.lockedOrigin;
    return this.parentOrigins.includes(event.origin);
  }

  private handleMessage(event: MessageEvent): void {
    if (!this.isTrustedSender(event)) return;
    const data = event.data;
    if (typeof data !== 'object' || data?.ns !== FRVR_EMBED_NAMESPACE) return;
    if (data.kind === 'response') {
      const pending = this.pending.get(data.id);
      if (!pending) return;
      this.lockedOrigin = this.lockedOrigin ?? event.origin;
      this.pending.delete(data.id);
      clearTimeout(pending.timer);
      if (data.ok) pending.resolve(data.data);
      else pending.reject(new FrvrEmbedBridgeError(data.message ?? 'bridge request failed', data.code));
    } else if (data.kind === 'event') {
      this.listeners.get(data.event)?.forEach((cb) => {
        try {
          cb(data.data);
        } catch (err) {
          this.logger?.error(`[frvr-embed] bridge event listener failed for ${data.event}`, err);
        }
      });
    }
  }

  private async doReady(): Promise<{ capabilities: string[] }> {
    const id = this.nextId++;
    const msg = {
      ns: FRVR_EMBED_NAMESPACE,
      kind: 'request',
      id,
      method: 'channel.ready',
      params: { authSession: 'session', sessionChange: 'session.stale' },
    };
    const interval = setInterval(() => this.post(msg), 500);
    return new Promise((resolve, reject) => {
      const timer = window.setTimeout(() => {
        clearInterval(interval);
        this.pending.delete(id);
        reject(new FrvrEmbedBridgeError('[frvr-embed] request channel.ready timed out'));
      }, 3000);
      this.pending.set(id, {
        resolve: (v) => {
          clearInterval(interval);
          clearTimeout(timer);
          resolve(v);
        },
        reject: (e) => {
          clearInterval(interval);
          clearTimeout(timer);
          reject(e);
        },
      });
      this.post(msg);
    });
  }
}

export abstract class BaseChannel {
  protected logger?: Logger;
  protected tracker?: Tracker;
  protected auth?: any;
  protected gameId?: string;
  protected env: Env = Env.PRODUCTION;
  protected channelConfig: any = {};
  protected consentConfig: any;
  protected consentProvider?: ConsentProvider;
  protected characteristics: ChannelCharacteristics = { ...defaultCharacteristics };
  protected config: any = {};
  protected promptsPurchaseLogin = false;

  onModulesUpdated(mods: { logger: Logger; tracker?: Tracker; auth: any }): void {
    this.logger = mods.logger;
    this.tracker = mods.tracker;
    this.auth = mods.auth;
    this.buildConsentProvider();
  }

  setConfig(config: any): void {
    this.gameId = config.gameId;
    this.config = config;
    this.consentConfig = config.consent;
    this.channelConfig = config.channels?.web?.config ?? {};
    this.characteristics = {
      ...defaultCharacteristics,
      ...this.channelConfig.characteristics,
    };
  }

  setEnv(env: Env): void {
    this.env = env;
  }

  getId(): string {
    return this.getPlatformId();
  }

  getSdkNamespace(): any {
    return typeof window === 'undefined' ? {} : (window as any).FRVR_SDK ?? {};
  }

  protected buildConsentProvider(): void {
    if (this.consentProvider || !this.logger) return;
    const sdk = this.getSdkNamespace();
    const Provider = sdk.TcfV2ConsentProvider;
    if (Provider) {
      this.consentProvider = new Provider(this.consentConfig?.config, this.logger);
    } else {
      this.consentProvider = noopConsentProvider;
    }
  }

  async requestPurchaseLogin(): Promise<boolean> {
    if (this.auth?.isLoggedIn?.()) return true;
    return false;
  }

  getChannelId(): string {
    return this.getPlatformId();
  }

  getName(): string {
    return 'web';
  }

  getBootstrapper(): ChannelWebBootstrapper {
    return new ChannelWebBootstrapper(this.logger ?? emptyLogger);
  }

  getConsentProvider(): ConsentProvider {
    return this.consentProvider ?? noopConsentProvider;
  }

  getCharacteristics(): ChannelCharacteristics {
    return this.characteristics;
  }

  async getAdsConfig(config: any): Promise<any> {
    return { ...config, enabled: config?.enabled === true };
  }

  getAdsProviders(config: any): AdProvider[] {
    if (config?.enabled !== true || !config.clientId) return [];
    const loader = new AdsByGoogleScriptLoader(
      () => Promise.resolve({ src: config.clientId, channel: config.channelId }),
      this.getPlatformId(),
      config.testMode === true,
    );
    const configured = Array.isArray(config.providers) ? config.providers : [];
    const types = new Set(configured.map((provider: any) => provider.type));
    const providers: AdProvider[] = [];
    if (types.has(AdType.BANNER)) {
      providers.push(new AdsByGoogleBannerProvider(loader, this.logger ?? emptyLogger));
    }
    if (types.has(AdType.INTERSTITIAL)) {
      providers.push(
        new AdsByGoogleAdProvider(
          'web-interstitial',
          AdType.INTERSTITIAL,
          'Interstitial',
          loader,
          this.logger ?? emptyLogger,
        ),
      );
    }
    if (types.has(AdType.REWARD)) {
      providers.push(
        new AdsByGoogleAdProvider(
          'web-reward',
          AdType.REWARD,
          'Rewarded',
          loader,
          this.logger ?? emptyLogger,
        ),
      );
    }
    return providers;
  }

  getAnalyticsProviders(config: any, _env: Env): unknown[] {
    return Array.isArray(config?.providers) ? [...config.providers] : [];
  }

  getAnalyticsIDProvider(storage: any): unknown {
    const Provider = this.getSdkNamespace().StorageIDProvider;
    return Provider
      ? new Provider(storage)
      : {
          init: async () => {},
          getName: () => 'memory-id-provider',
          getUserSource: () => 'in-memory',
          getPageSessionId: () => '',
          getPlaySessionId: () => '',
          getGlobalUserId: () => '',
          managesUnconsentedIds: () => false,
        };
  }

  getLocalStorageProvider(config: any = this.config.storage): unknown {
    if (config?.provider) return config.provider;
    const sdk = this.getSdkNamespace();
    const providers = Array.isArray(config?.providers)
      ? config.providers
      : ['localStorage', 'memory'];
    try {
      return sdk.buildStorageProvider?.(providers) ?? new MemoryStorageProvider();
    } catch (error) {
      this.logger?.warn('[channel-web] configured storage unavailable; using memory storage', error);
      return new MemoryStorageProvider();
    }
  }

  getGameLocalStorageProvider(provider: unknown): unknown {
    return provider;
  }

  getLeaderboardProvider(): unknown {
    return new ChannelLeaderboardProvider(this.env, this.getChannelId(), this.auth);
  }

  getLeaderboardsProvider(): unknown {
    return this.getLeaderboardProvider();
  }

  getCloudStorageProvider(config: any, _env: Env): Promise<unknown> {
    return Promise.resolve(config?.provider);
  }

  getNavigationProvider(_config?: any): unknown {
    return this.getSdkNamespace().emptyNavigationProvider ?? {};
  }

  getProfile(): unknown {
    return this.channelConfig.profile;
  }

  getAuthProviders(_gameId?: string, config: any = this.config.auth): any[] {
    return Array.isArray(config?.providers) ? [...config.providers] : [];
  }

  getNotificationsProvider(): unknown {
    return this.getSdkNamespace().emptyNotificationsProvider ?? {};
  }

  getAudioStateProvider(): unknown {
    return this.channelConfig.audioStateProvider ?? EMPTY_AUDIO_STATE_PROVIDER;
  }

  getSocialProvider(): unknown {
    return this.channelConfig.socialProvider ?? EMPTY_SOCIAL_PROVIDER;
  }

  getLiveRoomProvider(): unknown {
    return this.channelConfig.liveRoomProvider ?? this.getSdkNamespace().emptyLiveRoomProvider ?? {};
  }

  getTournamentsProvider(): unknown {
    return this.channelConfig.tournamentsProvider ?? this.getSdkNamespace().emptyTournamentsProvider ?? {};
  }

  getChallengesProvider(): unknown {
    return this.channelConfig.challengesProvider ?? this.getSdkNamespace().emptyChallengesProvider ?? {};
  }

  getEntryPointProvider(): unknown {
    return this.entryPointProvider;
  }

  getShortcutProvider(): unknown {
    return this.getSdkNamespace().emptyShortcutProvider ?? {};
  }

  getCrosspromo(): unknown {
    return {};
  }

  getSetScoreProvider(): unknown {
    return {};
  }

  getTrackerContextProvider(config?: unknown): unknown {
    return config ?? {};
  }

  getSkippedAnalyticsEvents(): string[] {
    return [];
  }

  getPlatformId(): string {
    return this.channelConfig.channelId ?? 'web';
  }

  getPlatform(): string {
    return this.channelConfig.platform ?? 'web';
  }

  protected readonly entryPointProvider = {
    getEntryPointInfo: () => ({
      entry_point: new URLSearchParams(window.location.search).get('entry_point') ?? '',
    }),
  };

  getIAPProviders(
    config: any = this.config.iap,
    serviceClient?: any,
    auth: any = this.auth,
  ): Promise<unknown[]> {
    if (!config?.xsolla && !config?.providers?.some((provider: any) => provider === 'web-xsolla' || provider?.name === 'web-xsolla')) {
      return Promise.resolve([]);
    }
    const sdk = this.getSdkNamespace();
    const ServiceClient = sdk.IAPServiceClient;
    if ((!serviceClient && !ServiceClient) || !auth || !this.gameId) return Promise.resolve([]);
    const client = serviceClient ?? new ServiceClient({
      auth,
      channelId: this.getId(),
      env: this.env,
      hostOverride: config.hostOverride,
    });
    const provider = new XsollaIAPProvider(
      client,
      auth,
      this.gameId,
      this.logger ?? emptyLogger,
    );
    return Promise.resolve([provider]);
  }
}

class MemoryStorageProvider {
  private readonly values = new Map<string, string>();

  async setItems(items: Array<{ key: string; value: string }>): Promise<void> {
    for (const { key, value } of items) this.values.set(key, value);
  }

  async getItems(keys: string[]): Promise<Record<string, string | undefined>> {
    return Object.fromEntries(keys.map((key) => [key, this.values.get(key)]));
  }

  async removeItems(keys: string[]): Promise<void> {
    for (const key of keys) this.values.delete(key);
  }

  async getAllKeys(): Promise<string[]> {
    return [...this.values.keys()];
  }

  isPersistent(): boolean {
    return false;
  }
}

const EMPTY_AUDIO_STATE_PROVIDER = {
  isMuted: () => false,
  setMuted: () => {},
  onChanged: () => () => {},
};

const EMPTY_SOCIAL_PROVIDER = {
  getFriends: async () => [],
  inviteFriends: async () => {},
  share: async () => {},
};

const emptyLeaderboardProvider = {
  init: async () => {},
  isSupported: () => false,
  getLeaderboardEntries: async () => [],
  getLeaderboardEntry: async () => ({}),
  getLeaderboard: async () => ({}),
  postScore: async () => {},
  create: async () => '',
  getTimelineEntries: async () => [],
};

type RuleExpr =
  | { and: RuleExpr[] }
  | { or: RuleExpr[] }
  | { '==': [RuleExpr, RuleExpr] }
  | { '!=': [RuleExpr, RuleExpr] }
  | { '<': [RuleExpr, RuleExpr] }
  | { '>': [RuleExpr, RuleExpr] }
  | { '<=': [RuleExpr, RuleExpr] }
  | { '>=': [RuleExpr, RuleExpr] }
  | { in: [RuleExpr, RuleExpr] }
  | { endsWith: [RuleExpr, RuleExpr] }
  | { var: string }
  | string
  | number
  | boolean;

const CHANNEL_RULES: Record<string, RuleExpr> = {
  crazygames: { '==': [{ var: 'query.crazygames' }, ''] },
  mspwa: {
    or: [
      { '>=': [{ var: 'query.mspwa' }, ''] },
      { '>=': [{ var: 'query.msstart_sdk_init' }, ''] },
    ],
  },
  discord: { endsWith: ['discord.com', { var: 'location.host' }] },
  frvrEmbed: {
    and: [
      { '>=': [{ var: 'query.frvr_embed' }, ''] },
      { '==': [{ var: 'iframed' }, true] },
    ],
  },
};

function evaluateRule(expr: RuleExpr, ctx: any): any {
  if (typeof expr !== 'object' || expr === null) return expr;
  const op = Object.keys(expr as object)[0];
  const val = (expr as any)[op];
  switch (op) {
    case 'and':
      return (val as RuleExpr[]).every((e) => evaluateRule(e, ctx));
    case 'or':
      return (val as RuleExpr[]).some((e) => evaluateRule(e, ctx));
    case '<':
      return evaluateRule(val[0], ctx) < evaluateRule(val[1], ctx);
    case '>':
      return evaluateRule(val[0], ctx) > evaluateRule(val[1], ctx);
    case '<=':
      return evaluateRule(val[0], ctx) <= evaluateRule(val[1], ctx);
    case '>=':
      return evaluateRule(val[0], ctx) >= evaluateRule(val[1], ctx);
    case '==':
      return evaluateRule(val[0], ctx) === evaluateRule(val[1], ctx);
    case '!=':
      return evaluateRule(val[0], ctx) !== evaluateRule(val[1], ctx);
    case 'var':
      return (val as string).split('.').reduce((acc, k) => acc && acc[k], ctx);
    case 'in':
      return String(evaluateRule(val[1], ctx) ?? '').includes(
        evaluateRule(val[0], ctx),
      );
    case 'endsWith':
      return String(evaluateRule(val[1], ctx) ?? '').endsWith(
        evaluateRule(val[0], ctx),
      );
    default:
      throw new Error(`Unknown operator: ${op}`);
  }
}

export function detectChannel(rules: Record<string, RuleExpr> = CHANNEL_RULES): BaseChannel {
  const url = new URLSearchParams(window?.location?.search);
  const ctx = {
    query: Object.fromEntries(url.entries()),
    document,
    location,
    buildTimePlatform: (window as any).FRVR?.config?.buildTimePlatform,
    iframed: isIframed(),
  };
  if (evaluateRule(rules.crazygames as RuleExpr, ctx)) return new CrazyGamesChannel();
  if (evaluateRule(rules.mspwa as RuleExpr, ctx)) return new MsPwaChannel();
  if (evaluateRule(rules.discord as RuleExpr, ctx)) return new DiscordChannel();
  if (evaluateRule(rules.frvrEmbed as RuleExpr, ctx)) return new FrvrEmbedChannel();
  return new WebChannel();
}

export function installFrvrChannel(): BaseChannel {
  const scope = window as any;
  const frvr = scope.FRVR;
  if (!frvr?.setChannel) {
    throw new Error('[channel-web] FRVR SDK must be loaded before its channel adapter');
  }
  const channel = detectChannel();
  frvr.setChannel(channel);
  return channel;
}

export class WebChannel extends BaseChannel {
  override getName(): string {
    return 'web';
  }
}
export class CrazyGamesChannel extends BaseChannel {
  override getName(): string {
    return 'crazygames';
  }

  override getPlatformId(): string {
    return 'crazygames';
  }

  override getAdsProviders(config: any): AdProvider[] {
    if (config?.enabled !== true) return [];
    const providers = Array.isArray(config.providers) ? config.providers : [];
    const sdk = (window as any).CrazyGames?.SDK?.ad;
    if (!sdk?.requestAd) return [];
    return providers
      .filter((provider: any) => provider.type === AdType.REWARD || provider.type === AdType.INTERSTITIAL)
      .map((provider: any) =>
        new CrazyGamesAdProvider(
          provider.name,
          provider.type,
          sdk,
          this.logger ?? emptyLogger,
        ),
      );
  }
}

export class MsPwaChannel extends BaseChannel {
  override getName(): string {
    return 'mspwa';
  }

  override getPlatformId(): string {
    return 'microsoft';
  }

  override getPlatform(): string {
    return 'microsoft';
  }
}

export class DiscordChannel extends BaseChannel {
  override getName(): string {
    return 'discord';
  }

  override getPlatformId(): string {
    return 'discord';
  }

  override getPlatform(): string {
    return 'discord';
  }
}

export class FrvrEmbedChannel extends BaseChannel {
  private readonly bridge = new FrvrEmbedBridge();

  override getName(): string {
    return 'frvr-embed';
  }

  override getPlatformId(): string {
    return 'frvr-embed';
  }

  override getNavigationProvider(): unknown {
    return {
      openExternalLink: (url: string) =>
        this.bridge.request('navigation.openExternalLink', { url }),
    };
  }
}

class CrazyGamesAdProvider implements AdProvider {
  private tracker?: AdTracker;
  private ready = true;

  constructor(
    private readonly name: string,
    private readonly type: string,
    private readonly sdk: any,
    private readonly logger: Logger,
  ) {}

  getName(): string {
    return this.name;
  }

  getType(): AdType {
    return this.type === AdType.REWARD ? AdType.REWARD : AdType.INTERSTITIAL;
  }

  isReady(): boolean {
    return this.ready;
  }

  useManualControl(): boolean {
    return false;
  }

  async init(_config: unknown, _container: unknown, tracker: AdTracker): Promise<void> {
    this.tracker = tracker;
  }

  show(): Promise<{ success: boolean; code: string; message?: string }> {
    if (!this.sdk?.requestAd || !this.tracker) {
      return Promise.resolve({ success: false, code: AdError.NOFILL });
    }
    this.tracker.willShowAd(false);
    return new Promise((resolve) => {
      let settled = false;
      const finish = (result: { success: boolean; code: string; message?: string }) => {
        if (settled) return;
        settled = true;
        this.tracker?.finishedAd(
          result.success ? AdFinishedStatus.SUCCESS : AdFinishedStatus.ERROR,
        );
        resolve(result);
      };
      try {
        this.sdk.requestAd(this.type === AdType.REWARD ? 'rewarded' : 'midgame', {
          adFinished: () => finish({ success: true, code: AdSuccess.COMPLETED }),
          adError: (error: unknown) => {
            this.logger.warn('[crazygames] ad request failed', error);
            finish({ success: false, code: AdError.ERROR, message: String(error) });
          },
        });
      } catch (error) {
        this.logger.error('[crazygames] ad request threw', error);
        finish({ success: false, code: AdError.ERROR, message: String(error) });
      }
    });
  }

  hide(): void {}
}

function mergeProducts(existing: any[], incoming: any[]): any[] {
  const map = new Map(existing.map((p) => [p.sku ?? p.productId, p]));
  for (const p of incoming) {
    map.set(p.sku ?? p.productId, {
      sku: p.sku,
      name: p.label,
      price: p.priceMinor,
      currency: p.currencyCode,
      ...(p.taxIncluded != null ? { taxIncluded: p.taxIncluded } : {}),
      ...(p.imageUrl ? { imageUrl: p.imageUrl } : {}),
    });
  }
  return [...map.values()];
}

function mergeProductsDistinct(base: any[], extra: any[]): any[] {
  const seen = new Set(base.map((p) => p.sku));
  return [...base, ...extra.filter((p) => !seen.has(p.sku))];
}

function mapTransactionStatus(status: string | undefined): 'settled' | 'pending' | 'failed' {
  if (status === 'SUCCESS') return 'settled';
  if (status === 'REFUNDED') return 'failed';
  return 'pending';
}

function canFetchPurchases(auth: any): boolean {
  try {
    if (!auth.isAuthorized()) return false;
    const platform = auth.getCurrentPlatform?.();
    return platform == null || String(platform) !== 'discord';
  } catch {
    return false;
  }
}

function stripTokenFromUrl(): string {
  const url = new URL(window.location.href);
  for (const key of ['access-token', 'access_token']) url.searchParams.delete(key);
  return url.toString();
}

async function waitForSettlement(
  check: () => Promise<'settled' | 'pending' | 'failed'>,
  _label: string,
  logger?: Logger,
  timeoutMs = 30_000,
): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const status = await check();
      if (status === 'settled') return true;
      if (status === 'failed') {
        logger?.warn(`${_label} transaction ended in a failed state; resolving anyway`);
        return false;
      }
    } catch (err) {
      logger?.debug(`${_label} transaction status check failed, retrying`, err);
    }
    await delay(Math.min(1000, Math.max(0, deadline - Date.now())));
  }
  logger?.warn(`${_label} transaction not settled after ${timeoutMs}ms; resolving anyway`);
  return false;
}

export const FRVR_SDK_VERSION = {
  v: '11.31.0',
  bts: '1790842899326',
  name: 'web',
} as const;

if (typeof window !== 'undefined' && (window as any).FRVR) {
  installFrvrChannel();
}