// src/sdk-libs/frvr-channel-web.ts
var Env = /* @__PURE__ */ ((Env2) => {
  Env2["PRODUCTION"] = "production";
  Env2["BETA"] = "beta";
  Env2["DEVELOPMENT"] = "development";
  return Env2;
})(Env || {});
var AdType = /* @__PURE__ */ ((AdType2) => {
  AdType2["REWARD"] = "reward";
  AdType2["AD"] = "ad";
  AdType2["INTERSTITIAL"] = "interstitial";
  AdType2["BANNER"] = "banner";
  AdType2["DEFAULT"] = "default";
  return AdType2;
})(AdType || {});
var AdFinishedStatus = /* @__PURE__ */ ((AdFinishedStatus2) => {
  AdFinishedStatus2["SUCCESS"] = "success";
  AdFinishedStatus2["TIMED_OUT"] = "timedOut";
  AdFinishedStatus2["ERROR"] = "error";
  AdFinishedStatus2["DISMISSED"] = "dismissed";
  AdFinishedStatus2["USER_INPUT"] = "userInput";
  AdFinishedStatus2["SKIPPED"] = "skipped";
  return AdFinishedStatus2;
})(AdFinishedStatus || {});
var AdError = /* @__PURE__ */ ((AdError2) => {
  AdError2["UNKNOWN"] = "unknown";
  AdError2["TIMED_OUT"] = "timedOut";
  AdError2["NOFILL"] = "nofill";
  AdError2["CLOSE"] = "close";
  AdError2["ERROR"] = "error";
  AdError2["AD_BLOCKED"] = "adBlocked";
  return AdError2;
})(AdError || {});
var AdSuccess = /* @__PURE__ */ ((AdSuccess2) => {
  AdSuccess2["COMPLETED"] = "completed";
  AdSuccess2["SUCCESS"] = "success";
  return AdSuccess2;
})(AdSuccess || {});
var Platform = /* @__PURE__ */ ((Platform2) => {
  Platform2["WEB"] = "web";
  Platform2["FACEBOOK_INSTANT"] = "facebook-instant";
  Platform2["FACEBOOK_WEB"] = "facebook-web";
  Platform2["GOOGLE_INTERNAL"] = "google-internal";
  Platform2["SAMSUNG_INSTANT"] = "samsung-instant";
  Platform2["MICROSOFT"] = "microsoft";
  Platform2["DISCORD"] = "discord";
  Platform2["CRAZYGAMES"] = "crazygames";
  Platform2["FRVR_EMBED"] = "frvr-embed";
  Platform2["MSPWA"] = "mspwa";
  return Platform2;
})(Platform || {});
var LifecycleSuspendReason = /* @__PURE__ */ ((LifecycleSuspendReason2) => {
  LifecycleSuspendReason2["DEFAULT"] = "default";
  LifecycleSuspendReason2["PARENT_UI"] = "parentUi";
  LifecycleSuspendReason2["CHANNEL"] = "channel";
  LifecycleSuspendReason2["GAME"] = "game";
  return LifecycleSuspendReason2;
})(LifecycleSuspendReason || {});
var IAPErrorCode = /* @__PURE__ */ ((IAPErrorCode2) => {
  IAPErrorCode2["UNKNOWN"] = "UNKNOWN";
  IAPErrorCode2["INVALID_PARAM"] = "INVALID_PARAM";
  IAPErrorCode2["ALREADY_OWNED"] = "ALREADY_OWNED";
  IAPErrorCode2["HELD_BY_ECONOMY"] = "HELD_BY_ECONOMY";
  IAPErrorCode2["POPUP_BLOCKED"] = "POPUP_BLOCKED";
  IAPErrorCode2["CANCELLED_BY_USER"] = "CANCELLED_BY_USER";
  IAPErrorCode2["PRODUCT_UNKNOWN"] = "IAPPurchaseErrorUnknownProduct";
  return IAPErrorCode2;
})(IAPErrorCode || {});
var ConsentPurpose = /* @__PURE__ */ ((ConsentPurpose2) => {
  ConsentPurpose2[ConsentPurpose2["None"] = 0] = "None";
  ConsentPurpose2[ConsentPurpose2["P1StoreInformationOnADevice"] = 1] = "P1StoreInformationOnADevice";
  ConsentPurpose2[ConsentPurpose2["P2SelectBasicAds"] = 2] = "P2SelectBasicAds";
  ConsentPurpose2[ConsentPurpose2["P3PersonalizedAdsProfile"] = 4] = "P3PersonalizedAdsProfile";
  ConsentPurpose2[ConsentPurpose2["P4PersonalizedAds"] = 8] = "P4PersonalizedAds";
  ConsentPurpose2[ConsentPurpose2["P5PersonalizedContentProfile"] = 16] = "P5PersonalizedContentProfile";
  ConsentPurpose2[ConsentPurpose2["P6PersonalizedContent"] = 32] = "P6PersonalizedContent";
  ConsentPurpose2[ConsentPurpose2["P7MeasureAdPerformance"] = 64] = "P7MeasureAdPerformance";
  ConsentPurpose2[ConsentPurpose2["P8MeasureContentPerformance"] = 128] = "P8MeasureContentPerformance";
  ConsentPurpose2[ConsentPurpose2["P9MarketResearchForAudienceInsights"] = 256] = "P9MarketResearchForAudienceInsights";
  ConsentPurpose2[ConsentPurpose2["P10DevelopAndImproveProducts"] = 512] = "P10DevelopAndImproveProducts";
  ConsentPurpose2[ConsentPurpose2["All"] = 2046] = "All";
  return ConsentPurpose2;
})(ConsentPurpose || {});
var CURRENCY_EXPONENTS = {
  // zero-decimal
  BIF: 0,
  CLP: 0,
  DJF: 0,
  GNF: 0,
  ISK: 0,
  JPY: 0,
  KMF: 0,
  KRW: 0,
  PYG: 0,
  RWF: 0,
  UGX: 0,
  UYI: 0,
  VND: 0,
  VUV: 0,
  XAF: 0,
  XOF: 0,
  XPF: 0,
  XPT: 0,
  XSU: 0,
  XUA: 0,
  XTS: 0,
  XBA: 0,
  XBB: 0,
  XBC: 0,
  XBD: 0,
  XDR: 0,
  XFU: 0,
  // three-decimal
  BHD: 3,
  IQD: 3,
  JOD: 3,
  KWD: 3,
  LYD: 3,
  OMR: 3,
  TND: 3
  // everything else is 2
};
function currencyExponent(currency) {
  return CURRENCY_EXPONENTS[currency] ?? 2;
}
function convertToPriceValue(amount, currency) {
  const exp = CURRENCY_EXPONENTS[currency];
  if (exp == null) {
    console.warn(`Unexpected currency ${currency}`);
    return amount;
  }
  return amount / Math.pow(10, exp);
}
var emptyLogger = {
  debug: () => {
  },
  log: () => {
  },
  info: () => {
  },
  warn: () => {
  },
  error: () => {
  }
};
var defaultCharacteristics = {
  hasDedicatedLoadingScreen: false
};
var delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
function isIframed(win = window) {
  try {
    return win.self !== win.top;
  } catch {
    return true;
  }
}
function isMobileIOS() {
  return /(ipod|iphone|ipad)/i.test(navigator.userAgent) || /(Macintosh)/i.test(navigator.userAgent) && "ontouchend" in document;
}
function isAndroid() {
  return /(android)/i.test(navigator.userAgent) && !/(Windows)/i.test(navigator.userAgent);
}
function formatCurrency(amount, currency) {
  try {
    return new Intl.NumberFormat(void 0, {
      style: "currency",
      currency,
      currencyDisplay: "narrowSymbol"
    }).format(amount);
  } catch {
    try {
      return new Intl.NumberFormat(void 0, {
        style: "currency",
        currency
      }).format(amount);
    } catch {
      return `${currency} ${amount}`;
    }
  }
}
var ChannelWebBootstrapper = class {
  constructor(logger) {
    this.logger = logger;
  }
  async init() {
  }
  setProgress(progress) {
    const pct = (100 * progress).toFixed(1);
    this.logger.log(`[channel-web] progress: ${pct}%`);
  }
  async complete() {
    this.logger.log("[channel-web] complete");
  }
};
var AdsByGoogleScriptLoader = class _AdsByGoogleScriptLoader {
  static {
    this.CHANNEL_IDS = {
      web: 4167329963,
      microsoft: 4955342615
    };
  }
  constructor(srcOrFactory, channel, enabled = false) {
    if (typeof srcOrFactory === "function") {
      this.channel = channel;
      this.readyPromise = this.loadScriptAsync(srcOrFactory, channel, enabled);
    } else {
      this.readyPromise = this.loadScriptAsync(
        () => Promise.resolve({ src: srcOrFactory, channel }),
        channel,
        enabled
      );
    }
  }
  async loadScriptAsync(factory, channel, enabled) {
    try {
      const cfg = await factory();
      this.placementId = cfg.src ?? "adsbygoogle";
      this.channel = channel;
      if (cfg.channel) this.customChannelId = cfg.channel;
      return this.loadScript(enabled);
    } catch (err) {
      console.warn("[adsbygoogle] failed to load script", err);
      return false;
    }
  }
  loadScript(enabled) {
    const script = document.createElement("script");
    script.async = true;
    script.setAttribute("data-ad-client", this.placementId.toString());
    script.setAttribute("data-ad-frequency-hint", "30s");
    if (enabled) script.setAttribute("data-adbreak-test", "on");
    const promise = new Promise((resolve) => {
      script.onload = async () => {
        await this.preload();
        resolve(true);
      };
      script.onerror = () => resolve(false);
    });
    const channelId = this.getChannelId();
    if (channelId) script.setAttribute("data-ad-channel", channelId.toString());
    script.src = "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js";
    (document.head || document.documentElement || document.body).appendChild(
      script
    );
    return promise;
  }
  getChannelId() {
    if (this.customChannelId) return this.customChannelId;
    if (this.channel && this.channel in _AdsByGoogleScriptLoader.CHANNEL_IDS) {
      return _AdsByGoogleScriptLoader.CHANNEL_IDS[this.channel];
    }
    return 2062420116;
  }
  preload() {
    return new Promise((resolve) => {
      window.adsbygoogle.push({
        preloadAdBreaks: "on",
        onReady: () => resolve(true)
      });
    });
  }
};
var ElementWaiter = class {
  constructor() {
    this.observer = null;
    this.timeoutId = null;
  }
  wait(fn, timeoutMs = 3e4) {
    return new Promise((resolve, reject) => {
      const immediate = fn();
      if (immediate) return resolve(immediate);
      this.timeoutId = window.setTimeout(() => {
        this.disconnect();
        reject(new Error("Element not found within timeout"));
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
  disconnect() {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
  }
};
var ViewportObserver = class {
  constructor(getElement, onVisibilityChange) {
    this.getElement = getElement;
    this.onVisibilityChange = onVisibilityChange;
    this.observer = null;
    this.interval = null;
    this.isVisible = false;
    this.element = null;
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
      }, 1e3);
    }
  }
  setupObserver() {
    if (!this.element) return;
    if (typeof window.IntersectionObserver === "function") {
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
        const visible = rect.top < window.innerHeight && rect.bottom > 0 && rect.left < window.innerWidth && rect.right > 0;
        if (visible && !this.isVisible) {
          this.onVisibilityChange(true);
          this.isVisible = true;
        } else if (!visible && this.isVisible) {
          this.onVisibilityChange(false);
          this.isVisible = false;
        }
      }, 1e3);
    }
  }
  disconnect() {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }
};
var AdsByGoogleBannerProvider = class {
  constructor(preloader, logger) {
    this.preloader = preloader;
    this.logger = logger;
    this.isReadyFlag = false;
    this.banners = [];
    this.bannerElements = /* @__PURE__ */ new Map();
    this.elementWaiters = /* @__PURE__ */ new Map();
    this.viewportObservers = /* @__PURE__ */ new Map();
  }
  getName() {
    return "AdsByGoogleBannerProvider";
  }
  getType() {
    return "banner" /* BANNER */;
  }
  isReady() {
    return this.isReadyFlag;
  }
  useManualControl() {
    return false;
  }
  async init(config, _tracker, _container) {
    const cfg = config?.adsConfig;
    this.banners = cfg?.banners || [];
    this.logger.debug(
      "[adsbygoogle] AdsByGoogleBannerProvider checking if ready",
      this.isReadyFlag,
      this.banners.length
    );
    this.preloader.readyPromise.then((ready) => {
      this.isReadyFlag = ready;
      this.logger.debug(
        "[adsbygoogle] AdsByGoogleBannerProvider ready changed",
        this.isReadyFlag,
        this.banners.length
      );
      if (ready && this.banners.length > 0) this.registerBanners();
    }).catch((err) => {
      this.logger.warn("[adsbygoogle] AdsByGoogleBannerProvider init error", err);
    });
  }
  registerBanners() {
    this.banners.forEach((banner) => {
      if (this.bannerElements.has(banner.adUnitId)) return;
      const waiter = new ElementWaiter();
      this.elementWaiters.set(banner.adUnitId, waiter);
      this.logger.debug(
        `[adsbygoogle] Registering banner ${banner.adUnitId} (element ${banner.targetElementId ?? banner.adUnitId})`
      );
      waiter.wait(() => {
        if (banner.targetElementId)
          return document.getElementById(banner.targetElementId);
        return document.getElementById(banner.adUnitId) || document.querySelector(`[data-ad-unit-id="${banner.adUnitId}"]`);
      }).then((el) => {
        this.logger.debug(
          `[adsbygoogle] Element found for banner ${banner.adUnitId}, setting up viewport observer`
        );
        const observer = new ViewportObserver(
          () => {
            if (banner.targetElementId)
              return document.getElementById(banner.targetElementId);
            return document.getElementById(banner.adUnitId) || document.querySelector(
              `[data-ad-unit-id="${banner.adUnitId}"]`
            );
          },
          (visible) => {
            if (!visible) return;
            const target = banner.targetElementId ? document.getElementById(banner.targetElementId) : document.getElementById(banner.adUnitId) || document.querySelector(
              `[data-ad-unit-id="${banner.adUnitId}"]`
            );
            if (target && !this.bannerElements.has(banner.adUnitId)) {
              this.logger.debug(
                `[adsbygoogle] Banner ${banner.adUnitId} became visible, creating ad`
              );
              this.createAndInsertAd(banner, target);
            }
          }
        );
        this.viewportObservers.set(banner.adUnitId, observer);
      }).catch((err) => {
        this.logger.warn(
          `[adsbygoogle] Failed to find target element for banner ${banner.adUnitId}:`,
          err
        );
      });
    });
  }
  createAndInsertAd(banner, target) {
    if (this.bannerElements.has(banner.adUnitId)) return;
    const selector = `[data-ad-unit-id="${banner.adUnitId}"]`;
    let width = banner.width;
    let height = banner.height;
    if (banner.width === void 0 || banner.height === void 0) {
      const m = /^(\d+)x(\d+)$/.exec(banner.size);
      if (m) {
        width = banner.width ?? parseInt(m[1], 10);
        height = banner.height ?? parseInt(m[2], 10);
      }
    }
    if (typeof document !== "undefined" && width && height) {
      const styleId = `adslot-style-${banner.adUnitId}`;
      if (!document.getElementById(styleId)) {
        const style = document.createElement("style");
        style.id = styleId;
        style.type = "text/css";
        style.textContent = `${selector} { width: ${width}px; height: ${height}px; }
        `;
        document.head.appendChild(style);
      }
    }
    const ad = document.createElement("ins");
    ad.className = `adsbygoogle${selector}`;
    ad.style.display = "inline-block";
    ad.setAttribute("data-ad-client", this.preloader.placementId);
    ad.setAttribute("data-ad-slot", banner.adUnitId);
    ad.setAttribute("data-ad-format", `${banner.size}`);
    if (banner.size === "auto") {
      ad.setAttribute("data-full-width-responsive", "true");
    }
    const channel = this.preloader.getChannelId?.();
    if (channel) ad.setAttribute("data-ad-channel", channel.toString());
    target.appendChild(ad);
    this.bannerElements.set(banner.adUnitId, ad);
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (err) {
      console.warn(`[adsbygoogle] Failed to push ad for ${banner.adUnitId}:`, err);
    }
  }
  async show() {
    this.bannerElements.forEach((el) => {
      el.style.display = "inline-block";
    });
    return Promise.resolve({ success: true, code: "completed" /* COMPLETED */ });
  }
  hide() {
    this.bannerElements.forEach((el) => {
      el.style.display = "none";
    });
  }
};
var AdsByGoogleAdProvider = class {
  constructor(name, type, displayName, preloader, logger) {
    this.name = name;
    this.type = type;
    this.displayName = displayName;
    this.preloader = preloader;
    this.logger = logger;
    this.ready = false;
  }
  getName() {
    return this.name;
  }
  getType() {
    return this.type;
  }
  isReady() {
    return this.ready;
  }
  useManualControl() {
    return false;
  }
  async init(_config, _tracker, adTracker) {
    this.adTracker = adTracker;
    this.preloader.readyPromise.then((r) => {
      this.ready = r;
    }).catch((err) => {
      this.logger.error("[adsbygoogle] AdsByGoogleProvider init error", err);
    });
  }
  show() {
    if (!this.ready) {
      return Promise.resolve({
        success: false,
        code: "nofill" /* NOFILL */,
        message: "Not ready"
      });
    }
    this.adTracker.willShowAd(false);
    return new Promise((resolve) => {
      const opts = {
        type: this.type,
        adBreakDone: (info) => resolve(this.mapAdBreakResult(info))
      };
      if (this.type === "reward" /* REWARD */) {
        opts.beforeReward = (grant) => grant();
        opts.afterReward = () => {
        };
        opts.adDismissed = () => {
        };
      }
      window.adsbygoogle.push(opts);
    });
  }
  mapAdBreakResult(info) {
    switch (info.breakStatus) {
      case "timedOut":
        this.adTracker.finishedAd("timedOut" /* TIMED_OUT */);
        return { success: false, code: "timedOut" /* TIMED_OUT */, message: "Ad timed out" };
      case "error":
      case "noAdPreloaded":
      case "notReady":
        this.adTracker.finishedAd("error" /* ERROR */);
        return { success: false, code: "nofill" /* NOFILL */, message: "No ad preloaded" };
      case "frequencyCapped":
        this.adTracker.finishedAd("dismissed" /* DISMISSED */);
        return { success: false, code: "close" /* CLOSE */, message: "Frequency capped" };
      case "ignored":
      case "other":
        this.adTracker.finishedAd("success" /* SUCCESS */);
        return { success: true, code: "completed" /* COMPLETED */ };
      case "viewed":
        this.adTracker.finishedAd("userInput" /* USER_INPUT */);
        return { success: true, code: "completed" /* COMPLETED */ };
      case "dismissed":
        this.adTracker.finishedAd("dismissed" /* DISMISSED */);
        this.preloader.preload();
        return { success: false, code: "close" /* CLOSE */, message: "Ad dismissed" };
      case "noAdPreloaded2":
        this.adTracker.finishedAd("dismissed" /* DISMISSED */);
        return { success: false, code: "nofill" /* NOFILL */, message: "Not ready" };
      default:
        this.adTracker.finishedAd("error" /* ERROR */);
        return { success: false, code: "nofill" /* NOFILL */, message: "Ad error" };
    }
  }
  hide() {
  }
};
var MetapixelAnalyticsProvider = class _MetapixelAnalyticsProvider {
  constructor(pixelId, logger) {
    this.pixelId = pixelId;
    this.logger = logger;
    this.announced = false;
    this.scriptIsLoaded = false;
  }
  static {
    this.CONSENT_FLAGS = 8 /* P4PersonalizedAds */ | 2 /* P2SelectBasicAds */ | 64 /* P7MeasureAdPerformance */;
  }
  async init(consentProvider) {
    this.addFacebookMetaPixelQueue();
    consentProvider.onConsentChanged((consents) => {
      if ((consents & _MetapixelAnalyticsProvider.CONSENT_FLAGS) === _MetapixelAnalyticsProvider.CONSENT_FLAGS) {
        this.injectFacebookMetaPixelLoader();
      }
    });
  }
  getName() {
    return "metapixel-analytics";
  }
  track(event, _props, payload, _ctx) {
    switch (event) {
      case "page_loading":
        this.fbqTrack("PageView");
        break;
      case "purchase":
        this.fbqTrack("Purchase", {
          currency: payload.currencyCode,
          value: payload.priceValue
        });
        break;
    }
  }
  fbqTrack(event, params) {
    if (window.fbq) {
      if (!this.announced) {
        this.logger.debug("[metapixel-analytics] tracking fbq event", "init", this.pixelId);
        window.fbq("init", this.pixelId);
        this.announced = true;
      }
      this.logger.debug("[metapixel-analytics] tracking fbq event", event, params);
      if (params !== void 0) window.fbq("track", event, params);
      else window.fbq("track", event);
    } else {
      this.logger.error("[metapixel-analytics] window.fbq not found, enqueueing event");
    }
  }
  addFacebookMetaPixelQueue() {
    if (window.fbq) return;
    this.logger.debug("[metapixel-analytics] installing metapixel queue");
    this.appendScript(
      `
    !function(f,b,e,v,n,t,s)
    {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
    n.callMethod.apply(n,arguments):n.queue.push(arguments)};
    if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
    n.queue=[];}(window, document,'script',
    'https://connect.facebook.net/en_US/fbevents.js');
    `
    );
  }
  injectFacebookMetaPixelLoader() {
    if (this.scriptIsLoaded) return;
    this.logger.debug("[metapixel-analytics] installing metapixel loader");
    this.appendScript(`
    !function(f,b,e,v,n,t,s)
    {t=b.createElement(e);t.async=!0;
    t.src=v;s=b.getElementsByTagName(e)[0];
    s.parentNode.insertBefore(t,s)}(window, document,'script',
    'https://connect.facebook.net/en_US/fbevents.js');
    `);
    this.scriptIsLoaded = true;
  }
  appendScript(src) {
    const script = document.createElement("script");
    const text = document.createTextNode(src);
    script.appendChild(text);
    window.document.getElementsByTagName("script")[0].appendChild(script);
  }
};
var PlayerStorageClient = class {
  constructor(baseUrl, auth, logger) {
    this.auth = auth;
    this.logger = logger;
    this.baseUrl = baseUrl.replace(/\/$/, "");
  }
  async getQuery(keys, gameId, keyList) {
    const params = new URLSearchParams();
    if (keys !== void 0) params.set("keys", keys ?? "");
    if (gameId !== void 0) params.set("gameId", gameId ?? "");
    if (keyList !== void 0) params.set("keyList", keyList ?? "");
    const res = await this.auth?.authenticatedFetch(
      `${this.baseUrl}/player/query?${params.toString()}`,
      { method: "GET", headers: { "Content-Type": "application/json" } }
    );
    if (!res?.ok) throw new PlayerStorageError(res);
    return res.json();
  }
  async getAllPlayerObjects(userId, gameId, keys) {
    const params = new URLSearchParams();
    if (keys !== void 0) params.set("keys", keys ?? "");
    const res = await this.auth?.authenticatedFetch(
      `${this.baseUrl}/player/${userId}/${gameId}?${params.toString()}`,
      { method: "GET", headers: { "Content-Type": "application/json" } }
    );
    if (!res?.ok) throw new PlayerStorageError(res);
    return res.json();
  }
  async getPlayerSummary(userId, gameId) {
    const res = await this.auth?.authenticatedFetch(
      `${this.baseUrl}/player/${userId}/${gameId}?summary=true`,
      { method: "GET", headers: { "Content-Type": "application/json" } }
    );
    if (!res?.ok) throw new PlayerStorageError(res);
    const body = await res.json();
    if (typeof body?.exists === "boolean") return { exists: body.exists };
    if (Array.isArray(body?.items)) return { exists: body.items.length > 0 };
    throw new PlayerStorageError(res);
  }
  async upsertItem(userId, gameId, key, value) {
    const res = await this.auth?.authenticatedFetch(
      `${this.baseUrl}/player/${userId}/${gameId}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, value })
      }
    );
    if (!res?.ok) throw new PlayerStorageError(res);
  }
  async deletePlayerObject(userId, gameId, key, value) {
    const res = await this.auth?.authenticatedFetch(
      `${this.baseUrl}/player/${userId}/${gameId}/${key}`,
      {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(value)
      }
    );
    if (!res?.ok) throw new PlayerStorageError(res);
  }
};
var PlayerStorageError = class extends Error {
  constructor(response) {
    super(response.statusText);
    this.status = response.status;
  }
};
var CachePolicy = /* @__PURE__ */ ((CachePolicy2) => {
  CachePolicy2["HIGHEST"] = "highest";
  CachePolicy2["LATEST"] = "latest";
  return CachePolicy2;
})(CachePolicy || {});
var LeaderboardEntry = class {
  constructor(data) {
    this.id = data.id;
    Object.assign(this, data);
  }
};
var Tournament = class {
  constructor(data) {
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
};
var LeaderboardClient = class {
  constructor(env) {
    this.env = env;
    this.leaderboards = {};
  }
  init(gameId, env) {
    this.apiUrl = {
      ["production" /* PRODUCTION */]: "https://crucible.frvr.com",
      ["beta" /* BETA */]: "https://staging.crucible.frvr.com",
      ["development" /* DEVELOPMENT */]: "https://staging.crucible.frvr.com"
    }[env];
    this.gameId = gameId;
    this.leaderboards = {};
  }
  setChannel(channel) {
    this.channel = channel;
  }
  async create(type, opts) {
    const url = `${this.apiUrl}/v1/leaderboards`;
    const body = {
      game: this.gameId,
      title: opts.title,
      endTime: opts.endTime,
      refreshInterval: opts.refreshInterval,
      type: type || "default",
      data: opts.payload,
      sortOrder: opts.sortOrder || "HIGHER_IS_BETTER"
    };
    if (opts.id) body.id = opts.id;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    const json = await res.json();
    if (!res.ok) throw new LeaderboardError(json.error);
    return json.id;
  }
  async getLeaderboard(id, count = 30, offset = 0, cachePolicy = "highest" /* HIGHEST */) {
    const url = `${this.apiUrl}/v1/leaderboards/${this.gameId}/${id}`;
    const params = { count: count.toString(), offset: offset.toString() };
    const res = await fetch(`${url}?${new URLSearchParams(params)}`);
    const json = await res.json();
    if (!res.ok) throw new LeaderboardError(json.error);
    json.payload = json.data;
    if (json.players) {
      json.players = json.players.map((p) => {
        const entry = new LeaderboardEntry(p);
        entry.score = this.getCachedScore(id, entry.id, entry.score, cachePolicy);
        return entry;
      });
    }
    return new Tournament(json);
  }
  async getLeaderboardEntry(id, playerId, cachePolicy = "highest" /* HIGHEST */) {
    const url = `${this.apiUrl}/v1/leaderboards/${this.gameId}/${id}/${playerId}`;
    const params = { platform: this.channel };
    const res = await fetch(`${url}?${new URLSearchParams(params)}`);
    const json = await res.json();
    if (!res.ok) throw new LeaderboardError(json.error);
    json.payload = json.data;
    json.score = this.getCachedScore(id, playerId, json.score, cachePolicy);
    return new LeaderboardEntry(json);
  }
  async postScore(leaderboardId, playerId, score, name, payload, cachePolicy = "highest" /* HIGHEST */) {
    this.applyStatus(leaderboardId, playerId, score, cachePolicy);
    const url = `${this.apiUrl}/v1/leaderboards/${this.gameId}/${leaderboardId}`;
    const body = {
      id: playerId,
      score,
      platform: this.channel,
      disableSortOrder: cachePolicy === "latest" /* LATEST */
    };
    if (name) body.name = name;
    if (payload) body.extra = payload;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    const json = await res.json();
    if (!res.ok) throw new LeaderboardError(json.error);
    return json;
  }
  async getAllLeaderboardsIdsOfType(opts) {
    return (await this.getAllLeaderboardsOfType({ ...opts, verbose: false })).ids || [];
  }
  async getAllLeaderboardsDataOfType(opts) {
    return (await this.getAllLeaderboardsOfType({ ...opts, verbose: true })).leaderboards || [];
  }
  async getAllLeaderboardsOfType(opts) {
    const url = `${this.apiUrl}/v1/leaderboards/${this.gameId}/${opts.playerId}`;
    const params = {
      type: opts.type,
      platform: this.channel,
      sortOrder: opts.sortOrder || "LATEST",
      sortBy: opts.sortBy || "created",
      count: (opts.count || 30).toString(),
      offset: (opts.offset || 0).toString(),
      verbose: opts.verbose ? "true" : "false"
    };
    const res = await fetch(`${url}?${new URLSearchParams(params)}`);
    const json = await res.json();
    if (!res.ok) throw new LeaderboardError(json.error);
    return json;
  }
  async getLeaderboardEntries(leaderboardId, players, cachePolicy = "highest" /* HIGHEST */) {
    if (!players.length) return [];
    const url = `${this.apiUrl}/v1/leaderboards/${this.gameId}/${leaderboardId}/entries`;
    const params = { platform: this.channel, players: players.join(",") };
    const res = await fetch(`${url}?${new URLSearchParams(params)}`);
    const json = await res.json();
    if (!res.ok) throw new LeaderboardError(json.error);
    return (json?.items || []).map((e) => {
      e.payload = e.data;
      e.score = this.getCachedScore(leaderboardId, e.id, e.score, cachePolicy);
      return new LeaderboardEntry(e);
    });
  }
  async getLeaderboardTimeline(opts) {
    const url = `${this.apiUrl}/v1/leaderboards/${this.gameId}/${opts.leaderboardId}/timeline`;
    const params = {
      platform: this.channel,
      interval: opts.interval.toString(),
      minInterval: opts.minScore.toString(),
      maxInterval: opts.maxScore.toString(),
      entries: opts.limit?.toString(),
      page: opts.page?.toString()
    };
    const search = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v !== void 0) search.set(k, v);
    const res = await fetch(`${url}?${search}`);
    const json = await res.json();
    if (!res.ok) throw new LeaderboardError(json.error);
    return (json?.items || []).map((e) => new LeaderboardEntry(e));
  }
  buildScoreCache(id) {
    if (!this.leaderboards[id]) this.leaderboards[id] = { scores: {} };
    return this.leaderboards[id];
  }
  getCachedScore(leaderboardId, playerId, score, policy) {
    const cache = this.buildScoreCache(leaderboardId);
    const prev = cache.scores[playerId];
    if (!policy) throw new Error("Somehow, we are missing cache policy!");
    switch (policy) {
      case "highest" /* HIGHEST */:
        score = Math.max(prev ?? 0, score);
        cache.scores[playerId] = score;
        break;
      case "latest" /* LATEST */:
        score = prev ?? score;
        break;
    }
    return score;
  }
  applyStatus(leaderboardId, playerId, score, policy) {
    const cache = this.buildScoreCache(leaderboardId);
    const prev = cache.scores[playerId];
    if (!policy) throw new Error("Somehow, we are missing cache policy!");
    switch (policy) {
      case "highest" /* HIGHEST */:
        score = Math.max(prev ?? 0, score);
        break;
      case "latest" /* LATEST */:
        break;
    }
    cache.scores[playerId] = score;
  }
};
var LeaderboardError = class extends Error {
  constructor(code, message) {
    super(message ?? code);
    this.code = code;
  }
};
var ChannelLeaderboardProvider = class {
  constructor(env, channel, auth) {
    this.env = env;
    this.channel = channel;
    this.auth = auth;
    this.client = new LeaderboardClient(env);
    this.client.setChannel(channel);
  }
  init(gameId, env) {
    this.client.init(gameId, env);
    this.client.setChannel(this.channel);
  }
  isSupported() {
    return true;
  }
  getLeaderboardEntries(id, players, policy) {
    return this.client.getLeaderboardEntries(id, players, policy);
  }
  getLeaderboardEntry(id, playerId, policy) {
    return this.client.getLeaderboardEntry(id, playerId, policy);
  }
  getLeaderboard(id, count, offset, policy) {
    return this.client.getLeaderboard(id, count, offset, policy);
  }
  async postScore(id, score, extra) {
    const playerId = this.auth?.getFRVRID?.();
    if (!playerId) throw new Error("Cannot post a leaderboard score without an authenticated FRVR ID");
    return this.client.postScore(id, playerId, score, void 0, extra);
  }
  create(id, options) {
    return this.client.create(options?.type ?? "default", { ...options, id });
  }
  getTimelineEntries(options) {
    return this.client.getLeaderboardTimeline(options);
  }
};
var noopConsentProvider = {
  async init() {
  },
  getName: () => "NoopConsentProvider",
  onConsentChanged() {
  },
  hasConsentForAny: () => false,
  hasConsentForAll: () => false,
  getConsents: () => 0 /* None */,
  getLegitimateInterests: () => 0 /* None */,
  hasLoaded: () => false,
  isConsentEditable: () => false,
  showConsentPreferences() {
  },
  isReady: () => false
};
var TcfV2ConsentProvider = class {
  constructor(config, logger) {
    this.config = config;
    this.logger = logger;
    this.consentsBitSet = 0 /* None */;
    this.legitimateInterestsBitSet = 0 /* None */;
    this.loaded = false;
    this.googleFcInjected = false;
    this.inheritedCmp = false;
    this.noCmpFallbackApplied = false;
    this.onConsentChangedHandlers = [];
    this.installInheritedTcfApi();
  }
  bitsFromConsents(consents) {
    let bits = 0;
    for (const key in consents) if (consents[key]) bits |= 1 << Number(key);
    return bits;
  }
  setupTcfApiListener() {
    if (!window.__tcfapi) return;
    this.logger.log(`${this.getName()}::onLoad()`);
    const callback = (data, success) => {
      if (!success || data.eventStatus !== "tcloaded" && data.eventStatus !== "useractioncomplete") return;
      this.loaded = true;
      this.noCmpFallbackApplied = false;
      this.consentsBitSet = this.bitsFromConsents(data.purpose?.consents ?? {});
      this.legitimateInterestsBitSet = this.bitsFromConsents(data.purpose?.legitimateInterests ?? {});
      this.dispatchConsentChanged(this.consentsBitSet, this.legitimateInterestsBitSet);
    };
    window.__tcfapi("addEventListener", 2, callback);
  }
  dispatchConsentChanged(consents, li) {
    for (let i = 0; i < this.onConsentChangedHandlers.length; i++) {
      this.onConsentChangedHandlers[i](consents, li);
    }
  }
  hasLoaded() {
    return this.loaded;
  }
  isConsentEditable() {
    return !this.inheritedCmp && !this.noCmpFallbackApplied;
  }
  async init(config) {
    const cfg = config;
    const googleFcPropertyId = cfg?.googleFcPropertyId;
    if (!window.__tcfapi) {
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
  installInheritedTcfApi() {
    let found = null;
    let w = window;
    while (w) {
      try {
        if (w.frames["__tcfapiLocator"]) {
          found = w;
          break;
        }
      } catch {
      }
      if (w === window.top) break;
      w = w.parent === w ? null : w.parent;
    }
    if (!found || found === window) return false;
    const callbacks = {};
    let callId = 0;
    window.addEventListener(
      "message",
      (event) => {
        let data = event.data;
        if (typeof data === "string") {
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
          if (call.command !== "addEventListener") delete callbacks[call.callId];
        }
      },
      false
    );
    window.__tcfapi = (command, version, cb, parameter) => {
      callId += 1;
      const id = `__tcfapiReturn${callId}`;
      callbacks[id] = cb;
      found.postMessage(
        { __tcfapiCall: { command, version, callId: id, parameter } },
        "*"
      );
    };
    this.inheritedCmp = true;
    return true;
  }
  waitForTcfApi() {
    let delay2 = 1;
    const check = () => {
      if (window.__tcfapi) this.setupTcfApiListener();
      else {
        setTimeout(check, delay2);
        delay2 *= 2;
        if (delay2 > 4e3) delay2 = 4e3;
      }
    };
    check();
  }
  injectGoogleFundingChoices(propertyId) {
    this.logger.log(`${this.getName()}::injecting Google Funding Choices for ${propertyId}`);
    this.googleFcInjected = true;
    const script = document.createElement("script");
    script.async = true;
    script.src = `https://fundingchoicesmessages.google.com/i/${propertyId}?ers=1`;
    script.onerror = () => {
      this.logger.warn(`${this.getName()}::Google Funding Choices script failed to load`);
      this.scheduleNoCmpFallback();
    };
    document.head.appendChild(script);
    this.signalGooglefcPresent();
  }
  signalGooglefcPresent() {
    if (window.googlefc?.present) return;
    if (!document.body) {
      setTimeout(() => this.signalGooglefcPresent(), 0);
      return;
    }
    const div = document.createElement("div");
    div.style.width = "0";
    div.style.height = "0";
    div.style.display = "none";
    div.id = "googlefcPresent";
    document.body.appendChild(div);
  }
  scheduleNoCmpFallback(timeout = 5e3) {
    if (this.noCmpFallbackTimer !== void 0 || this.loaded) return;
    this.noCmpFallbackTimer = window.setTimeout(() => {
      if (this.loaded || window.__tcfapi) return;
      this.logger.warn(`${this.getName()}::no CMP present, falling back to consent-to-all`);
      this.noCmpFallbackApplied = true;
      this.loaded = true;
      this.consentsBitSet = 2046 /* All */;
      this.legitimateInterestsBitSet = 2046 /* All */;
      this.dispatchConsentChanged(this.consentsBitSet, this.legitimateInterestsBitSet);
    }, timeout);
  }
  showConsentPreferences() {
    if (this.inheritedCmp) {
      this.logger.warn(`${this.getName()}::consentToTerms(NoOpImpl)`);
      return;
    }
    if (this.googleFcInjected || window.googlefc) {
      const fc = window.googlefc = window.googlefc ?? {};
      fc.callbackQueue = fc.callbackQueue ?? [];
      fc.callbackQueue.push({
        CONSENT_DATA_READY: () => fc.showRevocationMessage?.()
      });
      return;
    }
    this.logger.warn(`${this.getName()}::consentToTerms(owned by the embedding page)`);
  }
  isReady() {
    return true;
  }
  onConsentChanged(cb) {
    this.onConsentChangedHandlers.push(cb);
    if (this.loaded) cb(this.consentsBitSet, this.legitimateInterestsBitSet);
  }
  hasConsentForAny(bits, _fallback = 0 /* None */) {
    return this.hasLoaded() && (this.consentsBitSet & bits) !== 0;
  }
  hasConsentForAll(bits, _fallback = 0 /* None */) {
    return this.hasLoaded() && (this.consentsBitSet & bits) === bits;
  }
  getConsents() {
    return this.consentsBitSet;
  }
  getLegitimateInterests() {
    return this.legitimateInterestsBitSet;
  }
  getName() {
    return "TcfV2ConsentProvider";
  }
};
var CookieproConsentProvider = class extends TcfV2ConsentProvider {
  constructor(config, logger) {
    super(config, logger);
    this.cookieproLoaded = false;
  }
  getName() {
    return "CookieproConsentProvider";
  }
  async init(config) {
    const script = document.createElement("script");
    script.type = "text/javascript";
    script.src = "https://cookie-cdn.cookiepro.com/scripttemplates/otSDKStub.js";
    script.setAttribute("data-domain-script", config.websiteKey);
    script.async = true;
    script.defer = true;
    script.onload = () => {
      if (!this.cookieproLoaded) {
        this.cookieproLoaded = true;
        this.waitForTcfApi?.();
      }
    };
    document.head.appendChild(script);
    const inline = document.createElement("script");
    inline.type = "text/javascript";
    inline.textContent = "function OptanonWrapper() { }";
    document.head.appendChild(inline);
    const style = document.createElement("style");
    style.setAttribute("type", "text/css");
    style.textContent = "div#ot-sdk-btn-floating { display: none !important; }";
    document.head.appendChild(style);
  }
  showConsentPreferences() {
    if (this.hasLoaded()) window.OneTrust?.ToggleInfoDisplay();
  }
};
var IAPError = class extends Error {
  constructor(message, options, code = "UNKNOWN" /* UNKNOWN */) {
    super(message);
    this.code = code;
    this.cause = options?.cause;
  }
};
var IAPPurchaseErrorCancelledByUser = class extends IAPError {
  constructor(msg = "Purchase cancelled by user", opts) {
    super(msg, opts, "CANCELLED_BY_USER" /* CANCELLED_BY_USER */);
    this.name = "IAPPurchaseErrorCancelledByUser";
  }
};
var IAPPurchaseErrorAlreadyOwned = class extends IAPError {
  constructor(msg = "Purchase already owned", opts) {
    super(msg, opts, "ALREADY_OWNED" /* ALREADY_OWNED */);
  }
};
var IAPPurchaseErrorPopupBlocked = class extends IAPError {
  constructor(msg = "The payment window was blocked by the browser", opts) {
    super(msg, opts, "POPUP_BLOCKED" /* POPUP_BLOCKED */);
    this.maybePaid = true;
    this.name = "IAPPurchaseErrorPopupBlocked";
  }
};
var IAPPurchaseErrorPending = class extends IAPError {
  constructor(msg = "Payment received; the purchase is still being confirmed", opts) {
    super(msg, opts, "HELD_BY_ECONOMY" /* HELD_BY_ECONOMY */);
  }
};
var WebIAPReadyManager = class {
  constructor(requiredStates, handler) {
    this.requiredStates = requiredStates;
    this.handler = handler;
    this._isReady = false;
    this.states = {};
    for (const s of requiredStates) this.states[s] = false;
    this.updateIsReady();
  }
  updateIsReady() {
    const prev = this._isReady;
    this._isReady = this.requiredStates.every((s) => this.states[s]);
    if (prev !== this._isReady) this.handler(this._isReady);
  }
  setState(state, value) {
    this.states[state] = value;
    this.updateIsReady();
  }
  getState(state) {
    return this.states[state];
  }
  get isReady() {
    return this._isReady;
  }
};
var XsollaIAPProvider = class {
  constructor(serviceClient, auth, gameId, logger) {
    this.serviceClient = serviceClient;
    this.auth = auth;
    this.gameId = gameId;
    this.logger = logger;
    this.name = "web-xsolla";
    this.products = [];
    this.backfilled = [];
    this.isReadyFlag = false;
    this.catalogLoaded = false;
    this.popupInFlight = false;
    this.paystationLoadingPromise = null;
  }
  getName() {
    return this.name;
  }
  getDisplayName() {
    return "Xsolla";
  }
  async init() {
    this.auth.onAuthChanged((loggedIn) => {
      if (loggedIn && !this.catalogLoaded) this.loadCatalog();
    });
    await this.loadCatalog();
  }
  async configure() {
  }
  async loadCatalog() {
    try {
      const products = await this.serviceClient.getXsollaProducts();
      this.products = products ?? [];
      this.catalogLoaded = true;
      this.updateIsReady(this.catalogProducts().length > 0);
    } catch (err) {
      this.logger.error("[web-xsolla] failed to load catalog", err);
    }
  }
  isReady() {
    return this.isReadyFlag;
  }
  onIsReadyChanged(cb) {
    this.onIsReadyChangedHandler = cb;
  }
  updateIsReady(ready) {
    this.isReadyFlag = ready;
    this.onIsReadyChangedHandler?.(ready);
  }
  addProducts(products) {
    this.backfilled = mergeProducts(this.backfilled, products);
    this.updateIsReady(this.catalogProducts().length > 0);
  }
  catalogProducts() {
    return mergeProductsDistinct(this.products, this.backfilled);
  }
  getSkus() {
    const out = {};
    for (const p of this.catalogProducts()) out[p.sku] = { label: p.name, storeId: p.sku };
    return out;
  }
  getProductById(sku) {
    const p = this.catalogProducts().find((x) => x.sku === sku);
    if (!p) return null;
    return {
      price: formatCurrency(p.priceMinor, p.currency),
      priceValue: String(p.priceMinor),
      currencyCode: p.currency,
      label: p.name,
      trackingName: p.sku
    };
  }
  async purchase(sku, opts = {}) {
    if (typeof window === "undefined") throw new IAPError("[web-xsolla] needs a browser");
    if (this.popupInFlight) throw new IAPError("[web-xsolla] another payment is already in progress");
    this.popupInFlight = true;
    try {
      const provided = opts.provider_data;
      let purchaseId;
      let paymentUrl;
      if (provided) {
        purchaseId = String(opts.iap_transaction_id ?? sku);
        paymentUrl = opts.payment_url;
      } else {
        const quantity = opts.quantity ?? 1;
        const productId = this.products.find((p) => p.sku === sku)?._id ?? sku;
        const order = await this.serviceClient.createXsollaPaymentUrl({
          products: [{ productId, quantity }],
          metadata: { ...opts, returnUrl: stripTokenFromUrl() }
        });
        purchaseId = order.purchaseId;
        paymentUrl = order.payment_url;
      }
      const accessToken = new URL(paymentUrl).searchParams.get("access_token");
      if (!accessToken) throw new IAPError("[web-xsolla] payment url missing access_token");
      await this.loadPayStation();
      const widget = window.XPayStationWidget;
      if (!widget) throw new IAPError("[web-xsolla] Pay Station widget unavailable");
      return await new Promise((resolve, reject) => {
        let settled = false;
        const closeLightbox = () => {
          const el = document.querySelector(".xpaystation-widget-lightbox");
          if (el) el.remove();
        };
        const cleanup = () => {
          if (timeout) clearTimeout(timeout);
          widget.off();
          if (messageListener) window.removeEventListener("message", messageListener);
          closeLightbox();
        };
        const timeout = setTimeout(() => {
          if (settled) return;
          settled = true;
          cleanup();
          reject(new IAPError("[web-xsolla] paystation popup timed out"));
        }, 9e5);
        widget.show();
        closeLightbox();
        widget.on(widget.eventTypes.CLOSE, () => {
          if (settled) return;
          settled = true;
          clearTimeout(timeout);
          (async () => {
            if (opts.settle) await opts.settle();
            else if (!provided) await waitForSettlement(() => this.getXsollaTransaction(purchaseId), "web-xsolla", this.logger);
          })().then(() => {
            resolve({
              channelId: this.name,
              productId: sku,
              purchaseId,
              transactionId: purchaseId,
              transactionReceipt: { transactionId: purchaseId },
              gameId: this.gameId
            });
          }).catch(reject);
        });
        const onCancel = () => {
          if (settled) return;
          settled = true;
          cleanup();
          reject(new IAPPurchaseErrorCancelledByUser());
        };
        widget.on(widget.eventTypes.CLOSE_LIGHTBOX, onCancel);
        widget.on(widget.eventTypes.POPUP_BLOCKED, onCancel);
        const messageListener = (event) => {
          let payload;
          try {
            payload = typeof event.data === "string" ? JSON.parse(event.data) : event.data;
          } catch {
            return;
          }
          if (payload?.type === "CLOSE") onCancel();
        };
        window.addEventListener("message", messageListener);
        widget.init({
          access_token: accessToken,
          sandbox: paymentUrl.includes("sandbox"),
          lightbox: {
            width: "630px",
            height: "740px",
            zIndex: 2e9,
            spinner: "round"
          }
        });
        widget.open();
      });
    } finally {
      this.popupInFlight = false;
    }
  }
  loadPayStation() {
    if (window.XPayStationWidget) return Promise.resolve();
    if (this.paystationLoadingPromise) return this.paystationLoadingPromise;
    this.paystationLoadingPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.async = true;
      script.src = "https://static.xsolla.com/embed/paystation/1.0.7/widget.min.js";
      script.addEventListener("load", () => resolve());
      script.addEventListener("error", () => {
        this.paystationLoadingPromise = null;
        reject(new IAPError("[web-xsolla] failed to load Pay Station script"));
      });
      document.head.appendChild(script);
    });
    return this.paystationLoadingPromise;
  }
  async getXsollaTransaction(id) {
    const tx = await this.serviceClient.getXsollaTransaction(id);
    return mapTransactionStatus(tx?.status);
  }
  async consumePurchase(purchase) {
    const id = purchase.purchaseId ?? purchase.id;
    await this.serviceClient.consumeXsollaTransaction(id);
  }
  async getPurchasesToRecover() {
    if (!canFetchPurchases(this.auth)) return [];
    const txs = await this.serviceClient.listXsollaTransactions().catch(() => []);
    const skuByProductId = new Map(this.products.map((p) => [p._id, p.sku]));
    return (txs ?? []).filter((t) => t.status === "SUCCESS" && !t.order).map((t) => ({
      channelId: this.name,
      productId: skuByProductId.get(t.products[0]?.productId) ?? t.products[0]?.productId ?? "",
      purchaseId: t._id,
      transactionId: t._id,
      transactionReceipt: { transactionId: t._id },
      gameId: this.gameId
    }));
  }
};
var FRVR_EMBED_NAMESPACE = "frvr-embed";
var DEFAULT_PARENT_ORIGINS = [
  "https://frvr.com",
  "https://beta.frvr.com",
  "https://staging.frvr.com",
  "https://crucible.frvr.com"
];
var FrvrEmbedBridgeError = class _FrvrEmbedBridgeError extends Error {
  constructor(msg, code) {
    super(msg);
    this.code = code;
    Object.setPrototypeOf(this, _FrvrEmbedBridgeError.prototype);
  }
};
var FrvrEmbedBridge = class {
  constructor(config) {
    this.nextId = 1;
    this.pending = /* @__PURE__ */ new Map();
    this.listeners = /* @__PURE__ */ new Map();
    this.installed = false;
    this.parentOrigins = [...DEFAULT_PARENT_ORIGINS];
    this.setConfig(config);
  }
  setLogger(logger) {
    this.logger = logger;
  }
  setConfig(config) {
    if (config?.parentOrigins?.length) this.parentOrigins = [...config.parentOrigins];
  }
  isAvailable() {
    return isIframed();
  }
  ready() {
    if (!this.readyPromise) {
      this.readyPromise = this.doReady().then((info) => {
        this.readyInfo = info;
        return info;
      }).catch((err) => {
        this.readyPromise = void 0;
        throw err;
      });
    }
    return this.readyPromise;
  }
  hasCapability(name) {
    return !!this.readyInfo?.capabilities?.includes(name);
  }
  async request(method, params, timeoutMs = 5e3) {
    if (!this.isAvailable()) {
      throw new FrvrEmbedBridgeError(`[frvr-embed] bridge unavailable for ${method}`);
    }
    this.install();
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      const pending = { resolve, reject, timer: void 0 };
      if (timeoutMs > 0) {
        pending.timer = window.setTimeout(() => {
          this.pending.delete(id);
          reject(new FrvrEmbedBridgeError(`[frvr-embed] request ${method} timed out after ${timeoutMs}ms`));
        }, timeoutMs);
      }
      this.pending.set(id, pending);
      this.post({ ns: FRVR_EMBED_NAMESPACE, kind: "request", id, method, params });
    });
  }
  notify(method, params) {
    if (!this.isAvailable()) return;
    this.install();
    this.post({ ns: FRVR_EMBED_NAMESPACE, kind: "request", id: 0, method, params });
  }
  on(event, cb) {
    if (!this.listeners.has(event)) this.listeners.set(event, /* @__PURE__ */ new Set());
    this.listeners.get(event).add(cb);
    this.install();
  }
  off(event, cb) {
    this.listeners.get(event)?.delete(cb);
  }
  getTargetOrigins() {
    if (this.lockedOrigin) return [this.lockedOrigin];
    const referrer = this.getReferrerOrigin();
    if (referrer && this.parentOrigins.includes(referrer)) return [referrer];
    return this.parentOrigins;
  }
  getReferrerOrigin() {
    try {
      return document.referrer ? new URL(document.referrer).origin : void 0;
    } catch {
      return void 0;
    }
  }
  post(message) {
    try {
      for (const origin of this.getTargetOrigins()) {
        window.parent.postMessage(message, origin);
      }
    } catch (err) {
      this.logger?.error("[frvr-embed] failed to post bridge message", err);
      const p = this.pending.get(message.id);
      if (p) {
        this.pending.delete(message.id);
        clearTimeout(p.timer);
        p.reject(new FrvrEmbedBridgeError(`[frvr-embed] failed to post ${message.method}`));
      }
    }
  }
  install() {
    if (this.installed) return;
    this.installed = true;
    window.addEventListener("message", (event) => this.handleMessage(event));
  }
  isTrustedSender(event) {
    if (event.source !== window.parent) return false;
    if (this.lockedOrigin) return event.origin === this.lockedOrigin;
    return this.parentOrigins.includes(event.origin);
  }
  handleMessage(event) {
    if (!this.isTrustedSender(event)) return;
    const data = event.data;
    if (typeof data !== "object" || data?.ns !== FRVR_EMBED_NAMESPACE) return;
    if (data.kind === "response") {
      const pending = this.pending.get(data.id);
      if (!pending) return;
      this.lockedOrigin = this.lockedOrigin ?? event.origin;
      this.pending.delete(data.id);
      clearTimeout(pending.timer);
      if (data.ok) pending.resolve(data.data);
      else pending.reject(new FrvrEmbedBridgeError(data.message ?? "bridge request failed", data.code));
    } else if (data.kind === "event") {
      this.listeners.get(data.event)?.forEach((cb) => {
        try {
          cb(data.data);
        } catch (err) {
          this.logger?.error(`[frvr-embed] bridge event listener failed for ${data.event}`, err);
        }
      });
    }
  }
  async doReady() {
    const id = this.nextId++;
    const msg = {
      ns: FRVR_EMBED_NAMESPACE,
      kind: "request",
      id,
      method: "channel.ready",
      params: { authSession: "session", sessionChange: "session.stale" }
    };
    const interval = setInterval(() => this.post(msg), 500);
    return new Promise((resolve, reject) => {
      const timer = window.setTimeout(() => {
        clearInterval(interval);
        this.pending.delete(id);
        reject(new FrvrEmbedBridgeError("[frvr-embed] request channel.ready timed out"));
      }, 3e3);
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
        }
      });
      this.post(msg);
    });
  }
};
var BaseChannel = class {
  constructor() {
    this.env = "production" /* PRODUCTION */;
    this.channelConfig = {};
    this.characteristics = { ...defaultCharacteristics };
    this.config = {};
    this.promptsPurchaseLogin = false;
    this.entryPointProvider = {
      getEntryPointInfo: () => ({
        entry_point: new URLSearchParams(window.location.search).get("entry_point") ?? ""
      })
    };
  }
  onModulesUpdated(mods) {
    this.logger = mods.logger;
    this.tracker = mods.tracker;
    this.auth = mods.auth;
    this.buildConsentProvider();
  }
  setConfig(config) {
    this.gameId = config.gameId;
    this.config = config;
    this.consentConfig = config.consent;
    this.channelConfig = config.channels?.web?.config ?? {};
    this.characteristics = {
      ...defaultCharacteristics,
      ...this.channelConfig.characteristics
    };
  }
  setEnv(env) {
    this.env = env;
  }
  getId() {
    return this.getPlatformId();
  }
  getSdkNamespace() {
    return typeof window === "undefined" ? {} : window.FRVR_SDK ?? {};
  }
  buildConsentProvider() {
    if (this.consentProvider || !this.logger) return;
    const sdk = this.getSdkNamespace();
    const Provider = sdk.TcfV2ConsentProvider;
    if (Provider) {
      this.consentProvider = new Provider(this.consentConfig?.config, this.logger);
    } else {
      this.consentProvider = noopConsentProvider;
    }
  }
  async requestPurchaseLogin() {
    if (this.auth?.isLoggedIn?.()) return true;
    return false;
  }
  getChannelId() {
    return this.getPlatformId();
  }
  getName() {
    return "web";
  }
  getBootstrapper() {
    return new ChannelWebBootstrapper(this.logger ?? emptyLogger);
  }
  getConsentProvider() {
    return this.consentProvider ?? noopConsentProvider;
  }
  getCharacteristics() {
    return this.characteristics;
  }
  async getAdsConfig(config) {
    return { ...config, enabled: config?.enabled === true };
  }
  getAdsProviders(config) {
    if (config?.enabled !== true || !config.clientId) return [];
    const loader = new AdsByGoogleScriptLoader(
      () => Promise.resolve({ src: config.clientId, channel: config.channelId }),
      this.getPlatformId(),
      config.testMode === true
    );
    const configured = Array.isArray(config.providers) ? config.providers : [];
    const types = new Set(configured.map((provider) => provider.type));
    const providers = [];
    if (types.has("banner" /* BANNER */)) {
      providers.push(new AdsByGoogleBannerProvider(loader, this.logger ?? emptyLogger));
    }
    if (types.has("interstitial" /* INTERSTITIAL */)) {
      providers.push(
        new AdsByGoogleAdProvider(
          "web-interstitial",
          "interstitial" /* INTERSTITIAL */,
          "Interstitial",
          loader,
          this.logger ?? emptyLogger
        )
      );
    }
    if (types.has("reward" /* REWARD */)) {
      providers.push(
        new AdsByGoogleAdProvider(
          "web-reward",
          "reward" /* REWARD */,
          "Rewarded",
          loader,
          this.logger ?? emptyLogger
        )
      );
    }
    return providers;
  }
  getAnalyticsProviders(config, _env) {
    return Array.isArray(config?.providers) ? [...config.providers] : [];
  }
  getAnalyticsIDProvider(storage) {
    const Provider = this.getSdkNamespace().StorageIDProvider;
    return Provider ? new Provider(storage) : {
      init: async () => {
      },
      getName: () => "memory-id-provider",
      getUserSource: () => "in-memory",
      getPageSessionId: () => "",
      getPlaySessionId: () => "",
      getGlobalUserId: () => "",
      managesUnconsentedIds: () => false
    };
  }
  getLocalStorageProvider(config = this.config.storage) {
    if (config?.provider) return config.provider;
    const sdk = this.getSdkNamespace();
    const providers = Array.isArray(config?.providers) ? config.providers : ["localStorage", "memory"];
    try {
      return sdk.buildStorageProvider?.(providers) ?? new MemoryStorageProvider();
    } catch (error) {
      this.logger?.warn("[channel-web] configured storage unavailable; using memory storage", error);
      return new MemoryStorageProvider();
    }
  }
  getGameLocalStorageProvider(provider) {
    return provider;
  }
  getLeaderboardProvider() {
    return new ChannelLeaderboardProvider(this.env, this.getChannelId(), this.auth);
  }
  getLeaderboardsProvider() {
    return this.getLeaderboardProvider();
  }
  getCloudStorageProvider(config, _env) {
    return Promise.resolve(config?.provider);
  }
  getNavigationProvider(_config) {
    return this.getSdkNamespace().emptyNavigationProvider ?? {};
  }
  getProfile() {
    return this.channelConfig.profile;
  }
  getAuthProviders(_gameId, config = this.config.auth) {
    return Array.isArray(config?.providers) ? [...config.providers] : [];
  }
  getNotificationsProvider() {
    return this.getSdkNamespace().emptyNotificationsProvider ?? {};
  }
  getAudioStateProvider() {
    return this.channelConfig.audioStateProvider ?? EMPTY_AUDIO_STATE_PROVIDER;
  }
  getSocialProvider() {
    return this.channelConfig.socialProvider ?? EMPTY_SOCIAL_PROVIDER;
  }
  getLiveRoomProvider() {
    return this.channelConfig.liveRoomProvider ?? this.getSdkNamespace().emptyLiveRoomProvider ?? {};
  }
  getTournamentsProvider() {
    return this.channelConfig.tournamentsProvider ?? this.getSdkNamespace().emptyTournamentsProvider ?? {};
  }
  getChallengesProvider() {
    return this.channelConfig.challengesProvider ?? this.getSdkNamespace().emptyChallengesProvider ?? {};
  }
  getEntryPointProvider() {
    return this.entryPointProvider;
  }
  getShortcutProvider() {
    return this.getSdkNamespace().emptyShortcutProvider ?? {};
  }
  getCrosspromo() {
    return {};
  }
  getSetScoreProvider() {
    return {};
  }
  getTrackerContextProvider(config) {
    return config ?? {};
  }
  getSkippedAnalyticsEvents() {
    return [];
  }
  getPlatformId() {
    return this.channelConfig.channelId ?? "web";
  }
  getPlatform() {
    return this.channelConfig.platform ?? "web";
  }
  getIAPProviders(config = this.config.iap, serviceClient, auth = this.auth) {
    if (!config?.xsolla && !config?.providers?.some((provider2) => provider2 === "web-xsolla" || provider2?.name === "web-xsolla")) {
      return Promise.resolve([]);
    }
    const sdk = this.getSdkNamespace();
    const ServiceClient = sdk.IAPServiceClient;
    if (!serviceClient && !ServiceClient || !auth || !this.gameId) return Promise.resolve([]);
    const client = serviceClient ?? new ServiceClient({
      auth,
      channelId: this.getId(),
      env: this.env,
      hostOverride: config.hostOverride
    });
    const provider = new XsollaIAPProvider(
      client,
      auth,
      this.gameId,
      this.logger ?? emptyLogger
    );
    return Promise.resolve([provider]);
  }
};
var MemoryStorageProvider = class {
  constructor() {
    this.values = /* @__PURE__ */ new Map();
  }
  async setItems(items) {
    for (const { key, value } of items) this.values.set(key, value);
  }
  async getItems(keys) {
    return Object.fromEntries(keys.map((key) => [key, this.values.get(key)]));
  }
  async removeItems(keys) {
    for (const key of keys) this.values.delete(key);
  }
  async getAllKeys() {
    return [...this.values.keys()];
  }
  isPersistent() {
    return false;
  }
};
var EMPTY_AUDIO_STATE_PROVIDER = {
  isMuted: () => false,
  setMuted: () => {
  },
  onChanged: () => () => {
  }
};
var EMPTY_SOCIAL_PROVIDER = {
  getFriends: async () => [],
  inviteFriends: async () => {
  },
  share: async () => {
  }
};
var CHANNEL_RULES = {
  crazygames: { "==": [{ var: "query.crazygames" }, ""] },
  mspwa: {
    or: [
      { ">=": [{ var: "query.mspwa" }, ""] },
      { ">=": [{ var: "query.msstart_sdk_init" }, ""] }
    ]
  },
  discord: { endsWith: ["discord.com", { var: "location.host" }] },
  frvrEmbed: {
    and: [
      { ">=": [{ var: "query.frvr_embed" }, ""] },
      { "==": [{ var: "iframed" }, true] }
    ]
  }
};
function evaluateRule(expr, ctx) {
  if (typeof expr !== "object" || expr === null) return expr;
  const op = Object.keys(expr)[0];
  const val = expr[op];
  switch (op) {
    case "and":
      return val.every((e) => evaluateRule(e, ctx));
    case "or":
      return val.some((e) => evaluateRule(e, ctx));
    case "<":
      return evaluateRule(val[0], ctx) < evaluateRule(val[1], ctx);
    case ">":
      return evaluateRule(val[0], ctx) > evaluateRule(val[1], ctx);
    case "<=":
      return evaluateRule(val[0], ctx) <= evaluateRule(val[1], ctx);
    case ">=":
      return evaluateRule(val[0], ctx) >= evaluateRule(val[1], ctx);
    case "==":
      return evaluateRule(val[0], ctx) === evaluateRule(val[1], ctx);
    case "!=":
      return evaluateRule(val[0], ctx) !== evaluateRule(val[1], ctx);
    case "var":
      return val.split(".").reduce((acc, k) => acc && acc[k], ctx);
    case "in":
      return String(evaluateRule(val[1], ctx) ?? "").includes(
        evaluateRule(val[0], ctx)
      );
    case "endsWith":
      return String(evaluateRule(val[1], ctx) ?? "").endsWith(
        evaluateRule(val[0], ctx)
      );
    default:
      throw new Error(`Unknown operator: ${op}`);
  }
}
function detectChannel(rules = CHANNEL_RULES) {
  const url = new URLSearchParams(window?.location?.search);
  const ctx = {
    query: Object.fromEntries(url.entries()),
    document,
    location,
    buildTimePlatform: window.FRVR?.config?.buildTimePlatform,
    iframed: isIframed()
  };
  if (evaluateRule(rules.crazygames, ctx)) return new CrazyGamesChannel();
  if (evaluateRule(rules.mspwa, ctx)) return new MsPwaChannel();
  if (evaluateRule(rules.discord, ctx)) return new DiscordChannel();
  if (evaluateRule(rules.frvrEmbed, ctx)) return new FrvrEmbedChannel();
  return new WebChannel();
}
function installFrvrChannel() {
  const scope = window;
  const frvr = scope.FRVR;
  if (!frvr?.setChannel) {
    throw new Error("[channel-web] FRVR SDK must be loaded before its channel adapter");
  }
  const channel = detectChannel();
  frvr.setChannel(channel);
  return channel;
}
var WebChannel = class extends BaseChannel {
  getName() {
    return "web";
  }
};
var CrazyGamesChannel = class extends BaseChannel {
  getName() {
    return "crazygames";
  }
  getPlatformId() {
    return "crazygames";
  }
  getAdsProviders(config) {
    if (config?.enabled !== true) return [];
    const providers = Array.isArray(config.providers) ? config.providers : [];
    const sdk = window.CrazyGames?.SDK?.ad;
    if (!sdk?.requestAd) return [];
    return providers.filter((provider) => provider.type === "reward" /* REWARD */ || provider.type === "interstitial" /* INTERSTITIAL */).map(
      (provider) => new CrazyGamesAdProvider(
        provider.name,
        provider.type,
        sdk,
        this.logger ?? emptyLogger
      )
    );
  }
};
var MsPwaChannel = class extends BaseChannel {
  getName() {
    return "mspwa";
  }
  getPlatformId() {
    return "microsoft";
  }
  getPlatform() {
    return "microsoft";
  }
};
var DiscordChannel = class extends BaseChannel {
  getName() {
    return "discord";
  }
  getPlatformId() {
    return "discord";
  }
  getPlatform() {
    return "discord";
  }
};
var FrvrEmbedChannel = class extends BaseChannel {
  constructor() {
    super(...arguments);
    this.bridge = new FrvrEmbedBridge();
  }
  getName() {
    return "frvr-embed";
  }
  getPlatformId() {
    return "frvr-embed";
  }
  getNavigationProvider() {
    return {
      openExternalLink: (url) => this.bridge.request("navigation.openExternalLink", { url })
    };
  }
};
var CrazyGamesAdProvider = class {
  constructor(name, type, sdk, logger) {
    this.name = name;
    this.type = type;
    this.sdk = sdk;
    this.logger = logger;
    this.ready = true;
  }
  getName() {
    return this.name;
  }
  getType() {
    return this.type === "reward" /* REWARD */ ? "reward" /* REWARD */ : "interstitial" /* INTERSTITIAL */;
  }
  isReady() {
    return this.ready;
  }
  useManualControl() {
    return false;
  }
  async init(_config, _container, tracker) {
    this.tracker = tracker;
  }
  show() {
    if (!this.sdk?.requestAd || !this.tracker) {
      return Promise.resolve({ success: false, code: "nofill" /* NOFILL */ });
    }
    this.tracker.willShowAd(false);
    return new Promise((resolve) => {
      let settled = false;
      const finish = (result) => {
        if (settled) return;
        settled = true;
        this.tracker?.finishedAd(
          result.success ? "success" /* SUCCESS */ : "error" /* ERROR */
        );
        resolve(result);
      };
      try {
        this.sdk.requestAd(this.type === "reward" /* REWARD */ ? "rewarded" : "midgame", {
          adFinished: () => finish({ success: true, code: "completed" /* COMPLETED */ }),
          adError: (error) => {
            this.logger.warn("[crazygames] ad request failed", error);
            finish({ success: false, code: "error" /* ERROR */, message: String(error) });
          }
        });
      } catch (error) {
        this.logger.error("[crazygames] ad request threw", error);
        finish({ success: false, code: "error" /* ERROR */, message: String(error) });
      }
    });
  }
  hide() {
  }
};
function mergeProducts(existing, incoming) {
  const map = new Map(existing.map((p) => [p.sku ?? p.productId, p]));
  for (const p of incoming) {
    map.set(p.sku ?? p.productId, {
      sku: p.sku,
      name: p.label,
      price: p.priceMinor,
      currency: p.currencyCode,
      ...p.taxIncluded != null ? { taxIncluded: p.taxIncluded } : {},
      ...p.imageUrl ? { imageUrl: p.imageUrl } : {}
    });
  }
  return [...map.values()];
}
function mergeProductsDistinct(base, extra) {
  const seen = new Set(base.map((p) => p.sku));
  return [...base, ...extra.filter((p) => !seen.has(p.sku))];
}
function mapTransactionStatus(status) {
  if (status === "SUCCESS") return "settled";
  if (status === "REFUNDED") return "failed";
  return "pending";
}
function canFetchPurchases(auth) {
  try {
    if (!auth.isAuthorized()) return false;
    const platform = auth.getCurrentPlatform?.();
    return platform == null || String(platform) !== "discord";
  } catch {
    return false;
  }
}
function stripTokenFromUrl() {
  const url = new URL(window.location.href);
  for (const key of ["access-token", "access_token"]) url.searchParams.delete(key);
  return url.toString();
}
async function waitForSettlement(check, _label, logger, timeoutMs = 3e4) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const status = await check();
      if (status === "settled") return true;
      if (status === "failed") {
        logger?.warn(`${_label} transaction ended in a failed state; resolving anyway`);
        return false;
      }
    } catch (err) {
      logger?.debug(`${_label} transaction status check failed, retrying`, err);
    }
    await delay(Math.min(1e3, Math.max(0, deadline - Date.now())));
  }
  logger?.warn(`${_label} transaction not settled after ${timeoutMs}ms; resolving anyway`);
  return false;
}
var FRVR_SDK_VERSION = {
  v: "11.31.0",
  bts: "1790842899326",
  name: "web"
};
if (typeof window !== "undefined" && window.FRVR) {
  installFrvrChannel();
}
export {
  AdError,
  AdFinishedStatus,
  AdSuccess,
  AdType,
  AdsByGoogleAdProvider,
  AdsByGoogleBannerProvider,
  AdsByGoogleScriptLoader,
  BaseChannel,
  CURRENCY_EXPONENTS,
  CachePolicy,
  ChannelWebBootstrapper,
  ConsentPurpose,
  CookieproConsentProvider,
  CrazyGamesChannel,
  DiscordChannel,
  ElementWaiter,
  Env,
  FRVR_SDK_VERSION,
  FrvrEmbedBridge,
  FrvrEmbedBridgeError,
  FrvrEmbedChannel,
  IAPError,
  IAPErrorCode,
  IAPPurchaseErrorAlreadyOwned,
  IAPPurchaseErrorCancelledByUser,
  IAPPurchaseErrorPending,
  IAPPurchaseErrorPopupBlocked,
  LeaderboardClient,
  LeaderboardEntry,
  LeaderboardError,
  LifecycleSuspendReason,
  MetapixelAnalyticsProvider,
  MsPwaChannel,
  Platform,
  PlayerStorageClient,
  PlayerStorageError,
  TcfV2ConsentProvider,
  Tournament,
  ViewportObserver,
  WebChannel,
  WebIAPReadyManager,
  XsollaIAPProvider,
  convertToPriceValue,
  currencyExponent,
  defaultCharacteristics,
  delay,
  detectChannel,
  emptyLogger,
  formatCurrency,
  installFrvrChannel,
  isAndroid,
  isIframed,
  isMobileIOS,
  noopConsentProvider
};
