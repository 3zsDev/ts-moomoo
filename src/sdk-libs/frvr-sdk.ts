// ============================================================================
// FRVR SDK · v2.0.1 (build 1790842895014, code "14.25.14")
// ============================================================================

import { ChannelWebBootstrapper } from './frvr-channel-web.js';

export enum Env {
  DEVELOPMENT = 'development',
  BETA = 'beta',
  PRODUCTION = 'production',
}

export enum LifecycleSuspendReason {
  CHANNEL = 'channel',
  AD = 'ad',
  DEFAULT = 'default',
  PARENT_UI = 'parent-ui',
}

export enum Platform {
  FRVR = 'frvr',
  ANONYMOUS = 'anonymous',
  FACEBOOK_INSTANT = 'facebook-instant',
  FACEBOOK_WEB = 'facebook-web',
  GOOGLE_INTERNAL = 'google-internal',
  SAMSUNG_INSTANT = 'samsung-instant',
  MICROSOFT = 'microsoft',
  DISCORD = 'discord',
  CRAZYGAMES = 'crazy_games',
  FRVR_EMBED = 'frvr-embed',
  MONDIA = 'mondia',
}

export enum AdType {
  INTERSTITIAL = 'interstitial',
  REWARD = 'reward',
  BANNER = 'banner',
  SURVEY = 'survey',
  REWARDED_INTERSTITIAL = 'rewarded-interstitial',
}

export const AdTypeProperties: Record<AdType, { stopsGameFlow: boolean; throttleable: boolean }> = {
  [AdType.INTERSTITIAL]: { stopsGameFlow: true, throttleable: true },
  [AdType.REWARD]: { stopsGameFlow: true, throttleable: false },
  [AdType.BANNER]: { stopsGameFlow: false, throttleable: false },
  [AdType.SURVEY]: { stopsGameFlow: true, throttleable: true },
  [AdType.REWARDED_INTERSTITIAL]: { stopsGameFlow: true, throttleable: true },
};

export enum AdSuccess {
  DELIVERED = 'delivered',
  COMPLETED = 'completed',
}

export enum AdError {
  UNKNOWN = 'unknown',
  TIMED_OUT = 'timedout',
  NOFILL = 'nofill',
  CLOSE = 'adclosed',
  ERROR = 'internalerror',
}

export enum AdFinishedStatus {
  ERROR = 'error',
  NOFILL = 'nofill',
  SKIPPED = 'skipped',
  SUCCESS = 'success',
  TIMED_OUT = 'timed_out',
}

export enum AdResponseStatus {
  AD_CLOSED = 'adclosed',
  AD_LEAVING_APPLICATION = 'adleavingapplication',
  ERROR = 'internalerror',
  INVALID_REQUEST = 'invalidrequest',
  NETWORK_ERROR = 'networkerror',
  NOFILL = 'nofill',
  SUCCESS = 'success',
  THROTTLED = 'throttled',
  TIMEDOUT = 'timedout',
}

export enum AdsThrottlerResult {
  NO_THROTTLING = 'NO_THROTTLING',
  INIT_TIME = 'INIT_TIME',
  FREQUENCY = 'FREQUENCY',
}

export enum AdShowResult {
  NOT_DISPLAYED = 'not_displayed',
  DELIVERED = 'delivered',
  COMPLETED = 'completed',
}

export enum ConsentOptions {
  None = 0,
  P1StoreInformationOnADevice = 2,
  P2SelectBasicAds = 4,
  P3PersonalizedAdsProfile = 8,
  P4PersonalizedAds = 0x10,
  P5PersonalizedContentProfile = 0x20,
  P6PersonalizedContent = 0x40,
  P7MeasureAdPerformance = 0x80,
  P8MeasureContentPerformance = 0x100,
  P9MarketResearchForAudienceInsights = 0x200,
  P10DevelopAndImproveProducts = 0x400,
  All = 0x7fe,
}

export enum IAPErrorCode {
  UNKNOWN = 'UNKNOWN',
  USER_INPUT = 'USER_INPUT',
  INVALID_PARAM = 'INVALID_PARAM',
  ALREADY_OWNED = 'ALREADY_OWNED',
  HELD_BY_ECONOMY = 'HELD_BY_ECONOMY',
  IN_PROGRESS = 'IN_PROGRESS',
  POPUP_BLOCKED = 'POPUP_BLOCKED',
  PENDING = 'PENDING',
}

export enum EconomyErrorCode {
  UNKNOWN = 'UNKNOWN',
  ANONYMOUS_NOT_ALLOWED = 'ANONYMOUS_NOT_ALLOWED',
  LOGIN_REQUIRED = 'LOGIN_REQUIRED',
  PAYMENT_REJECTED = 'PAYMENT_REJECTED',
  PAYMENT_REFUNDED = 'PAYMENT_REFUNDED',
  PENDING = 'PENDING',
  SERVER_ERROR = 'SERVER_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  NOT_LOGGED_IN = 'NOT_LOGGED_IN',
  PURCHASE_CANCELLED = 'PURCHASE_CANCELLED',
}

export enum ScoreCachePolicy {
  HIGHEST = 'highest',
  LATEST = 'latest',
}

export enum AnalyticsIDProviderStorageType {
  IN_MEMORY = 'in-memory',
  COOKIE = 'cookie',
  LOCAL_STORAGE = 'localStorage',
}

export const DEFAULT_ADS_CONFIG = {
  providers: [],
  throttling: { maxfrequency: 5000 },
};

export const SDK_VERSION = {
  v: '2.0.1',
  bts: '1790842895014',
  name: '14.25.14',
  hash: 'e4b529c85d182e86c3dc572437e6b5c84b2f7d69',
};

export interface Logger {
  log(...args: unknown[]): void;
  error(...args: unknown[]): void;
  warn(...args: unknown[]): void;
  info(...args: unknown[]): void;
  debug(...args: unknown[]): void;
}

export const emptyLogger: Logger = {
  log: () => {},
  error: () => {},
  warn: () => {},
  info: () => {},
  debug: () => {},
};

export const emptyTracker: Tracker = { logEvent: () => {}, logValuedEvent: () => {} };

export interface StorageProvider {
  setItems(items: Array<{ key: string; value: string }>): Promise<void>;
  getItems(keys: string[]): Promise<Record<string, string | undefined>>;
  removeItems(keys: string[]): Promise<void>;
  isPersistent(): boolean;
  getAllKeys?(): Promise<string[]>;
}

export class Storage {
  constructor(
    public readonly provider: StorageProvider,
    public readonly logger: Logger = emptyLogger,
  ) {}

  setItems(items: Array<{ key: string; value: unknown }>): Promise<void> {
    const encoded = items.map(({ key, value }) => ({
      key,
      value: JSON.stringify(value),
    }));
    return this.provider.setItems(encoded);
  }

  async getItems(keys: string[]): Promise<Record<string, unknown>> {
    const raw = await this.provider.getItems(keys);
    const out: Record<string, unknown> = {};
    for (const k in raw) {
      try {
        out[k] = JSON.parse(raw[k]!);
      } catch (err) {
        out[k] = raw[k];
        this.logger.warn(`[storage] parsing error on key ${k}`, (err as Error).message);
      }
    }
    return out;
  }

  removeItems(keys: string[]): Promise<void> {
    return this.provider.removeItems(keys);
  }

  setItem(key: string, value: unknown): Promise<void> {
    return this.provider.setItems([{ key, value: JSON.stringify(value) }]);
  }

  async getItem(key: string, fallback?: unknown): Promise<unknown> {
    let result: unknown;
    const raw = (await this.provider.getItems([key]))[key];
    try {
      result = raw !== undefined ? JSON.parse(raw) : fallback;
    } catch (err) {
      result = fallback ?? raw;
      this.logger.warn(`[storage] parsing error on key ${key}`, (err as Error).message);
    }
    return result;
  }

  removeItem(key: string): Promise<void> {
    return this.provider.removeItems([key]);
  }

  isPersistent(): boolean {
    return this.provider.isPersistent();
  }
}

export class CloudStorage extends Storage {
  constructor(options: { provider: StorageProvider; logger?: Logger }) {
    super(options.provider, options.logger ?? emptyLogger);
  }
}

const COOKIE_TEST_KEY = 'test-01e0e1c8-2a13-4fe9-b8d0-458a98c4fc89';

export class WebLocalStorageProvider implements StorageProvider {
  static providerName = 'localStorage';

  static isAvailable(): boolean {
    try {
      window.localStorage.setItem(COOKIE_TEST_KEY, 'test');
      window.localStorage.removeItem(COOKIE_TEST_KEY);
      return true;
    } catch {
      return false;
    }
  }

  async setItems(items: Array<{ key: string; value: string }>): Promise<void> {
    for (const { key, value } of items) window.localStorage.setItem(key, value);
  }

  async getItems(keys: string[]): Promise<Record<string, string | undefined>> {
    const out: Record<string, string | undefined> = {};
    for (const k of keys) {
      const v = window.localStorage.getItem(k);
      if (v !== null) out[k] = v;
    }
    return out;
  }

  async removeItems(keys: string[]): Promise<void> {
    for (const k of keys) window.localStorage.removeItem(k);
  }

  isPersistent(): boolean {
    return true;
  }

  async getAllKeys(): Promise<string[]> {
    const out: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (k !== null) out.push(k);
    }
    return out;
  }
}

export class MemoryAsyncStorageProvider implements StorageProvider {
  static providerName = 'memory';
  private values: Record<string, string> = {};

  async setItems(items: Array<{ key: string; value: string }>): Promise<void> {
    for (const { key, value } of items) this.values[key] = value;
  }

  async getItems(keys: string[]): Promise<Record<string, string | undefined>> {
    const out: Record<string, string | undefined> = {};
    for (const k of keys) {
      const v = this.values[k];
      if (v !== undefined) out[k] = v;
    }
    return out;
  }

  async removeItems(keys: string[]): Promise<void> {
    for (const k of keys) delete this.values[k];
  }

  isPersistent(): boolean {
    return false;
  }

  async getAllKeys(): Promise<string[]> {
    return Object.keys(this.values);
  }
}

export class PrefixedStorageProvider implements StorageProvider {
  constructor(
    private readonly prefix: string,
    private readonly provider: StorageProvider,
  ) {}

  async setItems(items: Array<{ key: string; value: string }>): Promise<void> {
    return this.provider.setItems(items.map(({ key, value }) => ({ key: this.prefix + key, value })));
  }

  async getItems(keys: string[]): Promise<Record<string, string | undefined>> {
    const raw = await this.provider.getItems(keys.map((k) => this.prefix + k));
    const out: Record<string, string | undefined> = {};
    for (const k of keys) {
      const v = raw[this.prefix + k];
      if (v !== undefined) out[k] = v;
    }
    return out;
  }

  async removeItems(keys: string[]): Promise<void> {
    return this.provider.removeItems(keys.map((k) => this.prefix + k));
  }

  isPersistent(): boolean {
    return this.provider.isPersistent();
  }
}

export function buildStorageProvider(providerNames: string[]): StorageProvider {
  for (const name of providerNames) {
    switch (name) {
      case WebLocalStorageProvider.providerName:
        if (WebLocalStorageProvider.isAvailable()) return new WebLocalStorageProvider();
        break;
      case MemoryAsyncStorageProvider.providerName:
        return new MemoryAsyncStorageProvider();
      default:
        throw new Error('Unsupported Local Storage provider');
    }
  }
  throw new Error('Error initializing Local Storage provider');
}

export const defaultStorage = new Storage(new MemoryAsyncStorageProvider());

export const emptyBootstrapper = {
  init: () => Promise.resolve(),
  setProgress: () => {},
  complete: () => Promise.resolve(),
};

export interface LifecycleEvents {
  onSuspend(): void;
  onResume(): void;
  onAudioSuspend(): void;
  onAudioResume(): void;
  onShow?(): void;
  onHide?(): void;
  onGamePause?(): void;
}

export const defaultLifecycle: LifecycleEvents = {
  onSuspend: () => {},
  onResume: () => {},
  onAudioSuspend: () => {},
  onAudioResume: () => {},
};

export class RefcountedLifecycle {
  private audioCounts = new Map<string, number>();
  private gameCounts = new Map<string, number>();

  constructor(private readonly inner: LifecycleEvents) {}

  audioSuspend(reason: string, force = false): void {
    if (this.audioTotal() === 0) {
      this.inner.onAudioSuspend();
    } else if (force) {
      this.inner.onAudioSuspend();
      return;
    }
    this.audioCounts.set(reason, (this.audioCounts.get(reason) ?? 0) + 1);
  }

  audioResume(reason: string, force = false): void {
    const cur = this.audioCounts.get(reason) ?? 0;
    if (cur !== 0) {
      if (cur === 1) this.audioCounts.delete(reason);
      else this.audioCounts.set(reason, cur - 1);
      if (this.audioTotal() === 0 || force) this.inner.onAudioResume();
    } else if (force) {
      this.inner.onAudioResume();
    }
  }

  gameSuspend(reason: string): void {
    if (this.gameTotal() === 0) this.inner.onSuspend();
    this.gameCounts.set(reason, (this.gameCounts.get(reason) ?? 0) + 1);
  }

  gameResume(reason: string): void {
    const cur = this.gameCounts.get(reason) ?? 0;
    if (cur !== 0) {
      if (cur === 1) this.gameCounts.delete(reason);
      else this.gameCounts.set(reason, cur - 1);
      if (this.gameTotal() === 0) this.inner.onResume();
    }
  }

  onSuspend(): void {
    this.gameSuspend(LifecycleSuspendReason.DEFAULT);
  }
  onResume(): void {
    this.gameResume(LifecycleSuspendReason.DEFAULT);
  }
  onAudioSuspend(): void {
    this.audioSuspend(LifecycleSuspendReason.DEFAULT);
  }
  onAudioResume(): void {
    this.audioResume(LifecycleSuspendReason.DEFAULT);
  }
  onShow(): void {
    this.inner.onShow?.();
  }
  onHide(): void {
    this.inner.onHide?.();
  }
  onGamePause(): void {
    this.inner.onGamePause?.();
  }

  isAudioSuspended(): boolean {
    return this.audioTotal() > 0;
  }
  isGameSuspended(): boolean {
    return this.gameTotal() > 0;
  }
  isAdActive(): boolean {
    return (
      (this.gameCounts.get(LifecycleSuspendReason.AD) ?? 0) > 0 ||
      (this.audioCounts.get(LifecycleSuspendReason.AD) ?? 0) > 0
    );
  }
  isAdOrChannelActive(): boolean {
    const check = (r: string) => (this.gameCounts.get(r) ?? 0) > 0 || (this.audioCounts.get(r) ?? 0) > 0;
    return check(LifecycleSuspendReason.AD) || check(LifecycleSuspendReason.CHANNEL);
  }
  private audioTotal(): number {
    let n = 0;
    this.audioCounts.forEach((v) => (n += v));
    return n;
  }
  private gameTotal(): number {
    let n = 0;
    this.gameCounts.forEach((v) => (n += v));
    return n;
  }
}

export class EmptyShortcutError extends Error {
  code = 'EMPTY_SHORTCUT';
  override message = 'Trying to use an empty interface.';
}

export const emptyShortcutProvider = {
  init: async () => {},
  canCreateShortcut: () => Promise.resolve(false),
  createShortcut: () => Promise.reject(new EmptyShortcutError()),
};

export class EmptyNavigationError extends Error {
  code = 'EMPTY_NAVIGATE_IMPLEMENTATION';
  override message = 'Trying to use an empty interface.';
}

export const emptyNavigationProvider = {
  canNavigate: () => false,
  navigate: () => {
    throw new EmptyNavigationError();
  },
  canOpenChannelAppStore: () => false,
  openChannelAppStore: () => {
    throw new Error('EMPTY_OPEN_CHANNEL_STORE_IMPLEMENTATION');
  },
};

export const emptyCrosspromo = {
  canCrosspromo: () => Promise.resolve(false),
  openGame: () => {
    throw new Error('Crosspromo not implemented');
  },
};

export class Deferred<T = void> extends Promise<T> {
  resolve!: (value: T) => void;
  reject!: (err: unknown) => void;
  constructor(executor?: (resolve: (v: T) => void, reject: (e: unknown) => void) => void) {
    let res: (v: T) => void;
    let rej: (e: unknown) => void;
    super((r, j) => {
      res = r;
      rej = j;
    });
    this.resolve = res!;
    this.reject = rej!;
    executor?.(res!, rej!);
  }
}

export interface ConsentProvider {
  consentToTerms(): void;
  onConsentChanged(cb: (consents: number, li: number) => void): void;
  hasConsentForAll(bits: number, fallback?: number): boolean;
  hasConsentForAny(bits: number, fallback?: number): boolean;
  consents(): number;
  legitimateInterests(): number;
  hasLoaded(): boolean;
  isConsentEditable(): boolean;
  supportsAutoInitialization(): boolean;
  getName?(): string;
  loadConsentManagementPlatform?(cfg: unknown): void;
  showConsentPreferences?(): void;
}

export const emptyConsentProvider: ConsentProvider = {
  consentToTerms: () => {},
  onConsentChanged: () => {},
  hasConsentForAll: () => false,
  hasConsentForAny: () => false,
  consents: () => ConsentOptions.None,
  legitimateInterests: () => ConsentOptions.None,
  hasLoaded: () => false,
  isConsentEditable: () => false,
  supportsAutoInitialization: () => true,
};

export const noConsentConsentProvider: ConsentProvider = {
  consentToTerms: () => {},
  onConsentChanged: () => {},
  hasConsentForAll: () => true,
  hasConsentForAny: () => true,
  consents: () => ConsentOptions.All,
  legitimateInterests: () => ConsentOptions.All,
  hasLoaded: () => true,
  isConsentEditable: () => false,
  supportsAutoInitialization: () => false,
};

export class TcfBitSet {
  bits = '0';
  constructor(hex?: string) {
    if (hex) this.parse(hex);
  }
  getRightmost1Index(): number {
    return this.bits.indexOf('1');
  }
  is1AtIndex(index: number): boolean {
    return index >= 0 && this.bits.substring(index, index + 1) === '1';
  }
  set1AtIndex(index: number): void {
    this.bits = this.bits.substring(0, index) + '1' + this.bits.substring(index + 1);
  }
  parse(hex: string): this {
    if (!/^0x[a-f0-9]*$/i.test(hex)) {
      hex = '0x' + (Number(hex) || 0).toString(2).split('').reverse().join('').toString();
    }
    hex = hex.substring(2);
    this.bits = hex
      .split('')
      .map((ch) => {
        let b = parseInt(ch, 16).toString(2);
        while (b.length < 4) b = '0' + b;
        return b;
      })
      .join('');
    return this;
  }
  toHexString(): string {
    return (
      '0x' +
      this.bits.match(/(.{1,4})/g)!.map((chunk) => {
        while (chunk.length < 4) chunk += '0';
        return parseInt(chunk, 2).toString(16);
      }).join('')
    );
  }
}

export class TcfV2ConsentProvider implements ConsentProvider {
  private consentsBitSet = ConsentOptions.None;
  private legitimateInterestsBitSet = ConsentOptions.None;
  private consentIsLoaded = false;
  private googleFcInjected = false;
  private inheritedCmp = false;
  private noCmpFallbackApplied = false;
  private onConsentChangedHandlers: Array<(c: number, l: number) => void> = [];
  private noCmpFallbackTimer?: ReturnType<typeof setTimeout>;

  constructor(
    private readonly config: { googleFcPropertyId?: string } | undefined,
    private readonly logger: Logger,
  ) {
    this.loadConsentManagementPlatform(config);
  }

  private consentsToBitSet(consents: Record<string, boolean>): number {
    let bits = 0;
    for (const k in consents) if (consents[k]) bits |= 1 << Number(k);
    return bits;
  }

  private onLoad(): void {
    if (!(window as any).__tcfapi) return;
    this.logger.log(`${this.getName()}::onLoad()`);
    (window as any).__tcfapi('addEventListener', 2, (data: any, success: boolean) => {
      if (
        !success ||
        (data.eventStatus !== 'tcloaded' && data.eventStatus !== 'useractioncomplete')
      )
        return;
      this.consentIsLoaded = true;
      this.noCmpFallbackApplied = false;
      this.consentsBitSet = this.consentsToBitSet(data.purpose?.consents ?? {});
      this.legitimateInterestsBitSet = this.consentsToBitSet(data.purpose?.legitimateInterests ?? {});
      this.dispatchConsentChanged(this.consentsBitSet, this.legitimateInterestsBitSet);
    });
  }

  private dispatchConsentChanged(c: number, l: number): void {
    for (let i = 0; i < this.onConsentChangedHandlers.length; i++) {
      this.onConsentChangedHandlers[i](c, l);
    }
  }

  hasLoaded(): boolean {
    return this.consentIsLoaded;
  }
  isConsentEditable(): boolean {
    return !this.inheritedCmp && !this.noCmpFallbackApplied;
  }

  loadConsentManagementPlatform(cfg: any): void {
    const propertyId = cfg?.googleFcPropertyId;
    if (!(window as any).__tcfapi) {
      if (this.installInheritedTcfApi()) {
        this.logger.log(`${this.getName()}::inherited CMP from an ancestor frame`);
      } else if (propertyId) {
        this.injectGoogleFundingChoices(propertyId);
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
      } catch {}
      if (w === window.top) break;
      w = (w.parent as Window) === w ? null : (w.parent as Window);
    }
    if (!found || found === window) return false;
    const callbacks: Record<string, (v: any, ok: boolean) => void> = {};
    let callId = 0;
    window.addEventListener(
      'message',
      (ev) => {
        let data = ev.data;
        if (typeof data === 'string') {
          try {
            data = JSON.parse(data);
          } catch {
            return;
          }
        }
        const call = data && data.__tcfapiReturn;
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
      if ((window as any).__tcfapi) this.onLoad();
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
    if ((window as any).frames['googlefcPresent']) return;
    if (!document.body) {
      setTimeout(() => this.signalGooglefcPresent(), 0);
      return;
    }
    const div = document.createElement('div');
    div.style.cssText =
      'width: 0; height: 0; border: none; z-index: -1000; left: -1000px; top: -1000px;';
    div.style.display = 'none';
    div.id = 'googlefcPresent';
    document.body.appendChild(div);
  }

  private scheduleNoCmpFallback(timeout = 5000): void {
    if (this.noCmpFallbackTimer !== undefined || this.consentIsLoaded) return;
    this.noCmpFallbackTimer = setTimeout(() => {
      if (this.consentIsLoaded || (window as any).__tcfapi) return;
      this.logger.warn(`${this.getName()}::no CMP present, falling back to consent-to-all`);
      this.noCmpFallbackApplied = true;
      this.consentIsLoaded = true;
      this.consentsBitSet = ConsentOptions.All;
      this.legitimateInterestsBitSet = ConsentOptions.All;
      this.dispatchConsentChanged(this.consentsBitSet, this.legitimateInterestsBitSet);
    }, timeout);
  }

  consentToTerms(): void {
    if (this.inheritedCmp) {
      this.logger.warn(`${this.getName()}::consentToTerms(NoOpImpl)`);
      return;
    }
    if (this.googleFcInjected || (window as any).googlefc) {
      const fc = ((window as any).googlefc = (window as any).googlefc ?? {});
      fc.callbackQueue = fc.callbackQueue ?? [];
      fc.callbackQueue.push({
        CONSENT_DATA_READY: () => (window as any).googlefc?.showRevocationMessage?.(),
      });
      return;
    }
    this.logger.warn(`${this.getName()}::consentToTerms(owned by the embedding page)`);
  }

  supportsAutoInitialization(): boolean {
    return true;
  }

  onConsentChanged(cb: (c: number, l: number) => void): void {
    this.onConsentChangedHandlers.push(cb);
    if (this.consentIsLoaded) cb(this.consentsBitSet, this.legitimateInterestsBitSet);
  }

  hasConsentForAny(bits: number, fallback = ConsentOptions.None): boolean {
    return this.hasLoaded() && (this.consentsBitSet & bits) !== 0;
  }
  hasConsentForAll(bits: number, fallback = ConsentOptions.None): boolean {
    return this.hasLoaded() && (this.consentsBitSet & bits) === bits;
  }
  consents(): number {
    return this.consentsBitSet;
  }
  legitimateInterests(): number {
    return this.legitimateInterestsBitSet;
  }
  getName(): string {
    return 'TcfV2ConsentProvider';
  }
}

export interface AnalyticsProvider {
  init(consentProvider: ConsentProvider, tracker: Tracker): Promise<void> | void;
  getName(): string;
  send(
    event: string,
    value?: unknown,
    fields?: Record<string, unknown>,
    context?: Record<string, unknown>,
  ): void;
}

export interface Tracker {
  logEvent(event: string, fields?: Record<string, unknown>, requiredConsents?: number): void;
  logValuedEvent(
    event: string,
    value: number,
    fields?: Record<string, unknown>,
    requiredConsents?: number,
  ): void;
  set?(key: string, value: unknown): unknown;
  inc?(key: string, by?: number): number;
  getPlaySessionId?(): string;
  getPageSessionId?(): string;
  getGlobalUserId?(): string;
  getUserSource?(): string;
  addExtraFieldFunction?(fn: (ctx: Record<string, unknown>) => void): () => void;
  ftue?(step: number, name: string, fields?: Record<string, unknown>): void;
  ftueUnordered?(step: number, name: string, fields?: Record<string, unknown>): void;
  levelStart?(level: string | number, fields?: Record<string, unknown>): void;
  levelEnd?(level: string | number, fields?: Record<string, unknown>): void;
  init?(): Promise<void>;
  preComplete?(): void;
  complete?(): void;
}

export interface AnalyticsIDProvider {
  init(): Promise<void>;
  getName(): string;
  getUserSource(): string;
  getPageSessionId(): string;
  getPlaySessionId(): string;
  getGlobalUserId(): string;
  managesUnconsentedIds(): boolean;
}

export const emptyAnalyticsIDProvider: AnalyticsIDProvider = {
  init: async () => {},
  getName: () => '',
  getUserSource: () => AnalyticsIDProviderStorageType.IN_MEMORY,
  getPageSessionId: () => '',
  getPlaySessionId: () => '',
  getGlobalUserId: () => '',
  managesUnconsentedIds: () => false,
};

export class RandomIdProvider implements AnalyticsIDProvider {
  private static PAGE_SESSION_TIMEOUT = 1800000;
  private static PLAY_SESSION_TIMEOUT = 1800000;
  private randomPageSessionId = randomId();
  private randomPlaySessionId = randomId();
  private randomGlobalUserId = randomId();
  private randomPlaySessionIdTimeStamp = Date.now();

  async init(): Promise<void> {}
  getName() {
    return 'randomIdProvider';
  }
  getUserSource() {
    return AnalyticsIDProviderStorageType.IN_MEMORY;
  }
  getPageSessionId() {
    return this.randomPageSessionId;
  }
  getPlaySessionId() {
    if (this.randomPlaySessionIdTimeStamp + 1800000 < Date.now()) {
      this.randomPlaySessionId = randomId();
    }
    this.randomPlaySessionIdTimeStamp = Date.now();
    return this.randomPlaySessionId;
  }
  getGlobalUserId() {
    return this.randomGlobalUserId;
  }
  managesUnconsentedIds() {
    return false;
  }
}

export class StorageIDProvider implements AnalyticsIDProvider {
  private static PAGE_SESSION_TIMEOUT = 1800000;
  private static PLAY_SESSION_TIMEOUT = 1800000;
  private pageSessionId?: string;
  private playSessionId?: string;
  private playSessionIdTimeStamp?: number;
  private globalUserId?: string;
  private globalUserIdSource: AnalyticsIDProviderStorageType =
    AnalyticsIDProviderStorageType.COOKIE;
  private canUseCookies = false;

  constructor(private readonly storage: Storage) {}

  private setCanUseCookies(): void {
    try {
      if (window && Object.getOwnPropertyDescriptor(document, 'cookie')?.writable) {
        document.cookie = 'can_use_cookies=test;';
        this.canUseCookies = document.cookie.indexOf('can_use_cookies') > -1;
      } else {
        this.canUseCookies = false;
      }
    } catch {
      this.canUseCookies = false;
    }
  }

  async init(): Promise<void> {
    this.setCanUseCookies();
    if (this.canUseCookies) this.globalUserIdSource = AnalyticsIDProviderStorageType.COOKIE;
    else if (this.storage.isPersistent()) this.globalUserIdSource = AnalyticsIDProviderStorageType.LOCAL_STORAGE;
    else this.globalUserIdSource = AnalyticsIDProviderStorageType.IN_MEMORY;

    const data = await this.storage.getItems([
      'pageSessionId',
      'playSessionId',
      'playSessionIdTimeStamp',
      'globalUserId',
    ]);
    this.pageSessionId = (data.pageSessionId as string) || undefined;
    this.playSessionId = (data.playSessionId as string) || undefined;
    this.playSessionIdTimeStamp =
      data.playSessionIdTimeStamp != null ? parseInt(String(data.playSessionIdTimeStamp), 10) : undefined;
    this.globalUserId = (data.globalUserId as string) || undefined;
  }
  getName() {
    return 'StorageIDProvider';
  }
  getUserSource() {
    return this.globalUserIdSource;
  }
  getPageSessionId(): string {
    if (!this.pageSessionId) {
      this.pageSessionId = randomId();
      this.storage.setItem('pageSessionId', this.pageSessionId);
    }
    return this.pageSessionId;
  }
  getPlaySessionId(): string {
    if (this.playSessionId && (this.playSessionIdTimeStamp ?? 0) + 1800000 < Date.now()) {
      this.playSessionId = undefined;
    }
    if (!this.playSessionId) {
      this.playSessionId = randomId();
      this.storage.setItem('playSessionId', this.playSessionId);
    }
    this.playSessionIdTimeStamp = Date.now();
    this.storage.setItem('playSessionIdTimeStamp', this.playSessionIdTimeStamp);
    return this.playSessionId;
  }
  getGlobalUserId(): string {
    if (this.canUseCookies) return this.getGlobalUserIdFromCookie();
    return this.getGlobalUserIdFromStorage();
  }
  private getGlobalUserIdFromStorage(): string {
    if (!this.globalUserId) {
      this.globalUserId = randomId();
      this.storage.setItem('globalUserId', this.globalUserId);
    }
    return this.globalUserId;
  }
  private getGlobalUserIdFromCookie(): string {
    const m = document.cookie.match('^(?:.*_frvr=([^;]*)).*$');
    this.globalUserId = (m && m[1]) || randomId();
    this.writeCookie(this.globalUserId);
    return this.globalUserId;
  }
  private writeCookie(value: string): void {
    const d = new Date();
    d.setDate(d.getDate() + 365);
    document.cookie = `_frvr=${value}; path=/; expires=${new Date(d).toUTCString()};${getCookieDomain()};`;
  }
  managesUnconsentedIds() {
    return this.globalUserIdSource === AnalyticsIDProviderStorageType.COOKIE;
  }
}

function getCookieDomain(): string {
  const parts = document.location.hostname.split('.');
  for (let i = parts.length - 1; i >= 0; i--) {
    const candidate = parts.slice(i).join('.');
    document.cookie = 'get_tld=test;domain=.' + candidate + ';';
    if (document.cookie.indexOf('get_tld') > -1) {
      document.cookie = 'get_tld=;domain=.' + candidate + ';expires=Thu, 01 Jan 1970 00:00:01 GMT;';
      return candidate;
    }
  }
  return '';
}

export class TrackerImpl implements Tracker {
  private static STORAGE_KEY = 'frvr_analytics_storage';
  private static FTUE_STEPS_DONE_KEY = '__frvr_ftue_steps_done';
  private static MAX_PRE_CONSENT_LOAD_EVENT_QUEUE = 100;

  private data: Record<string, unknown> = {};
  private extraFieldFunctions: Array<(ctx: Record<string, unknown>) => void> = [];
  private preConsentLoadEventQueue: any[] = [];
  private idProvider: AnalyticsIDProvider = emptyAnalyticsIDProvider;
  private consentProvider!: ConsentProvider;
  private storage!: Storage;
  private logger: Logger = emptyLogger;
  private qatoolEnabled = false;
  private timeStart = Date.now();
  private timeLoaded?: number;
  private appContextFields: Record<string, unknown> = {};
  private analyticsProviders: AnalyticsProvider[];

  constructor({
    analyticsProviders,
    idProvider,
    consentProvider,
    contextProvider,
    storage,
    logger,
    appContextFields,
  }: any = {}) {
    this.analyticsProviders = analyticsProviders ?? [];
    this.idProvider = idProvider ?? emptyAnalyticsIDProvider;
    this.consentProvider = consentProvider ?? new TcfV2ConsentProvider(undefined, logger);
    this.storage = storage ?? defaultStorage;
    this.logger = logger ?? emptyLogger;
    this.appContextFields = appContextFields ?? {};
  }

  async loadStorage(): Promise<void> {
    this.data = (await this.storage.getItem('frvr_analytics_storage', {})) as Record<string, unknown>;
  }
  updateStorage(): void {
    this.storage.setItem('frvr_analytics_storage', { ...this.data });
  }
  getConsentContextFields(): Record<string, unknown> {
    return {
      cmp_consents: this.consentProvider.consents(),
      cmp_legitimateInterests: this.consentProvider.legitimateInterests(),
    };
  }
  getContextFields(): Record<string, unknown> {
    return {
      page_session_id: this.idProvider.getPageSessionId(),
      play_session_id: this.idProvider.getPlaySessionId(),
    };
  }

  async init(): Promise<void> {
    installErrorHandlers((payload) =>
      this.logEvent('error', payload, ConsentOptions.None),
    );
    await this.loadStorage();
    await Promise.all([this.idProvider.init(), this.consentProvider.onConsentChanged(() => this.dispatchOutstandingEvents())]);
    await Promise.all(this.analyticsProviders.map((p) => p.init(this.consentProvider, this)));
  }

  logEvent(event: string, fields: Record<string, unknown> = {}, requiredConsents = ConsentOptions.None, requiredLIs = ConsentOptions.None): void {
    this.send(event, undefined, fields, requiredConsents, requiredLIs);
  }
  logValuedEvent(event: string, value: number, fields: Record<string, unknown> = {}, requiredConsents = ConsentOptions.None, requiredLIs = ConsentOptions.None): void {
    this.send(event, value, fields, requiredConsents, requiredLIs);
  }

  preComplete(): void {
    this.timeLoaded = Date.now();
    this.logEvent('loading_stop', {}, ConsentOptions.P10DevelopAndImproveProducts);
  }
  complete(): void {
    this.logEvent('game_loaded', {}, ConsentOptions.P10DevelopAndImproveProducts);
  }
  set(key: string, value: unknown): unknown {
    this.data[key] = value;
    this.updateStorage();
    return value;
  }
  inc(key: string, by?: number): number {
    const v = ((this.data[key] as number) || 0) + (by === undefined ? 1 : by);
    this.set(key, v);
    return v;
  }
  getPlaySessionId(): string {
    return this.idProvider.getPlaySessionId();
  }
  getPageSessionId(): string {
    return this.idProvider.getPageSessionId();
  }
  getGlobalUserId(): string {
    return this.idProvider.getGlobalUserId();
  }
  getUserSource(): string {
    return this.idProvider.getUserSource();
  }

  addExtraFieldFunction(fn: (ctx: Record<string, unknown>) => void): () => void {
    this.extraFieldFunctions.push(fn);
    return () => {
      const i = this.extraFieldFunctions.indexOf(fn);
      if (i !== -1) this.extraFieldFunctions.splice(i, 1);
    };
  }
  ftue(step: number, name: string, extra?: Record<string, unknown>): void {
    const bits = new TcfBitSet(String(this.data.ftuestepsdone || '0'));
    if (step <= bits.getRightmost1Index()) {
      this.logger.warn(`[frvr-tracker] ftue: step ${step} (${name}) has already been tracked`);
      return;
    }
    bits.set1AtIndex(step);
    this.set('ftuestepsdone', bits.toHexString());
    this.logEvent('ftue', { ...extra, step_number: step, step_name: name });
  }
  async ftueUnordered(step: number, name: string, extra?: Record<string, unknown>): Promise<void> {
    const done = ((await this.storage.getItem('__frvr_ftue_steps_done', [])) as number[]) || [];
    if (done.includes(step)) {
      this.logger.warn(`[frvr-tracker] ftue: step ${step} (${name}) has already been tracked`);
      return;
    }
    done.push(step);
    await this.storage.setItem('__frvr_ftue_steps_done', done);
    this.logEvent('ftue', { ...extra, step_number: step, step_name: name });
  }
  levelStart(level: string | number, extra?: Record<string, unknown>): void {
    this.set('game_start_time', Date.now());
    this.inc('games_played');
    const date = new Date();
    const day = `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
    if (this.data.last_day_played !== day) {
      this.set('last_day_played', day);
      this.inc('days_played');
    }
    this.inc('game_total');
    this.logValuedEvent('levelStart', this.inc('level_total'), { ...extra, level_id: level });
  }
  levelEnd(level: string | number, extra?: Record<string, unknown>): void {
    this.logValuedEvent('levelEnd', this.inc('game_total'), { ...extra, level_id: level });
    this.set('game_start_time', -1);
  }
  private send(event: string, value: unknown, fields: Record<string, unknown>, requiredConsents: number, requiredLIs: number): void {
    const ctx = { ...this.getContextFields(), ...this.getConsentContextFields(), ...this.data };
    this.logger.debug('[frvr-tracker] event', event, fields, ctx);
    if (!this.consentProvider.hasLoaded() && !this.qatoolEnabled) {
      if (this.preConsentLoadEventQueue.length < 100) {
        this.preConsentLoadEventQueue.push({ event, value, fields, ctx, requiredConsents, requiredLIs });
      }
      return;
    }
    for (const p of this.analyticsProviders) {
      try {
        p.send(event, value, fields, ctx);
      } catch (err) {
        this.logger.error(`[frvr-tracker] error sending event via provider ${p.getName()}`, err);
      }
    }
  }
  private dispatchOutstandingEvents(): void {
    const queue = this.preConsentLoadEventQueue;
    while (queue.length) {
      const { event, value, fields, ctx } = queue.shift();
      this.send(event, value, fields, ConsentOptions.None, ConsentOptions.None);
    }
  }
}

export class AdsThrottler {
  private maxFrequency = 300_000;
  private initTimeBlock = 0;
  private forceFirstAd = false;
  private static DEFAULT_FREQUENCY = 300_000;
  private static DEFAULT_RATE = 3;

  private getInitialisedState(state: any): any {
    if (state.lastShownAd) return state;
    return { ...state, lastShownAd: this.getFirstIntervalTime(state) };
  }
  private getFirstIntervalTime(state: { initTime: number }): number {
    return state.initTime;
  }
  private shouldBlockByInitTime(state: any, now: number): boolean {
    return now - state.initTime < this.initTimeBlock;
  }
  private shouldBlockByFrequency(state: any, now: number): boolean {
    const elapsed = now - state.lastShownAd;
    return this.maxFrequency > 0 && elapsed < this.maxFrequency && !(state.isFirstAd && this.forceFirstAd);
  }
  init(config: any): void {
    this.initTimeBlock = config.initTimeBlock || 0;
    this.maxFrequency = config.maxfrequency === undefined ? 300_000 : config.maxfrequency;
    this.forceFirstAd = config.forceFirstAd || false;
  }
  mustThrottle(state: any, now = Date.now()): AdsThrottlerResult | undefined {
    const initialized = this.getInitialisedState(state);
    if (this.shouldBlockByInitTime(initialized, now)) return AdsThrottlerResult.INIT_TIME;
    if (this.shouldBlockByFrequency(initialized, now)) return AdsThrottlerResult.FREQUENCY;
    return undefined;
  }
  notifyAdShown(state: any, now = Date.now()): any {
    return { ...state, isFirstAd: false, isFirstAdEver: false, lastShownAd: now };
  }
}

export interface AdProvider {
  getName(): string;
  getType(): AdType;
  isReady(): boolean;
  useManualControl(): boolean;
  init(config: any, adTracker: AdTracker, adContainer: HTMLElement): Promise<void>;
  show(): Promise<{ success: boolean; code: string; message?: string }>;
  hide(): Promise<void>;
}

export interface AdTracker {
  requestingAd(): void;
  receivedAdResponse(status: AdResponseStatus, advertisementId?: string): void;
  finishedAd(status: AdFinishedStatus): void;
  willShowAd(preloaded: boolean, advertisementId?: string): void;
}

export class AdTrackerImpl implements AdTracker {
  constructor(
    private readonly tracker: { logEvent: (event: string, fields?: any, consent?: number) => void },
    private readonly config: { adType: AdType; provider: string },
  ) {}

  private getEventName(suffix: string): string {
    const prefix: Record<string, string> = {
      [AdType.INTERSTITIAL]: 'mandatory',
      [AdType.REWARD]: 'rewarded',
      [AdType.BANNER]: 'banner',
    };
    return 'ad_' + (prefix[this.config.adType] ?? this.config.adType) + '_' + suffix;
  }
  logEvent(event: string, fields?: any): void {
    this.tracker.logEvent(event, fields, ConsentOptions.None);
  }
  requestingAd(id?: string): void {
    this.logEvent(this.getEventName('request'), {
      ...({} as any),
      provider: this.config.provider,
      advertisement_id: id,
    });
  }
  receivedAdResponse(status: AdResponseStatus, id?: string, extra?: any): void {
    this.logEvent(this.getEventName('response'), {
      ...extra,
      provider: this.config.provider,
      advertisement_id: id,
      ad_response: status,
    });
  }
  willShowAd(preloaded: boolean, id?: string, extra?: any): void {
    this.logEvent(this.getEventName('will_show'), {
      ...extra,
      provider: this.config.provider,
      advertisement_id: id,
      preloaded,
    });
  }
  finishedAd(status: AdFinishedStatus, id?: string, extra?: any): void {
    this.logEvent(this.getEventName('finished'), {
      ...extra,
      provider: this.config.provider,
      advertisement_id: id,
      ad_result: status,
    });
  }
}

export function decodeTokenPayload(token?: string): any {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
  const bytes = window.atob(b64);
  const json = bytes
    .split('')
    .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
    .join('');
  try {
    return JSON.parse(decodeURIComponent(json));
  } catch {
    return null;
  }
}

export class TokenPair {
  private _accessToken?: string;
  private _accessPayload: any;
  private _accessExpiration = 0;
  private _accessIAT = 0;
  private _verified = false;
  private _refreshToken?: string;
  private _refreshPayload: any;
  private _refreshExpiration = 0;
  private _platform: Platform | null = null;
  private _frvrID: string | null = null;

  constructor(accessToken?: string, refreshToken?: string) {
    if (accessToken) this.accessToken = accessToken;
    if (refreshToken) this.refreshToken = refreshToken;
  }

  set accessToken(token: string | undefined) {
    const payload = decodeTokenPayload(token);
    if (payload) {
      this._accessToken = token;
      this._accessPayload = payload;
      this._accessExpiration = parseInt(payload.exp, 10) || 0;
      this._accessIAT = parseInt(payload.iat, 10) || 0;
      this._verified = payload.user?.verified !== false;
    } else {
      this._accessToken = undefined;
      this._accessPayload = null;
      this._accessExpiration = 0;
      this._accessIAT = 0;
      this._verified = false;
    }
  }
  get accessToken(): string | undefined {
    return this._accessToken;
  }
  set refreshToken(token: string | undefined) {
    const payload = decodeTokenPayload(token);
    if (payload) {
      this._refreshToken = token;
      this._refreshPayload = payload;
      this._refreshExpiration = parseInt(payload.exp, 10);
      this._platform = payload.user?.platform;
      this._frvrID = payload.sub;
    } else {
      this._refreshToken = undefined;
      this._refreshPayload = null;
      this._refreshExpiration = 0;
      this._platform = null;
      this._frvrID = null;
    }
  }
  get refreshToken(): string | undefined {
    return this._refreshToken;
  }
  get accessExpiration(): number {
    return this._accessExpiration;
  }
  get refreshExpiration(): number {
    return this._refreshExpiration;
  }
  get platform(): Platform | null {
    return this._refreshToken ? this._platform : this._accessPayload?.user?.platform ?? null;
  }
  get frvrID(): string | null {
    return this._refreshToken ? this._frvrID : this._accessPayload?.sub ?? null;
  }
  get verified(): boolean {
    return this._verified;
  }
  get accessIssuedAt(): number {
    return this._accessIAT;
  }
  get timeTillAccessExpiry(): number {
    return this._accessToken ? Math.floor(this._accessExpiration - Date.now() / 1000) : -1;
  }
  get accessLifespan(): number {
    return this._accessToken ? this._accessExpiration - this._accessIAT : 0;
  }
  updateTokens(access: string, refresh: string): void {
    this.accessToken = access;
    this.refreshToken = refresh;
  }
  updateTokensIfValid(access: string, refresh: string): void {
    const prevA = this._accessToken;
    const prevR = this._refreshToken;
    this.updateTokens(access, refresh);
    if (!this.isAccessValid() && !this.isRefreshValid()) {
      this._accessToken = prevA;
      this._refreshToken = prevR;
    }
  }
  isAccessValid(): boolean {
    return !!this._accessToken && this._accessExpiration - 60 > Date.now() / 1000;
  }
  isRefreshValid(): boolean {
    return !!this._refreshToken && this._refreshExpiration - 60 > Date.now() / 1000;
  }
  isAnyValid(): boolean {
    return this.isRefreshValid() || this.isAccessValid();
  }
  shouldRefresh(): boolean {
    return this.isRefreshValid() && !this.isAccessValid();
  }
  getAccessPayload(): any {
    return this._accessPayload;
  }
  getRefreshPayload(): any {
    return this._refreshPayload;
  }
}

const REFRESH_TOKEN_KEY = '__FRVR_auth_refresh_token';
const ACCESS_TOKEN_KEY = '__FRVR_auth_access_token';

export function tokenStorageKeys(scope?: string): { refresh: string; access: string } {
  if (scope) return { refresh: `${REFRESH_TOKEN_KEY}__${scope}`, access: `${ACCESS_TOKEN_KEY}__${scope}` };
  return { refresh: REFRESH_TOKEN_KEY, access: ACCESS_TOKEN_KEY };
}

export class TokenHandler {
  private currentPairValue = new TokenPair();
  private pairsPerPlatform: Record<string, TokenPair> = {};
  private storage: Storage = defaultStorage;
  private keys: { refresh: string; access: string };

  constructor(private readonly scope?: string) {
    this.keys = tokenStorageKeys(scope);
  }

  async initFromStorage(storage: Storage = defaultStorage): Promise<void> {
    this.storage = storage;
    const refresh = await this.storage.getItem(this.keys.refresh);
    const access = await this.storage.getItem(this.keys.access);
    this.currentPairValue = new TokenPair(access as string, refresh as string);
    this.storedPair = this.currentPairValue;
  }
  getAccessToken(): string | undefined {
    return this.currentPairValue.accessToken;
  }
  getRefreshToken(): string | undefined {
    return this.currentPairValue.refreshToken;
  }
  getFRVRID(): string | null {
    return this.currentPairValue.frvrID;
  }
  isVerified(): boolean {
    return this.currentPairValue.verified;
  }
  shouldRefresh(): boolean {
    return this.currentPairValue.shouldRefresh();
  }
  getCurrentPlatform(): Platform | null {
    return this.currentPairValue.platform;
  }
  availablePlatforms(): string[] {
    const out: string[] = [];
    for (const p in this.pairsPerPlatform) {
      if (this.pairsPerPlatform[p].isAnyValid()) out.push(p);
    }
    return out;
  }
  get pairs(): Record<string, TokenPair> {
    return this.pairsPerPlatform;
  }
  setAsCurrent(pair: TokenPair, persist = true): void {
    this.currentPairValue = pair;
    if (persist) {
      this.storedPair = pair;
      this.storage.setItem(this.keys.refresh, pair.refreshToken);
      this.storage.setItem(this.keys.access, pair.accessToken);
    }
  }
  private storedPairValue?: TokenPair;
  get storedPair(): TokenPair | undefined {
    return this.storedPairValue;
  }
  private set storedPair(pair: TokenPair | undefined) {
    this.storedPairValue = pair;
  }

  deleteStoredTokens(): void {
    this.storedPairValue = undefined;
    this.storage.removeItems([this.keys.refresh, this.keys.access]);
  }
  deleteTokens(): void {
    this.clear();
  }
  addPairAsCurrent(access: string, refresh: string): void {
    this.setAsCurrent(new TokenPair(access, refresh));
  }
  updateAndValidateCurrentPair(access: string, refresh: string): boolean {
    this.updateCurrentPair(access, refresh);
    return this.isAccessValid();
  }
  updateCurrentPair(access: string, refresh: string): void {
    this.setAsCurrent(new TokenPair(access, refresh));
  }
  clear(): void {
    this.currentPairValue = new TokenPair();
    this.pairsPerPlatform = {};
    this.storedPairValue = undefined;
    this.storage.removeItems([this.keys.refresh, this.keys.access]);
  }
  isAccessValid(): boolean {
    return this.currentPairValue.isAccessValid();
  }
  isRefreshValid(): boolean {
    return this.currentPairValue.isRefreshValid();
  }
  isAnyValid(): boolean {
    return this.currentPairValue.isAnyValid();
  }
  get currentPair(): TokenPair {
    return this.currentPairValue;
  }
}

export const RESPONSE_TYPES = {
  registrationSuccess: 'registrationSuccess',
  registrationConflict: 'registrationConflict',
  loginSuccess: 'loginSuccess',
  accountNotActive: 'accountNotActive',
  invalidCredentials: 'invalidCredentials',
  invalidFormat: 'invalidFormat',
  serverError: 'serverError',
  unknownError: 'unknownError',
  networkError: 'networkError',
  operationSuccess: 'operationSuccess',
  tokenExpired: 'tokenExpired',
  notLoggedIn: 'notLoggedIn',
  invalidParam: 'invalidParam',
  platformNotAvailable: 'platformNotAvailable',
  platformLoginFail: 'platformLoginFail',
} as const;

export const RESPONSE_DEFINITIONS = {
  REG_SUCCESS: { type: RESPONSE_TYPES.registrationSuccess, success: true, message: 'User registered successfully. Pending confirmation' },
  LOGIN_SUCCESS: { type: RESPONSE_TYPES.loginSuccess, success: true, message: 'Login successful' },
  OPERATION_SUCCESS: { type: RESPONSE_TYPES.operationSuccess, success: true, message: 'Operation success' },
  REG_CONFLICT: { type: RESPONSE_TYPES.registrationConflict, success: false, message: 'Email already registered' },
  ACCOUNT_NOT_ACTIVE: { type: RESPONSE_TYPES.accountNotActive, success: false, message: 'Provided credentials are valid but account is either not confirmed or suspended' },
  INVALID_CREDENTIALS: { type: RESPONSE_TYPES.invalidCredentials, success: false, message: 'Provided credentials are invalid' },
  INVALID_FORMAT: { type: RESPONSE_TYPES.invalidFormat, success: false, message: 'Invalid format on data' },
  SERVER_ERROR: { type: RESPONSE_TYPES.serverError, success: false, message: 'Error on server' },
  UNKNOWN_ERROR: { type: RESPONSE_TYPES.unknownError, success: false, message: 'Unknown error' },
  NETWORK_ERROR: { type: RESPONSE_TYPES.networkError, success: false, message: 'Network Error' },
  TOKEN_EXPIRED: { type: RESPONSE_TYPES.tokenExpired, success: false, message: 'Token has expired. Request a new challenge to get a fresh one' },
  NOT_LOGGED_IN: { type: RESPONSE_TYPES.notLoggedIn, success: false, message: 'Cannot perform operation without active login' },
  INVALID_PARAM: { type: RESPONSE_TYPES.invalidParam, success: false, message: 'Invalid parameter' },
  PLATFORM_NOT_AVAILABLE: { type: RESPONSE_TYPES.platformNotAvailable, success: false, message: 'The requested platform is not available' },
  PLATFORM_LOGIN_FAIL: { type: RESPONSE_TYPES.platformLoginFail, success: false, message: 'The login on the requested platform failed' },
};

export const AUTH_ENDPOINTS = {
  AUTH_REGISTRATION: { method: 'POST', path: '/register' },
  AUTH_LOGIN: { method: 'POST', path: '/login' },
  AUTH_REFRESH: { method: 'POST', path: '/refresh' },
  AUTH_RECOVER: { method: 'POST', path: '/recover' },
  AUTH_RECOVER_CHALLENGE: { method: 'POST', path: '/recover-challenge' },
  AUTH_VERIFY: { method: 'POST', path: '/verify' },
  AUTH_VERIFY_CHALLENGE: { method: 'POST', path: '/verify-challenge' },
  AUTH_SETTINGS: { method: 'POST', path: '/settings' },
  USER_VERIFIED: { method: 'GET', path: '/user/verified' },
};

export class AuthClient {
  private ongoingFRVRLogin: Promise<any> | null = null;
  private apiBaseURL: string;

  constructor({ apiBaseURL, env }: { apiBaseURL?: string; env: Env }) {
    this.apiBaseURL =
      apiBaseURL ??
      (env === Env.PRODUCTION ? 'https://crucible.frvr.com/v1/auth' : 'https://staging.crucible.frvr.com/v1/auth');
  }

  isLoggingIn(): boolean {
    return !!this.ongoingFRVRLogin;
  }

  async register(credentials: any): Promise<any> {
    return this.fetchAndHandleCommonErrors(
      AUTH_ENDPOINTS.AUTH_REGISTRATION,
      {
        201: () => RESPONSE_DEFINITIONS.REG_SUCCESS,
        409: () => { throw RESPONSE_DEFINITIONS.REG_CONFLICT; },
      },
      { platform: Platform.FRVR, credentials },
    );
  }

  async login(body: any): Promise<any> {
    if (this.ongoingFRVRLogin) return this.ongoingFRVRLogin;
    this.ongoingFRVRLogin = this.fetchAndHandleCommonErrors(
      AUTH_ENDPOINTS.AUTH_LOGIN,
      {
        201: async (res: Response) => {
          const data = await res.json();
          const pair = new TokenPair(data.accessToken, data.refreshToken);
          if (pair.isAccessValid()) return { ...RESPONSE_DEFINITIONS.LOGIN_SUCCESS, tokenPair: pair };
          throw RESPONSE_DEFINITIONS.SERVER_ERROR;
        },
        401: () => { throw RESPONSE_DEFINITIONS.INVALID_CREDENTIALS; },
        403: () => { throw RESPONSE_DEFINITIONS.ACCOUNT_NOT_ACTIVE; },
      },
      body,
    );
    return this.ongoingFRVRLogin.finally(() => {
      this.ongoingFRVRLogin = null;
    });
  }

  async loginAsAnonymous(): Promise<any> {
    return this.login({ platform: Platform.ANONYMOUS });
  }

  async requestEmailCode(email: string, register = false): Promise<any> {
    const endpoint = register ? AUTH_ENDPOINTS.AUTH_REGISTRATION : AUTH_ENDPOINTS.AUTH_LOGIN;
    return this.fetchAuthFlow(endpoint, { platform: Platform.FRVR, credentials: { email, method: 'code' } });
  }
  async requestEmailLoginCode(email: string, register = false): Promise<any> {
    return this.requestEmailCode(email, register);
  }

  async continueEmailCode(email: string, code: string, flowId: string, register = false): Promise<any> {
    const endpoint = register ? AUTH_ENDPOINTS.AUTH_REGISTRATION : AUTH_ENDPOINTS.AUTH_LOGIN;
    return this.fetchAndHandleCommonErrors(
      { ...endpoint, path: endpoint.path + '?flow=' + encodeURIComponent(flowId) },
      {
        200: async (res: Response) => this.parseTokens(res),
        201: async (res: Response) => this.parseTokens(res),
        400: () => { throw RESPONSE_DEFINITIONS.INVALID_FORMAT; },
        401: () => { throw RESPONSE_DEFINITIONS.INVALID_CREDENTIALS; },
        409: () => { throw RESPONSE_DEFINITIONS.REG_CONFLICT; },
      },
      { platform: Platform.FRVR, credentials: { email, method: 'code', code } },
    );
  }

  async resendEmailCode(email: string, flowId: string, register = false): Promise<any> {
    const endpoint = register ? AUTH_ENDPOINTS.AUTH_REGISTRATION : AUTH_ENDPOINTS.AUTH_LOGIN;
    return this.fetchAndHandleCommonErrors(
      { ...endpoint, path: endpoint.path + '?flow=' + encodeURIComponent(flowId) },
      {
        200: () => RESPONSE_DEFINITIONS.OPERATION_SUCCESS,
        201: () => RESPONSE_DEFINITIONS.OPERATION_SUCCESS,
        401: () => { throw RESPONSE_DEFINITIONS.INVALID_CREDENTIALS; },
      },
      { platform: Platform.FRVR, credentials: { email, method: 'code', resend: 'true' } },
    );
  }

  private async parseTokens(res: Response): Promise<any> {
    const data = await res.json();
    if (!data.accessToken || !data.refreshToken) throw RESPONSE_DEFINITIONS.SERVER_ERROR;
    const pair = new TokenPair(data.accessToken, data.refreshToken);
    if (!pair.isAccessValid()) throw RESPONSE_DEFINITIONS.SERVER_ERROR;
    return { ...RESPONSE_DEFINITIONS.LOGIN_SUCCESS, tokenPair: pair };
  }

  private async fetchAuthFlow(endpoint: any, body: any): Promise<any> {
    return this.fetchAndHandleCommonErrors(
      endpoint,
      {
        200: async (res: Response) => this.parseFlow(res),
        201: async (res: Response) => this.parseFlow(res),
        401: () => { throw RESPONSE_DEFINITIONS.INVALID_CREDENTIALS; },
        409: () => { throw RESPONSE_DEFINITIONS.REG_CONFLICT; },
      },
      body,
    );
  }

  private async parseFlow(res: Response): Promise<{ flowId: string }> {
    const data = await res.json();
    if (!data.flowId) throw RESPONSE_DEFINITIONS.SERVER_ERROR;
    return { flowId: data.flowId };
  }

  async checkVerification(pair: TokenPair): Promise<boolean> {
    return this.fetchAndHandleCommonErrors(
      AUTH_ENDPOINTS.USER_VERIFIED,
      {
        200: async (res: Response) => {
          const data = await res.json();
          return data?.verified;
        },
      },
      undefined,
      { 'X-REFRESH-TOKEN': pair.refreshToken! },
    );
  }

  async initiateVerifyChallenge(credentials: any): Promise<any> {
    return this.fetchAndHandleCommonErrors(
      AUTH_ENDPOINTS.AUTH_VERIFY_CHALLENGE,
      {
        201: () => RESPONSE_DEFINITIONS.OPERATION_SUCCESS,
        401: () => { throw RESPONSE_DEFINITIONS.INVALID_CREDENTIALS; },
      },
      { platform: Platform.FRVR, credentials },
    );
  }

  async initiateRecoveryChallenge(credentials: any): Promise<any> {
    return this.fetchAndHandleCommonErrors(
      AUTH_ENDPOINTS.AUTH_RECOVER_CHALLENGE,
      {
        201: () => RESPONSE_DEFINITIONS.OPERATION_SUCCESS,
        401: () => { throw RESPONSE_DEFINITIONS.INVALID_CREDENTIALS; },
      },
      { platform: Platform.FRVR, credentials },
    );
  }

  async changePassword(accessToken: string, newPassword: string): Promise<any> {
    return this.fetchAndHandleCommonErrors(
      AUTH_ENDPOINTS.AUTH_SETTINGS,
      {
        200: () => RESPONSE_DEFINITIONS.OPERATION_SUCCESS,
        401: () => { throw RESPONSE_DEFINITIONS.INVALID_CREDENTIALS; },
      },
      { platform: Platform.FRVR, credentials: { newPassword } },
      { Authorization: 'Bearer ' + accessToken },
    );
  }

  async refreshTokens(pair: TokenPair): Promise<any> {
    return this.fetchAndHandleCommonErrors(
      AUTH_ENDPOINTS.AUTH_REFRESH,
      {
        201: async (res: Response) => {
          const data = await res.json();
          if (!data.accessToken || !data.refreshToken) throw RESPONSE_DEFINITIONS.SERVER_ERROR;
          pair.updateTokensIfValid(data.accessToken, data.refreshToken);
          if (pair.isAccessValid()) return RESPONSE_DEFINITIONS.OPERATION_SUCCESS;
          throw RESPONSE_DEFINITIONS.SERVER_ERROR;
        },
        401: () => { throw RESPONSE_DEFINITIONS.INVALID_CREDENTIALS; },
      },
      { refreshToken: pair.refreshToken },
    );
  }

  private async fetchAndHandleCommonErrors(
    endpoint: { path: string; method: string },
    handlers: Record<number, (res: Response) => any>,
    body?: any,
    headers: Record<string, string> = {},
  ): Promise<any> {
    const url = this.apiBaseURL + endpoint.path;
    let response: Response;
    try {
      response = await fetch(url, {
        method: endpoint.method,
        headers: { 'Content-Type': 'application/json', ...headers },
        body: body && JSON.stringify(body),
      });
    } catch (err) {
      throw { ...RESPONSE_DEFINITIONS.NETWORK_ERROR, payload: { error: err } };
    }
    if (!response) throw RESPONSE_DEFINITIONS.NETWORK_ERROR;
    if (handlers[response.status]) return handlers[response.status](response);
    switch (response.status) {
      case 400:
        throw RESPONSE_DEFINITIONS.INVALID_FORMAT;
      case 500:
        throw RESPONSE_DEFINITIONS.SERVER_ERROR;
      default:
        throw { ...RESPONSE_DEFINITIONS.UNKNOWN_ERROR, payload: { status: response.status, url: endpoint } };
    }
  }
}

export class AuthManager {
  private loginStatusListeners: Array<(loggedIn: boolean) => void> = [];
  private internalListeners = new Set<(loggedIn: boolean) => void>();
  private gameStatusDelivery: Promise<void> = Promise.resolve();
  private proactiveRefreshTimeoutID = -1;
  private externalPair: TokenPair | null = null;
  private initializing = false;
  private lastNotifiedStatus?: { isLoggedIn: boolean; frvrID: string | null };
  private statusChangeInterceptor?: (
    status: { isLoggedIn: boolean; frvrID: string | null; external: boolean; gameListeners: number },
    next: () => Promise<void> | void,
  ) => Promise<void>;

  private readonly providers: any[];
  private readonly storage: Storage;
  private readonly env: Env;
  private readonly client: AuthClient;
  private readonly tokenHandler: TokenHandler;
  private readonly logger: Logger;
  private readonly config: any;

  constructor(options: {
    providers?: any[];
    storage?: Storage;
    env?: Env;
    client?: AuthClient;
    tokenHandler?: TokenHandler;
    logger?: Logger;
    config?: any;
  } = {}) {
    this.providers = options.providers ?? [];
    this.storage = options.storage ?? defaultStorage;
    this.env = options.env ?? Env.PRODUCTION;
    this.client = options.client ?? new AuthClient({ env: this.env });
    this.tokenHandler = options.tokenHandler ?? new TokenHandler();
    this.logger = options.logger ?? emptyLogger;
    this.config = options.config ?? {};
  }

  async getStorageAccessToken(): Promise<string | null> {
    const handler = new TokenHandler(this.config.tokenStorageScope);
    await handler.initFromStorage(this.storage);
    return handler.isAccessValid() ? handler.getAccessToken() ?? null : null;
  }

  init(): Promise<void> {
    return (this.initPromise = this.runInit());
  }
  private initPromise?: Promise<void>;

  private async runInit(): Promise<void> {
    await this.tokenHandler.initFromStorage(this.storage);
    if (!this.tokenHandler.isRefreshValid()) this.tokenHandler.deleteStoredTokens();

    const api = {
      loginWithProvider: this.loginWithProvider.bind(this),
      loginWithExternalTokens: this.loginWithExternalTokens.bind(this),
      setExternalSession: this.setExternalSession.bind(this),
      endExternalSession: this.endExternalSession.bind(this),
      loginAsAnonymous: this.loginAsAnonymous.bind(this),
      logout: this.logout.bind(this),
      getCurrentPlatform: this.getCurrentPlatform.bind(this),
      getCurrentIdentifier: this.getCurrentIdentifier.bind(this),
      isVerified: this.isVerified.bind(this),
    };

    let isLoggedIn = false;
    this.initializing = true;
    try {
      for (const p of this.providers) {
        await p.init(api);
        if (p.getCredentials?.() && !isLoggedIn) {
          if (p.awaitsAutoLogin?.() && this.isLoggedIn()) break;
          isLoggedIn = true;
          if (p.handlesFRVRLogin?.()) break;
          const promise = this.loginWithProvider(p).catch((err) => {
            this.logger?.warn(`Auto login with platform ${p.getPlatformId()} failed!`, err);
          });
          if (p.awaitsAutoLogin?.()) this.ongoingFRVRLogin = promise;
        }
      }
    } finally {
      this.initializing = false;
    }

    if (!isLoggedIn && this.isAnonymousLoginEnabled()) {
      this.loginAsAnonymous().catch((err) => this.logger?.warn('Auto login with anonymous account failed!', err));
    } else if (isLoggedIn) {
      this.onLoginStatusChange();
    }
  }
  private ongoingFRVRLogin?: Promise<void>;

  private needsRefresh(): boolean {
    return this.tokenHandler.shouldRefresh();
  }

  getAccessToken(): string | null {
    if (this.tokenHandler.isRefreshValid()) {
      if (this.needsRefresh()) return null;
      return this.tokenHandler.getAccessToken() ?? null;
    }
    if (this.isExternalSession() && this.tokenHandler.isAccessValid()) return this.tokenHandler.getAccessToken() ?? null;
    return null;
  }
  async getFreshAccessToken(): Promise<string | null> {
    await this.awaitSettledSession();
    if (this.shouldRefreshTokens() && !this.inRefreshBackoff()) await this.refreshTokens();
    if (this.requiresSettledSession() && !this.tokenHandler.isAnyValid()) return null;
    return this.tokenHandler.getAccessToken() ?? null;
  }
  getFRVRID(): string | null {
    return this.isLoggedIn() ? this.tokenHandler.getFRVRID() : null;
  }
  isVerified(): boolean {
    return this.tokenHandler.isVerified();
  }
  isLoggedIn(): boolean {
    return this.tokenHandler.isAnyValid();
  }
  getCurrentPlatform(): Platform | null {
    return this.tokenHandler.getCurrentPlatform();
  }
  getCurrentIdentifier(): string | undefined {
    try {
      const id = this.tokenHandler.currentPair.getAccessPayload()?.user?.identifier;
      return typeof id === 'string' ? id : undefined;
    } catch {
      return;
    }
  }
  async whenAutoLoginSettled(timeout = 1000): Promise<void> {
    const promise = this.ongoingFRVRLogin;
    if (!promise) return Promise.resolve();
    let timer: ReturnType<typeof setTimeout>;
    return Promise.race([
      promise.catch(() => {}),
      new Promise<void>((resolve) => (timer = setTimeout(resolve, timeout))),
    ]).finally(() => clearTimeout(timer!));
  }
  getAvailablePlatforms(): string[] {
    return this.providers.filter((p) => p.isAvailable()).map((p) => p.getPlatformId());
  }
  isPlatformAvailable(id: Platform): boolean {
    return !!this.providers.find((p) => p.isAvailable() && p.getPlatformId() === id);
  }
  isFRVRLoginEnabled(): boolean {
    return !this.providers.find((p) => p.prohibitsLoginWithFRVRCredentials?.());
  }
  isAnonymousLoginEnabled(): boolean {
    return this.isFRVRLoginEnabled() && this.config.enableAnonymousLogin;
  }
  isLogoutSupported(): boolean {
    return !this.providers.find((p) => !p.isLogoutSupported());
  }
  addStatusChangeListener(cb: (loggedIn: boolean) => void): void {
    this.loginStatusListeners.push(cb);
  }
  addInternalStatusChangeListener(cb: (loggedIn: boolean) => void): void {
    this.internalListeners.add(cb);
    this.loginStatusListeners.push(cb);
  }
  whenGameStatusDelivered(): Promise<void> {
    return this.gameStatusDelivery;
  }
  setStatusChangeInterceptor(fn: typeof this.statusChangeInterceptor): void {
    this.statusChangeInterceptor = fn;
  }

  async registerOnFRVR(credentials: any, retry = true): Promise<any> {
    return this.client
      .register(credentials)
      .then(() => this.loginToFRVR({ platform: Platform.FRVR, credentials }))
      .catch((err: unknown) => {
        const type = typeof err === 'object' && err !== null && 'type' in err ? err.type : undefined;
        if (type === RESPONSE_DEFINITIONS.REG_CONFLICT.type && retry) {
          return this.loginToFRVR({ platform: Platform.FRVR, credentials });
        }
        throw err;
      });
  }

  login(platform: any, credentials?: any): Promise<any> {
    return platform && credentials
      ? this.loginToFRVR({ platform, credentials })
      : this.loginThroughPlatform(platform);
  }
  async loginToFRVR(body: any): Promise<any> {
    const res = await this.client.login(body);
    if (res.tokenPair) {
      this.tokenHandler.setAsCurrent(res.tokenPair);
      for (const p of this.providers) {
        if (p.onFRVRTokensReceived) await p.onFRVRTokensReceived(this.tokenHandler.currentPair);
      }
      this.onLoginStatusChange();
    }
    return omit(res, 'tokenPair');
  }
  async loginWithProvider(provider: any): Promise<any> {
    return this.loginToFRVR({ platform: provider?.getPlatformId(), credentials: provider?.getCredentials() });
  }
  getAvailableLoginPlatforms(): string[] {
    return this.providers.filter((p) => p.isLoginSupported()).map((p) => p.getPlatformId());
  }
  getCredentials(): any {
    if (!this.isLoggedIn()) return;
    return Object.assign(
      {
        [Platform.FRVR]: {
          userID: this.tokenHandler.getFRVRID(),
          accessToken: this.tokenHandler.getAccessToken(),
          isTokenExpired: !this.tokenHandler.isAccessValid(),
          isVerified: this.tokenHandler.isVerified(),
        },
      },
      this.getThirdPartyCredentials(),
    );
  }
  getThirdPartyCredentials(): Record<string, any> {
    const out: Record<string, any> = {};
    this.providers.forEach((p) => {
      if (p && p.isLoggedIn()) out[p.getPlatformId()] = p.getCredentials();
    });
    return out;
  }
  async mergeAccounts(_from?: unknown, _to?: unknown): Promise<void> {}
  discardStoredAccount(): void {
    const stored = (this.tokenHandler as any).storedPair as TokenPair | undefined;
    if (stored?.refreshToken && !this.isAnonymousPair(stored)) (this.tokenHandler as any).deleteStoredTokens?.();
  }
  async initiateVerifyChallenge(credentials: any): Promise<any> {
    return this.client.initiateVerifyChallenge(credentials);
  }

  async requestEmailLoginCode(email: string): Promise<any> {
    const { flowId } = await this.client.requestEmailLoginCode(email, false);
    return this.makeEmailCodeFlow(email, flowId, false);
  }
  async requestEmailRegisterCode(email: string): Promise<any> {
    const { flowId } = await this.client.requestEmailLoginCode(email, true);
    return this.makeEmailCodeFlow(email, flowId, true);
  }
  private makeEmailCodeFlow(email: string, flowId: string, register: boolean) {
    return {
      email,
      flowId,
      continue: async (code: string) => this.applyTokensFromCodeFlow(
        await this.client.continueEmailCode(email, code, flowId, register),
      ),
      resend: async () => this.client.resendEmailCode(email, flowId, register),
    };
  }
  private async applyTokensFromCodeFlow(res: any): Promise<any> {
    if (res.tokenPair) {
      this.tokenHandler.setAsCurrent(res.tokenPair);
      for (const p of this.providers) {
        if (p.onFRVRTokensReceived) await p.onFRVRTokensReceived(this.tokenHandler.currentPair);
      }
      this.onLoginStatusChange();
    }
    return omit(res, 'tokenPair');
  }
  async loginWithExternalTokens(accessToken: string, refreshToken: string): Promise<any> {
    const pair = new TokenPair(accessToken, refreshToken);
    if (!pair.isAnyValid()) throw RESPONSE_DEFINITIONS.INVALID_CREDENTIALS;
    this.tokenHandler.setAsCurrent(pair);
    for (const p of this.providers) {
      if (p.onFRVRTokensReceived) await p.onFRVRTokensReceived(this.tokenHandler.currentPair);
    }
    this.onLoginStatusChange();
    return RESPONSE_DEFINITIONS.LOGIN_SUCCESS;
  }

  async setExternalSession(accessToken: string): Promise<any> {
    const pair = new TokenPair(accessToken);
    if (!pair.isAccessValid() || !pair.frvrID) throw RESPONSE_DEFINITIONS.INVALID_PARAM;
    if (this.isExternalSession() && this.tokenHandler.getAccessToken() === accessToken) {
      this.notifyIfIdentityChanged();
      return RESPONSE_DEFINITIONS.LOGIN_SUCCESS;
    }
    this.refreshUserIdCookie();
    this.externalPair = pair;
    this.tokenHandler.setAsCurrent(pair, false);
    for (const p of this.providers) {
      if (p.onFRVRTokensReceived) await p.onFRVRTokensReceived(this.tokenHandler.currentPair);
    }
    this.notifyIfIdentityChanged();
    return RESPONSE_DEFINITIONS.LOGIN_SUCCESS;
  }

  async endExternalSession(): Promise<void> {
    const wasExternal = this.isExternalSession();
    this.externalPair = null;
    if (wasExternal || !this.isAnonymousPair(this.tokenHandler.currentPair)) {
      const stored = (this.tokenHandler as any).storedPair;
      if (stored?.isRefreshValid()) this.tokenHandler.setAsCurrent(stored);
      else this.tokenHandler.deleteTokens?.();
    }
    if (!this.initializing) {
      if (!this.isLoggedIn() && this.isAnonymousLoginEnabled()) {
        try {
          return void (await this.loginAsAnonymous());
        } catch (err) {
          this.logger?.warn('Anonymous login after the external session ended failed!', err);
        }
      }
      this.notifyIfIdentityChanged();
    }
  }

  isExternalSession(): boolean {
    return !!this.externalPair && this.tokenHandler.currentPair === this.externalPair;
  }
  private isAnonymousPair(pair?: TokenPair): boolean {
    return pair?.platform === Platform.ANONYMOUS;
  }
  private refreshUserIdCookie(): void {
    const stored = (this.tokenHandler as any).storedPair;
    if (stored?.refreshToken && !this.isAnonymousPair(stored)) {
      (this.tokenHandler as any).deleteStoredTokens?.();
    }
  }

  async loginAsAnonymous(): Promise<any> {
    if (!this.isAnonymousLoginEnabled()) throw RESPONSE_DEFINITIONS.PLATFORM_NOT_AVAILABLE;
    const res = await this.client.loginAsAnonymous();
    const { tokenPair } = res;
    const rest = omit(res, 'tokenPair');
    if (tokenPair) {
      this.tokenHandler.setAsCurrent(tokenPair);
      for (const p of this.providers) {
        if (p.onFRVRTokensReceived) await p.onFRVRTokensReceived(this.tokenHandler.currentPair);
      }
      this.onLoginStatusChange();
    }
    return rest;
  }

  async loginThroughPlatform(platform: any): Promise<any> {
    let provider: any;
    if (platform && this.providers.length !== 1) provider = this.providers.find((p) => p.getPlatformId() === platform);
    else provider = this.providers[0];
    if (!provider) throw RESPONSE_DEFINITIONS.PLATFORM_NOT_AVAILABLE;
    return provider
      .login()
      .catch((err: unknown) => {
        throw { ...RESPONSE_DEFINITIONS.PLATFORM_LOGIN_FAIL, payload: { platform: provider.getPlatformId(), error: err } };
      })
      .then((loggedIn: any) => {
        if (loggedIn) return this.loginWithProvider(provider);
        throw { ...RESPONSE_DEFINITIONS.PLATFORM_LOGIN_FAIL, payload: { platform: provider.getPlatformId() } };
      });
  }

  logout(): void {
    this.externalPair = null;
    this.tokenHandler.clear?.();
    this.providers.forEach((p) => p.logout?.());
    this.notifyIfIdentityChanged();
  }
  async logoutFRVR(): Promise<void> {
    this.logout();
  }
  async initiateRecoveryChallenge(credentials: any): Promise<any> {
    return this.client.initiateRecoveryChallenge(credentials);
  }
  async changePassword(newPassword: string): Promise<any> {
    if (!this.isLoggedIn()) throw RESPONSE_DEFINITIONS.NOT_LOGGED_IN;
    return this.client.changePassword(this.tokenHandler.getAccessToken()!, newPassword);
  }
  async synchronizeVerifiedStatus(): Promise<boolean> {
    if (this.isVerified() || !this.isLoggedIn()) return true;
    return this.client.checkVerification(this.tokenHandler.currentPair).then((ok) => !!ok && this.refreshCurrentPair().then(() => true));
  }
  async fetch(url: string, options: RequestInit): Promise<Response> {
    return this.authenticatedFetch(url, options);
  }
  async authenticatedFetch(url: string, options: RequestInit): Promise<Response> {
    return fetch(url, await this.decorateRequestWithAuth(options));
  }

  private async decorateRequestWithAuth(options: RequestInit): Promise<RequestInit> {
    await this.awaitSettledSession();
    if (this.shouldRefreshTokens() && !this.inRefreshBackoff()) {
      await this.refreshTokens();
    }
    if (!this.tokenHandler.isAccessValid()) throw RESPONSE_DEFINITIONS.NOT_LOGGED_IN;
    const accessToken = this.tokenHandler.getAccessToken();
    return {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...Object.fromEntries(new Headers(options.headers).entries()),
        Authorization: `Bearer ${accessToken}`,
      },
    };
  }

  onLoginStatusChange(): void {
    const isLoggedIn = this.isLoggedIn();
    const frvrID = this.getFRVRID();
    this.lastNotifiedStatus = { isLoggedIn, frvrID };
    const interceptor = this.statusChangeInterceptor;
    if (interceptor) {
      this.loginStatusListeners.forEach((cb) => {
        if (this.internalListeners.has(cb)) cb(isLoggedIn);
      });
      this.interceptStatusChange(interceptor, {
        isLoggedIn,
        frvrID,
        external: this.isExternalSession(),
        gameListeners: this.loginStatusListeners.filter((cb) => !this.internalListeners.has(cb)).length,
      });
    } else {
      this.loginStatusListeners.forEach((cb) => cb(isLoggedIn));
    }
    this.notifyIfIdentityChanged();
  }
  private interceptStatusChange(fn: Function, status: any): void {
    let p: Promise<any>;
    try {
      p = Promise.resolve(fn(status));
    } catch (err) {
      p = Promise.reject(err);
    }
    p = p.catch((err) => this.logger?.warn('Status change interceptor failed', err));
    const prev = this.gameStatusDelivery;
    this.gameStatusDelivery = Promise.all([prev, p])
      .then(() => {
        this.loginStatusListeners.forEach((cb) => {
          if (!this.internalListeners.has(cb)) cb(status.isLoggedIn);
        });
      })
      .catch((err) => this.logger?.warn('Status change listener failed', err));
  }
  private notifyIfIdentityChanged(): void {
    const last = this.lastNotifiedStatus;
    if (last && last.isLoggedIn === this.isLoggedIn() && last.frvrID === this.getFRVRID()) {
      return;
    }
    this.onLoginStatusChange();
  }

  async awaitSettledSession(): Promise<void> {
    await this.settleSession();
  }
  private requiresSettledSession(): boolean {
    return this.providers.some((p) => p.requiresSettledSession?.());
  }
  private async settleSession(): Promise<void> {
    if (this.initPromise && this.requiresSettledSession()) await this.initPromise.catch(() => {});
  }
  private shouldRefreshTokens(): boolean {
    if (this.isExternalSession()) return !this.tokenHandler.isAccessValid();
    if (!this.shouldRefresh() && this.tokenHandler.isRefreshValid()) return false;
    return !(this.requiresSettledSession() && !this.tokenHandler.getRefreshToken());
  }
  private shouldRefresh(): boolean {
    return this.tokenHandler.shouldRefresh();
  }
  async refreshCurrentPair(pair: TokenPair = this.tokenHandler.currentPair): Promise<boolean> {
    const p = this.client.refreshTokens(pair);
    p.then(() => {
      if (this.tokenHandler.currentPair === pair) {
        this.tokenHandler.setAsCurrent(pair);
        this.notifyIfIdentityChanged();
      }
    }).catch(() => {});
    return p.catch(async (err) => {
      if (this.tokenHandler.currentPair !== pair) throw err;
      const provider = this.providers.find((p) => p.getPlatformId() === pair.platform);
      if (err.type === RESPONSE_TYPES.invalidCredentials && provider?.isLoggedIn?.()) {
        try {
          await this.loginThroughPlatform(provider);
          return true;
        } catch (loginErr) {
          if (this.tokenHandler.currentPair === pair) this.logout();
          throw loginErr;
        }
      }
      if (this.tokenHandler.isAccessValid()) this.updateProactiveRefresh();
      else this.logout();
      throw err;
    });
  }

  async refreshTokens(): Promise<void> {
    const cur = this.tokenHandler.currentPair;
    const cached = (this as any).ongoingRefresh;
    if (cached?.pair === cur) return cached.promise;
    const promise = (this.isExternalSession() ? this.refreshExternalSession() : this.refreshNormalPair(cur)).then(
      (ok) => {
        if ((this as any).ongoingRefresh?.pair === cur) (this as any).ongoingRefresh = undefined;
        return ok;
      },
      (err) => {
        this.noteRefreshFailure(cur);
        if (this.tokenHandler.currentPair === cur && this.isLoggedIn()) this.updateProactiveRefresh();
        throw err;
      },
    );
    const wrapped = promise.finally(() => {
      if ((this as any).ongoingRefresh?.promise === wrapped) (this as any).ongoingRefresh = undefined;
    });
    (this as any).ongoingRefresh = { pair: cur, promise: wrapped };
    return wrapped;
  }
  private async refreshNormalPair(pair: TokenPair): Promise<any> {
    return this.refreshCurrentPair(pair).then(async (ok) => {
      if (ok === true || this.tokenHandler.currentPair === pair) {
        for (const p of this.providers) {
          if (p.onFRVRTokensReceived) await p.onFRVRTokensReceived(this.tokenHandler.currentPair);
        }
      }
      return ok;
    });
  }
  private async refreshExternalSession(): Promise<boolean> {
    const provider = this.providers.find((p) => p.refreshExternalSession);
    if (!provider) return false;
    let newToken: string | undefined;
    try {
      newToken = await provider.refreshExternalSession();
    } catch (err) {
      if (this.tokenHandler.currentPair === this.tokenHandler.currentPair && this.tokenHandler.isAccessValid()) {
        this.notifyIfIdentityChanged();
      }
      throw err;
    }
    if (this.tokenHandler.currentPair === this.tokenHandler.currentPair) {
      if (newToken) {
        await this.setExternalSession(newToken);
        return true;
      }
      await this.endExternalSession();
      return false;
    }
    return false;
  }

  private updateProactiveRefresh(): void {
    window.clearTimeout(this.proactiveRefreshTimeoutID);
    if (!this.isLoggedIn()) return;
    let seconds = this.getTimeTillProactiveRefresh();
    if (seconds >= Number.MAX_SAFE_INTEGER) return;
    if (!Number.isFinite(seconds)) seconds = 30;
    let ms = 1000 * seconds;
    if (this.inRefreshBackoff()) ms = Math.max(ms, (this as any).refreshBackoff.retryAt - Date.now());
    this.proactiveRefreshTimeoutID = window.setTimeout(() => {
      this.refreshTokens().catch((err) => this.logger?.warn('Proactive token refresh failed', err));
    }, Math.min(ms, 0x7fffffff));
  }
  private inRefreshBackoff(): boolean {
    const b = (this as any).refreshBackoff;
    return !!b && b.pair === this.tokenHandler.currentPair && Date.now() < b.retryAt;
  }
  private noteRefreshFailure(pair: TokenPair): void {
    const failures = (this as any).refreshBackoff?.pair === pair ? (this as any).refreshBackoff.failures + 1 : 1;
    const seconds = Math.min(5 * Math.pow(2, failures - 1), 300);
    (this as any).refreshBackoff = { pair, failures, retryAt: Date.now() + 1000 * seconds };
    this.logger?.warn(`Token refresh failed ${failures} time(s), next attempt in ${seconds}s`);
  }
  private getTimeTillProactiveRefresh(): number {
    if (!this.tokenHandler.isRefreshValid() && !this.isExternalSession()) return Number.MAX_SAFE_INTEGER;
    const pair = this.tokenHandler.currentPair;
    const half = 0.4 * ((pair.accessIssuedAt ?? Date.now() / 1000) + pair.accessLifespan - Math.floor(Date.now() / 1000));
    return Math.max(30, half);
  }
  get responseTypes() {
    return RESPONSE_TYPES;
  }
  get Platform() {
    return Platform;
  }
}

function omit<T, K extends keyof T>(obj: T, ...keys: K[]): Omit<T, K> {
  const out: any = {};
  for (const k in obj) if (Object.prototype.hasOwnProperty.call(obj, k) && keys.indexOf(k as any) < 0) out[k] = obj[k];
  return out;
}

export function addSdkStatusChangeListener(auth: any, cb: (loggedIn: boolean) => void): void {
  if (typeof auth.addInternalStatusChangeListener === 'function') auth.addInternalStatusChangeListener(cb);
  else auth.addStatusChangeListener(cb);
}

export enum SocialAPI {
  shareMessage = 0,
  sendUpdate = 1,
  invite = 2,
  getFriends = 3,
  getContextId = 4,
  getContextData = 5,
  getContextPlayers = 6,
}

export enum SocialEvents {
  onConnect = 'ON_CONNECT',
  onGameInvite = 'RECEIVE_GAME_INVITE',
  onError = 'ON_ERROR',
}

export enum WebsocketEventTypes {
  open = 'open',
  close = 'close',
  error = 'error',
  message = 'message',
  retry = 'retry',
}

export class WebsocketClient {
  private retries = 0;
  private closedByUser = false;
  private RECONNECT_RETRY_MS = 1000;
  private RECONNECT_DEFAULT_BACKOFF_MS = 500;
  private ws?: WebSocket;
  private eventListeners: Record<string, Array<{ listener: (ev: any) => void }>> = {
    open: [],
    close: [],
    error: [],
    message: [],
    retry: [],
  };

  constructor(private readonly config: any) {}

  send(msg: string): void {
    if (this.ws) {
      if (this.ws.readyState === WebSocket.OPEN) {
        if (this.closedByUser) this.config.logger?.error('WebsocketClient: Cannot send message, closed by user');
        else this.ws.send(msg);
      } else this.config.logger?.error('WebsocketClient: Cannot send message, not connected');
    } else {
      this.config.logger?.error('WebsocketClient: Cannot send message, not initialised');
    }
  }

  async connect(): Promise<void> {
    this.closedByUser = false;
    if (this.ws) {
      this.ws.removeEventListener(WebsocketEventTypes.open, this.onOpen);
      this.ws.removeEventListener(WebsocketEventTypes.close, this.onClose);
      this.ws.removeEventListener(WebsocketEventTypes.error, this.onError);
      this.ws.removeEventListener(WebsocketEventTypes.message, this.onMessage);
      this.ws.close();
    }
    const url = typeof this.config.url === 'function' ? await this.config.url() : this.config.url;
    const ws: WebSocket = this.config.webSocketClientBuilder
      ? this.config.webSocketClientBuilder(url)
      : new WebSocket(url);
    this.ws = ws;
    ws.addEventListener(WebsocketEventTypes.open, this.onOpen);
    ws.addEventListener(WebsocketEventTypes.close, this.onClose);
    ws.addEventListener(WebsocketEventTypes.error, this.onError);
    ws.addEventListener(WebsocketEventTypes.message, this.onMessage);
  }
  close(code = 1000, reason = 'client close'): void {
    this.closedByUser = true;
    this.ws?.close(code, reason);
  }
  on(event: string, fn: (ev: any) => void): void {
    const listeners = this.eventListeners[event];
    if (!listeners) throw new Error(`event type "${event}" is not supported`);
    listeners.push({ listener: fn });
  }
  removeListener(event: string, fn: (ev: any) => void): void {
    const listeners = this.eventListeners[event];
    if (!listeners) throw new Error(`event type "${event}" is not supported`);
    this.eventListeners[event] = listeners.filter((l) => l.listener !== fn);
  }
  getConnectionStatus(): number {
    return this.ws ? this.ws.readyState : WebSocket.CLOSED;
  }
  private onOpen = (ev: any) => this.handleEvent(WebsocketEventTypes.open, ev);
  private onClose = (ev: any) => this.handleEvent(WebsocketEventTypes.close, ev);
  private onError = (ev: any) => this.handleEvent(WebsocketEventTypes.error, ev);
  private onMessage = (ev: any) => this.handleEvent(WebsocketEventTypes.message, ev);

  private handleEvent(type: string, ev: any): void {
    switch (type) {
      case WebsocketEventTypes.close:
        if (!this.closedByUser) this.reconnect();
        break;
      case WebsocketEventTypes.open:
        this.retries = 0;
        break;
      case WebsocketEventTypes.error:
      case WebsocketEventTypes.message:
        break;
    }
    this.dispatchEvent(type, ev);
  }
  private reconnect(): void {
    const backoff = this.RECONNECT_DEFAULT_BACKOFF_MS * this.retries + this.RECONNECT_DEFAULT_BACKOFF_MS;
    const detail = { detail: { retries: this.retries++, backoff } };
    setTimeout(() => {
      if (this.closedByUser) return;
      this.dispatchEvent(WebsocketEventTypes.retry, new CustomEvent(WebsocketEventTypes.retry, detail));
      this.connect();
    }, backoff);
  }
  private dispatchEvent(event: string, ev: any): void {
    this.eventListeners[event]?.forEach((l) => l.listener(ev));
  }
}

export class SocialWebsocketClient {
  private friendsStatus = new Map<string, any>();
  private eventListeners: Record<string, Array<{ listener: (ev: any) => void }>>;
  public SocialEvents = SocialEvents;

  constructor(private readonly config: any, private readonly container: any) {
    const logger = config.logger ?? container.logger ?? emptyLogger;
    this.eventListeners = {
      [SocialEvents.onConnect]: [],
      [SocialEvents.onGameInvite]: [],
      [SocialEvents.onError]: [],
    };
    this.wsClient =
      config.webSocketBuilder?.() ??
      new WebsocketClient({
        logger,
        url: () => this.getFreshUrl(config.apiHost, config.gameId),
      });
    if (!this.wsClient) throw new Error('websocket client is not defined');

    this.on(SocialEvents.onConnect, ({ data }) => {
      for (const f of data.friends) this.friendsStatus.set(f.userId, f);
    });
    this.on(SocialEvents.onConnect, ({ data }) => this.friendsStatus.set(data.userId, data));
    this.wsClient.on(WebsocketEventTypes.open, () => logger.log('connected to social server'));
    this.wsClient.on(WebsocketEventTypes.close, (ev) => logger.debug('websocket client closed', ev));
    this.wsClient.on(WebsocketEventTypes.error, (ev) => logger.error('websocket client error', ev));
    this.wsClient.on(WebsocketEventTypes.message, (ev: MessageEvent) => {
      const msg = JSON.parse(ev.data as string);
      if (Object.values(SocialEvents).includes(msg.type)) this.dispatchEvent(msg.type, msg);
      else logger.error('event type is not supported');
    });
    addSdkStatusChangeListener(container.auth, (loggedIn) => this.onAuthStatusChange(loggedIn));
  }

  private wsClient: WebsocketClient;

  connect(): void {
    const shouldReconnect = this.lastUserId === this.container.auth.getFRVRID();
    const status = this.wsClient.getConnectionStatus();
    if ((status !== WebSocket.OPEN && status !== WebSocket.CONNECTING) || !shouldReconnect) {
      this.lastUserId = this.container.auth.getFRVRID();
      this.wsClient.connect();
    }
  }
  private lastUserId?: string | null;

  close(): void {
    this.friendsStatus.clear();
    this.lastUserId = undefined;
    this.wsClient.close();
  }
  on(event: string, fn: (ev: any) => void): void {
    const l = { listener: fn };
    const list = this.eventListeners[event];
    if (!list) throw new Error(`event type "${event}" is not supported`);
    list.push(l);
  }
  getFriendsStatus(): any[] {
    return Array.from(this.friendsStatus.values());
  }
  sendGameInvite(recipientId: string, lobbyId: string, metadata?: any): void {
    this.send({
      code: 'SEND_GAME_INVITE',
      data: { recipientId, lobbyId, gameId: this.config.gameId, metadata },
    });
  }
  updateStatus(metadata: any): void {
    this.send({ code: 'UPDATE_STATUS', data: { metadata, gameId: this.config.gameId } });
  }
  private dispatchEvent(event: string, msg: any): void {
    this.eventListeners[event].forEach((l) => l.listener(msg));
  }
  private send(msg: any): void {
    this.wsClient.send(JSON.stringify(msg));
  }
  async onAuthStatusChange(loggedIn: boolean): Promise<void> {
    if (loggedIn) {
      const status = this.wsClient.getConnectionStatus();
      if (status === WebSocket.CLOSED || status === WebSocket.CONNECTING) this.connect();
    } else {
      this.close();
    }
  }
  private async getFreshUrl(apiHost: string, gameId: string): Promise<string> {
    const token = await this.container.auth.getFreshAccessToken();
    return `wss://${apiHost}/ws?token=${token}&gameId=${gameId}`;
  }
}

class SocialResponseError extends Error {
  constructor(readonly response: Response) {
    super(response.statusText);
    this.name = 'ResponseError';
  }
}

class SocialHttpClient {
  private readonly baseUrl: string;

  constructor(baseUrl: string, private readonly auth: AuthManager) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
  }

  async getFriends(userId: string): Promise<any[]> {
    const response = await this.auth.authenticatedFetch(`${this.baseUrl}/friends/${userId}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!response.ok) throw new SocialResponseError(response);
    return response.json();
  }

  async addFriend(userId: string, body: unknown): Promise<any> {
    const response = await this.auth.authenticatedFetch(`${this.baseUrl}/friends/${userId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!response.ok) throw new SocialResponseError(response);
    return response.json();
  }

  async removeFriend(userId: string, body: unknown): Promise<void> {
    const response = await this.auth.authenticatedFetch(`${this.baseUrl}/friends/${userId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!response.ok) throw new SocialResponseError(response);
  }

  async syncFriends(userId: string, body: unknown): Promise<any[]> {
    const response = await this.auth.authenticatedFetch(`${this.baseUrl}/friends/${userId}/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!response.ok) throw new SocialResponseError(response);
    return response.json();
  }
}

const emptySocialProvider = {
  shareMessage: async () => {},
  sendUpdate: async () => {},
  canInvite: async () => false,
  invite: async () => {},
  getContextId: async () => '',
  getContextData: async () => ({}),
  getContextPlayers: async () => [],
  getFriends: async () => [],
  getSupportedAPIs: () => [],
};

export class Social {
  private friendsByFRVRID: Record<string, any> = {};
  private friendsByChannelUserId: Record<string, any> = {};
  private providerFriendsCache: Record<string, any> = {};
  readonly API = SocialAPI;
  private readonly auth: AuthManager;
  private readonly gameId: string;
  private readonly provider: any;
  private readonly webClient: SocialHttpClient;
  private readonly websocketClient: SocialWebsocketClient;
  private readonly socialPlatform: any;

  constructor(private readonly config: any, private readonly container: any) {
    this.auth = container.auth;
    this.gameId = config.gameId;
    this.provider = container.provider ?? emptySocialProvider;
    const host =
      config.apiHostOverride ??
      (config.env === Env.PRODUCTION ? 'crucible.frvr.com' : 'staging.crucible.frvr.com');
    const apiHost = `${host}/v1/social`;
    this.webClient = new SocialHttpClient(`https://${apiHost}`, this.auth);
    this.websocketClient = new SocialWebsocketClient({ ...config, apiHost }, container);
    this.socialPlatform = new SocialPlatform({ provider: this.provider });
    if (config.syncFriendsOnLogin ?? true) {
      addSdkStatusChangeListener(this.auth, this.onAuthStatusChange.bind(this));
    }
  }

  get wsClient(): SocialWebsocketClient {
    return this.websocketClient;
  }
  get platform(): any {
    return this.socialPlatform;
  }

  async getFriends(): Promise<any[]> {
    return this.socialPlatform.getFriends();
  }

  async syncFriends(): Promise<any[]> {
    const res: Array<{ id: string; channel: string; name?: string; image?: string }> =
      await this.socialPlatform.getFriends();
    const byChannel = res.reduce((acc: Map<string, string[]>, f: any) => {
      const list = acc.get(f.channel) ?? [];
      list.push(f.id);
      acc.set(f.channel, list);
      return acc;
    }, new Map<string, string[]>());
    const out: any[] = [];
    for (const [channel, ids] of Array.from(byChannel.entries())) {
      const synced = await this.webClient.syncFriends(this.getUserId(), {
        channel,
        gameId: this.gameId,
        friendIds: ids,
      });
      out.push(...synced);
    }
    this.friendsByFRVRID = out.reduce<Record<string, any>>((acc, f) => ((acc[f.userId] = f), acc), {});
    this.friendsByChannelUserId = out.reduce(
      (acc: Record<string, any>, f: any) => ((acc[f.channelUserId] = f), acc),
      {},
    );
    this.providerFriendsCache = res.reduce(
      (acc: Record<string, any>, f) => ((acc[f.id] = f), acc),
      {},
    );
    return out;
  }
  async getFriendsStatus(): Promise<any[]> {
    return this.websocketClient.getFriendsStatus();
  }
  async getAllFriends(): Promise<any[]> {
    return this.webClient.getFriends(this.getUserId());
  }
  async getFriendByFRVRID(frvrId: string): Promise<any> {
    const f = this.friendsByFRVRID[frvrId];
    if (!f) return;
    const p = this.providerFriendsCache[f.channelUserId];
    return { ...f, name: p?.name, image: p?.image };
  }
  async getFriendByChannelId(channelUserId: string): Promise<any> {
    const f = this.friendsByChannelUserId[channelUserId];
    if (!f) return;
    const p = this.providerFriendsCache[channelUserId];
    return { ...f, name: p?.name, image: p?.image };
  }
  async addFriend(friendId: string): Promise<any> {
    return this.webClient.addFriend(this.getUserId(), { friendId });
  }
  async removeFriend(friendId: string): Promise<any> {
    return this.webClient.removeFriend(this.getUserId(), { friendId });
  }
  private getUserId(): string {
    const id = this.container.auth.getFRVRID();
    if (id === null) throw new Error('Player is not logged in');
    return id;
  }
  onAuthStatusChanged(loggedIn: boolean): void {
    if (loggedIn) void this.syncFriends();
  }
  onAuthStatusChange(loggedIn: boolean): void {
    this.onAuthStatusChanged(loggedIn);
  }
  getFriendsStatusForId(id: string): any {
    return this.webClient.getFriends(id);
  }
  shareMessage(data: any): Promise<any> {
    return this.socialPlatform.shareMessage(data);
  }
  sendUpdate(data: any): Promise<any> {
    return this.socialPlatform.sendUpdate(data);
  }
  canInvite(): Promise<boolean> {
    return this.socialPlatform.canInvite();
  }
  invite(data: any): Promise<any> {
    return this.socialPlatform.invite(data);
  }
  getContextId(): Promise<any> {
    return this.socialPlatform.getContextId();
  }
  getContextData(): Promise<any> {
    return this.socialPlatform.getContextData();
  }
  getContextPlayers(): Promise<any> {
    return this.socialPlatform.getContextPlayers();
  }
  getSupportedAPIs(): string[] {
    return this.socialPlatform.getSupportedAPIs();
  }
  isSupportedAPI(api: string): boolean {
    return this.socialPlatform.getSupportedAPIs().indexOf(api) !== -1;
  }
}

class SocialPlatform {
  readonly API = SocialAPI;
  constructor(private readonly config: { provider: any }) {}
  shareMessage(data: any): Promise<any> { return this.config.provider.shareMessage(data); }
  sendUpdate(data: any): Promise<any> { return this.config.provider.sendUpdate(data); }
  canInvite(): Promise<boolean> { return this.config.provider.canInvite(); }
  invite(data: any): Promise<any> { return this.config.provider.invite(data); }
  getFriends(): Promise<any[]> { return this.config.provider.getFriends(); }
  getContextId(): Promise<any> { return this.config.provider.getContextId(); }
  getContextData(): Promise<any> { return this.config.provider.getContextData(); }
  getContextPlayers(): Promise<any> { return this.config.provider.getContextPlayers(); }
  getSupportedAPIs(): string[] { return this.config.provider.getSupportedAPIs(); }
  isSupportedAPI(api: string): boolean { return this.getSupportedAPIs().includes(api); }
}

export class LeaderboardEntry {
  score?: number;
  payload?: unknown;
  updated?: string;
  rank?: number;
  photo?: string;
  id?: string;
  name?: string;
  constructor(data: any) {
    this.id = data.id;
    this.name = data.name;
    this.photo = data.photo;
    this.rank = data.rank;
    if (data.updated) this.updated = data.updated;
    this.score = data.score;
    this.payload = data.payload;
  }
}

export class Tournament {
  id: string;
  contextID?: string;
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
    this.contextID = data.contextID;
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
  private leaderboards: Record<string, { scores: Record<string, number> }> = {};

  constructor(private readonly channel: string) {}

  init(gameId: string, env: Env): void {
    this.apiUrl = {
      [Env.PRODUCTION]: 'https://crucible.frvr.com',
      [Env.BETA]: 'https://staging.crucible.frvr.com',
      [Env.DEVELOPMENT]: 'https://staging.crucible.frvr.com',
    }[env];
    this.gameId = gameId;
    this.leaderboards = {};
  }

  async createLeaderboard(
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
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const json = await res.json();
    if (!res.ok) throw new LeaderboardError(json.error);
    return json.id;
  }

  async getLeaderboard(id: string, count = 30, offset = 0, cachePolicy = ScoreCachePolicy.HIGHEST): Promise<Tournament> {
    const url = `${this.apiUrl}/v1/leaderboards/${this.gameId}/${id}`;
    const res = await fetch(`${url}?${new URLSearchParams({ count: count.toString(), offset: offset.toString() })}`);
    const json = await res.json();
    if (!res.ok) throw new LeaderboardError(json.error);
    json.payload = json.data;
    if (json.players) {
      json.players = json.players.map((p: any) => {
        const entry = new LeaderboardEntry(p);
        entry.score = this.getCachedScore(id, entry.id!, entry.score!, cachePolicy);
        return entry;
      });
    }
    return new Tournament(json);
  }

  async getLeaderboardEntry(id: string, playerId: string, cachePolicy = ScoreCachePolicy.HIGHEST): Promise<LeaderboardEntry> {
    const url = `${this.apiUrl}/v1/leaderboards/${this.gameId}/${id}/${playerId}`;
    const res = await fetch(`${url}?${new URLSearchParams({ platform: this.channel })}`);
    const json = await res.json();
    if (!res.ok) throw new LeaderboardError(json.error);
    json.payload = json.data;
    json.score = this.getCachedScore(id, playerId, json.score, cachePolicy);
    return new LeaderboardEntry(json);
  }

  async submitScore(
    leaderboardId: string,
    playerId: string,
    score: number,
    name?: string,
    photo?: string,
    cachePolicy = ScoreCachePolicy.HIGHEST,
  ): Promise<any> {
    this.applyStatus(leaderboardId, playerId, score, cachePolicy);
    const url = `${this.apiUrl}/v1/leaderboards/${this.gameId}/${leaderboardId}`;
    const body: Record<string, unknown> = {
      id: playerId,
      score,
      platform: this.channel,
      disableSortOrder: cachePolicy === ScoreCachePolicy.LATEST,
    };
    if (name) body.name = name;
    if (photo) body.photo = photo;
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
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
      sortOrder: opts.sortOrder || 'desc',
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

  async getLeaderboardEntries(leaderboardId: string, players: string[], cachePolicy = ScoreCachePolicy.HIGHEST): Promise<LeaderboardEntry[]> {
    if (!players.length) return [];
    const url = `${this.apiUrl}/v1/leaderboards/${this.gameId}/${leaderboardId}/entries`;
    const params = { platform: this.channel, players: players.join(',') };
    const res = await fetch(`${url}?${new URLSearchParams(params)}`);
    const json = await res.json();
    if (!res.ok) throw new LeaderboardError(json.error);
    return (json?.entries || []).map((e: any) => {
      e.payload = e.data;
      e.score = this.getCachedScore(leaderboardId, e.id, e.score, cachePolicy);
      return new LeaderboardEntry(e);
    });
  }

  async getTimelineEntries(opts: { leaderboardId: string; interval: number; minScore: number; maxScore: number; limit?: number; page?: number }): Promise<LeaderboardEntry[]> {
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
    return (json?.entries || []).map((e: any) => new LeaderboardEntry(e));
  }

  private buildScoreCache(id: string): { scores: Record<string, number> } {
    if (!this.leaderboards[id]) this.leaderboards[id] = { scores: {} };
    return this.leaderboards[id];
  }
  private getCachedScore(leaderboardId: string, playerId: string, score: number, policy?: ScoreCachePolicy): number {
    const cache = this.buildScoreCache(leaderboardId);
    const prev = cache.scores[playerId];
    if (!policy) throw new Error('Somehow, we are missing cache policy!');
    switch (policy) {
      case ScoreCachePolicy.HIGHEST:
        score = Math.max(prev ?? 0, score);
        cache.scores[playerId] = score;
        break;
      case ScoreCachePolicy.LATEST:
        score = prev ?? score;
        break;
    }
    return score;
  }
  private applyStatus(leaderboardId: string, playerId: string, score: number, policy?: ScoreCachePolicy): void {
    const cache = this.buildScoreCache(leaderboardId);
    const prev = cache.scores[playerId];
    if (!policy) throw new Error('Somehow, we are missing cache policy!');
    switch (policy) {
      case ScoreCachePolicy.HIGHEST:
        score = Math.max(prev ?? 0, score);
        break;
      case ScoreCachePolicy.LATEST:
    }
    cache.scores[playerId] = score;
  }
}

export class LeaderboardError extends Error {
  constructor(code: string, message?: string) {
    super(message ?? code);
    this.name = 'LeaderboardError';
    this.code = code;
  }
  code: string;
}

export enum TournamentAPI {
  getCurrentTournament = 0,
  getActiveTournaments = 1,
  create = 2,
  getLeaderboardEntry = 3,
  join = 4,
  leave = 5,
  share = 6,
  invitePlayers = 7,
}

export const emptyTournamentsProvider = {
  isSupported: () => false,
  getSupportedAPIs: () => [],
  getLeaderboardsChannelId: () => 'empty',
  getCurrentTournament: async () => null,
  create: async () => null,
  postScore: async () => {},
  share: async () => {},
  getActiveTournaments: async () => [],
  join: async () => {},
  leave: async () => {},
  invitePlayers: async () => {},
};

export class Tournaments {
  constructor(private readonly provider: any) {}

  isSupported(): boolean {
    return this.provider.isSupported();
  }
  isSupportedAPI(api: string): boolean {
    return this.provider.getSupportedAPIs().indexOf(api) !== -1;
  }
  getSupportedAPIs(): string[] {
    return this.provider.getSupportedAPIs();
  }
  getCurrentTournament(): Promise<any> {
    return this.provider.getCurrentTournament();
  }
  getActiveTournaments(): Promise<any[]> {
    return this.provider.getActiveTournaments();
  }
  join(id: string): Promise<any> {
    return this.provider.join(id);
  }
  leave(id: string): Promise<any> {
    return this.provider.leave(id);
  }
  share(id: string, data: unknown): Promise<any> {
    return this.provider.share(id, data);
  }
  invitePlayers(data: unknown): Promise<any> {
    return this.provider.invitePlayers(data);
  }
  updateScore(id: string, score: number, name?: string, photo?: string): Promise<any> {
    return this.provider.updateScore(id, score, name, photo);
  }
}

export class IAPError extends Error {
  code: IAPErrorCode;
  cause?: unknown;
  constructor(message?: string, options?: { cause?: unknown }, code: IAPErrorCode = IAPErrorCode.UNKNOWN) {
    super(message);
    this.code = code;
    if (options && 'cause' in options) this.cause = options.cause;
  }
}
export class IAPPurchaseErrorUnknownProduct extends IAPError {
  constructor(msg: string, opts?: { cause?: unknown }) {
    super(msg, opts, IAPErrorCode.INVALID_PARAM);
  }
}
export class IAPPurchaseErrorCancelledByUser extends IAPError {
  constructor(msg = 'Purchase cancelled by user', opts?: { cause?: unknown }) {
    super(msg, opts, IAPErrorCode.USER_INPUT);
    this.name = 'IAPPurchaseErrorCancelledByUser';
  }
}
export function isPurchaseCancelled(e: unknown): boolean {
  return e instanceof IAPPurchaseErrorCancelledByUser || (e as any)?.name === 'IAPPurchaseErrorCancelledByUser';
}
export class IAPPurchaseErrorAlreadyOwned extends IAPError {
  constructor(msg = 'Purchase already owned', opts?: { cause?: unknown }) {
    super(msg, opts, IAPErrorCode.ALREADY_OWNED);
  }
}
export function isAlreadyOwned(e: unknown): boolean {
  return e instanceof IAPPurchaseErrorAlreadyOwned || (e as any)?.code === IAPErrorCode.ALREADY_OWNED;
}
export class IAPPurchaseErrorInProgress extends IAPError {
  constructor(msg = 'A purchase is already in progress', opts?: { cause?: unknown }) {
    super(msg, opts, IAPErrorCode.IN_PROGRESS);
    this.name = 'IAPPurchaseErrorInProgress';
  }
}
export class IAPPurchaseErrorHeldByEconomy extends IAPError {
  maybePaid = true;
  constructor(msg = 'Purchase held by the economy until it is granted', opts?: { cause?: unknown }) {
    super(msg, opts, IAPErrorCode.HELD_BY_ECONOMY);
    this.name = 'IAPPurchaseErrorHeldByEconomy';
  }
}
export class IAPPurchaseErrorPopupBlocked extends IAPError {
  constructor(msg = 'The payment window was blocked by the browser', opts?: { cause?: unknown }) {
    super(msg, opts, IAPErrorCode.POPUP_BLOCKED);
    this.name = 'IAPPurchaseErrorPopupBlocked';
  }
}
export function isPopupBlocked(e: unknown): boolean {
  return e instanceof IAPPurchaseErrorPopupBlocked || (e as any)?.name === 'IAPPurchaseErrorPopupBlocked';
}
export class IAPPurchaseErrorPending extends IAPError {
  pending = true;
  constructor(msg = 'Payment received; the purchase is still being confirmed', opts?: { cause?: unknown }) {
    super(msg, opts, IAPErrorCode.PENDING);
    this.name = 'IAPPurchaseErrorPending';
  }
}
export function isPurchasePending(e: unknown): boolean {
  return e instanceof IAPPurchaseErrorPending || (e as any)?.name === 'IAPPurchaseErrorPending';
}

export const emptyIAPProvider = {
  getName: () => 'Empty Provider',
  init: async () => {},
  configure: async () => {},
  isReady: () => false,
  getCatalog: () => ({}),
  getProductById: () => undefined,
  purchase: async () => { throw new Error('no products'); },
  consumePurchase: () => { throw new Error('no products'); },
  getUnconsumedPurchases: async () => [],
  onIsReadyChanged: () => {},
};

interface IAPTracker {
  logRequestPayment(product?: unknown): void;
  logRequestPaymentSuccess(product: unknown, purchase: unknown): void;
  logRequestPaymentError(product: unknown, message: string): void;
  logConsumePurchase(product: unknown, purchase: unknown): void;
  logRestorePurchases(): void;
  logRestorePurchasesSuccess(): void;
  logRestorePurchasesError(message: string): void;
}

export class IAP {
  private providers: any[] = [];
  private selected: any = null;
  private selectionFresh = false;
  private backfill = new Map<string, any>();
  private ready = false;
  private readyWaiters = new Set<() => void>();
  private consumed = new Set<string>();
  private consumedByEconomy = new Set<string>();
  private finishedByEconomy = new Set<string>();
  private consuming = new Map<string, Promise<any>>();
  private managed = new Map<string, { settle: () => void; promise: Promise<void>; released: boolean }>();
  private errors = { IAPError, IAPPurchaseErrorCancelledByUser, IAPPurchaseErrorAlreadyOwned, IAPPurchaseErrorInProgress, IAPPurchaseErrorHeldByEconomy, IAPPurchaseErrorPopupBlocked, IAPPurchaseErrorPending };
  private iapTracker?: IAPTracker;

  constructor(opts: any) {
    if (opts.providers) this.providersThunk = opts.providers;
    else this.adoptProviders([opts.provider || emptyIAPProvider]);
    this.logger = opts.logger || emptyLogger;
    this.ensureLogin = opts.ensureLogin;
    this.iapTracker = opts.iapTracker;
  }
  private providersThunk?: () => Promise<any[]>;
  private logger: Logger;
  private ensureLogin?: () => Promise<{ proceed: boolean; loggedIn: boolean }>;

  adoptProviders(list: any[]): void {
    this.providers = list;
    this.selected = list.length === 1 ? list[0] : null;
    const backfilled = [...this.backfill.values()];
    for (const p of list) {
      p.onIsReadyChanged?.(() => this.emitReady());
      if (backfilled.length > 0) p.addProducts?.(backfilled);
    }
  }
  private getReadyProviders(): any[] {
    return this.providers.filter((p) => p.isReady());
  }
  currentProvider(): any {
    if (this.selected?.isReady()) return this.selected;
    return this.getReadyProviders()[0] ?? this.selected ?? this.providers[0] ?? emptyIAPProvider;
  }
  emitReady(): void {
    const isReady = this.isReady();
    if (isReady) this.readyWaiters.forEach((cb) => cb());
    if (isReady !== this.ready) {
      this.ready = isReady;
      this.onReadyHandler?.(isReady);
    }
  }
  private onReadyHandler?: (ready: boolean) => void;

  async init(): Promise<void> {
    if (this.providersThunk) {
      let list: any[] = [];
      try {
        list = (await this.providersThunk()) ?? [];
      } catch (err) {
        this.logger.error('Economy.purchase: no provider mapping for IAP', err);
      }
      this.adoptProviders(list.length > 0 ? list : [emptyIAPProvider]);
    }
    await Promise.all(
      this.providers.map((p) =>
        Promise.resolve(p.init()).catch((err) => {
          this.logger.error(`IAP provider ${p.getName()} init failed`, err);
        }),
      ),
    );
    this.emitReady();
  }

  async configure(config: any): Promise<void> {
    await Promise.all(this.providers.map((p) => p.configure(config)));
  }

  isReady(): boolean {
    return this.providers.some((p) => p.isReady());
  }
  onReady(cb: (ready: boolean) => void): void {
    this.onReadyHandler = cb;
  }
  emitReadyNow(): void {
    if (this.isReady()) {
      this.ready = true;
      this.onReadyHandler?.(true);
    }
  }
  getProviderName(): string {
    if (this.selected) return this.selected.getName();
    if (this.providers.length === 1) return this.providers[0].getName();
    return 'multi';
  }
  getRegisteredProviders(): Array<{ id: string; displayName: string; ready: boolean }> {
    return this.providers.map((p) => ({
      id: p.getName(),
      displayName: p.getDisplayName?.() ?? p.getName(),
      ready: p.isReady(),
    }));
  }
  backfillProducts(products: any[]): void {
    for (const p of products) this.backfill.set(p.sku, p);
    for (const provider of this.providers) provider.addProducts?.(products);
  }
  async selectProvider(id: string | undefined): Promise<boolean> {
    if (id != null) {
      const p = this.providers.find((x) => x.getName() === id);
      if (p) {
        this.selected = p;
        this.selectionFresh = true;
        return true;
      }
      this.logger.error(`IAP: unknown provider option "${id}"`);
      return false;
    }
    const ready = this.getReadyProviders();
    if (ready.length === 0) {
      this.selectionFresh = !!this.selected;
      return !!this.selected;
    }
    if (ready.length === 1) {
      this.selected = ready[0];
      this.selectionFresh = true;
      return true;
    }
    const chosen = await showProviderSelectPopup({
      providers: ready.map((p) => ({ id: p.getName(), displayName: p.getDisplayName?.() ?? p.getName() })),
    });
    if (chosen != null) {
      this.selected = ready.find((p) => p.getName() === chosen) ?? this.selected;
      this.selectionFresh = !!this.selected;
      return this.selectionFresh;
    }
    return false;
  }

  getProviderCatalog(sku: string): any {
    const p = this.selected ?? (this.providers.length === 1 ? this.providers[0] : null);
    return p?.getProductById?.(sku);
  }
  getCatalog(): Record<string, any> {
    return this.providers.reduce((acc, p) => ({ ...acc, ...(p.getCatalog?.() ?? {}) }), {});
  }
  getProductForSku(sku: string): any {
    return this.getProviderCatalog(sku) ?? this.backfill.get(sku);
  }
  getProductById(sku: string): any {
    return this.getProductForSku(sku);
  }

  async purchase(
    sku: string,
    fields: any = {},
    context: any = {},
    isManaged = false,
  ): Promise<any> {
    await this.requireLogin();
    if (fields.payment_id && context.provider == null && this.providers.some((p) => p.getName() === 'stripe')) {
      context = { ...context, provider: 'stripe' };
    }
    if (context.provider != null) {
      if (!(await this.selectProvider(context.provider))) {
        throw new IAPError(`Unknown payment option "${context.provider}"`);
      }
    } else {
      if (!(this.selectionFresh && this.selected || (await this.selectProvider(undefined)))) {
        throw new IAPPurchaseErrorCancelledByUser();
      }
    }
    this.selectionFresh = false;
    const provider = this.selected ?? this.currentProvider();
    await provider.ensureReady?.().catch(() => {});
    const hasPaymentId = !!fields.payment_id;
    const product = hasPaymentId ? undefined : this.getProductForSku(sku);
    this.iapTracker?.logRequestPayment(product);
    const bypassProduct = !!fields.real || hasPaymentId;
    if (!product && !bypassProduct) throw new IAPPurchaseErrorUnknownProduct(`Unknown product "${sku}"`);
    try {
      const purchase = await provider.purchase(product?.productId ?? sku, fields);
      if (isManaged) this.managePurchase(purchase);
      this.iapTracker?.logRequestPaymentSuccess(product, purchase);
      return purchase;
    } catch (err) {
      const msg = (err as Error).message || String(err);
      this.iapTracker?.logRequestPaymentError(product, msg);
      if (isPurchaseCancelled(err)) {
        this.logger.debug('IAP: purchase cancelled');
        throw err;
      }
      if (isPopupBlocked(err)) {
        this.logger.warn('IAP: purchase window blocked by the browser');
        throw err;
      }
      if (isPurchasePending(err)) {
        this.logger.warn('IAP: payment received, still being confirmed', sku);
        throw err;
      }
      if (isAlreadyOwned(err) && (hasPaymentId || provider.reportsAlreadyOwned)) {
        this.logger.warn(hasPaymentId ? 'IAP: this payment was already completed' : 'IAP: product already owned', sku);
        throw err;
      }
      this.logger.error('Error in purchase: ' + msg, err);
      throw new IAPError('Unexpected purchase error', { cause: err });
    }
  }

  async requireLogin(): Promise<void> {
    if (!this.ensureLogin) return;
    let res = { proceed: false, loggedIn: false };
    try {
      res = await this.ensureLogin();
    } catch (err) {
      this.logger.error('IAP: pre-purchase login failed', err);
    }
    if (!res?.proceed) throw new IAPPurchaseErrorCancelledByUser();
    if (res.loggedIn) await this.waitUntilReady(10000);
  }

  waitUntilReady(timeout = 10000): Promise<void> {
    if (this.isReady()) return Promise.resolve();
    return new Promise((resolve) => {
      const cb = () => {
        clearTimeout(timer);
        this.readyWaiters.delete(cb);
        resolve();
      };
      const timer = setTimeout(cb, timeout);
      this.readyWaiters.add(cb);
    });
  }

  async consumeManagedPurchase(purchase: any): Promise<string> {
    const id = purchaseIdOf(purchase);
    let m = id == null ? undefined : this.managed.get(id);
    while (m && !m.released) {
      await m.promise;
      m = id == null ? undefined : this.managed.get(id);
    }
    if (m?.released) {
      this.logger.warn('IAP: not consuming a purchase economy has not granted; the next launch recovers it', id);
      throw new IAPPurchaseErrorHeldByEconomy();
    }
    if (id != null && !this.consumed.has(id) && !this.consumedByEconomy.has(id)) {
      await this.trackConsumption(id, this.consumeNative(purchase, isConsumable(purchase)));
    }
    return purchase.purchaseId;
  }
  managePurchase(purchase: any): boolean {
    const id = purchaseIdOf(purchase);
    if (id == null || this.consumed.has(id) || this.consuming.has(id)) return false;
    const existing = this.managed.get(id);
    if (existing && !existing.released) return false;
    let settle!: () => void;
    const promise = new Promise<void>((res) => (settle = res));
    this.managed.set(id, { promise, settle, released: false });
    return true;
  }
  async consumePurchase(purchase: any): Promise<string> {
    const id = purchaseIdOf(purchase);
    const shouldFinish = this.isConsumable(purchase) === false;
    try {
      await this.consumeOnce(purchase, shouldFinish);
    } catch (err) {
      this.releasePurchase(purchase);
      throw err;
    }
    if (id != null) {
      (shouldFinish ? this.consumedByEconomy : this.consumed).add(id);
    }
    this.forgetManaged(id);
    return purchase.purchaseId;
  }
  isConsumable(purchase: any): boolean | undefined {
    try {
      return this.providerOf(purchase).isConsumable?.(purchase);
    } catch (err) {
      this.logger.error('[FRVR-Economy] reading the item type failed', err);
    }
  }
  releasePurchase(purchase: any, forget = false): void {
    const id = purchaseIdOf(purchase);
    const m = this.managedOf(id);
    if (m && !m.released) {
      if (forget) this.forgetManaged(id);
      else {
        m.released = true;
        m.settle();
      }
    }
  }
  managedOf(id: string | undefined): any {
    return id != null ? this.managed.get(id) : undefined;
  }
  forgetManaged(id: string | undefined): void {
    if (id == null) return;
    const m = this.managed.get(id);
    if (m) {
      this.managed.delete(id);
      m.settle();
    }
  }
  private consumeOnce(purchase: any, finishNonConsumable = false): Promise<any> {
    const id = purchaseIdOf(purchase);
    if (id == null) return this.consumeNative(purchase, finishNonConsumable);
    if (this.consumed.has(id)) return Promise.resolve();
    return this.consuming.get(id) ?? this.trackConsumption(id, this.consumeNative(purchase, finishNonConsumable));
  }
  private trackConsumption(id: string, promise: Promise<any>): Promise<any> {
    if (id == null) return promise;
    const tracked = promise
      .then(() => this.consumed.add(id))
      .finally(() => {
        if (this.consuming.get(id) === tracked) this.consuming.delete(id);
      });
    this.consuming.set(id, tracked);
    return tracked;
  }
  private async consumeNative(purchase: any, finishNonConsumable = false): Promise<void> {
    const provider = this.providerOf(purchase);
    if (finishNonConsumable && provider.finishNonConsumable) {
      try {
        await provider.finishNonConsumable(purchase);
      } catch (err) {
        throw new IAPError('IAP: isConsumable failed', { cause: err });
      }
    } else {
      this.iapTracker?.logConsumePurchase(this.getProductForSku(purchase.productId), purchase);
      try {
        await provider.consumePurchase(purchase);
      } catch (err) {
        throw new IAPError('IAP: isConsumable failed', { cause: err });
      }
    }
  }
  private providerOf(purchase: any): any {
    const p = this.providers.find((x) => x.getName() === purchase.channelId);
    return p ?? this.selected ?? this.currentProvider();
  }
  getBackendProviderName(purchase: any): { name: string; backendProvider?: string } {
    const p = this.providerOf(purchase);
    return { name: p.getName(), backendProvider: p.getBackendProvider?.() };
  }
  getBackendProvider(): string | undefined {
    const name = this.getProviderName();
    return this.selected?.getBackendProvider?.() ?? RECOVERY_PROVIDER_MAP[name];
  }
  prepareCheckout(fields: any): any {
    return this.selected?.prepareCheckout?.(fields);
  }
  purchaseManaged(sku: string, fields: any): Promise<any> {
    return this.purchase(sku, fields, {}, true);
  }

  getUnconsumedPurchases(): Promise<any[]> {
    return this.getUnconsumedPurchasesUntracked(true);
  }
  getPurchases(): Promise<any[]> {
    return this.getUnconsumedPurchases();
  }
  async getUnconsumedPurchasesUntracked(tracked = false): Promise<any[]> {
    const [unconsumed, recover] = await Promise.all([
      this.unconsumedPurchases(!tracked),
      this.getPurchasesToRecover(tracked),
    ]);
    const known = new Set(unconsumed.map(purchaseIdOf).filter((id) => id != null));
    return [...unconsumed, ...recover.filter((p) => !known.has(purchaseIdOf(p)!))];
  }
  async getPurchasesToRecover(tracked = false): Promise<any[]> {
    const results = await Promise.all(
      this.providers.map((p) =>
        Promise.resolve(p.getPurchasesToRecover?.()).catch((err) => {
          this.logger.error(`IAP provider ${p.getName()} purchases to recover failed`, err);
          return [];
        }),
      ),
    );
    return results.flatMap((r) => r ?? []);
  }

  async unconsumedPurchases(untracked = false): Promise<any[]> {
    if (untracked) this.iapTracker?.logRestorePurchases();
    try {
      const seen = new Set<string>();
      const providers: any[] = [];
      for (const p of this.providers) {
        const name = p.getBackendProvider?.() ?? p.getName();
        if (seen.has(name)) continue;
        seen.add(name);
        providers.push(p);
      }
      const results = await Promise.allSettled(providers.map((p) => p.getUnconsumedPurchases()));
      const failures = results.filter((r: any) => r.status === 'rejected');
      if (failures.length > 0 && failures.length === results.length) throw (failures[0] as any).reason;
      const out = results.flatMap((r: any) => (r.status === 'fulfilled' ? r.value ?? [] : [])).filter((p: any) => !this.consumedByEconomy.has(purchaseIdOf(p)!));
      if (untracked) this.iapTracker?.logRestorePurchasesSuccess();
      return out;
    } catch (err) {
      const msg = (err as Error).message || String(err);
      if (untracked) this.iapTracker?.logRestorePurchasesError(msg);
      this.logger.error('[FRVR-Economy] purchase recovery failed', err);
    }
    return [];
  }

  purchaseWith(purchaseId: string, fields: any = {}): Promise<any> {
    return this.purchase(purchaseId, fields);
  }
  restorePurchases(): Promise<any> {
    const p = this.currentProvider();
    if (p.restorePurchases) {
      this.iapTracker?.logRestorePurchases();
      return p.restorePurchases();
    }
    return this.getUnconsumedPurchases();
  }
}

function purchaseIdOf(purchase: any): string | undefined {
  return purchase?.purchaseId ?? (purchase as any)?.transactionId;
}
function isConsumable(purchase: any): boolean | undefined {
  try {
    return (purchase as any).consumable !== false;
  } catch {
    return true;
  }
}

function showProviderSelectPopup({
  providers,
}: {
  providers: Array<{ id: string; displayName: string }>;
}): Promise<string | null> {
  if (typeof document === 'undefined' || !document.body) return Promise.resolve(null);
  if (providers.length === 1) return Promise.resolve(providers[0].id);
  if (providers.length === 0) return Promise.resolve(null);
  hideProviderSelectPopup();
  const container = document.createElement('div');
  container.innerHTML = PROVIDER_POPUP_HTML;
  const el = container.firstElementChild as HTMLElement;
  document.body.appendChild(el);
  activePopup = el;
  const list = el.querySelector('.frvr-iap-provider-popup-options') as HTMLElement;
  const cancel = el.querySelector('.frvr-iap-provider-popup-cancel') as HTMLElement;
  return new Promise((resolve) => {
    const done = (id: string | null) => {
      pendingCancel = null;
      hideProviderSelectPopup();
      resolve(id);
    };
    pendingCancel = () => resolve(null);
    for (const p of providers) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'frvr-iap-provider-popup-option';
      btn.dataset.providerId = p.id;
      btn.textContent = p.displayName;
      btn.addEventListener('click', () => done(p.id));
      list.appendChild(btn);
    }
    (list.firstElementChild as HTMLElement)?.focus();
    cancel.addEventListener('click', () => done(null));
  });
}
let activePopup: HTMLElement | null = null;
let pendingCancel: (() => void) | null = null;
function hideProviderSelectPopup(): void {
  activePopup?.remove();
  activePopup = null;
  pendingCancel?.();
  pendingCancel = null;
}

const PROVIDER_POPUP_HTML = `
<div id="frvr-iap-provider-popup" class="frvr-iap-provider-popup-container">
    <style>
        @keyframes frvr-iap-provider-popup-pop-in {
          from { opacity: 0; transform: scale(0.8); }
        }
        @media (prefers-reduced-motion: reduce) {
          #frvr-iap-provider-popup, #frvr-iap-provider-popup * {
            animation: none !important;
          }
        }
        .frvr-iap-provider-popup-container {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10006;
            background: rgba(0,0,0,0.6);
        }
        .frvr-iap-provider-popup {
            animation: frvr-iap-provider-popup-pop-in 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
            background: #1A1A2E;
            border: 1px solid #2B2B3D;
            border-radius: 1rem;
            padding: 32px;
            width: 380px;
            max-width: 80%;
            text-align: center;
        }
        .frvr-iap-provider-popup-title {
            margin: 0 0 8px;
            font-size: 24px;
            font-weight: bold;
            color: #FFFFFF;
        }
        .frvr-iap-provider-popup-hint {
            margin: 0 0 16px;
            color: #A0A0B0;
            font-size: 15px;
        }
        .frvr-iap-provider-popup-option {
            width: 100%;
            margin-top: 8px;
            padding: 12px;
            font-size: 16px;
            font-weight: bold;
            color: #FFFFFF;
            background: #12121F;
            border: 1px solid #2B2B3D;
            border-radius: 0.75rem;
            cursor: pointer;
        }
        .frvr-iap-provider-popup-option:hover,
        .frvr-iap-provider-popup-option:focus {
            border-color: #5865F2;
            outline: none;
        }
        .frvr-iap-provider-popup-cancel {
            margin-top: 16px;
            color: #A0A0B0;
            background: none;
            border: none;
            cursor: pointer;
            text-decoration: underline;
        }
    </style>
    <div class="frvr-iap-provider-popup">
        <p class="frvr-iap-provider-popup-title">Choose payment method</p>
        <p class="frvr-iap-provider-popup-hint">How would you like to pay?</p>
        <div class="frvr-iap-provider-popup-options"></div>
        <button class="frvr-iap-provider-popup-cancel" type="button">Cancel</button>
    </div>
</div>
`;

export class EconomyError extends Error {
  code?: string;
  cause?: unknown;
  constructor(message: string, code = EconomyErrorCode.UNKNOWN, cause?: unknown) {
    super(message);
    this.code = code;
    this.cause = cause;
  }
}

export const IAP_API_HOST_PRODUCTION = 'https://crucible.frvr.com/v1/iap';
export const IAP_API_HOST_STAGING = 'https://staging.crucible.frvr.com/v1/iap';

export function resolveIapHost(env: Env, override?: string): string {
  if (override != null) return override;
  return env === Env.PRODUCTION ? IAP_API_HOST_PRODUCTION : IAP_API_HOST_STAGING;
}

const PROVIDER_MAP: Record<string, string> = {
  'ios-iap-provider': 'apple',
  'google-play-iap-provider': 'google',
  'samsung-galaxy-iap-provider': 'samsung_galaxy_store',
  'samsung_instant_play': 'samsung_galaxy_store',
  'fbi-iap-provider': 'facebook',
  'web-xsolla': 'xsolla',
  discord: 'discord',
  microsoft: 'microsoft',
};

const WALLET_MAP: Record<string, string> = {
  'web-google-pay': 'google-pay',
  'web-apple-pay': 'apple-pay',
  'web-card': 'card',
};

const PROVIDERS_WITH_RECOVER = new Set<string>(['web-xsolla', 'stripe']);
const PROVIDERS_WITH_EXTERNAL_REF = new Set<string>([
  'apple',
  'google',
  'facebook',
  'samsung_galaxy_store',
  'discord',
  'microsoft',
]);
const RECOVERY_PROVIDER_MAP: Record<string, string> = {
  'ios-iap-provider': 'apple',
  'google-play-iap-provider': 'google',
  'samsung-galaxy-iap-provider': 'samsung',
  samsung_instant_play: 'samsung',
  samsung_galaxy_store: 'samsung',
  'fbi-iap-provider': 'facebook',
  'web-xsolla': 'xsolla',
  stripe: 'stripe',
  apple: 'apple',
  google: 'google',
  facebook: 'facebook',
  samsung: 'samsung',
  discord: 'discord',
  microsoft: 'microsoft',
};
const REAL_MONEY_RECOVERY_PROVIDERS = new Set([
  'apple',
  'google',
  'facebook',
  'samsung',
  'discord',
  'microsoft',
]);

export class IAPServiceClient {
  private cache = new Map<string, Promise<any>>();
  private walletTransactions: { frvrId: string | null; promise: Promise<any>; at?: number } | null = null;

  constructor(private readonly config: any) {}

  private get auth() {
    return this.config.auth;
  }
  private get channelId() {
    return this.config.channelId;
  }
  private get apiHost(): string {
    return this.config.apiHost ?? resolveIapHost(this.config.env, this.config.hostOverride);
  }
  private get purchaseSource() {
    return this.config.purchaseSource;
  }

  getBaseConfig(): any {
    return {
      environment: this.config.env,
      channelId: this.channelId,
      apiHost: this.apiHost,
      purchaseSource: this.purchaseSource,
    };
  }

  getXsollaProducts(): Promise<any> {
    return this.cachedFetch(this.apiHost + '/xsolla/transactions');
  }
  getXsollaTransaction(id: string): Promise<any> {
    return this.cachedFetch(`${this.apiHost}/xsolla/transactions/${id}`);
  }
  createXsollaPaymentUrl(body: any): Promise<any> {
    return this.postWithAuth(`${this.apiHost}/xsolla/create-payment-url`, {
      sandbox: this.config.env !== Env.PRODUCTION,
      ...body,
    });
  }
  consumeXsollaTransaction(id: string): Promise<any> {
    return this.postWithAuth(`${this.apiHost}/xsolla/transactions/${id}/consume`, {});
  }
  listXsollaTransactions(): Promise<any> {
    return this.cachedFetch(`${this.apiHost}/xsolla/transactions?consumed=false&status=SUCCESS`);
  }
  getWalletTransaction(id: string): Promise<any> {
    return this.cachedFetch(`${this.apiHost}/wallet/transactions/${id}`);
  }
  listWalletTransactions(): Promise<any> {
    return this.cachedFetch(`${this.apiHost}/wallet/transactions?consumed=false&status=SUCCESS`);
  }
  listPaidWalletTransactions(): Promise<any> {
    return this.cachedFetch(`${this.apiHost}/wallet/transactions?status=SUCCESS`);
  }
  createWalletPaymentIntent(body: any): Promise<any> {
    return this.postWithAuth(`${this.apiHost}/wallet/payment-intent/${this.config.gameId}`, body);
  }
  consumeWalletTransaction(id: string): Promise<any> {
    return this.postWithAuth(`${this.apiHost}/wallet/transactions/${id}/consume`, {});
  }
  invalidateWalletTransactions(): void {
    this.walletTransactions = null;
  }
  private async postWithAuth(url: string, body: any): Promise<any> {
    const res = await this.auth.authenticatedFetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(this.withSource(body)),
    });
    return this.validateAndReturnJSON(res);
  }
  private cachedFetch(url: string): Promise<any> {
    let p = this.cache.get(url);
    if (!p) {
      p = fetch(url, { method: 'GET' }).then(this.validateAndReturnJSON).catch(() => {
        this.cache.delete(url);
        throw new Error('Failed to fetch ' + url);
      });
      this.cache.set(url, p);
    }
    return p;
  }
  private withSource(body: any): any {
    if (this.purchaseSource && body && typeof body === 'object' && !Array.isArray(body)) {
      return { ...body, source: this.purchaseSource };
    }
    return body;
  }
  private validateAndReturnJSON(res: Response): Promise<any> {
    if (!res.ok) {
      throw new Error(`IAPServiceClient bad response: ${res.status} ${res.statusText}`);
    }
    return res.json();
  }
  private json = this.validateAndReturnJSON;
}

export class EconomyServiceClient {
  private auth: any;
  private gameId: string;
  private baseUrl: string;
  private iapHost: string;
  private purchaseSource: string;

  constructor({
    auth,
    gameId,
    debugProvider,
    apiUrl,
    channelId,
    env,
    apiHostOverride,
    overrideBackendURL,
    iapHostOverride,
    purchaseSource,
  }: any) {
    this.auth = auth;
    this.gameId = gameId;
    this.baseUrl =
      apiHostOverride ??
      overrideBackendURL ??
      apiUrl ??
      (env === Env.PRODUCTION
        ? 'https://crucible.frvr.com/v1/economy'
        : 'https://staging.crucible.frvr.com/v1/economy');
    this.iapHost = resolveIapHost(env, iapHostOverride);
    this.purchaseSource = purchaseSource;
  }

  myWallets(): Promise<any> {
    const playerId = this.auth.getFRVRID();
    return this.auth
      .authenticatedFetch(
        `${this.baseUrl}/games/${encodeURIComponent(this.gameId)}/players/${encodeURIComponent(playerId)}/wallets`,
        { method: 'GET' },
      )
      .then(this.json);
  }
  getMyWallets(): Promise<any> {
    return this.myWallets();
  }
  defaultWallet(): Promise<any> {
    return this.auth
      .authenticatedFetch(`${this.baseUrl}/games/${encodeURIComponent(this.gameId)}/wallets/default`, { method: 'GET' })
      .then(this.json);
  }
  wallet(id: string): Promise<any> {
    return this.auth
      .authenticatedFetch(`${this.baseUrl}/wallets/${encodeURIComponent(id)}`, { method: 'GET' })
      .then(this.json);
  }
  transactions(walletId: string, opts?: { limit?: number }): Promise<any> {
    const query = opts?.limit ? `?limit=${opts.limit}` : '';
    return this.auth
      .authenticatedFetch(
        `${this.baseUrl}/wallets/${encodeURIComponent(walletId)}/transactions${query}`,
        { method: 'GET' },
      )
      .then(this.json);
  }
  listWalletTransactions(walletId: string, opts?: { limit?: number }): Promise<any> {
    return this.transactions(walletId, opts);
  }
  itemDefinitions(): Promise<any> {
    return this.auth
      .authenticatedFetch(`${this.baseUrl}/games/${encodeURIComponent(this.gameId)}/item-definitions`, { method: 'GET' })
      .then(this.json);
  }
  currencies(): Promise<any> {
    return this.auth
      .authenticatedFetch(`${this.baseUrl}/currencies?game=${encodeURIComponent(this.gameId)}`, { method: 'GET' })
      .then(this.json);
  }
  getShops(): Promise<any[]> {
    return this.auth
      .authenticatedFetch(`${this.baseUrl}/games/${encodeURIComponent(this.gameId)}/shop/displays`, { method: 'GET' })
      .then(this.json);
  }
  getShop(shopfrontId = ''): Promise<any> {
    return this.auth
      .authenticatedFetch(
        `${this.baseUrl}/games/${encodeURIComponent(this.gameId)}/shop/displays/${encodeURIComponent(shopfrontId)}`,
        { method: 'GET' },
      )
      .then(this.json);
  }
  shopProducts(): Promise<any[]> {
    return this.auth
      .authenticatedFetch(`${this.baseUrl}/games/${encodeURIComponent(this.gameId)}/shop/products`, { method: 'GET' })
      .then(this.json);
  }
  allShopProducts(): Promise<any[]> {
    return this.shopProducts();
  }
  shopProduct(id: string): Promise<any> {
    return this.auth
      .authenticatedFetch(
        `${this.baseUrl}/games/${encodeURIComponent(this.gameId)}/shop/products/${encodeURIComponent(id)}`,
        { method: 'GET' },
      )
      .then(this.json);
  }
  getProducts(ids: string[]): Promise<any[]> {
    return Promise.all(ids.map((id) => this.shopProduct(id)));
  }
  private timed<T>(fn: (signal?: AbortSignal) => Promise<T>): Promise<T> {
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : undefined;
    let timer: ReturnType<typeof setTimeout>;
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        controller?.abort();
        reject(new EconomyError('economy request timed out after 15000ms', EconomyErrorCode.NETWORK_ERROR));
      }, 15000);
    });
    return Promise.race([fn(controller?.signal), timeout]).finally(() => clearTimeout(timer));
  }
  private async json(res: Response): Promise<any> {
    if (res.ok) return res.json();
    const text = await res.text();
    let body: any;
    try {
      body = JSON.parse(text);
    } catch {}
    const code = body?.error?.code;
    const msg = body?.message ?? text;
    if (code === EconomyErrorCode.ANONYMOUS_NOT_ALLOWED) throw new EconomyError(msg, EconomyErrorCode.ANONYMOUS_NOT_ALLOWED);
    throw new EconomyError(`economy response error: ${res.status}: ${msg}`, res.status >= 500 ? EconomyErrorCode.SERVER_ERROR : EconomyErrorCode.NETWORK_ERROR, { status: res.status, body: text });
  }

  async resolveProductAndPrice(productRef: string, priceRef: string): Promise<{ product: any; price: any }> {
    let shop = this.cache.get(productRef);
    if (!shop) {
      shop = await this.fetchShop(productRef);
      this.cache.set(String(shop.id), shop);
      this.cache.set(shop.shopfrontId, shop);
      this.cacheShops([shop]);
    }
    const price = shop.prices.find((p: any) => p.shopfrontId === priceRef || String(p.id) === priceRef);
    if (!price) throw new Error(`Economy.purchase: price ${priceRef} not on product ${productRef}`);
    return { product: shop, price };
  }
  private cache = new Map<string, any>();

  async fetchShop(productRef: string): Promise<any> {
    const res = await this.auth.authenticatedFetch(
      `${this.baseUrl}/games/${encodeURIComponent(this.gameId)}/shop/products/${encodeURIComponent(productRef)}`,
      { method: 'GET' },
    );
    if (!res.ok) throw new EconomyError('Failed to fetch shop data: ' + res.status + ' ' + res.statusText, res.status);
    return res.json();
  }
  private cacheShops(shops: any[]): void {
    for (const s of shops) {
      for (const [id, p] of Object.entries(s.products ?? {})) this.cache.set(id, p);
      this.cache.set(s.shopfrontId, s);
    }
  }

  async createShopIntent(body: any): Promise<any> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (body.idempotencyKey) headers['Idempotency-Key'] = body.idempotencyKey;
    return this.timed((signal) =>
      this.auth.authenticatedFetch(`${this.iapHost}/shop/intent/${this.gameId}`, {
        method: 'POST',
        headers,
        signal,
        body: JSON.stringify({
          productRef: body.productRef,
          priceRef: body.priceRef,
          walletId: body.walletId,
          provider: body.provider,
          channelId: body.channelId,
          ...(body.quantity != null ? { quantity: body.quantity } : {}),
          ...(body.wallet ? { wallet: body.wallet } : {}),
          ...(body.checkout ? { checkout: body.checkout } : {}),
          ...(body.checkout && body.returnUrl ? { returnUrl: body.returnUrl } : {}),
          ...(this.purchaseSource ? { source: this.purchaseSource } : {}),
        }),
      }).then(this.json),
    );
  }

  finalizeShopPurchase(body: any): Promise<any> {
    return this.timed((signal) =>
      this.auth.authenticatedFetch(`${this.iapHost}/shop/finalize/${this.gameId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal,
        body: JSON.stringify({
          iapTransactionId: body.iapTransactionId,
          provider: body.provider,
          externalRef: body.externalRef,
          payload: body.payload,
        }),
      }).then(this.json),
    );
  }

  recoverShopPurchase(body: any): Promise<any> {
    const statuses = new Map([
      [200, 'settled'],
      [202, 'pending'],
      [400, 'failed'],
      [404, 'refunded'],
      [409, 'rejected'],
    ]);
    return this.timed((signal) =>
      this.auth.authenticatedFetch(`${this.iapHost}/shop/recover/${this.gameId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal,
        body: JSON.stringify({
          provider: body.provider,
          ...(body.externalRef != null ? { externalRef: body.externalRef } : {}),
          ...(body.iapTransactionId != null ? { iapTransactionId: body.iapTransactionId } : {}),
          ...(body.payload ? { payload: body.payload } : {}),
        }),
      }).then(async (res: Response) => {
        if (!statuses.has(res.status)) return this.json(res);
        const payload = await res.json().catch(() => ({}));
        const mapped = statuses.get(res.status);
        return { ...payload, status: mapped, consume: res.status === 200 && payload.consume === true };
      }),
    );
  }

  getIAPTransaction(id: string): Promise<any> {
    return this.timed((signal) => this.auth.authenticatedFetch(`${this.iapHost}/shop/${this.gameId}/transactions/${id}`, { method: 'GET', signal }).then(this.json));
  }

  applyVirtualPurchase(body: any): Promise<any> {
    const headers: Record<string, string> = {};
    if (body.idempotencyKey) headers['Idempotency-Key'] = body.idempotencyKey;
    return this.timed((signal) =>
      this.auth.authenticatedFetch(`${this.iapHost}/shop/${this.gameId}/consume/virtual`, {
        method: 'POST',
        headers,
        signal,
        body: JSON.stringify({
          productRef: body.productRef,
          priceRef: body.priceRef,
          walletId: body.walletId,
          ...(body.quantity != null ? { quantity: body.quantity } : {}),
          ...(this.purchaseSource ? { source: this.purchaseSource } : {}),
        }),
      }).then(this.json),
    );
  }

  playerId(): string {
    return this.auth.getFRVRID();
  }
  getGameId(): string {
    return this.gameId;
  }
  isAnonymous(): boolean {
    return this.auth.getCurrentPlatform() === Platform.ANONYMOUS;
  }
}

export class FRVRSDK {
  private channel?: any;
  private logger?: Logger;
  config: any = { init: async () => {} };
  private localStorage!: Storage;
  private sdkLocalStorage!: Storage;
  private bootstrapper: any;
  private tracker!: TrackerImpl;
  private consentProvider!: ConsentProvider;
  private ads: AdsManager | undefined;
  private notifications!: Notifications;
  private auth!: AuthManager;
  private iap!: IAP;
  private iapServiceClient!: IAPServiceClient;
  private economy!: Economy;
  private features!: Features;
  private social!: Social;
  private liveRoom!: LiveRoom;
  private tournaments!: Tournaments;
  private challenges!: Challenges;
  private leaderboards!: Leaderboards;
  private profile: any;
  private navigation: any;
  private audio: any;
  private shop!: Shop;
  cloud?: CloudStorage;
  private score: any;
  private shield = new ShieldOverlay();
  private adsConfig: any;
  private initPromise?: Promise<void>;
  private lifecycle: RefcountedLifecycle;
  private lifecycleEvents: any = { ...defaultLifecycle };
  private postCompleteHook?: () => void;
  private postCompleteHookCalled = false;
  private completionPromise = new Deferred<void>();

  constructor() {
    this.lifecycle = new RefcountedLifecycle({
      onSuspend: () => this.lifecycleEvents.onSuspend(),
      onResume: () => this.lifecycleEvents.onResume(),
      onAudioSuspend: () => this.lifecycleEvents.onAudioSuspend(),
      onAudioResume: () => this.lifecycleEvents.onAudioResume(),
      onShow: () => this.lifecycleEvents.onShow?.(),
      onHide: () => this.lifecycleEvents.onHide?.(),
      onGamePause: () => this.lifecycleEvents.onGamePause?.(),
    });
  }

  setChannel(channel: any): void {
    if (this.channel) {
      if (this.initPromise) {
        this.logger?.error('[FRVR-SDK] channel cannot be set after init');
        return;
      }
      this.logger?.warn('[FRVR-SDK] setting channel multiple times');
    }
    this.channel = channel;
  }

  getId(): string {
    return this.channel?.getId?.() ?? this.channel?.getChannelId?.() ?? '';
  }

  init(env: Env = Env.PRODUCTION): Promise<void> {
    if (this.initPromise) return this.initPromise;
    if (!this.channel) {
      return Promise.reject(new Error('[FRVR-SDK] no channel has been configured'));
    }
    const requestedEnv = env;
    env = resolveEnv(requestedEnv, env);
    if (env !== Env.PRODUCTION) {
      console.warn(
        `%c[FRVR-SDK] Environment: ${env} (Running in non production environment)`,
        'color:white;background:red;',
      );
    }
    this.logger = this.logger ?? emptyLogger;
    (this.channel as any).setEnv?.(env);
    this.channel?.setConfig?.(this.config);
    this.buildComponents(env);
    const initPromise = Promise.resolve()
      .then(() => this.config.init?.())
      .then(() => this.auth.init())
      .then(() => this.initTracker())
      .then(() => this.postInit(env));
    this.initPromise = initPromise;
    return initPromise;
  }

  private buildComponents(env: Env): void {
    this.logger!.debug('[FRVR-SDK] building components');
    this.bootstrapper =
      this.channel.getBootstrapper?.() ?? new ChannelWebBootstrapper(this.logger!);
    if (!this.localStorage) {
      const base = this.channel.getLocalStorageProvider(this.config.storage);
      this.localStorage = new Storage(base, this.logger);
      const cloud = this.channel.getGameLocalStorageProvider?.(base);
      this.localStorage = cloud && cloud !== base ? new Storage(cloud, this.logger) : this.localStorage;
    }
    this.auth = this.auth ?? new AuthManager({
      providers: this.channel.getAuthProviders(this.config.gameId, this.config.auth),
      storage: this.localStorage,
      env,
      config: this.config.auth,
      logger: this.logger,
    });
    this.channel.onModulesUpdated?.({
      logger: this.logger!,
      auth: this.auth,
    });
    this.consentProvider = this.channel.getConsentProvider();
    const analyticsProviders = this.channel.getAnalyticsProviders(this.config.analytics ?? {}, env);
    this.tracker = this.tracker ?? new TrackerImpl({
      storage: this.localStorage,
      logger: this.logger,
      analyticsProviders,
      idProvider: this.channel.getAnalyticsIDProvider(this.localStorage),
      consentProvider: this.consentProvider,
      appContextFields: {
        context: this.config.tracker?.gameId || this.config.gameId,
        app_version: this.config.tracker?.appVersion,
        app_build: this.config.tracker?.appBuild,
      },
    });
    this.channel.onModulesUpdated?.({
      logger: this.logger!,
      tracker: this.tracker,
      auth: this.auth,
    });
    this.ads = this.ads ?? new AdsManager({
      env,
      logger: this.logger,
      storage: this.localStorage,
      tracker: this.tracker,
      controls: this.lifecycle,
      onBeforeInit: () => this.configAds(env),
    });
    for (const provider of this.channel.getAdsProviders(this.config.ads ?? {})) {
      this.ads.registerProvider(provider);
    }
    this.notifications = this.notifications ?? new Notifications({ logger: this.logger, provider: this.channel.getNotificationsProvider(), tracker: this.tracker });
    this.audio = this.audio ?? this.channel.getAudioStateProvider();
    this.iapServiceClient = this.iapServiceClient ?? new IAPServiceClient({
      auth: this.auth,
      channelId: this.channel.getId(),
      env,
      hostOverride: this.config.iap?.hostOverride,
      purchaseSource: this.purchaseSource,
    });
    this.iap = this.iap ?? new IAP({
      logger: this.logger,
      providers: () =>
        this.channel.getIAPProviders?.(this.config.iap, this.iapServiceClient, this.auth) ?? [],
    });
    this.economy = this.economy ?? new Economy({
      client: new EconomyServiceClient({
        env,
        auth: this.auth,
        gameId: this.config.gameId,
        apiHostOverride: this.config.economy?.overrideBackendURL,
        iapHostOverride: this.config.iap?.hostOverride,
        purchaseSource: this.purchaseSource,
      }),
      iap: this.iap,
      channelId: this.channel.getId(),
      ensureLogin: this.ensureLogin(),
      logger: this.logger,
      storage: this.localStorage,
    });
    this.features = this.features ?? new Features({
      logger: this.logger,
      auth: this.auth,
      tracker: this.tracker,
      localStorage: this.localStorage,
      remoteABTests: new ABTests(this.tracker),
      config: { ...(this.config.features ?? {}), gameId: this.config.features?.gameId ?? this.config.gameId },
      channelId: this.channel.getId(),
      env,
    });
    this.social = this.social ?? new Social(
      { env, ...this.config.social, gameId: this.config.social?.gameId ?? this.config.gameId },
      { logger: this.logger, provider: this.channel.getSocialProvider(), auth: this.auth },
    );
    this.liveRoom = this.liveRoom ?? new LiveRoom({
      logger: this.logger,
      provider: this.channel.getLiveRoomProvider(),
      auth: this.auth,
    });
    this.tournaments = this.tournaments ?? new Tournaments({
      logger: this.logger,
      provider: this.channel.getTournamentsProvider(),
      auth: this.auth,
    });
    this.challenges = new Challenges({ logger: this.logger, provider: this.channel.getChallengesProvider() });
    this.leaderboards = new Leaderboards({ provider: this.channel.getLeaderboardsProvider() });
    this.profile = this.profile ?? this.channel.getProfile();
    this.navigation = this.navigation ?? this.channel.getNavigationProvider();
    this.audio = this.audio ?? this.channel.getAudioStateProvider();
    this.shield.setup(!!this.config.shield, this.logger);
  }

  private ensureLogin(): (() => Promise<{ proceed: boolean; loggedIn: boolean }>) | undefined {
    const ch = this.channel;
    if (ch?.requestPurchaseLogin) {
      return async () => {
        const prevId = this.auth?.getFRVRID?.() ?? null;
        const proceed = await ch.requestPurchaseLogin();
        const newId = this.auth?.getFRVRID?.() ?? null;
        return { proceed, loggedIn: proceed && newId !== prevId };
      };
    }
    return undefined;
  }

  private async initTracker(): Promise<void> {
    await this.tracker.init();
    if (!(this.channel.getSkippedAnalyticsEvents?.()?.includes?.('page_loading'))) {
      this.tracker.logEvent('page_loading', {});
    }
  }

  private async postInit(env: Env): Promise<void> {
    this.logger!.debug('[FRVR-SDK] post init');
    this.addDefaultWebListeners(env);
    await Promise.all([this.ads!.init(), this.features.init()]);
    if (this.config.gameId) await this.notifications.configure({ game: this.config.gameId });
    await this.notifications.init();
    if (this.ads!.needsConfiguration()) {
      this.config.ads ? this.ads!.setConfig(this.config.ads) : this.logger!.error('[FRVR-SDK] Missing game\'s name in configuration');
    }
    await Promise.all([
      (async () => {
        let cloud;
        try {
          cloud = await this.channel.getCloudStorageProvider(this.config.cloudStorage, env);
        } catch (err) {
          this.logger!.error('[FRVR-SDK] error initialising cloud storage', err);
        }
        if (!cloud) this.logger!.warn('[FRVR-SDK] no cloud storage provider available, falling back to prefixed local storage solution');
        this.cloud = new CloudStorage({
          provider: cloud ?? new PrefixedStorageProvider('frvr-sdk-', this.channel.getLocalStorageProvider(this.config.storage)),
          logger: this.logger,
        });
      })(),
      (async () => {
        await this.iap.init();
        await this.iap.configure(this.config.iap);
      })(),
      this.challenges.init(this.config.gameId, this.channel, env),
      this.leaderboards.init(this.config.gameId, env),
    ]);
    this.startPurchaseRecovery();
  }

  private async configAds(env: Env): Promise<void> {
    this.logger!.debug('[FRVR-SDK] configuring ads');
    const cfg = await this.channel.getAdsConfig(this.config.ads);
    if (cfg) this.config.ads = { ...cfg };
    if (this.ads!.needsConfiguration()) this.ads!.setConfig(this.config.ads ?? DEFAULT_ADS_CONFIG);
  }

  addDefaultWebListeners(env: Env): void {
    if (this.channelCharacteristics?.usesPlatformLifecycle) return;
    if (typeof window !== 'undefined') addSuspendResumeWebListeners(this.lifecycle);
    if (env !== Env.DEVELOPMENT) addGamePauseWebListeners(this.lifecycle);
  }

  complete(): Promise<void> {
    return this.bootstrapper.complete();
  }

  private startPurchaseRecovery(): void {
    const recover = () => {
      if (this.auth.isLoggedIn()) {
        this.economy.runRecovery().catch((err) => this.logger!.warn('[FRVR-SDK] purchase recovery failed', err));
      }
    };
    let lastId: string | null = this.auth.isLoggedIn() ? this.auth.getFRVRID() : null;
    addSdkStatusChangeListener(this.auth, (loggedIn: boolean) => {
      if (loggedIn) recover();
      const id = loggedIn ? this.auth.getFRVRID() : null;
      if (id && id !== lastId) this.economy.runRecovery();
      lastId = id;
    });
    recover();
  }

  getUserSource(): string {
    return this.tracker.getUserSource();
  }

  getChannelCharacteristics(): any {
    return this.channelCharacteristics;
  }

  get channelCharacteristics(): any {
    return this.channel?.getCharacteristics?.() ?? {};
  }

  get adsManager(): AdsManager {
    return this.ads!;
  }

  private get purchaseSource(): string | undefined {
    try {
      const source = new URLSearchParams(window.location.search).get('utm_source')?.trim();
      if (source) {
        window.localStorage?.setItem('frvr.purchase.source', source);
        return source;
      }
      return window.localStorage?.getItem('frvr.purchase.source') ?? undefined;
    } catch {
      return undefined;
    }
  }
}

export class AdsManager {
  private providers: Record<string, any> = {};
  private registeredProviders: any[] = [];
  private adShownCount: Record<AdType, number> = {
    [AdType.INTERSTITIAL]: 0,
    [AdType.REWARD]: 0,
    [AdType.BANNER]: 0,
    [AdType.SURVEY]: 0,
    [AdType.REWARDED_INTERSTITIAL]: 0,
  };
  private adShownListeners: Array<(type: AdType, counts: Record<AdType, number>, code: string) => void> = [];
  private throttlerState = { initTime: Date.now(), isFirstAd: true, isFirstAdEver: false, lastShownAd: 0 };
  private throttleFirstAdStorage = '__ads_firstTimeView';
  private throttler: AdsThrottler;

  constructor(private config: any) {
    this.throttler = config.throttler || new AdsThrottler();
    this.storage = config.storage || defaultStorage;
    this.tracker = config.tracker || emptyTracker;
    this.controls = config.controls || defaultLifecycle;
    this.onBeforeInit = config.onBeforeInit || (() => Promise.resolve());
  }
  private storage: Storage;
  private tracker: Tracker;
  private controls: any;
  private onBeforeInit: () => Promise<void>;

  registerProvider(provider: AdProvider): void {
    const key = provider.getName() + '#' + provider.getType();
    this.providers[key] = provider;
  }
  setConfig(config: any): void {
    this.config = config;
  }

  needsConfiguration(): boolean {
    return !Array.isArray(this.config.providers);
  }

  async init(): Promise<void> {
    await this.onBeforeInit?.();
    this.throttlerState.isFirstAdEver = Boolean(await this.storage.getItem(this.throttleFirstAdStorage, true));
    this.logger?.debug('[ads] first time ever?', this.throttlerState.isFirstAdEver);
    this.throttler.init(this.config.throttling ?? {});
    const configs = [...(this.config.providers ?? [])].sort((a, b) => a.priority - b.priority);
    const promises = configs
      .map((p) => ({ provider: this.providers[p.name + '#' + p.type], providerConfig: p, key: p.name + '#' + p.type }))
      .filter(({ provider }) => provider)
      .map(async ({ provider, providerConfig, key }) => {
        const tracker = new AdTrackerImpl(this.tracker, { adType: provider.getType(), provider: provider.getName() });
        await provider.init(providerConfig, this.controls, tracker).then(() => provider);
        return provider;
      });
    this.registeredProviders = (await Promise.all(promises)).filter((p) => p !== undefined);
  }

  getProviders(): any[] {
    return this.registeredProviders;
  }
  getProvidersByType(type: AdType): any[] {
    return this.registeredProviders.filter((p) => p.getType() === type);
  }
  hasProviders(type: AdType): boolean {
    return this.getProvidersByType(type).length > 0;
  }
  isProviderReady(type: AdType): boolean {
    if (this.getProvidersByType(type).find((p) => p.isReady()) === undefined) return false;
    if (AdTypeProperties[type].throttleable) {
      if (this.throttler.mustThrottle(this.throttlerState)) return false;
    }
    return true;
  }
  async show(type: AdType): Promise<AdShowResult> {
    const throttleable = AdTypeProperties[type].throttleable;
    if (throttleable) {
      const throttle = this.throttler.mustThrottle(this.throttlerState);
      if (throttle) {
        this.logger?.debug('[ads] Ad was throttled, reason =', throttle);
        return Promise.resolve(AdShowResult.NOT_DISPLAYED);
      }
    }
    const providers = this.getProvidersByType(type);
    if (providers.length === 0) this.logger?.error('[ads] no providers for', type);
    let suspended = false;
    const code = await firstSuccess(providers, async (provider) => {
      try {
        if (!provider.isReady()) {
          this.logger?.warn('[ads] Ad provider', provider.getName(), 'not ready');
          return;
        }
        if (!suspended && AdTypeProperties[type].stopsGameFlow && !provider.isAdActive()) {
          if (this.controls instanceof RefcountedLifecycle) {
            this.controls.gameSuspend(LifecycleSuspendReason.AD);
            this.controls.audioSuspend(LifecycleSuspendReason.AD);
          } else {
            this.controls.onSuspend();
            this.controls.onAudioSuspend();
          }
          suspended = true;
        }
        this.logger?.debug('[ads] showing', provider.getName(), 'of type', type);
        const res = await provider.show();
        if (res.success === false) {
          this.logger?.error('[ads] show error', res.message);
          this.trackAdError(provider, type, res);
        }
        return res.success ? res.code : undefined;
      } catch (err) {
        this.logger?.error('[ads] hide error', err);
      }
    });
    if (suspended) {
      if (this.controls instanceof RefcountedLifecycle) {
        this.controls.audioResume(LifecycleSuspendReason.AD);
        this.controls.gameResume(LifecycleSuspendReason.AD);
      } else {
        this.controls.onAudioResume();
        this.controls.onResume();
      }
    }
    if (code !== undefined) {
      if (throttleable) {
        this.throttlerState = this.throttler.notifyAdShown(this.throttlerState);
        await this.storage.setItem(this.throttleFirstAdStorage, false);
      }
      this.adShownCount[type] = (this.adShownCount[type] || 0) + 1;
      this.notifyAdShown(type, code);
      return code === AdSuccess.COMPLETED ? AdShowResult.COMPLETED : AdShowResult.DELIVERED;
    }
    return AdShowResult.NOT_DISPLAYED;
  }

  private trackAdError(provider: any, type: AdType, res: any): void {
    this.tracker.logEvent('error', { msg: res.message + ' in: ' + JSON.stringify({ provider: provider.getName(), type, code: res.code }), line: 0, col: 0, label: JSON.stringify({ provider: provider.getName(), type, code: res.code }) }, ConsentOptions.None);
  }
  onAdShown(listener: (type: AdType, counts: Record<AdType, number>, code: string) => void): () => void {
    this.adShownListeners.push(listener);
    return () => {
      const i = this.adShownListeners.indexOf(listener);
      if (i >= 0) this.adShownListeners.splice(i, 1);
    };
  }
  private notifyAdShown(type: AdType, code: string): void {
    this.adShownListeners.forEach((l) => l(type, this.adShownCount, code));
  }
  getAdShownCount(): Record<AdType, number> {
    return this.adShownCount;
  }
  private logger = emptyLogger;
}

async function firstSuccess<T>(
  items: any[],
  fn: (item: any) => Promise<T | undefined>,
): Promise<T | undefined> {
  const tryOne = (i: number): Promise<T | undefined> => {
    if (i >= items.length) return Promise.resolve(undefined);
    return Promise.resolve(fn(items[i])).then((res) => (res === undefined ? tryOne(i + 1) : res));
  };
  return tryOne(0);
}

export class Notifications {
  private initialized = false;
  constructor(private readonly config: any) {
    this.provider = config.provider ?? emptyNotificationsProvider;
  }
  async init(): Promise<void> {
    if (this.initialized) {
      this.logger?.error('Notifications class should be configured before it is initialized');
    } else {
      this.initialized = true;
      await this.provider.init?.();
    }
  }
  async configure(cfg: any): Promise<void> {
    await this.provider.configure?.(cfg);
  }
  private get logger() {
    return this.config.logger;
  }
  private provider: any;
  private get tracker() {
    return this.config.tracker;
  }
  getProviderId(): string {
    return this.provider?.getId?.() ?? '';
  }
  subscribeScheduleMessages(): Promise<boolean> {
    this.tracker.logEvent('bot_subscribe_show', {});
    return this.provider
      .subscribeScheduleMessages()
      .then((ok: boolean) => {
        if (ok) this.tracker.logEvent('bot_subscribe_success', {});
        else this.tracker.logEvent('bot_subscribe_failure', {});
        return ok;
      })
      .catch(() => {
        this.tracker.logEvent('bot_subscribe_failure', {});
        return false;
      });
  }
  scheduleMessage(title: string, description: string, type: number, minDelay: number): Promise<any> {
    return this.provider.scheduleMessage(title, description, type, minDelay);
  }
}

export const emptyNotificationsProvider = {
  getName: () => '',
  canScheduleMessages: async () => false,
  subscribeScheduleMessages: async () => false,
  scheduleLocalNotification: () => Promise.reject(new Error('no schedule support')),
};

export enum ChallengesAPI {
  getCurrentChallengeData = 0,
  getCurrentChallengeId = 1,
  getPossibleOpponents = 2,
  getLeaderboard = 3,
  join = 4,
  leave = 5,
  share = 6,
  invitePlayers = 7,
}

export const emptyChallengesProvider = {
  platform: {
    API: ChallengesAPI,
    getSupportedAPIs: () => [],
    isSupportedAPI: () => false,
    getID: () => '',
    getType: () => 'context.getType',
    isSizeBetween: () => ({ answer: false, minSize: 0, maxSize: 0 }),
    switch: () => Promise.resolve(),
    choose: () => Promise.resolve(),
    create: () => Promise.resolve(),
    getPlayers: () => Promise.resolve([]),
    update: () => Promise.resolve(),
  },
  init: async () => {},
  create: async () => '',
  challengeByPlayerId: async () => '',
  getPossibleOpponents: async () => [],
  challengeByContextId: async () => '',
  getCurrentChallengeData: async () => {},
  leave: async () => {},
  getCurrentChallengeId: () => '',
  getPlayerEntries: async () => [],
  getAllChallenges: async () => {},
  getLeaderboardEntry: async () => {},
  getLeaderboardById: async () => {},
  postScore: async () => {},
  join: async () => {},
  nudge: async () => {},
  getOpponentsFromChallenges: async () => {},
  getChallengesByOpponents: async () => {},
  getEntryPayload: () => ({}),
  isSupported: () => false,
};

export class Challenges {
  constructor(private readonly config: any) {
    this.provider = config.provider;
  }
  private provider: any;
  init(gameId: string, env: Env, container: any): Promise<void> {
    return this.provider.init?.(gameId, env, container);
  }
  isSupported(): boolean {
    return this.provider.isSupported?.() ?? false;
  }
}

export const emptyLiveRoomProvider = {
  getId: () => '',
  isInRoom: async () => false,
  getRoomData: async () => ({}),
  getRoomId: async () => '',
  getPlayers: async () => [],
  getSupportedAPIs: () => [],
  isSupportedAPI: () => false,
};

export class LiveRoom {
  constructor(private readonly config: any) {
    this.provider = config.provider ?? emptyLiveRoomProvider;
  }
  private provider: any;
  isInRoom(): any {
    return this.provider.isInRoom();
  }
  getRoomId(): any {
    return this.provider.getRoomId();
  }
  getRoomData(): any {
    return this.provider.getRoomData();
  }
  getPlayers(): any {
    return this.provider.getPlayers();
  }
  getSupportedAPIs(): string[] {
    return this.provider.getSupportedAPIs();
  }
  isSupportedAPI(api: string): boolean {
    return this.provider.isSupportedAPI(api);
  }
}

export class Leaderboards {
  constructor(private readonly config: any) {
    this.provider = config.provider ?? emptyLeaderboardProvider;
  }
  private provider: any;
  isSupported(): boolean {
    return this.provider.isSupported?.() ?? false;
  }
  async init(gameId: string, env: Env): Promise<void> {
    return this.provider.init?.(gameId, env);
  }
  getLeaderboardEntries(id: string, players: string[], policy: ScoreCachePolicy): Promise<LeaderboardEntry[]> {
    return this.provider.getLeaderboardEntries(id, players, policy);
  }
  getLeaderboardEntry(id: string, playerId: string, policy: ScoreCachePolicy): Promise<LeaderboardEntry> {
    return this.provider.getLeaderboardEntry(id, playerId, policy);
  }
  getLeaderboard(id: string, count: number, offset: number, policy: ScoreCachePolicy): Promise<Tournament> {
    return this.provider.getLeaderboard(id, count, offset, policy);
  }
  postScore(id: string, score: number, extra?: unknown): Promise<any> {
    return this.provider.postScore(id, score, extra);
  }
  create(id: string | undefined, opts: any): Promise<string> {
    return this.provider.create(id, opts);
  }
  getTimelineEntries(opts: any): Promise<LeaderboardEntry[]> {
    return this.provider.getTimelineEntries(opts);
  }
}

export const emptyLeaderboardProvider = {
  init() {},
  isSupported: () => false,
  getLeaderboardEntries: async () => [],
  getLeaderboardEntry: async () => ({}) as any,
  getLeaderboard: async () => ({}) as any,
  postScore: async () => {},
  create: async () => '',
  getTimelineEntries: async () => [],
};

export class Economy {
  constructor(private readonly config: any) {
    this.client = config.client;
    this.iap = config.iap;
    this.channelId = config.channelId;
    this.ensureLogin = config.ensureLogin;
    this.logger = config.logger ?? emptyLogger;
    this.storage = config.storage;
    this.iapTracker = config.iapTracker ?? { logRequestPayment: () => {}, logRequestPaymentSuccess: () => {}, logRequestPaymentError: () => {}, logConsumePurchase: () => {}, logRestorePurchases: () => {}, logRestorePurchasesSuccess: () => {}, logRestorePurchasesError: () => {} };
    this.shopCache = new Map();
    this.recoveredListeners = [];
    this.recoveryAttempts = new Set();
  }
  private shopCache: Map<string, any>;
  private recoveredListeners: Array<(result: any, purchase: any) => void>;
  private recoveryAttempts: Set<string>;
  private client: EconomyServiceClient;
  private iap: IAP;
  private channelId: string;
  private ensureLogin?: () => Promise<{ proceed: boolean; loggedIn: boolean }>;
  private logger: Logger;
  private storage: Storage;
  private iapTracker: any;
  private recoveringPromise?: Promise<any[]>;
  private grantedListeners: Array<[any, any]> = [];
  private recovered: Array<[any, any]> = [];

  async init(): Promise<void> {
    this.logger.log('[FRVR-Economy] init');
  }
  async getMyWallets(): Promise<any> {
    return this.client.getMyWallets();
  }
  async defaultWallet(): Promise<any> {
    return this.client.defaultWallet();
  }
  async wallet(id: string): Promise<any> {
    return this.client.wallet(id);
  }
  listWalletTransactions(walletId: string, opts: any): Promise<any> {
    return this.client.listWalletTransactions(walletId, opts);
  }
  itemDefinitions(): Promise<any> {
    return this.client.itemDefinitions();
  }
  allShopProducts(): Promise<any[]> {
    return this.client.allShopProducts();
  }
  async getShop(shopfrontId = ''): Promise<any> {
    let shop = await this.client.getShop(shopfrontId);
    if (!shop) return emptyShop;
    this.cacheShop(shop);
    return this.pruneShop(shop) ?? { ...shop, tree: [], products: {} };
  }
  async getProducts(ids: string[]): Promise<any[]> {
    if (!ids.length) return [];
    return this.client.getProducts(ids);
  }
  private cacheShop(shop: any): void {
    this.shopCache.set(String(shop.id), shop);
    if (shop.shopfrontId) this.shopCache.set(shop.shopfrontId, shop);
    for (const [id, product] of Object.entries(shop.products ?? {})) {
      this.shopCache.set(id, product);
    }
  }
  private pruneShop(shop: any): any | null {
    const activeProduct = (product: any) => {
      const prices = (product.prices ?? []).filter((price: any) => !price.deletedAt);
      return prices.length ? { ...product, prices } : null;
    };
    const products: Record<string, any> = {};
    const pruneTree = (nodes: any[]): any[] => {
      const result: any[] = [];
      for (const node of nodes) {
        if (node.type === 'product') {
          if (node.productId == null) continue;
          const id = String(node.productId);
          const product = shop.products?.[id];
          if (!product) continue;
          const pruned = activeProduct(product);
          if (!pruned) continue;
          products[id] = pruned;
          result.push(node);
          continue;
        }
        const children = pruneTree(node.children ?? []);
        if (children.length) result.push({ ...node, children });
      }
      return result;
    };
    const tree = pruneTree(shop.tree ?? []);
    return tree.length ? { ...shop, tree, products } : null;
  }
  async purchase(args: {
    productRef: string;
    priceRef: string;
    walletId: string;
    quantity?: number;
    idempotencyKey?: string;
    provider?: string;
    meta?: Record<string, any>;
  }): Promise<any> {
    if (!args.walletId) throw new Error('Economy.purchase: walletId required');
    const { productRef, priceRef, walletId, quantity, idempotencyKey } = args;
    const { price } = await this.client.resolveProductAndPrice(productRef, priceRef);
    if (price.kind === 'virtual') {
      return this.client.applyVirtualPurchase({ productRef, priceRef, walletId, quantity, idempotencyKey });
    }
    if (price.kind !== 'real') throw new Error(`Economy.purchase: unsupported price kind ${price.kind}`);

    let effectiveWalletId = walletId;
    if (this.ensureLogin) {
      const oldPlayerId = this.client.playerId();
      let loginResult: { proceed?: boolean; loggedIn?: boolean } | undefined;
      try {
        loginResult = await this.ensureLogin();
      } catch (err) {
        this.logger.error('[FRVR-Economy] pre-purchase login failed', err);
      }
      if (!loginResult?.proceed) {
        throw new EconomyError('purchase cancelled', EconomyErrorCode.PURCHASE_CANCELLED);
      }
      if (loginResult.loggedIn) await this.iap?.waitUntilReady?.(10000);
      if (loginResult.loggedIn || this.client.playerId() !== oldPlayerId) {
        effectiveWalletId = await this.walletOfCurrentPlayer(effectiveWalletId);
      }
    }
    if (this.client.isAnonymous()) {
      throw new EconomyError(
        'real-money purchases require a non-anonymous account',
        EconomyErrorCode.ANONYMOUS_NOT_ALLOWED,
      );
    }
    if (!price.real) throw new Error(`Economy.purchase: price ${price.friendlyId} missing real block`);
    if (!this.iap) throw new Error('Economy.purchase: real-money requires IAP module');
    if (this.iap.selectProvider && !(await this.iap.selectProvider(args.provider))) {
      throw new EconomyError('purchase cancelled', EconomyErrorCode.PURCHASE_CANCELLED);
    }

    const checkout = this.iap.prepareCheckout?.({
      ...(price.real.providerSku ? { productId: price.real.providerSku } : {}),
      ...(quantity != null ? { quantity } : {}),
    });
    let intent: any;
    try {
      const providerName = this.iap.getProviderName?.();
      if (!providerName) throw new Error('Economy.purchase: real-money requires IAP module with getProviderName()');
      const backendProvider = this.iap.getBackendProvider?.();
      const provider =
        (backendProvider && RECOVERY_PROVIDER_MAP[backendProvider]) ??
        backendProvider ??
        RECOVERY_PROVIDER_MAP[providerName];
      if (!provider) throw new Error(`Economy.purchase: no provider mapping for IAP "${providerName}"`);
      if (!this.channelId) {
        throw new Error('Economy.purchase: real-money requires a channelId (FRVR.channel.getId())');
      }
      intent = await this.client.createShopIntent({
        productRef,
        priceRef,
        walletId: effectiveWalletId,
        quantity,
        provider,
        channelId: this.channelId,
        wallet: WALLET_MAP[providerName],
        ...(checkout ? { checkout: checkout.checkout, returnUrl: checkout.returnUrl } : {}),
        idempotencyKey,
      });
    } catch (err) {
      checkout?.abort?.();
      throw err;
    }

    const recoverable = PROVIDERS_WITH_RECOVER.has(intent.provider);
    let settledResult: any;
    let settledPayment: any;
    const settle = async (options?: { timeoutMs?: number }) => {
      const settled = await this.waitForIAPTransaction(intent.iapTransactionId, options?.timeoutMs ?? 30000);
      settledResult = settled?.result ?? null;
      settledPayment = settled?.payment ?? settledPayment;
      return {
        settled: !!settledResult,
        ...(settledPayment ? { payment: settledPayment } : {}),
      };
    };
    const purchaseManaged = recoverable
      ? undefined
      : this.iap.purchaseManaged?.bind(this.iap);
    let purchase: any;
    let finalized: any;
    try {
      const purchaseFields = {
        ...args.meta,
        ...(quantity != null ? { quantity } : {}),
        iap_transaction_id: intent.iapTransactionId,
        payment_url: intent.paymentUrl,
        provider_data: intent.providerData,
        ...(recoverable ? { settle } : {}),
      };
      purchase = await (purchaseManaged ?? this.iap.purchase.bind(this.iap))(
        intent.storeSku ?? intent.providerSku,
        purchaseFields,
      );
    } catch (err) {
      checkout?.abort?.(
        err != null && typeof err === 'object' && (err as { name?: unknown }).name === 'IAPPurchaseErrorCancelledByUser'
          ? 'cancelled'
          : 'failed',
      );
      if (err != null && typeof err === 'object' && (err as { name?: unknown }).name === 'IAPPurchaseErrorCancelledByUser') {
        throw new EconomyError('purchase cancelled', EconomyErrorCode.PURCHASE_CANCELLED);
      }
      const cause = err != null && typeof err === 'object' ? (err as { cause?: unknown }).cause : undefined;
      if (isAlreadyOwned(err) || isAlreadyOwned(cause)) void this.recoverPendingPurchases();
      throw err;
    }
    if (recoverable) {
      if (settledResult === undefined) await settle();
      if (settledResult) {
        return settledPayment && !settledResult.payment
          ? { ...settledResult, payment: settledPayment }
          : settledResult;
      }
      return {
        transactionId: '',
        productId: 0,
        priceId: 0,
        rewards: [],
        iapTransactionId: intent.iapTransactionId,
        pending: true,
      };
    }

    try {
      const recovery = this.purchaseRecoveryPayload(intent.provider, purchase);
      finalized = await this.client.finalizeShopPurchase({
        iapTransactionId: intent.iapTransactionId,
        provider: intent.provider,
        ...recovery,
      });
    } catch (err) {
      this.iap.releasePurchase?.(purchase);
      if (err != null && typeof err === 'object') {
        (err as { pending?: boolean }).pending = true;
        throw err;
      }
      const pendingError = new EconomyError(String(err), EconomyErrorCode.UNKNOWN, err);
      (pendingError as EconomyError & { pending?: boolean }).pending = true;
      throw pendingError;
    }
    if (await this.consumeGranted(purchase)) await this.rememberFinishedNonConsumable(purchase);
    return finalized;
  }
  async applyVirtualPurchase(body: any): Promise<any> {
    return this.client.applyVirtualPurchase(body);
  }
  async runRecovery(): Promise<any[]> {
    const iap = this.iap;
    if (!iap || !this.storage || this.client.isAnonymous()) return [];
    const getPurchases = iap.getUnconsumedPurchasesUntracked ?? iap.getUnconsumedPurchases;
    if (!getPurchases) return [];
    const [purchases, answered] = await Promise.all([
      getPurchases.call(iap),
      this.loadAnswered(this.client.playerId()),
    ]);
    const candidates: Array<[any, string, Record<string, any>, string]> = [];
    for (const purchase of purchases ?? []) {
      const id = purchase.purchaseId ?? purchase.transactionId;
      if (!id || this.recoveryAttempts.has(id) || answered?.keys.includes(id)) continue;
      const provider = this.backendProviderOf(purchase);
      const payload = provider ? this.recoveryPayload(provider, purchase) : null;
      if (!provider || !payload) continue;
      if (iap.managePurchase && iap.managePurchase(purchase)) continue;
      candidates.push([purchase, provider, payload, id]);
    }
    if (candidates.some(([, provider]) => REAL_MONEY_RECOVERY_PROVIDERS.has(provider))) {
      const realSkus = await this.realMoneySkus();
      if (realSkus) {
        for (let i = candidates.length - 1; i >= 0; i--) {
          const [purchase, provider] = candidates[i];
          if (REAL_MONEY_RECOVERY_PROVIDERS.has(provider) && !realSkus.has(String(purchase.productId))) {
            iap.releasePurchase?.(purchase, true);
            candidates.splice(i, 1);
          }
        }
      }
    }
    const batch: typeof candidates = [];
    for (const candidate of candidates) {
      if (this.recoveryAttempts.size >= 10) iap.releasePurchase?.(candidate[0], true);
      else {
        this.recoveryAttempts.add(candidate[3]);
        batch.push(candidate);
      }
    }
    const results: any[] = [];
    try {
      for (const [purchase, provider, payload, id] of batch) {
        const recovered = await this.recoverOne(provider, purchase, payload);
        if (recovered.final && answered) await this.rememberAnswered(answered, id);
        if (recovered.result) results.push(recovered.result);
      }
    } finally {
      for (const [purchase] of batch) iap.releasePurchase?.(purchase, true);
    }
    return results;
  }
  onPurchaseRecovered(listener: (result: any, purchase: any) => void): void {
    this.recoveredListeners.push(listener);
    for (const [result, purchase] of this.recovered) this.notifyRecovered(listener, result, purchase);
  }
  recoverPendingPurchases(): Promise<any[]> {
    if (!this.recoveringPromise) {
      this.recoveringPromise = this.runRecovery()
        .catch((err) => {
          this.logger.warn('[FRVR-Economy] purchase recovery failed', err);
          return [];
        })
        .finally(() => {
          this.recoveringPromise = undefined;
        });
    }
    return this.recoveringPromise;
  }
  private async walletOfCurrentPlayer(walletId: string): Promise<string> {
    const wallets = await this.client.myWallets();
    if (wallets.some((wallet: any) => wallet.id === walletId)) return walletId;
    return (await this.client.defaultWallet()).id;
  }
  private async realMoneySkus(): Promise<Set<string> | undefined> {
    let products: any[];
    try {
      products = await this.client.allShopProducts();
    } catch (err) {
      this.logger.warn('[FRVR-Economy] reading the shop for recovery failed; asking about every purchase', err);
      return;
    }
    if (!Array.isArray(products)) return;
    const skus = new Set<string>();
    for (const product of products) {
      for (const price of product.prices ?? []) {
        if (price.kind !== 'real' || !price.real) continue;
        if (price.real.providerSku) skus.add(price.real.providerSku);
        for (const sku of Object.values(price.real.providerSkus ?? {})) {
          if (sku) skus.add(String(sku));
        }
      }
    }
    return skus;
  }
  private backendProviderOf(purchase: any): string | undefined {
    const providerInfo = this.iap.getBackendProviderName?.(purchase);
    if (providerInfo) {
      return (
        RECOVERY_PROVIDER_MAP[providerInfo.backendProvider ?? ''] ??
        providerInfo.backendProvider ??
        RECOVERY_PROVIDER_MAP[providerInfo.name]
      );
    }
    const providerName = this.iap.getProviderName?.();
    return providerName ? RECOVERY_PROVIDER_MAP[providerName] : undefined;
  }
  private recoveryPayload(provider: string, purchase: any): Record<string, any> | null {
    if (REAL_MONEY_RECOVERY_PROVIDERS.has(provider)) {
      try {
        return this.purchaseRecoveryPayload(provider, purchase).payload;
      } catch {
        return null;
      }
    }
    if (PROVIDERS_WITH_RECOVER.has(provider)) {
      const transactionId = purchase.channelData?.iapTransactionId;
      if (typeof transactionId === 'number' && Number.isInteger(transactionId) && transactionId > 0) {
        return { iapTransactionId: transactionId };
      }
      const externalRef = purchase.transactionId ?? purchase.purchaseId;
      return externalRef ? { externalRef } : null;
    }
    return null;
  }
  private async recoverOne(
    provider: string,
    purchase: any,
    payload: Record<string, any>,
  ): Promise<{ result: any; final: boolean }> {
    let response: any;
    try {
      response = await this.client.recoverShopPurchase({ provider, ...payload });
    } catch (err) {
      this.logger.warn(
        '[FRVR-Economy] recovering purchase failed, retrying next boot',
        payload.externalRef ?? payload.iapTransactionId,
        err,
      );
      this.iap.releasePurchase?.(purchase, true);
      return { result: null, final: false };
    }
    this.logger.log(
      '[FRVR-Economy] recovering purchase',
      payload.externalRef ?? payload.iapTransactionId,
      response.status,
      response.code ?? '',
    );
    if (!response.consume) {
      const final =
        response.status === 'no-intent' ||
        response.status === 'rejected' ||
        (response.status === 'refused' && response.code === 'RECEIPT_INVALID');
      this.iap.releasePurchase?.(
        purchase,
        response.status !== 'pending' && response.status !== 'settled',
      );
      return { result: null, final };
    }
    const consumed = (await this.consumeGranted(purchase)) && response.status === 'settled';
    if (response.status !== 'settled' || !response.result) return { result: null, final: consumed };
    this.recovered.push([response.result, purchase]);
    for (const listener of this.recoveredListeners) {
      this.notifyRecovered(listener, response.result, purchase);
    }
    return { result: response.result, final: consumed };
  }
  private async loadAnswered(playerId: string | null): Promise<{ storageKey: string; keys: string[] } | null> {
    if (!this.storage || !playerId) return null;
    const storageKey = `frvr.economy.recovery.answered.${this.client.getGameId()}.${playerId}`;
    let value: unknown;
    try {
      value = await this.storage.getItem(storageKey);
    } catch (err) {
      this.logger.warn('[FRVR-Economy] reading answered purchases failed', err);
    }
    return {
      storageKey,
      keys: Array.isArray(value) ? value.filter((key): key is string => typeof key === 'string') : [],
    };
  }
  private async rememberAnswered(
    answered: { storageKey: string; keys: string[] },
    id: string,
  ): Promise<void> {
    answered.keys = [...answered.keys.filter((key) => key !== id), id].slice(-200);
    try {
      await this.storage.setItem(answered.storageKey, answered.keys);
    } catch (err) {
      this.logger.warn('[FRVR-Economy] storing answered purchases failed', err);
    }
  }
  private async rememberFinishedNonConsumable(purchase: any): Promise<void> {
    const id = purchase.purchaseId ?? purchase.transactionId;
    if (!id || !this.iap || this.iap.isConsumable(purchase) !== false) return;
    const answered = await this.loadAnswered(this.client.playerId());
    if (answered) await this.rememberAnswered(answered, id);
  }
  private async consumeGranted(purchase: any): Promise<boolean> {
    if (!this.iap?.consumeManagedPurchase && !this.iap?.consumePurchase) return true;
    try {
      if (this.iap.consumeManagedPurchase) await this.iap.consumeManagedPurchase(purchase);
      else await this.iap.consumePurchase(purchase);
      return true;
    } catch (err) {
      this.logger.warn('[FRVR-Economy] consume after finalize failed', err);
      return false;
    }
  }
  private notifyRecovered(listener: (result: any, purchase: any) => void, result: any, purchase: any): void {
    try {
      listener(result, purchase);
    } catch (err) {
      this.logger.error('[FRVR-Economy] onPurchaseRecovered listener threw', err);
    }
  }
  private async waitForIAPTransaction(id: string, timeoutMs: number): Promise<any> {
    const deadline = Date.now() + timeoutMs;
    let first = true;
    while (first || Date.now() < deadline) {
      first = false;
      try {
        const response = await this.client.getIAPTransaction(id);
        if (response.status === 'success' && response.result) {
          const payment = response.payment ?? response.result.payment;
          return payment ? { result: response.result, payment } : { result: response.result };
        }
        if (response.status === 'rejected') {
          throw new EconomyError('payment was rejected', EconomyErrorCode.PAYMENT_REJECTED);
        }
        if (response.status === 'refunded') {
          throw new EconomyError('payment was refunded', EconomyErrorCode.PAYMENT_REFUNDED);
        }
      } catch (err) {
        if (
          err instanceof EconomyError &&
          (err.code === EconomyErrorCode.PAYMENT_REJECTED || err.code === EconomyErrorCode.PAYMENT_REFUNDED)
        ) {
          throw err;
        }
      }
      if (Date.now() >= deadline) break;
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
    return null;
  }
  private purchaseRecoveryPayload(
    provider: string,
    purchase: any,
  ): { externalRef: string; payload: any } {
    const receipt = purchase.transactionReceipt;
    let payload: any;
    switch (provider) {
      case 'apple': {
        let receiptData = receipt;
        if (typeof receipt === 'object' && receipt) {
          try {
            receiptData = JSON.parse(String(receipt.receipt))?.jws;
          } catch {
            receiptData = undefined;
          }
        }
        if (typeof receiptData !== 'string' || !receiptData) {
          throw new Error('Economy.purchase: apple receipt missing — contact support, do not retry');
        }
        payload = { receiptData };
        break;
      }
      case 'google': {
        const rawReceipt = receipt?.receipt;
        let data: any = {};
        try {
          if (typeof rawReceipt === 'string') data = JSON.parse(rawReceipt);
          else if (typeof receipt === 'object' && receipt) data = receipt;
        } catch {
          throw new Error('Economy.purchase: google receipt malformed — contact support, do not retry');
        }
        const packageName = data.packageName ?? purchase.channelData?.packageName;
        const productId = purchase.productId ?? data.productId;
        const purchaseToken = purchase.purchaseId ?? data.purchaseToken;
        if (!productId || !purchaseToken) {
          throw new Error('Economy.purchase: google receipt missing productId/purchaseToken — contact support, do not retry');
        }
        payload = {
          ...(packageName ? { packageName } : {}),
          productId,
          purchaseToken,
        };
        break;
      }
      case 'facebook':
        if (typeof receipt !== 'string' || !receipt) {
          throw new Error('Economy.purchase: facebook signedRequest missing — contact support, do not retry');
        }
        if (!purchase.productId || !purchase.transactionId) {
          throw new Error('Economy.purchase: facebook productId/paymentId missing — contact support, do not retry');
        }
        payload = {
          signedRequest: receipt,
          productId: purchase.productId,
          paymentId: purchase.transactionId,
        };
        break;
      case 'samsung': {
        if (!purchase.purchaseId) {
          throw new Error('Economy.purchase: samsung purchaseId missing — contact support, do not retry');
        }
        payload = { purchaseId: purchase.purchaseId };
        if (purchase.productId) payload.productId = purchase.productId;
        if (typeof purchase.channelData?.nativePayload === 'string' && purchase.channelData.nativePayload) {
          payload.receipt = purchase.channelData.nativePayload;
        }
        break;
      }
      case 'discord':
        if (typeof receipt !== 'object' || !receipt) {
          throw new Error('Economy.purchase: discord receipt missing — contact support, do not retry');
        }
        payload = receipt;
        break;
      case 'microsoft': {
        const data = purchase.channelData;
        if (
          typeof receipt !== 'string' ||
          !receipt ||
          !purchase.purchaseId ||
          (!data?.receipts && !data?.receipt)
        ) {
          throw new Error('Economy.purchase: microsoft receipt missing — contact support, do not retry');
        }
        payload = data.receipts
          ? { receipts: data.receipts, receiptSignature: receipt, orderId: purchase.purchaseId }
          : { receipt: data.receipt, receiptSignature: receipt };
        break;
      }
      default:
        throw new Error(`Economy.purchase: unsupported provider ${provider}`);
    }
    const externalRef =
      provider === 'samsung' || provider === 'microsoft'
        ? purchase.purchaseId
        : purchase.transactionId ?? purchase.purchaseId;
    if (!externalRef) throw new Error('Economy.purchase: IAP result missing transactionId/purchaseId');
    return { externalRef, payload };
  }
}

export class Shop {
  constructor(private readonly config: any) {
    this.client = config.client ?? new ShopClient(config);
    this.logger = config.logger;
    this.iap = config.iap;
    this.shopfrontModuleCache = new Map();
  }
  private client: any;
  private logger: Logger;
  private iap: IAP;
  private shopfrontModuleCache: Map<string, any>;
  async getShop(shopfrontId = ''): Promise<any> {
    let res;
    try {
      res = await this.client.getShop(shopfrontId, sanitizeDates);
    } catch (err) {
      if ((err as any).code === 404) return emptyShop;
      throw err;
    }
    return this.withFormattedPrices(res);
  }
  async getProducts(ids: string[]): Promise<any[]> {
    if (!ids.length) return [];
    try {
      return await this.client.getProducts(ids, sanitizeDates);
    } catch (err) {
      if ((err as any).code === 404) return [];
      throw err;
    }
  }
  private withFormattedPrices(shop: any): any {
    return {
      ...shop,
      modules: shop.modules.map((m: any) => ({
        ...m,
        products: m.products.map((p: any) =>
          p.price.currency === 'iap' ? { ...p, price: { ...p.price, formattedAmount: this.getFormattedPrice(p) } } : p,
        ),
      })),
    };
  }
  getFormattedPrice(product: any): string | undefined {
    const name = this.iap.getProviderName();
    const channel = PROVIDER_MAP[name];
    const sku = product.channels?.[channel]?.sku;
    const catalog = this.iap.getProductById(sku);
    if (catalog) return catalog.price;
    this.logger?.warn(`[shop] No IAP product found for sku ${product.sku}/${sku} on provider ${name}`);
  }
}

const emptyShop = { _id: '', gameId: '', currencies: [], modules: [], metadata: {}, defaultShopfrontId: '' };
function sanitizeDates(obj: any): any {
  if (typeof obj !== 'object' || obj === null) return obj;
  if (Array.isArray(obj)) return obj.map(sanitizeDates);
  const out: any = {};
  for (const [k, v] of Object.entries(obj)) {
    out[k] = ['createdAt', 'archivedAt', 'deletedAt', 'updatedAt'].includes(k)
      ? (v ? new Date(v as string) : v)
      : sanitizeDates(v);
  }
  return out;
}

export class ShopClient {
  constructor(private readonly config: any) {}
  private get baseUrl(): string {
    return this.config.apiUrl ?? 'https://crucible.frvr.com';
  }
  async getShop(shopfrontId = '', sanitize?: (data: any) => any): Promise<any> {
    const params = new URLSearchParams();
    if (shopfrontId) params.set('shopfront', shopfrontId);
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const token = this.config.accessProvider.getAccessToken();
    if (!token) throw new ShopError('Shop access token is required', 0);
    headers.Authorization = 'Bearer ' + token;
    const res = await fetch(`${this.baseUrl}/v1/shop/${this.config.gameId}${params.toString() ? '?' + params.toString() : ''}`, { headers });
    if (!res.ok) throw new ShopError(`Failed to fetch shop data: ${res.status} ${res.statusText}`, res.status);
    const body = await res.json();
    return sanitize?.(body) ?? body;
  }
  async getProducts(ids: string[], sanitize?: (data: any) => any): Promise<any[]> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const token = this.config.accessProvider.getAccessToken();
    if (!token) throw new ShopError('Shop access token is required', 0);
    headers.Authorization = 'Bearer ' + token;
    const products = ids.length ? `?productSKUs=${ids.toString()}` : '';
    const res = await fetch(`${this.baseUrl}/v1/shop/${this.config.gameId}/products${products}`, { headers });
    if (!res.ok) throw new ShopError(`Failed to fetch shop data: ${res.status} ${res.statusText}`, res.status);
    const body = (await res.json()).products;
    return sanitize?.(body) ?? body;
  }
}

export class ShopError extends Error {
  constructor(message: string, public readonly code: number) {
    super(message);
    this.name = 'ShopError';
  }
}

export class FeaturesClient {
  constructor(private readonly config: any) {}
  async getFeatures(): Promise<any> {
    const params = new URLSearchParams();
    if (this.config.debugProvider) {
      const debug = await this.config.debugProvider.getProperty('abt');
      if (debug) params.append('abt', debug);
    }
    if (this.config.channelId) params.append('ch', this.config.channelId);
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const token = await this.config.accessProvider.getAccessToken();
    if (token) headers.Authorization = 'Bearer ' + token;
    else params.append('userId', await this.config.accessProvider.getUserId());
    const qs = params.toString() ? '?' + params.toString() : '';
    const url = token
      ? `${this.config.baseUrl}/v1/tailor/${this.config.gameId}/config${qs}`
      : `${this.config.baseUrl}/v1/tailor/guest/${this.config.gameId}/config${qs}`;
    const res = await fetch(url, { headers });
    if (!res.ok) throw new FeaturesClientNetworkError(`Failed to fetch features: ${res.status} ${res.statusText}`, res.status);
    return res.json();
  }
}

export class FeaturesClientNetworkError extends Error {
  constructor(message: string, public readonly code: number) {
    super(message);
    this.name = 'FeaturesClientNetworkError';
  }
}

export class Features {
  private client: FeaturesClient;
  private auth: any;
  private tracker: Tracker;
  private localStorage: Storage;
  private remoteABTests: any;
  private config: any;
  private remoteConfig?: any;
  private preStoredConfig: any;
  private firstFetchPromise?: Promise<any>;
  private timeout: TimeoutHelper;
  private remoteABTestsProvider: any;

  constructor(opts: any) {
    this.auth = opts.auth;
    this.tracker = opts.tracker;
    this.anonymousIdProvider = createAnonymousIdProvider(opts.localStorage);
    this.client = opts.client ?? new FeaturesClient({
      accessProvider: {
        getAccessToken: async () => (await this.auth.getAccessToken()) ?? (await this.auth.getStorageAccessToken()),
        getUserId: async () => this.anonymousUserId,
      },
      debugProvider: opts.debugProvider,
      gameId: opts.config.gameId,
      apiUrl: opts.config.apiUrl,
      channelId: opts.channelId,
      env: opts.env,
    });
    this.localStorage = opts.localStorage;
    this.tracker = opts.tracker;
    this.remoteABTests = opts.remoteABTests;
    this.defaultFeatures = opts.config.defaultFeatures ?? {};
    this.timeout = new TimeoutHelper(opts.config.timeoutMs ?? 1000);
    this.config = opts.config;
    if (!this.config.activateTimeout) this.timeout.activate();
  }
  private anonymousIdProvider: () => string;
  private defaultFeatures: Record<string, unknown>;
  private anonymousUserId = '';
  private activateTimeoutOnFeaturesLoad: any;

  async init(): Promise<void> {
    if (!this.initPromise) {
      this.initPromise = (async () => {
        this.preStoredConfig = await this.localStorage.getItem('__frvr_features');
        this.remoteConfig = await this.fetchFeatures();
      })();
    }
    return this.initPromise;
  }
  private initPromise?: Promise<void>;

  private activateTimeout(): void {
    this.timeout.activate();
  }

  async getFeatures<T = Record<string, unknown>>(keys?: string[], override?: boolean): Promise<T> {
    await this.fetchFeatures(override);
    const source = this.remoteConfig ?? this.preStoredConfig;
    const features = source?.config ?? this.defaultFeatures;
    if (this.remoteConfig && this.remoteConfig.tests) {
      this.applyRemoteABTests(this.remoteConfig.tests);
    }
    if (keys && keys.length !== 0) {
      return keys.reduce((acc: any, k) => ((acc[k] = features[k]), acc), {}) as T;
    }
    return features as T;
  }
  private applyRemoteABTests(tests: any[]): void {
    if (!this.remoteABTestsApplied) {
      this.remoteABTestsApplied = tests;
      if (tests.length > 0) this.remoteABTests?.setGroups(tests);
    }
  }
  private remoteABTestsApplied: any;

  private async fetchFeatures(override?: boolean): Promise<any> {
    if (this.fetchPromise) return this.fetchPromise;
    if (!this.remoteABTestsApplied && !override) return;
    this.remoteABTestsApplied = undefined;
    this.fetchingFeatures = true;
    const userId = this.getUserId();
    if (userId && this.preStoredConfig && userId !== this.preStoredConfig.userId) {
      await this.clearPreStoredConfig();
    }
    this.tracker.logEvent('features_loading', {});
    this.fetchPromise = this.timeout
      .wrap(() =>
        (async () => {
          let res;
          try {
            await this.auth.awaitSettledSession?.();
            res = await this.client.getFeatures();
          } catch (err) {
            this.logger?.error(
              ['Failed to fetch features:', (err as any).code, (err as Error).message].filter(Boolean).join(' '),
            );
            if (err instanceof FeaturesClientNetworkError && (err as any).code === 404) {
              await this.clearPreStoredConfig();
            }
            throw err;
          }
          if (res) await this.savePreStoredConfig(res);
          return res;
        })(),
      )
      .then((remoteConfig) => {
        this.remoteConfig = remoteConfig;
        this.fetchPromise = undefined;
        this.tracker.logEvent('features_loaded', {});
      })
      .catch((err) => {
        this.fetchPromise = undefined;
        if (err instanceof TimeoutError) this.logger?.error('Timeout while fetching features: ' + err.message);
        this.tracker.logEvent('features_loading_error', { error: (err as Error).message });
      });
    return this.fetchPromise;
  }
  private fetchPromise?: Promise<any>;
  private fetchingFeatures = false;

  private async savePreStoredConfig(config: any): Promise<void> {
    this.preStoredConfig = { ...config, userId: this.getUserId() };
    await this.localStorage.setItem('__frvr_features', this.preStoredConfig);
  }
  private async clearPreStoredConfig(): Promise<void> {
    this.preStoredConfig = undefined;
    await this.localStorage.removeItem('__frvr_features');
  }
  private getUserId(): string {
    return this.auth.getFRVRID();
  }
  private get logger(): Logger {
    return this.tracker ? (this.config.logger ?? emptyLogger) : emptyLogger;
  }
}

function createAnonymousIdProvider(storage: Storage): () => string {
  return function (): string {
    const key = '__frvr_rfc_uuidv4';
    return (
      (storage.getItem(key, { value: undefined, createdAt: 0 }) as any).value ??
      (() => {
        const uuid =
          typeof crypto !== 'undefined' && crypto.randomUUID
            ? crypto.randomUUID()
            : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
                const r = (16 * Math.random()) | 0;
                return (c === 'x' ? r : (3 & r) | 8).toString(16);
              });
        storage.setItem(key, { value: uuid, createdAt: Date.now() });
        return uuid;
      })()
    );
  }.bind(null);
}

export class TimeoutHelper {
  private timeoutActivePromise = new Deferred<boolean>();
  constructor(private readonly timeoutMs: number) {}
  activate(): void {
    this.timeoutActivePromise.resolve(false);
  }
  async wrap<T>(fn: () => Promise<T>): Promise<T> {
    const deadline = Date.now() + this.timeoutMs;
    const promise = fn().finally(() => this.timeoutActivePromise.resolve(true));
    if (await this.timeoutActivePromise) return promise;
    const remaining = Math.max(0, deadline - Date.now());
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => reject(new TimeoutError(`Timeout after ${this.timeoutMs}ms`)), remaining);
      promise.then((v) => {
        clearTimeout(timer);
        resolve(v);
      }).catch((e) => {
        clearTimeout(timer);
        reject(e);
      });
    });
  }
}

export class TimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TimeoutError';
    Object.setPrototypeOf(this, TimeoutError.prototype);
  }
}

export class ABTests {
  private playSessionId?: string;
  constructor(private readonly tracker: Tracker) {}
  setGroups(groups: any[]): void {
    const sessionId = this.tracker.getPlaySessionId?.();
    if (sessionId === this.playSessionId) return;
    this.tracker.addExtraFieldFunction?.((ctx) => {});
    if (!groups.length) return;
    this.playSessionId = sessionId;
    const names: Record<string, string> = {};
    for (const g of groups) {
      const label =
        g.group === 0 ? 'control' : g.group <= 26 ? String.fromCharCode(96 + g.group) : `${g.group}`;
      names[g.testName] = g.testName + '__' + label;
    }
    const fields = Object.fromEntries(Object.entries(names).map(([k, v]) => ['abt_' + k, v]));
    for (const name in names) {
      this.tracker.logValuedEvent?.('ab_test_activation', 1, { ab_test_name: name, ab_test_group: names[name] });
    }
    this.tracker.addExtraFieldFunction?.((ctx) => Object.assign(ctx, fields));
  }
}

export class DebugProvider {
  constructor(
    private readonly primaryDebugProvider: { getProperty(key: string): Promise<any> } | undefined,
    private readonly fallback: Storage,
  ) {}
  async getProperty(key: string): Promise<any> {
    const v = await this.primaryDebugProvider?.getProperty(key);
    return v === undefined ? this.fallback.getItem(key) : v;
  }
}

export class ShieldOverlay {
  private enabled = false;
  private logger?: Logger;
  setup(enabled: boolean, logger?: Logger): void {
    this.enabled = enabled;
    this.logger = logger;
  }
  async createOverlay(opts: any): Promise<any> {
    if (!this.enabled) {
      this.logger?.warn('Shield is not enabled in this environment');
      return null;
    }
    if (typeof window === 'undefined' || (window as any).FBInstant === undefined) {
      this.logger?.warn('Shield overlay is not supported in this channel');
      return null;
    }
    try {
      const fbi = this.getFBIChannel();
      if (fbi && fbi.isShieldSupported) {
        return fbi.createShieldOverlay({ ...opts, logger: this.logger });
      }
      this.logger?.warn('Shield overlay is not supported in this channel');
      return null;
    } catch (err) {
      this.logger?.warn('Failed to load Facebook Instant channel:', err);
      return null;
    }
  }
  isOverlayActive(): boolean {
    try {
      const fbi = this.getFBIChannel();
      return !!(fbi && fbi.isShieldSupported && fbi.isOverlayActive());
    } catch (err) {
      this.logger?.warn('Failed to load Facebook Instant channel:', err);
      return false;
    }
  }
  private getFBIChannel(): any {
    return (window as any).FRVRFBIChannel || null;
  }
}

function pad(n: number): string {
  return (n < 10 ? '0' : '') + n;
}
function randomId(): string {
  const SEG = '-';
  function rand() {
    return ((0x10000 * (1 + Math.random())) | 0).toString(16).slice(1);
  }
  const time = new Date().getTime().toString(16).slice(0, 11) + ((0x10000 * (1 + Math.random())) | 0).toString(16).slice(1, 2);
  return rand() + rand() + SEG + rand() + SEG + rand() + SEG + rand() + SEG + time;
}
function resolveEnv(requested: Env, current: Env): Env {
  const aliases: Record<string, Env> = {
    prod: Env.PRODUCTION,
    production: Env.PRODUCTION,
    beta: Env.BETA,
    staging: Env.BETA,
    dev: Env.DEVELOPMENT,
    development: Env.DEVELOPMENT,
  };
  return aliases[String(requested).toLowerCase()] ??
    aliases[String(current).toLowerCase()] ??
    current;
}
function installErrorHandlers(handler: (payload: any) => void): void {
  const prev = window.onerror;
  window.onerror = (msg, url, line, col, error) => {
    try {
      prev?.(msg, url, line, col, error);
    } catch {}
    if (((msg = String(msg)), (error = error || new Error(msg)))) {
      try {
        handler({ msg, line, col, label: error.stack || JSON.stringify(error) });
      } catch {}
    }
    return false;
  };
  const prevRej = window.onunhandledrejection;
  window.onunhandledrejection = (ev) => {
    try {
      prevRej?.call(window, ev);
    } catch {}
    try {
      const reason = ev?.reason || {};
      handler({ msg: reason.message, line: 0, col: 0, label: 'unhandled_rejection: ' + (reason.stack || JSON.stringify(reason)) });
    } catch {}
  };
}
function addSuspendResumeWebListeners(lifecycle: RefcountedLifecycle): void {
  addWebVisibilityListeners(lifecycle, ['onAudioSuspend', 'onAudioResume'], ['onGamePause', 'onResume']);
}
function addGamePauseWebListeners(lifecycle: RefcountedLifecycle): void {
  addWebVisibilityListeners(lifecycle, ['onSuspend'], ['onResume']);
}
function addWebVisibilityListeners(
  lifecycle: any,
  onHidden: string[],
  onVisible: string[],
): void {
  if (typeof window === 'undefined') return;
  const hasDocument = typeof document !== 'undefined';
  const isAdActive = () => lifecycle instanceof RefcountedLifecycle && lifecycle.isAdActive();
  const handleHide = () => {
    for (const k of onHidden) lifecycle[k]();
  };
  window.addEventListener('focus', () => {
    if (isAdActive()) return;
    handleHide();
    if (hasDocument) document.removeEventListener('pointerdown', handleHide, true);
  });
  window.addEventListener('blur', () => {
    if (!isAdActive()) {
      for (const k of onVisible) lifecycle[k]();
      if (hasDocument) document.addEventListener('pointerdown', handleHide, { capture: true, once: true });
    }
  });
}

(window as any).FRVR = new FRVRSDK();

export const FRVR_SDK = {
  version: SDK_VERSION,
  Env,
  Platform,
  LifecycleSuspendReason,
  AdType,
  AdTypeProperties,
  AdError,
  AdSuccess,
  AdFinishedStatus,
  AdResponseStatus,
  AdsThrottlerResult,
  ConsentOptions,
  IAPErrorCode,
  EconomyErrorCode,
  ScoreCachePolicy,
  AnalyticsIDProviderStorageType,
  AuthManager,
  TokenPair,
  TokenHandler,
  Storage,
  WebLocalStorageProvider,
  MemoryAsyncStorageProvider,
  PrefixedStorageProvider,
  StorageIDProvider,
  RefcountedLifecycle,
  TrackerImpl,
  AdsThrottler,
  AdsManager,
  TcfV2ConsentProvider,
  Social,
  SocialWebsocketClient,
  WebsocketClient,
  LeaderboardClient,
  Tournaments,
  IAP,
  IAPServiceClient,
  Economy,
  EconomyServiceClient,
  Shop,
  ShopClient,
  Features,
  FeaturesClient,
  TimeoutHelper,
  ABTests,
  Notifications,
  Challenges,
  LiveRoom,
  Leaderboards,
  ShieldOverlay,
  defaultStorage,
  defaultLifecycle,
  emptyLogger,
  emptyTracker,
  emptyBootstrapper,
  emptyNavigationProvider,
  emptyCrosspromo,
  emptyShortcutProvider,
  emptyConsentProvider,
  noConsentConsentProvider,
  emptyNotificationsProvider,
  emptyTournamentsProvider,
  emptyChallengesProvider,
  emptyLiveRoomProvider,
  emptyLeaderboardProvider,
  emptyIAPProvider,
  decodeTokenPayload,
  tokenStorageKeys,
  buildStorageProvider,
  resolveIapHost,
  isPurchaseCancelled,
  isAlreadyOwned,
  isPopupBlocked,
  isPurchasePending,
  addSdkStatusChangeListener,
  Deferred,
  ACCESS_TOKEN_KEY,
  REFRESH_TOKEN_KEY,
  DEFAULT_ADS_CONFIG,
  IAP_API_HOST_PRODUCTION,
  IAP_API_HOST_STAGING,
};

if (typeof window !== 'undefined') {
  (window as any).FRVR_SDK = FRVR_SDK;
}