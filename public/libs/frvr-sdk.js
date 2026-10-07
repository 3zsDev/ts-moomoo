// src/sdk-libs/frvr-channel-web.ts
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
if (typeof window !== "undefined" && window.FRVR) {
  installFrvrChannel();
}

// src/sdk-libs/frvr-sdk.ts
var Env = /* @__PURE__ */ ((Env2) => {
  Env2["DEVELOPMENT"] = "development";
  Env2["BETA"] = "beta";
  Env2["PRODUCTION"] = "production";
  return Env2;
})(Env || {});
var LifecycleSuspendReason = /* @__PURE__ */ ((LifecycleSuspendReason2) => {
  LifecycleSuspendReason2["CHANNEL"] = "channel";
  LifecycleSuspendReason2["AD"] = "ad";
  LifecycleSuspendReason2["DEFAULT"] = "default";
  LifecycleSuspendReason2["PARENT_UI"] = "parent-ui";
  return LifecycleSuspendReason2;
})(LifecycleSuspendReason || {});
var Platform = /* @__PURE__ */ ((Platform2) => {
  Platform2["FRVR"] = "frvr";
  Platform2["ANONYMOUS"] = "anonymous";
  Platform2["FACEBOOK_INSTANT"] = "facebook-instant";
  Platform2["FACEBOOK_WEB"] = "facebook-web";
  Platform2["GOOGLE_INTERNAL"] = "google-internal";
  Platform2["SAMSUNG_INSTANT"] = "samsung-instant";
  Platform2["MICROSOFT"] = "microsoft";
  Platform2["DISCORD"] = "discord";
  Platform2["CRAZYGAMES"] = "crazy_games";
  Platform2["FRVR_EMBED"] = "frvr-embed";
  Platform2["MONDIA"] = "mondia";
  return Platform2;
})(Platform || {});
var AdType = /* @__PURE__ */ ((AdType2) => {
  AdType2["INTERSTITIAL"] = "interstitial";
  AdType2["REWARD"] = "reward";
  AdType2["BANNER"] = "banner";
  AdType2["SURVEY"] = "survey";
  AdType2["REWARDED_INTERSTITIAL"] = "rewarded-interstitial";
  return AdType2;
})(AdType || {});
var AdTypeProperties = {
  ["interstitial" /* INTERSTITIAL */]: { stopsGameFlow: true, throttleable: true },
  ["reward" /* REWARD */]: { stopsGameFlow: true, throttleable: false },
  ["banner" /* BANNER */]: { stopsGameFlow: false, throttleable: false },
  ["survey" /* SURVEY */]: { stopsGameFlow: true, throttleable: true },
  ["rewarded-interstitial" /* REWARDED_INTERSTITIAL */]: { stopsGameFlow: true, throttleable: true }
};
var AdSuccess = /* @__PURE__ */ ((AdSuccess2) => {
  AdSuccess2["DELIVERED"] = "delivered";
  AdSuccess2["COMPLETED"] = "completed";
  return AdSuccess2;
})(AdSuccess || {});
var AdError = /* @__PURE__ */ ((AdError2) => {
  AdError2["UNKNOWN"] = "unknown";
  AdError2["TIMED_OUT"] = "timedout";
  AdError2["NOFILL"] = "nofill";
  AdError2["CLOSE"] = "adclosed";
  AdError2["ERROR"] = "internalerror";
  return AdError2;
})(AdError || {});
var AdFinishedStatus = /* @__PURE__ */ ((AdFinishedStatus2) => {
  AdFinishedStatus2["ERROR"] = "error";
  AdFinishedStatus2["NOFILL"] = "nofill";
  AdFinishedStatus2["SKIPPED"] = "skipped";
  AdFinishedStatus2["SUCCESS"] = "success";
  AdFinishedStatus2["TIMED_OUT"] = "timed_out";
  return AdFinishedStatus2;
})(AdFinishedStatus || {});
var AdResponseStatus = /* @__PURE__ */ ((AdResponseStatus2) => {
  AdResponseStatus2["AD_CLOSED"] = "adclosed";
  AdResponseStatus2["AD_LEAVING_APPLICATION"] = "adleavingapplication";
  AdResponseStatus2["ERROR"] = "internalerror";
  AdResponseStatus2["INVALID_REQUEST"] = "invalidrequest";
  AdResponseStatus2["NETWORK_ERROR"] = "networkerror";
  AdResponseStatus2["NOFILL"] = "nofill";
  AdResponseStatus2["SUCCESS"] = "success";
  AdResponseStatus2["THROTTLED"] = "throttled";
  AdResponseStatus2["TIMEDOUT"] = "timedout";
  return AdResponseStatus2;
})(AdResponseStatus || {});
var AdsThrottlerResult = /* @__PURE__ */ ((AdsThrottlerResult2) => {
  AdsThrottlerResult2["NO_THROTTLING"] = "NO_THROTTLING";
  AdsThrottlerResult2["INIT_TIME"] = "INIT_TIME";
  AdsThrottlerResult2["FREQUENCY"] = "FREQUENCY";
  return AdsThrottlerResult2;
})(AdsThrottlerResult || {});
var AdShowResult = /* @__PURE__ */ ((AdShowResult2) => {
  AdShowResult2["NOT_DISPLAYED"] = "not_displayed";
  AdShowResult2["DELIVERED"] = "delivered";
  AdShowResult2["COMPLETED"] = "completed";
  return AdShowResult2;
})(AdShowResult || {});
var ConsentOptions = /* @__PURE__ */ ((ConsentOptions2) => {
  ConsentOptions2[ConsentOptions2["None"] = 0] = "None";
  ConsentOptions2[ConsentOptions2["P1StoreInformationOnADevice"] = 2] = "P1StoreInformationOnADevice";
  ConsentOptions2[ConsentOptions2["P2SelectBasicAds"] = 4] = "P2SelectBasicAds";
  ConsentOptions2[ConsentOptions2["P3PersonalizedAdsProfile"] = 8] = "P3PersonalizedAdsProfile";
  ConsentOptions2[ConsentOptions2["P4PersonalizedAds"] = 16] = "P4PersonalizedAds";
  ConsentOptions2[ConsentOptions2["P5PersonalizedContentProfile"] = 32] = "P5PersonalizedContentProfile";
  ConsentOptions2[ConsentOptions2["P6PersonalizedContent"] = 64] = "P6PersonalizedContent";
  ConsentOptions2[ConsentOptions2["P7MeasureAdPerformance"] = 128] = "P7MeasureAdPerformance";
  ConsentOptions2[ConsentOptions2["P8MeasureContentPerformance"] = 256] = "P8MeasureContentPerformance";
  ConsentOptions2[ConsentOptions2["P9MarketResearchForAudienceInsights"] = 512] = "P9MarketResearchForAudienceInsights";
  ConsentOptions2[ConsentOptions2["P10DevelopAndImproveProducts"] = 1024] = "P10DevelopAndImproveProducts";
  ConsentOptions2[ConsentOptions2["All"] = 2046] = "All";
  return ConsentOptions2;
})(ConsentOptions || {});
var IAPErrorCode = /* @__PURE__ */ ((IAPErrorCode2) => {
  IAPErrorCode2["UNKNOWN"] = "UNKNOWN";
  IAPErrorCode2["USER_INPUT"] = "USER_INPUT";
  IAPErrorCode2["INVALID_PARAM"] = "INVALID_PARAM";
  IAPErrorCode2["ALREADY_OWNED"] = "ALREADY_OWNED";
  IAPErrorCode2["HELD_BY_ECONOMY"] = "HELD_BY_ECONOMY";
  IAPErrorCode2["IN_PROGRESS"] = "IN_PROGRESS";
  IAPErrorCode2["POPUP_BLOCKED"] = "POPUP_BLOCKED";
  IAPErrorCode2["PENDING"] = "PENDING";
  return IAPErrorCode2;
})(IAPErrorCode || {});
var EconomyErrorCode = /* @__PURE__ */ ((EconomyErrorCode2) => {
  EconomyErrorCode2["UNKNOWN"] = "UNKNOWN";
  EconomyErrorCode2["ANONYMOUS_NOT_ALLOWED"] = "ANONYMOUS_NOT_ALLOWED";
  EconomyErrorCode2["LOGIN_REQUIRED"] = "LOGIN_REQUIRED";
  EconomyErrorCode2["PAYMENT_REJECTED"] = "PAYMENT_REJECTED";
  EconomyErrorCode2["PAYMENT_REFUNDED"] = "PAYMENT_REFUNDED";
  EconomyErrorCode2["PENDING"] = "PENDING";
  EconomyErrorCode2["SERVER_ERROR"] = "SERVER_ERROR";
  EconomyErrorCode2["NETWORK_ERROR"] = "NETWORK_ERROR";
  EconomyErrorCode2["NOT_LOGGED_IN"] = "NOT_LOGGED_IN";
  EconomyErrorCode2["PURCHASE_CANCELLED"] = "PURCHASE_CANCELLED";
  return EconomyErrorCode2;
})(EconomyErrorCode || {});
var ScoreCachePolicy = /* @__PURE__ */ ((ScoreCachePolicy2) => {
  ScoreCachePolicy2["HIGHEST"] = "highest";
  ScoreCachePolicy2["LATEST"] = "latest";
  return ScoreCachePolicy2;
})(ScoreCachePolicy || {});
var AnalyticsIDProviderStorageType = /* @__PURE__ */ ((AnalyticsIDProviderStorageType2) => {
  AnalyticsIDProviderStorageType2["IN_MEMORY"] = "in-memory";
  AnalyticsIDProviderStorageType2["COOKIE"] = "cookie";
  AnalyticsIDProviderStorageType2["LOCAL_STORAGE"] = "localStorage";
  return AnalyticsIDProviderStorageType2;
})(AnalyticsIDProviderStorageType || {});
var DEFAULT_ADS_CONFIG = {
  providers: [],
  throttling: { maxfrequency: 5e3 }
};
var SDK_VERSION = {
  v: "2.0.1",
  bts: "1790842895014",
  name: "14.25.14",
  hash: "e4b529c85d182e86c3dc572437e6b5c84b2f7d69"
};
var emptyLogger2 = {
  log: () => {
  },
  error: () => {
  },
  warn: () => {
  },
  info: () => {
  },
  debug: () => {
  }
};
var emptyTracker = { logEvent: () => {
}, logValuedEvent: () => {
} };
var Storage = class {
  constructor(provider, logger = emptyLogger2) {
    this.provider = provider;
    this.logger = logger;
  }
  setItems(items) {
    const encoded = items.map(({ key, value }) => ({
      key,
      value: JSON.stringify(value)
    }));
    return this.provider.setItems(encoded);
  }
  async getItems(keys) {
    const raw = await this.provider.getItems(keys);
    const out = {};
    for (const k in raw) {
      try {
        out[k] = JSON.parse(raw[k]);
      } catch (err) {
        out[k] = raw[k];
        this.logger.warn(`[storage] parsing error on key ${k}`, err.message);
      }
    }
    return out;
  }
  removeItems(keys) {
    return this.provider.removeItems(keys);
  }
  setItem(key, value) {
    return this.provider.setItems([{ key, value: JSON.stringify(value) }]);
  }
  async getItem(key, fallback) {
    let result;
    const raw = (await this.provider.getItems([key]))[key];
    try {
      result = raw !== void 0 ? JSON.parse(raw) : fallback;
    } catch (err) {
      result = fallback ?? raw;
      this.logger.warn(`[storage] parsing error on key ${key}`, err.message);
    }
    return result;
  }
  removeItem(key) {
    return this.provider.removeItems([key]);
  }
  isPersistent() {
    return this.provider.isPersistent();
  }
};
var CloudStorage = class extends Storage {
  constructor(options) {
    super(options.provider, options.logger ?? emptyLogger2);
  }
};
var COOKIE_TEST_KEY = "test-01e0e1c8-2a13-4fe9-b8d0-458a98c4fc89";
var WebLocalStorageProvider = class {
  static {
    this.providerName = "localStorage";
  }
  static isAvailable() {
    try {
      window.localStorage.setItem(COOKIE_TEST_KEY, "test");
      window.localStorage.removeItem(COOKIE_TEST_KEY);
      return true;
    } catch {
      return false;
    }
  }
  async setItems(items) {
    for (const { key, value } of items) window.localStorage.setItem(key, value);
  }
  async getItems(keys) {
    const out = {};
    for (const k of keys) {
      const v = window.localStorage.getItem(k);
      if (v !== null) out[k] = v;
    }
    return out;
  }
  async removeItems(keys) {
    for (const k of keys) window.localStorage.removeItem(k);
  }
  isPersistent() {
    return true;
  }
  async getAllKeys() {
    const out = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (k !== null) out.push(k);
    }
    return out;
  }
};
var MemoryAsyncStorageProvider = class {
  constructor() {
    this.values = {};
  }
  static {
    this.providerName = "memory";
  }
  async setItems(items) {
    for (const { key, value } of items) this.values[key] = value;
  }
  async getItems(keys) {
    const out = {};
    for (const k of keys) {
      const v = this.values[k];
      if (v !== void 0) out[k] = v;
    }
    return out;
  }
  async removeItems(keys) {
    for (const k of keys) delete this.values[k];
  }
  isPersistent() {
    return false;
  }
  async getAllKeys() {
    return Object.keys(this.values);
  }
};
var PrefixedStorageProvider = class {
  constructor(prefix, provider) {
    this.prefix = prefix;
    this.provider = provider;
  }
  async setItems(items) {
    return this.provider.setItems(items.map(({ key, value }) => ({ key: this.prefix + key, value })));
  }
  async getItems(keys) {
    const raw = await this.provider.getItems(keys.map((k) => this.prefix + k));
    const out = {};
    for (const k of keys) {
      const v = raw[this.prefix + k];
      if (v !== void 0) out[k] = v;
    }
    return out;
  }
  async removeItems(keys) {
    return this.provider.removeItems(keys.map((k) => this.prefix + k));
  }
  isPersistent() {
    return this.provider.isPersistent();
  }
};
function buildStorageProvider(providerNames) {
  for (const name of providerNames) {
    switch (name) {
      case WebLocalStorageProvider.providerName:
        if (WebLocalStorageProvider.isAvailable()) return new WebLocalStorageProvider();
        break;
      case MemoryAsyncStorageProvider.providerName:
        return new MemoryAsyncStorageProvider();
      default:
        throw new Error("Unsupported Local Storage provider");
    }
  }
  throw new Error("Error initializing Local Storage provider");
}
var defaultStorage = new Storage(new MemoryAsyncStorageProvider());
var emptyBootstrapper = {
  init: () => Promise.resolve(),
  setProgress: () => {
  },
  complete: () => Promise.resolve()
};
var defaultLifecycle = {
  onSuspend: () => {
  },
  onResume: () => {
  },
  onAudioSuspend: () => {
  },
  onAudioResume: () => {
  }
};
var RefcountedLifecycle = class {
  constructor(inner) {
    this.inner = inner;
    this.audioCounts = /* @__PURE__ */ new Map();
    this.gameCounts = /* @__PURE__ */ new Map();
  }
  audioSuspend(reason, force = false) {
    if (this.audioTotal() === 0) {
      this.inner.onAudioSuspend();
    } else if (force) {
      this.inner.onAudioSuspend();
      return;
    }
    this.audioCounts.set(reason, (this.audioCounts.get(reason) ?? 0) + 1);
  }
  audioResume(reason, force = false) {
    const cur = this.audioCounts.get(reason) ?? 0;
    if (cur !== 0) {
      if (cur === 1) this.audioCounts.delete(reason);
      else this.audioCounts.set(reason, cur - 1);
      if (this.audioTotal() === 0 || force) this.inner.onAudioResume();
    } else if (force) {
      this.inner.onAudioResume();
    }
  }
  gameSuspend(reason) {
    if (this.gameTotal() === 0) this.inner.onSuspend();
    this.gameCounts.set(reason, (this.gameCounts.get(reason) ?? 0) + 1);
  }
  gameResume(reason) {
    const cur = this.gameCounts.get(reason) ?? 0;
    if (cur !== 0) {
      if (cur === 1) this.gameCounts.delete(reason);
      else this.gameCounts.set(reason, cur - 1);
      if (this.gameTotal() === 0) this.inner.onResume();
    }
  }
  onSuspend() {
    this.gameSuspend("default" /* DEFAULT */);
  }
  onResume() {
    this.gameResume("default" /* DEFAULT */);
  }
  onAudioSuspend() {
    this.audioSuspend("default" /* DEFAULT */);
  }
  onAudioResume() {
    this.audioResume("default" /* DEFAULT */);
  }
  onShow() {
    this.inner.onShow?.();
  }
  onHide() {
    this.inner.onHide?.();
  }
  onGamePause() {
    this.inner.onGamePause?.();
  }
  isAudioSuspended() {
    return this.audioTotal() > 0;
  }
  isGameSuspended() {
    return this.gameTotal() > 0;
  }
  isAdActive() {
    return (this.gameCounts.get("ad" /* AD */) ?? 0) > 0 || (this.audioCounts.get("ad" /* AD */) ?? 0) > 0;
  }
  isAdOrChannelActive() {
    const check = (r) => (this.gameCounts.get(r) ?? 0) > 0 || (this.audioCounts.get(r) ?? 0) > 0;
    return check("ad" /* AD */) || check("channel" /* CHANNEL */);
  }
  audioTotal() {
    let n = 0;
    this.audioCounts.forEach((v) => n += v);
    return n;
  }
  gameTotal() {
    let n = 0;
    this.gameCounts.forEach((v) => n += v);
    return n;
  }
};
var EmptyShortcutError = class extends Error {
  constructor() {
    super(...arguments);
    this.code = "EMPTY_SHORTCUT";
    this.message = "Trying to use an empty interface.";
  }
};
var emptyShortcutProvider = {
  init: async () => {
  },
  canCreateShortcut: () => Promise.resolve(false),
  createShortcut: () => Promise.reject(new EmptyShortcutError())
};
var EmptyNavigationError = class extends Error {
  constructor() {
    super(...arguments);
    this.code = "EMPTY_NAVIGATE_IMPLEMENTATION";
    this.message = "Trying to use an empty interface.";
  }
};
var emptyNavigationProvider = {
  canNavigate: () => false,
  navigate: () => {
    throw new EmptyNavigationError();
  },
  canOpenChannelAppStore: () => false,
  openChannelAppStore: () => {
    throw new Error("EMPTY_OPEN_CHANNEL_STORE_IMPLEMENTATION");
  }
};
var emptyCrosspromo = {
  canCrosspromo: () => Promise.resolve(false),
  openGame: () => {
    throw new Error("Crosspromo not implemented");
  }
};
var Deferred = class extends Promise {
  constructor(executor) {
    let res;
    let rej;
    super((r, j) => {
      res = r;
      rej = j;
    });
    this.resolve = res;
    this.reject = rej;
    executor?.(res, rej);
  }
};
var emptyConsentProvider = {
  consentToTerms: () => {
  },
  onConsentChanged: () => {
  },
  hasConsentForAll: () => false,
  hasConsentForAny: () => false,
  consents: () => 0 /* None */,
  legitimateInterests: () => 0 /* None */,
  hasLoaded: () => false,
  isConsentEditable: () => false,
  supportsAutoInitialization: () => true
};
var noConsentConsentProvider = {
  consentToTerms: () => {
  },
  onConsentChanged: () => {
  },
  hasConsentForAll: () => true,
  hasConsentForAny: () => true,
  consents: () => 2046 /* All */,
  legitimateInterests: () => 2046 /* All */,
  hasLoaded: () => true,
  isConsentEditable: () => false,
  supportsAutoInitialization: () => false
};
var TcfBitSet = class {
  constructor(hex) {
    this.bits = "0";
    if (hex) this.parse(hex);
  }
  getRightmost1Index() {
    return this.bits.indexOf("1");
  }
  is1AtIndex(index) {
    return index >= 0 && this.bits.substring(index, index + 1) === "1";
  }
  set1AtIndex(index) {
    this.bits = this.bits.substring(0, index) + "1" + this.bits.substring(index + 1);
  }
  parse(hex) {
    if (!/^0x[a-f0-9]*$/i.test(hex)) {
      hex = "0x" + (Number(hex) || 0).toString(2).split("").reverse().join("").toString();
    }
    hex = hex.substring(2);
    this.bits = hex.split("").map((ch) => {
      let b = parseInt(ch, 16).toString(2);
      while (b.length < 4) b = "0" + b;
      return b;
    }).join("");
    return this;
  }
  toHexString() {
    return "0x" + this.bits.match(/(.{1,4})/g).map((chunk) => {
      while (chunk.length < 4) chunk += "0";
      return parseInt(chunk, 2).toString(16);
    }).join("");
  }
};
var TcfV2ConsentProvider = class {
  constructor(config, logger) {
    this.config = config;
    this.logger = logger;
    this.consentsBitSet = 0 /* None */;
    this.legitimateInterestsBitSet = 0 /* None */;
    this.consentIsLoaded = false;
    this.googleFcInjected = false;
    this.inheritedCmp = false;
    this.noCmpFallbackApplied = false;
    this.onConsentChangedHandlers = [];
    this.loadConsentManagementPlatform(config);
  }
  consentsToBitSet(consents) {
    let bits = 0;
    for (const k in consents) if (consents[k]) bits |= 1 << Number(k);
    return bits;
  }
  onLoad() {
    if (!window.__tcfapi) return;
    this.logger.log(`${this.getName()}::onLoad()`);
    window.__tcfapi("addEventListener", 2, (data, success) => {
      if (!success || data.eventStatus !== "tcloaded" && data.eventStatus !== "useractioncomplete")
        return;
      this.consentIsLoaded = true;
      this.noCmpFallbackApplied = false;
      this.consentsBitSet = this.consentsToBitSet(data.purpose?.consents ?? {});
      this.legitimateInterestsBitSet = this.consentsToBitSet(data.purpose?.legitimateInterests ?? {});
      this.dispatchConsentChanged(this.consentsBitSet, this.legitimateInterestsBitSet);
    });
  }
  dispatchConsentChanged(c, l) {
    for (let i = 0; i < this.onConsentChangedHandlers.length; i++) {
      this.onConsentChangedHandlers[i](c, l);
    }
  }
  hasLoaded() {
    return this.consentIsLoaded;
  }
  isConsentEditable() {
    return !this.inheritedCmp && !this.noCmpFallbackApplied;
  }
  loadConsentManagementPlatform(cfg) {
    const propertyId = cfg?.googleFcPropertyId;
    if (!window.__tcfapi) {
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
      (ev) => {
        let data = ev.data;
        if (typeof data === "string") {
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
      if (window.__tcfapi) this.onLoad();
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
    if (window.frames["googlefcPresent"]) return;
    if (!document.body) {
      setTimeout(() => this.signalGooglefcPresent(), 0);
      return;
    }
    const div = document.createElement("div");
    div.style.cssText = "width: 0; height: 0; border: none; z-index: -1000; left: -1000px; top: -1000px;";
    div.style.display = "none";
    div.id = "googlefcPresent";
    document.body.appendChild(div);
  }
  scheduleNoCmpFallback(timeout = 5e3) {
    if (this.noCmpFallbackTimer !== void 0 || this.consentIsLoaded) return;
    this.noCmpFallbackTimer = setTimeout(() => {
      if (this.consentIsLoaded || window.__tcfapi) return;
      this.logger.warn(`${this.getName()}::no CMP present, falling back to consent-to-all`);
      this.noCmpFallbackApplied = true;
      this.consentIsLoaded = true;
      this.consentsBitSet = 2046 /* All */;
      this.legitimateInterestsBitSet = 2046 /* All */;
      this.dispatchConsentChanged(this.consentsBitSet, this.legitimateInterestsBitSet);
    }, timeout);
  }
  consentToTerms() {
    if (this.inheritedCmp) {
      this.logger.warn(`${this.getName()}::consentToTerms(NoOpImpl)`);
      return;
    }
    if (this.googleFcInjected || window.googlefc) {
      const fc = window.googlefc = window.googlefc ?? {};
      fc.callbackQueue = fc.callbackQueue ?? [];
      fc.callbackQueue.push({
        CONSENT_DATA_READY: () => window.googlefc?.showRevocationMessage?.()
      });
      return;
    }
    this.logger.warn(`${this.getName()}::consentToTerms(owned by the embedding page)`);
  }
  supportsAutoInitialization() {
    return true;
  }
  onConsentChanged(cb) {
    this.onConsentChangedHandlers.push(cb);
    if (this.consentIsLoaded) cb(this.consentsBitSet, this.legitimateInterestsBitSet);
  }
  hasConsentForAny(bits, fallback = 0 /* None */) {
    return this.hasLoaded() && (this.consentsBitSet & bits) !== 0;
  }
  hasConsentForAll(bits, fallback = 0 /* None */) {
    return this.hasLoaded() && (this.consentsBitSet & bits) === bits;
  }
  consents() {
    return this.consentsBitSet;
  }
  legitimateInterests() {
    return this.legitimateInterestsBitSet;
  }
  getName() {
    return "TcfV2ConsentProvider";
  }
};
var emptyAnalyticsIDProvider = {
  init: async () => {
  },
  getName: () => "",
  getUserSource: () => "in-memory" /* IN_MEMORY */,
  getPageSessionId: () => "",
  getPlaySessionId: () => "",
  getGlobalUserId: () => "",
  managesUnconsentedIds: () => false
};
var RandomIdProvider = class {
  constructor() {
    this.randomPageSessionId = randomId();
    this.randomPlaySessionId = randomId();
    this.randomGlobalUserId = randomId();
    this.randomPlaySessionIdTimeStamp = Date.now();
  }
  static {
    this.PAGE_SESSION_TIMEOUT = 18e5;
  }
  static {
    this.PLAY_SESSION_TIMEOUT = 18e5;
  }
  async init() {
  }
  getName() {
    return "randomIdProvider";
  }
  getUserSource() {
    return "in-memory" /* IN_MEMORY */;
  }
  getPageSessionId() {
    return this.randomPageSessionId;
  }
  getPlaySessionId() {
    if (this.randomPlaySessionIdTimeStamp + 18e5 < Date.now()) {
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
};
var StorageIDProvider = class {
  constructor(storage) {
    this.storage = storage;
    this.globalUserIdSource = "cookie" /* COOKIE */;
    this.canUseCookies = false;
  }
  static {
    this.PAGE_SESSION_TIMEOUT = 18e5;
  }
  static {
    this.PLAY_SESSION_TIMEOUT = 18e5;
  }
  setCanUseCookies() {
    try {
      if (window && Object.getOwnPropertyDescriptor(document, "cookie")?.writable) {
        document.cookie = "can_use_cookies=test;";
        this.canUseCookies = document.cookie.indexOf("can_use_cookies") > -1;
      } else {
        this.canUseCookies = false;
      }
    } catch {
      this.canUseCookies = false;
    }
  }
  async init() {
    this.setCanUseCookies();
    if (this.canUseCookies) this.globalUserIdSource = "cookie" /* COOKIE */;
    else if (this.storage.isPersistent()) this.globalUserIdSource = "localStorage" /* LOCAL_STORAGE */;
    else this.globalUserIdSource = "in-memory" /* IN_MEMORY */;
    const data = await this.storage.getItems([
      "pageSessionId",
      "playSessionId",
      "playSessionIdTimeStamp",
      "globalUserId"
    ]);
    this.pageSessionId = data.pageSessionId || void 0;
    this.playSessionId = data.playSessionId || void 0;
    this.playSessionIdTimeStamp = data.playSessionIdTimeStamp != null ? parseInt(String(data.playSessionIdTimeStamp), 10) : void 0;
    this.globalUserId = data.globalUserId || void 0;
  }
  getName() {
    return "StorageIDProvider";
  }
  getUserSource() {
    return this.globalUserIdSource;
  }
  getPageSessionId() {
    if (!this.pageSessionId) {
      this.pageSessionId = randomId();
      this.storage.setItem("pageSessionId", this.pageSessionId);
    }
    return this.pageSessionId;
  }
  getPlaySessionId() {
    if (this.playSessionId && (this.playSessionIdTimeStamp ?? 0) + 18e5 < Date.now()) {
      this.playSessionId = void 0;
    }
    if (!this.playSessionId) {
      this.playSessionId = randomId();
      this.storage.setItem("playSessionId", this.playSessionId);
    }
    this.playSessionIdTimeStamp = Date.now();
    this.storage.setItem("playSessionIdTimeStamp", this.playSessionIdTimeStamp);
    return this.playSessionId;
  }
  getGlobalUserId() {
    if (this.canUseCookies) return this.getGlobalUserIdFromCookie();
    return this.getGlobalUserIdFromStorage();
  }
  getGlobalUserIdFromStorage() {
    if (!this.globalUserId) {
      this.globalUserId = randomId();
      this.storage.setItem("globalUserId", this.globalUserId);
    }
    return this.globalUserId;
  }
  getGlobalUserIdFromCookie() {
    const m = document.cookie.match("^(?:.*_frvr=([^;]*)).*$");
    this.globalUserId = m && m[1] || randomId();
    this.writeCookie(this.globalUserId);
    return this.globalUserId;
  }
  writeCookie(value) {
    const d = /* @__PURE__ */ new Date();
    d.setDate(d.getDate() + 365);
    document.cookie = `_frvr=${value}; path=/; expires=${new Date(d).toUTCString()};${getCookieDomain()};`;
  }
  managesUnconsentedIds() {
    return this.globalUserIdSource === "cookie" /* COOKIE */;
  }
};
function getCookieDomain() {
  const parts = document.location.hostname.split(".");
  for (let i = parts.length - 1; i >= 0; i--) {
    const candidate = parts.slice(i).join(".");
    document.cookie = "get_tld=test;domain=." + candidate + ";";
    if (document.cookie.indexOf("get_tld") > -1) {
      document.cookie = "get_tld=;domain=." + candidate + ";expires=Thu, 01 Jan 1970 00:00:01 GMT;";
      return candidate;
    }
  }
  return "";
}
var TrackerImpl = class {
  constructor({
    analyticsProviders,
    idProvider,
    consentProvider,
    contextProvider,
    storage,
    logger,
    appContextFields
  } = {}) {
    this.data = {};
    this.extraFieldFunctions = [];
    this.preConsentLoadEventQueue = [];
    this.idProvider = emptyAnalyticsIDProvider;
    this.logger = emptyLogger2;
    this.qatoolEnabled = false;
    this.timeStart = Date.now();
    this.appContextFields = {};
    this.analyticsProviders = analyticsProviders ?? [];
    this.idProvider = idProvider ?? emptyAnalyticsIDProvider;
    this.consentProvider = consentProvider ?? new TcfV2ConsentProvider(void 0, logger);
    this.storage = storage ?? defaultStorage;
    this.logger = logger ?? emptyLogger2;
    this.appContextFields = appContextFields ?? {};
  }
  static {
    this.STORAGE_KEY = "frvr_analytics_storage";
  }
  static {
    this.FTUE_STEPS_DONE_KEY = "__frvr_ftue_steps_done";
  }
  static {
    this.MAX_PRE_CONSENT_LOAD_EVENT_QUEUE = 100;
  }
  async loadStorage() {
    this.data = await this.storage.getItem("frvr_analytics_storage", {});
  }
  updateStorage() {
    this.storage.setItem("frvr_analytics_storage", { ...this.data });
  }
  getConsentContextFields() {
    return {
      cmp_consents: this.consentProvider.consents(),
      cmp_legitimateInterests: this.consentProvider.legitimateInterests()
    };
  }
  getContextFields() {
    return {
      page_session_id: this.idProvider.getPageSessionId(),
      play_session_id: this.idProvider.getPlaySessionId()
    };
  }
  async init() {
    installErrorHandlers(
      (payload) => this.logEvent("error", payload, 0 /* None */)
    );
    await this.loadStorage();
    await Promise.all([this.idProvider.init(), this.consentProvider.onConsentChanged(() => this.dispatchOutstandingEvents())]);
    await Promise.all(this.analyticsProviders.map((p) => p.init(this.consentProvider, this)));
  }
  logEvent(event, fields = {}, requiredConsents = 0 /* None */, requiredLIs = 0 /* None */) {
    this.send(event, void 0, fields, requiredConsents, requiredLIs);
  }
  logValuedEvent(event, value, fields = {}, requiredConsents = 0 /* None */, requiredLIs = 0 /* None */) {
    this.send(event, value, fields, requiredConsents, requiredLIs);
  }
  preComplete() {
    this.timeLoaded = Date.now();
    this.logEvent("loading_stop", {}, 1024 /* P10DevelopAndImproveProducts */);
  }
  complete() {
    this.logEvent("game_loaded", {}, 1024 /* P10DevelopAndImproveProducts */);
  }
  set(key, value) {
    this.data[key] = value;
    this.updateStorage();
    return value;
  }
  inc(key, by) {
    const v = (this.data[key] || 0) + (by === void 0 ? 1 : by);
    this.set(key, v);
    return v;
  }
  getPlaySessionId() {
    return this.idProvider.getPlaySessionId();
  }
  getPageSessionId() {
    return this.idProvider.getPageSessionId();
  }
  getGlobalUserId() {
    return this.idProvider.getGlobalUserId();
  }
  getUserSource() {
    return this.idProvider.getUserSource();
  }
  addExtraFieldFunction(fn) {
    this.extraFieldFunctions.push(fn);
    return () => {
      const i = this.extraFieldFunctions.indexOf(fn);
      if (i !== -1) this.extraFieldFunctions.splice(i, 1);
    };
  }
  ftue(step, name, extra) {
    const bits = new TcfBitSet(String(this.data.ftuestepsdone || "0"));
    if (step <= bits.getRightmost1Index()) {
      this.logger.warn(`[frvr-tracker] ftue: step ${step} (${name}) has already been tracked`);
      return;
    }
    bits.set1AtIndex(step);
    this.set("ftuestepsdone", bits.toHexString());
    this.logEvent("ftue", { ...extra, step_number: step, step_name: name });
  }
  async ftueUnordered(step, name, extra) {
    const done = await this.storage.getItem("__frvr_ftue_steps_done", []) || [];
    if (done.includes(step)) {
      this.logger.warn(`[frvr-tracker] ftue: step ${step} (${name}) has already been tracked`);
      return;
    }
    done.push(step);
    await this.storage.setItem("__frvr_ftue_steps_done", done);
    this.logEvent("ftue", { ...extra, step_number: step, step_name: name });
  }
  levelStart(level, extra) {
    this.set("game_start_time", Date.now());
    this.inc("games_played");
    const date = /* @__PURE__ */ new Date();
    const day = `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
    if (this.data.last_day_played !== day) {
      this.set("last_day_played", day);
      this.inc("days_played");
    }
    this.inc("game_total");
    this.logValuedEvent("levelStart", this.inc("level_total"), { ...extra, level_id: level });
  }
  levelEnd(level, extra) {
    this.logValuedEvent("levelEnd", this.inc("game_total"), { ...extra, level_id: level });
    this.set("game_start_time", -1);
  }
  send(event, value, fields, requiredConsents, requiredLIs) {
    const ctx = { ...this.getContextFields(), ...this.getConsentContextFields(), ...this.data };
    this.logger.debug("[frvr-tracker] event", event, fields, ctx);
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
  dispatchOutstandingEvents() {
    const queue = this.preConsentLoadEventQueue;
    while (queue.length) {
      const { event, value, fields, ctx } = queue.shift();
      this.send(event, value, fields, 0 /* None */, 0 /* None */);
    }
  }
};
var AdsThrottler = class {
  constructor() {
    this.maxFrequency = 3e5;
    this.initTimeBlock = 0;
    this.forceFirstAd = false;
  }
  static {
    this.DEFAULT_FREQUENCY = 3e5;
  }
  static {
    this.DEFAULT_RATE = 3;
  }
  getInitialisedState(state) {
    if (state.lastShownAd) return state;
    return { ...state, lastShownAd: this.getFirstIntervalTime(state) };
  }
  getFirstIntervalTime(state) {
    return state.initTime;
  }
  shouldBlockByInitTime(state, now) {
    return now - state.initTime < this.initTimeBlock;
  }
  shouldBlockByFrequency(state, now) {
    const elapsed = now - state.lastShownAd;
    return this.maxFrequency > 0 && elapsed < this.maxFrequency && !(state.isFirstAd && this.forceFirstAd);
  }
  init(config) {
    this.initTimeBlock = config.initTimeBlock || 0;
    this.maxFrequency = config.maxfrequency === void 0 ? 3e5 : config.maxfrequency;
    this.forceFirstAd = config.forceFirstAd || false;
  }
  mustThrottle(state, now = Date.now()) {
    const initialized = this.getInitialisedState(state);
    if (this.shouldBlockByInitTime(initialized, now)) return "INIT_TIME" /* INIT_TIME */;
    if (this.shouldBlockByFrequency(initialized, now)) return "FREQUENCY" /* FREQUENCY */;
    return void 0;
  }
  notifyAdShown(state, now = Date.now()) {
    return { ...state, isFirstAd: false, isFirstAdEver: false, lastShownAd: now };
  }
};
var AdTrackerImpl = class {
  constructor(tracker, config) {
    this.tracker = tracker;
    this.config = config;
  }
  getEventName(suffix) {
    const prefix = {
      ["interstitial" /* INTERSTITIAL */]: "mandatory",
      ["reward" /* REWARD */]: "rewarded",
      ["banner" /* BANNER */]: "banner"
    };
    return "ad_" + (prefix[this.config.adType] ?? this.config.adType) + "_" + suffix;
  }
  logEvent(event, fields) {
    this.tracker.logEvent(event, fields, 0 /* None */);
  }
  requestingAd(id) {
    this.logEvent(this.getEventName("request"), {
      ...{},
      provider: this.config.provider,
      advertisement_id: id
    });
  }
  receivedAdResponse(status, id, extra) {
    this.logEvent(this.getEventName("response"), {
      ...extra,
      provider: this.config.provider,
      advertisement_id: id,
      ad_response: status
    });
  }
  willShowAd(preloaded, id, extra) {
    this.logEvent(this.getEventName("will_show"), {
      ...extra,
      provider: this.config.provider,
      advertisement_id: id,
      preloaded
    });
  }
  finishedAd(status, id, extra) {
    this.logEvent(this.getEventName("finished"), {
      ...extra,
      provider: this.config.provider,
      advertisement_id: id,
      ad_result: status
    });
  }
};
function decodeTokenPayload(token) {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
  const bytes = window.atob(b64);
  const json = bytes.split("").map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2)).join("");
  try {
    return JSON.parse(decodeURIComponent(json));
  } catch {
    return null;
  }
}
var TokenPair = class {
  constructor(accessToken, refreshToken) {
    this._accessExpiration = 0;
    this._accessIAT = 0;
    this._verified = false;
    this._refreshExpiration = 0;
    this._platform = null;
    this._frvrID = null;
    if (accessToken) this.accessToken = accessToken;
    if (refreshToken) this.refreshToken = refreshToken;
  }
  set accessToken(token) {
    const payload = decodeTokenPayload(token);
    if (payload) {
      this._accessToken = token;
      this._accessPayload = payload;
      this._accessExpiration = parseInt(payload.exp, 10) || 0;
      this._accessIAT = parseInt(payload.iat, 10) || 0;
      this._verified = payload.user?.verified !== false;
    } else {
      this._accessToken = void 0;
      this._accessPayload = null;
      this._accessExpiration = 0;
      this._accessIAT = 0;
      this._verified = false;
    }
  }
  get accessToken() {
    return this._accessToken;
  }
  set refreshToken(token) {
    const payload = decodeTokenPayload(token);
    if (payload) {
      this._refreshToken = token;
      this._refreshPayload = payload;
      this._refreshExpiration = parseInt(payload.exp, 10);
      this._platform = payload.user?.platform;
      this._frvrID = payload.sub;
    } else {
      this._refreshToken = void 0;
      this._refreshPayload = null;
      this._refreshExpiration = 0;
      this._platform = null;
      this._frvrID = null;
    }
  }
  get refreshToken() {
    return this._refreshToken;
  }
  get accessExpiration() {
    return this._accessExpiration;
  }
  get refreshExpiration() {
    return this._refreshExpiration;
  }
  get platform() {
    return this._refreshToken ? this._platform : this._accessPayload?.user?.platform ?? null;
  }
  get frvrID() {
    return this._refreshToken ? this._frvrID : this._accessPayload?.sub ?? null;
  }
  get verified() {
    return this._verified;
  }
  get accessIssuedAt() {
    return this._accessIAT;
  }
  get timeTillAccessExpiry() {
    return this._accessToken ? Math.floor(this._accessExpiration - Date.now() / 1e3) : -1;
  }
  get accessLifespan() {
    return this._accessToken ? this._accessExpiration - this._accessIAT : 0;
  }
  updateTokens(access, refresh) {
    this.accessToken = access;
    this.refreshToken = refresh;
  }
  updateTokensIfValid(access, refresh) {
    const prevA = this._accessToken;
    const prevR = this._refreshToken;
    this.updateTokens(access, refresh);
    if (!this.isAccessValid() && !this.isRefreshValid()) {
      this._accessToken = prevA;
      this._refreshToken = prevR;
    }
  }
  isAccessValid() {
    return !!this._accessToken && this._accessExpiration - 60 > Date.now() / 1e3;
  }
  isRefreshValid() {
    return !!this._refreshToken && this._refreshExpiration - 60 > Date.now() / 1e3;
  }
  isAnyValid() {
    return this.isRefreshValid() || this.isAccessValid();
  }
  shouldRefresh() {
    return this.isRefreshValid() && !this.isAccessValid();
  }
  getAccessPayload() {
    return this._accessPayload;
  }
  getRefreshPayload() {
    return this._refreshPayload;
  }
};
var REFRESH_TOKEN_KEY = "__FRVR_auth_refresh_token";
var ACCESS_TOKEN_KEY = "__FRVR_auth_access_token";
function tokenStorageKeys(scope) {
  if (scope) return { refresh: `${REFRESH_TOKEN_KEY}__${scope}`, access: `${ACCESS_TOKEN_KEY}__${scope}` };
  return { refresh: REFRESH_TOKEN_KEY, access: ACCESS_TOKEN_KEY };
}
var TokenHandler = class {
  constructor(scope) {
    this.scope = scope;
    this.currentPairValue = new TokenPair();
    this.pairsPerPlatform = {};
    this.storage = defaultStorage;
    this.keys = tokenStorageKeys(scope);
  }
  async initFromStorage(storage = defaultStorage) {
    this.storage = storage;
    const refresh = await this.storage.getItem(this.keys.refresh);
    const access = await this.storage.getItem(this.keys.access);
    this.currentPairValue = new TokenPair(access, refresh);
    this.storedPair = this.currentPairValue;
  }
  getAccessToken() {
    return this.currentPairValue.accessToken;
  }
  getRefreshToken() {
    return this.currentPairValue.refreshToken;
  }
  getFRVRID() {
    return this.currentPairValue.frvrID;
  }
  isVerified() {
    return this.currentPairValue.verified;
  }
  shouldRefresh() {
    return this.currentPairValue.shouldRefresh();
  }
  getCurrentPlatform() {
    return this.currentPairValue.platform;
  }
  availablePlatforms() {
    const out = [];
    for (const p in this.pairsPerPlatform) {
      if (this.pairsPerPlatform[p].isAnyValid()) out.push(p);
    }
    return out;
  }
  get pairs() {
    return this.pairsPerPlatform;
  }
  setAsCurrent(pair, persist = true) {
    this.currentPairValue = pair;
    if (persist) {
      this.storedPair = pair;
      this.storage.setItem(this.keys.refresh, pair.refreshToken);
      this.storage.setItem(this.keys.access, pair.accessToken);
    }
  }
  get storedPair() {
    return this.storedPairValue;
  }
  set storedPair(pair) {
    this.storedPairValue = pair;
  }
  deleteStoredTokens() {
    this.storedPairValue = void 0;
    this.storage.removeItems([this.keys.refresh, this.keys.access]);
  }
  deleteTokens() {
    this.clear();
  }
  addPairAsCurrent(access, refresh) {
    this.setAsCurrent(new TokenPair(access, refresh));
  }
  updateAndValidateCurrentPair(access, refresh) {
    this.updateCurrentPair(access, refresh);
    return this.isAccessValid();
  }
  updateCurrentPair(access, refresh) {
    this.setAsCurrent(new TokenPair(access, refresh));
  }
  clear() {
    this.currentPairValue = new TokenPair();
    this.pairsPerPlatform = {};
    this.storedPairValue = void 0;
    this.storage.removeItems([this.keys.refresh, this.keys.access]);
  }
  isAccessValid() {
    return this.currentPairValue.isAccessValid();
  }
  isRefreshValid() {
    return this.currentPairValue.isRefreshValid();
  }
  isAnyValid() {
    return this.currentPairValue.isAnyValid();
  }
  get currentPair() {
    return this.currentPairValue;
  }
};
var RESPONSE_TYPES = {
  registrationSuccess: "registrationSuccess",
  registrationConflict: "registrationConflict",
  loginSuccess: "loginSuccess",
  accountNotActive: "accountNotActive",
  invalidCredentials: "invalidCredentials",
  invalidFormat: "invalidFormat",
  serverError: "serverError",
  unknownError: "unknownError",
  networkError: "networkError",
  operationSuccess: "operationSuccess",
  tokenExpired: "tokenExpired",
  notLoggedIn: "notLoggedIn",
  invalidParam: "invalidParam",
  platformNotAvailable: "platformNotAvailable",
  platformLoginFail: "platformLoginFail"
};
var RESPONSE_DEFINITIONS = {
  REG_SUCCESS: { type: RESPONSE_TYPES.registrationSuccess, success: true, message: "User registered successfully. Pending confirmation" },
  LOGIN_SUCCESS: { type: RESPONSE_TYPES.loginSuccess, success: true, message: "Login successful" },
  OPERATION_SUCCESS: { type: RESPONSE_TYPES.operationSuccess, success: true, message: "Operation success" },
  REG_CONFLICT: { type: RESPONSE_TYPES.registrationConflict, success: false, message: "Email already registered" },
  ACCOUNT_NOT_ACTIVE: { type: RESPONSE_TYPES.accountNotActive, success: false, message: "Provided credentials are valid but account is either not confirmed or suspended" },
  INVALID_CREDENTIALS: { type: RESPONSE_TYPES.invalidCredentials, success: false, message: "Provided credentials are invalid" },
  INVALID_FORMAT: { type: RESPONSE_TYPES.invalidFormat, success: false, message: "Invalid format on data" },
  SERVER_ERROR: { type: RESPONSE_TYPES.serverError, success: false, message: "Error on server" },
  UNKNOWN_ERROR: { type: RESPONSE_TYPES.unknownError, success: false, message: "Unknown error" },
  NETWORK_ERROR: { type: RESPONSE_TYPES.networkError, success: false, message: "Network Error" },
  TOKEN_EXPIRED: { type: RESPONSE_TYPES.tokenExpired, success: false, message: "Token has expired. Request a new challenge to get a fresh one" },
  NOT_LOGGED_IN: { type: RESPONSE_TYPES.notLoggedIn, success: false, message: "Cannot perform operation without active login" },
  INVALID_PARAM: { type: RESPONSE_TYPES.invalidParam, success: false, message: "Invalid parameter" },
  PLATFORM_NOT_AVAILABLE: { type: RESPONSE_TYPES.platformNotAvailable, success: false, message: "The requested platform is not available" },
  PLATFORM_LOGIN_FAIL: { type: RESPONSE_TYPES.platformLoginFail, success: false, message: "The login on the requested platform failed" }
};
var AUTH_ENDPOINTS = {
  AUTH_REGISTRATION: { method: "POST", path: "/register" },
  AUTH_LOGIN: { method: "POST", path: "/login" },
  AUTH_REFRESH: { method: "POST", path: "/refresh" },
  AUTH_RECOVER: { method: "POST", path: "/recover" },
  AUTH_RECOVER_CHALLENGE: { method: "POST", path: "/recover-challenge" },
  AUTH_VERIFY: { method: "POST", path: "/verify" },
  AUTH_VERIFY_CHALLENGE: { method: "POST", path: "/verify-challenge" },
  AUTH_SETTINGS: { method: "POST", path: "/settings" },
  USER_VERIFIED: { method: "GET", path: "/user/verified" }
};
var AuthClient = class {
  constructor({ apiBaseURL, env }) {
    this.refreshPromise = null;
    this.apiBaseURL = apiBaseURL ?? (env === "production" /* PRODUCTION */ ? "https://crucible.frvr.com/v1/auth" : "https://staging.crucible.frvr.com/v1/auth");
  }
  isLoggingIn() {
    return !!this.refreshPromise;
  }
  async login(credentials) {
    return this.fetchAndHandleCommonErrors(
      AUTH_ENDPOINTS.AUTH_LOGIN,
      {
        200: async (res) => {
          const body = await res.json();
          const pair = new TokenPair(body.accessToken, body.refreshToken);
          if (pair.isAccessValid()) return { ...RESPONSE_DEFINITIONS.LOGIN_SUCCESS, tokenPair: pair };
          throw RESPONSE_DEFINITIONS.SERVER_ERROR;
        },
        401: () => {
          throw RESPONSE_DEFINITIONS.INVALID_CREDENTIALS;
        },
        403: () => {
          throw RESPONSE_DEFINITIONS.ACCOUNT_NOT_ACTIVE;
        }
      },
      { platform: "frvr" /* FRVR */, credentials }
    );
  }
  async loginAsAnonymous() {
    return this.login({ platform: "anonymous" /* ANONYMOUS */ });
  }
  async requestEmailLoginCode(email, register = false) {
    const endpoint = register ? AUTH_ENDPOINTS.AUTH_REGISTRATION : AUTH_ENDPOINTS.AUTH_LOGIN;
    return this.fetchFlow(endpoint, { platform: "frvr" /* FRVR */, credentials: { email, method: "code" } });
  }
  async continueEmailCode(email, code, flowId, register = false) {
    const endpoint = register ? AUTH_ENDPOINTS.AUTH_REGISTRATION : AUTH_ENDPOINTS.AUTH_LOGIN;
    return this.fetchFlow(
      { ...endpoint, path: endpoint.path + "?flow=" + encodeURIComponent(flowId) },
      { platform: "frvr" /* FRVR */, credentials: { email, method: "code", code } }
    );
  }
  async resendEmailCode(email, flowId, register = false) {
    const endpoint = register ? AUTH_ENDPOINTS.AUTH_REGISTRATION : AUTH_ENDPOINTS.AUTH_LOGIN;
    return this.fetchAndHandleCommonErrors(
      { ...endpoint, path: endpoint.path + "?flow=" + encodeURIComponent(flowId) },
      {
        200: () => RESPONSE_DEFINITIONS.OPERATION_SUCCESS,
        201: () => RESPONSE_DEFINITIONS.OPERATION_SUCCESS,
        401: () => {
          throw RESPONSE_DEFINITIONS.INVALID_CREDENTIALS;
        }
      },
      { platform: "frvr" /* FRVR */, credentials: { email, method: "code", resend: true } }
    );
  }
  async fetchFlow(endpoint, body) {
    return this.fetchAndHandleCommonErrors(
      endpoint,
      {
        200: async (res) => {
          const body2 = await res.json();
          if (!body2.accessToken || !body2.refreshToken) throw RESPONSE_DEFINITIONS.UNKNOWN_ERROR;
          const pair = new TokenPair(body2.accessToken, body2.refreshToken);
          if (!pair.isAccessValid()) throw RESPONSE_DEFINITIONS.SERVER_ERROR;
          return { ...RESPONSE_DEFINITIONS.LOGIN_SUCCESS, tokenPair: pair };
        },
        201: async (res) => this.parseFlow(res),
        401: () => {
          throw RESPONSE_DEFINITIONS.INVALID_CREDENTIALS;
        },
        400: () => {
          throw RESPONSE_DEFINITIONS.INVALID_FORMAT;
        }
      },
      body
    );
  }
  async parseFlow(res) {
    const body = await res.json();
    if (!body.flowId) throw RESPONSE_DEFINITIONS.UNKNOWN_ERROR;
    return { flowId: body.flowId };
  }
  async checkVerification(pair) {
    return this.fetchAndHandleCommonErrors(
      AUTH_ENDPOINTS.USER_VERIFIED,
      {
        200: async (res) => {
          const body = await res.json();
          return body?.verified;
        }
      },
      void 0,
      { "X-REFRESH-TOKEN": pair.refreshToken }
    );
  }
  async initiateVerifyChallenge(credentials) {
    return this.fetchAndHandleCommonErrors(
      AUTH_ENDPOINTS.AUTH_VERIFY,
      {
        200: () => RESPONSE_DEFINITIONS.OPERATION_SUCCESS,
        401: () => {
          throw RESPONSE_DEFINITIONS.INVALID_CREDENTIALS;
        }
      },
      { platform: "frvr" /* FRVR */, credentials }
    );
  }
  async loginThroughPlatform(credentials) {
    return this.fetchAndHandleCommonErrors(
      AUTH_ENDPOINTS.AUTH_RECOVER,
      {
        200: () => RESPONSE_DEFINITIONS.OPERATION_SUCCESS,
        401: () => {
          throw RESPONSE_DEFINITIONS.INVALID_CREDENTIALS;
        }
      },
      { platform: "frvr" /* FRVR */, credentials }
    );
  }
  async changePassword(accessToken, newPassword) {
    return this.fetchAndHandleCommonErrors(
      AUTH_ENDPOINTS.AUTH_SETTINGS,
      {
        200: () => RESPONSE_DEFINITIONS.OPERATION_SUCCESS,
        401: () => {
          throw RESPONSE_DEFINITIONS.INVALID_CREDENTIALS;
        }
      },
      { platform: "frvr" /* FRVR */, credentials: { newPassword } },
      { Authorization: "Bearer " + accessToken }
    );
  }
  async refreshTokens(pair) {
    return this.fetchAndHandleCommonErrors(
      AUTH_ENDPOINTS.AUTH_REFRESH,
      {
        200: async (res) => {
          const body = await res.json();
          if (!body.accessToken || !body.refreshToken) throw RESPONSE_DEFINITIONS.UNKNOWN_ERROR;
          pair.updateTokens(body.accessToken, body.refreshToken);
          if (pair.isAccessValid()) return RESPONSE_DEFINITIONS.OPERATION_SUCCESS;
          throw RESPONSE_DEFINITIONS.UNKNOWN_ERROR;
        },
        401: () => {
          throw RESPONSE_DEFINITIONS.INVALID_CREDENTIALS;
        }
      },
      { refreshToken: pair.refreshToken }
    );
  }
  async fetchAndHandleCommonErrors(endpoint, handlers, body, headers = {}) {
    const url = this.apiBaseURL + endpoint.path;
    let response;
    try {
      response = await fetch(url, {
        method: endpoint.method,
        headers: { "Content-Type": "application/json", ...headers },
        body: body && JSON.stringify(body)
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
        throw RESPONSE_DEFINITIONS.UNKNOWN_ERROR;
      default:
        throw { ...RESPONSE_DEFINITIONS.SERVER_ERROR, payload: { status: response.status, url: endpoint } };
    }
  }
};
var AuthManager = class {
  constructor(options = {}) {
    this.loginStatusListeners = [];
    this.internalListeners = /* @__PURE__ */ new Set();
    this.gameStatusDelivery = Promise.resolve();
    this.proactiveRefreshTimeoutID = -1;
    this.externalPair = null;
    this.initializing = false;
    this.providers = options.providers ?? [];
    this.storage = options.storage ?? defaultStorage;
    this.env = options.env ?? "production" /* PRODUCTION */;
    this.client = options.client ?? new AuthClient({ env: this.env });
    this.tokenHandler = options.tokenHandler ?? new TokenHandler();
    this.logger = options.logger ?? emptyLogger2;
    this.config = options.config ?? {};
  }
  async getStorageAccessToken() {
    const handler = new TokenHandler(this.config.tokenStorageScope);
    await handler.initFromStorage(this.storage);
    return handler.isAccessValid() ? handler.getAccessToken() ?? null : null;
  }
  init() {
    return this.initPromise = this.runInit();
  }
  async runInit() {
    await this.tokenHandler.initFromStorage(this.storage);
    if (!this.tokenHandler.isRefreshValid()) this.tokenHandler.deleteStoredTokens();
    const api = {
      loginWithProvider: this.loginThroughPlatform.bind(this),
      loginWithExternalTokens: this.loginWithExternalTokens.bind(this),
      setExternalSession: this.setExternalSession.bind(this),
      endExternalSession: this.endExternalSession.bind(this),
      loginAsAnonymous: this.loginAsAnonymous.bind(this),
      logout: this.logout.bind(this),
      getCurrentPlatform: this.getCurrentPlatform.bind(this),
      getCurrentIdentifier: this.getCurrentIdentifier.bind(this),
      isVerified: this.isVerified.bind(this)
    };
    let isLoggedIn = false;
    this.initializing = true;
    try {
      for (const p of this.providers) {
        await p.init(api);
        if (p.keepsStoredSession() && !isLoggedIn) {
          if (p.awaitsAutoLogin?.() && this.isLoggedIn()) break;
          isLoggedIn = true;
          if (p.handlesFRVRLogin?.()) break;
          const promise = this.loginThroughPlatform(p).catch((err) => {
            this.logger?.warn(`Auto login with platform ${p.getPlatformId()} failed!`, err);
          });
          if (p.awaitsAutoLogin?.()) this.ongoingFRVRLogin = promise;
        }
      }
    } finally {
      this.initializing = false;
    }
    if (!isLoggedIn && this.isAnonymousLoginEnabled()) {
      this.loginAsAnonymous().catch((err) => this.logger?.warn("Auto login with anonymous account failed!", err));
    } else if (isLoggedIn) {
      this.onLoginStatusChange();
    }
  }
  needsRefresh() {
    return this.tokenHandler.shouldRefresh();
  }
  getAccessToken() {
    if (this.tokenHandler.isRefreshValid()) {
      if (this.needsRefresh()) return null;
      return this.tokenHandler.getAccessToken() ?? null;
    }
    if (this.isExternalSession() && this.tokenHandler.isAccessValid()) return this.tokenHandler.getAccessToken() ?? null;
    return null;
  }
  async getFreshAccessToken() {
    await this.awaitSettledSession();
    return this.tokenHandler.getAccessToken() ?? null;
  }
  getFRVRID() {
    return this.isLoggedIn() ? this.tokenHandler.getFRVRID() : null;
  }
  isVerified() {
    return this.tokenHandler.isVerified();
  }
  isLoggedIn() {
    return this.tokenHandler.isAnyValid();
  }
  getCurrentPlatform() {
    return this.tokenHandler.getCurrentPlatform();
  }
  getCurrentIdentifier() {
    try {
      const id = this.tokenHandler.currentPair.getAccessPayload()?.user?.identifier;
      return typeof id === "string" ? id : void 0;
    } catch {
      return;
    }
  }
  async whenAutoLoginSettled(timeout = 1e3) {
    const promise = this.ongoingFRVRLogin;
    if (!promise) return Promise.resolve();
    let timer;
    return Promise.race([
      promise.catch(() => {
      }),
      new Promise((resolve) => timer = setTimeout(resolve, timeout))
    ]).finally(() => clearTimeout(timer));
  }
  getAvailablePlatforms() {
    return this.providers.filter((p) => p.isAvailable()).map((p) => p.getPlatformId());
  }
  isPlatformAvailable(id) {
    return !!this.providers.find((p) => p.isAvailable() && p.getPlatformId() === id);
  }
  isFRVRLoginEnabled() {
    return !this.providers.find((p) => p.prohibitsLoginWithFRVRCredentials?.());
  }
  isAnonymousLoginEnabled() {
    return this.isFRVRLoginEnabled() && this.config.enableAnonymousLogin;
  }
  isLogoutSupported() {
    return !this.providers.find((p) => !p.isLogoutSupported());
  }
  addStatusChangeListener(cb) {
    this.loginStatusListeners.push(cb);
  }
  addInternalStatusChangeListener(cb) {
    this.internalListeners.add(cb);
    this.loginStatusListeners.push(cb);
  }
  whenGameStatusDelivered() {
    return this.gameStatusDelivery;
  }
  setStatusChangeInterceptor(fn) {
    this.statusChangeInterceptor = fn;
  }
  async registerOnFRVR(credentials, retry = true) {
    return this.client.login({ platform: "frvr" /* FRVR */, credentials }).catch((err) => {
      const type = typeof err === "object" && err !== null && "type" in err ? err.type : void 0;
      if (type === RESPONSE_DEFINITIONS.REG_CONFLICT.type && retry) {
        return this.client.login({ platform: "frvr" /* FRVR */, credentials });
      }
      throw err;
    });
  }
  async requestEmailLoginCode(email) {
    const { flowId } = await this.client.requestEmailLoginCode(email, false);
    return this.makeEmailCodeFlow(email, flowId, false);
  }
  async requestEmailRegisterCode(email) {
    const { flowId } = await this.client.requestEmailLoginCode(email, true);
    return this.makeEmailCodeFlow(email, flowId, true);
  }
  makeEmailCodeFlow(email, flowId, register) {
    return {
      email,
      flowId,
      continue: async (code) => this.applyTokensFromCodeFlow(
        await this.client.continueEmailCode(email, code, flowId, register)
      ),
      resend: async () => this.client.resendEmailCode(email, flowId, register)
    };
  }
  async applyTokensFromCodeFlow(res) {
    if (res.tokenPair) {
      this.tokenHandler.setAsCurrent(res.tokenPair);
      for (const p of this.providers) {
        if (p.onFRVRTokensReceived) await p.onFRVRTokensReceived(this.tokenHandler.currentPair);
      }
      this.onLoginStatusChange();
    }
    return omit(res, "tokenPair");
  }
  async loginWithExternalTokens(accessToken, refreshToken) {
    const pair = new TokenPair(accessToken, refreshToken);
    if (!pair.isAnyValid()) throw RESPONSE_DEFINITIONS.INVALID_CREDENTIALS;
    this.tokenHandler.setAsCurrent(pair);
    for (const p of this.providers) {
      if (p.onFRVRTokensReceived) await p.onFRVRTokensReceived(this.tokenHandler.currentPair);
    }
    this.onLoginStatusChange();
    return RESPONSE_DEFINITIONS.LOGIN_SUCCESS;
  }
  async setExternalSession(accessToken) {
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
  async endExternalSession() {
    const wasExternal = this.isExternalSession();
    this.externalPair = null;
    if (wasExternal || !this.isAnonymousPair(this.tokenHandler.currentPair)) {
      const stored = this.tokenHandler.storedPair;
      if (stored?.isRefreshValid()) this.tokenHandler.setAsCurrent(stored);
      else this.tokenHandler.deleteTokens?.();
    }
    if (!this.initializing) {
      if (!this.isLoggedIn() && this.isAnonymousLoginEnabled()) {
        try {
          return void await this.loginAsAnonymous();
        } catch (err) {
          this.logger?.warn("Anonymous login after the external session ended failed!", err);
        }
      }
      this.notifyIfIdentityChanged();
    }
  }
  isExternalSession() {
    return !!this.externalPair && this.tokenHandler.currentPair === this.externalPair;
  }
  isAnonymousPair(pair) {
    return pair?.platform === "anonymous" /* ANONYMOUS */;
  }
  refreshUserIdCookie() {
    const stored = this.tokenHandler.storedPair;
    if (stored?.refreshToken && !this.isAnonymousPair(stored)) {
      this.tokenHandler.deleteStoredTokens?.();
    }
  }
  async loginAsAnonymous() {
    if (!this.isAnonymousLoginEnabled()) throw RESPONSE_DEFINITIONS.PLATFORM_NOT_AVAILABLE;
    const res = await this.client.loginAsAnonymous();
    const { tokenPair } = res;
    const rest = omit(res, "tokenPair");
    if (tokenPair) {
      this.tokenHandler.setAsCurrent(tokenPair);
      for (const p of this.providers) {
        if (p.onFRVRTokensReceived) await p.onFRVRTokensReceived(this.tokenHandler.currentPair);
      }
      this.onLoginStatusChange();
    }
    return rest;
  }
  async loginThroughPlatform(platform) {
    let provider;
    if (platform && this.providers.length !== 1) provider = this.providers.find((p) => p.getPlatformId() === platform);
    else provider = this.providers[0];
    if (!provider) throw RESPONSE_DEFINITIONS.PLATFORM_NOT_AVAILABLE;
    return provider.login().catch((err) => {
      throw { ...RESPONSE_DEFINITIONS.PLATFORM_LOGIN_FAIL, payload: { platform: provider.getPlatformId(), error: err } };
    }).then((credentials) => {
      if (credentials) return this.applyLoginResponse(provider, credentials);
      throw { ...RESPONSE_DEFINITIONS.PLATFORM_LOGIN_FAIL, payload: { platform: provider.getPlatformId() } };
    });
  }
  async applyLoginResponse(provider, credentials) {
    return this.client.login({ platform: provider?.getPlatformId(), credentials }).then(async (res) => {
      if (res.tokenPair) {
        this.tokenHandler.setAsCurrent(res.tokenPair);
        for (const p of this.providers) {
          if (p.onFRVRTokensReceived) await p.onFRVRTokensReceived(this.tokenHandler.currentPair);
        }
        this.onLoginStatusChange();
      }
      return omit(res, "tokenPair");
    });
  }
  logout() {
    this.externalPair = null;
    this.tokenHandler.clear?.();
    this.providers.forEach((p) => p.logout?.());
    this.notifyIfIdentityChanged();
  }
  async logoutFRVR() {
    this.logout();
  }
  async initiateRecoveryChallenge(credentials) {
    return this.client.initiateVerifyChallenge(credentials);
  }
  async verifyEmail(credentials) {
    return this.client.loginThroughPlatform(credentials);
  }
  async changePassword(newPassword) {
    if (!this.isLoggedIn()) throw RESPONSE_DEFINITIONS.NOT_LOGGED_IN;
    return this.client.changePassword(this.tokenHandler.getAccessToken(), newPassword);
  }
  async synchronizeVerifiedStatus() {
    if (this.isVerified() || !this.isLoggedIn()) return true;
    return this.client.checkVerification(this.tokenHandler.currentPair).then((ok) => !!ok && this.refreshCurrentPair().then(() => true));
  }
  async fetch(url, options) {
    return this.authenticatedFetch(url, options);
  }
  async authenticatedFetch(url, options) {
    await this.awaitSettledSession();
    if (this.shouldRefreshTokens() && !this.inRefreshBackoff()) {
      await this.refreshTokens();
    }
    if (!this.tokenHandler.isAccessValid() && !this.isExternalSession()) {
      throw RESPONSE_DEFINITIONS.NOT_LOGGED_IN;
    }
    const accessToken = this.tokenHandler.getAccessToken();
    if (!accessToken) throw RESPONSE_DEFINITIONS.NOT_LOGGED_IN;
    return fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...Object.fromEntries(new Headers(options.headers).entries()),
        Authorization: `Bearer ${accessToken}`
      }
    });
  }
  async decorateRequestWithAuth(options) {
    await this.awaitSettledSession();
    if (this.shouldRefreshTokens() && !this.inRefreshBackoff()) {
      await this.refreshTokens();
    }
    if (!this.tokenHandler.isAccessValid() && !this.isExternalSession()) {
      throw RESPONSE_DEFINITIONS.NOT_LOGGED_IN;
    }
    const accessToken = this.tokenHandler.getAccessToken();
    if (!accessToken) throw RESPONSE_DEFINITIONS.NOT_LOGGED_IN;
    return {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...Object.fromEntries(new Headers(options.headers).entries()),
        Authorization: `Bearer ${accessToken}`
      }
    };
  }
  onLoginStatusChange() {
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
        gameListeners: this.loginStatusListeners.filter((cb) => !this.internalListeners.has(cb)).length
      });
    } else {
      this.loginStatusListeners.forEach((cb) => cb(isLoggedIn));
    }
    this.notifyIfIdentityChanged();
  }
  interceptStatusChange(fn, status) {
    let p;
    try {
      p = Promise.resolve(fn(status));
    } catch (err) {
      p = Promise.reject(err);
    }
    p = p.catch((err) => this.logger?.warn("Status change interceptor failed", err));
    const prev = this.gameStatusDelivery;
    this.gameStatusDelivery = Promise.all([prev, p]).then(() => {
      this.loginStatusListeners.forEach((cb) => {
        if (!this.internalListeners.has(cb)) cb(status.isLoggedIn);
      });
    }).catch((err) => this.logger?.warn("Status change listener failed", err));
  }
  notifyIfIdentityChanged() {
    const last = this.lastNotifiedStatus;
    if (last && last.isLoggedIn === this.isLoggedIn() && last.frvrID === this.getFRVRID()) {
      return;
    }
    this.onLoginStatusChange();
  }
  async awaitSettledSession() {
    await this.settleSession();
    if (this.shouldRefreshTokens() && !this.inRefreshBackoff()) {
      await this.refreshTokens();
    }
    if (this.requiresSettledSession() && !this.tokenHandler.isAnyValid()) return;
    return this.tokenHandler.getAccessToken();
  }
  requiresSettledSession() {
    return this.providers.some((p) => p.requiresSettledSession?.());
  }
  async settleSession() {
    if (this.initPromise && this.requiresSettledSession()) await this.initPromise.catch(() => {
    });
  }
  shouldRefreshTokens() {
    if (this.isExternalSession()) return !this.tokenHandler.isAccessValid();
    if (this.shouldRefresh()) return true;
    if (!this.tokenHandler.isRefreshValid()) return false;
    return !(this.requiresSettledSession() && !this.tokenHandler.getRefreshToken());
  }
  shouldRefresh() {
    return this.tokenHandler.shouldRefresh();
  }
  async refreshCurrentPair(pair = this.tokenHandler.currentPair) {
    const p = this.client.refreshTokens(pair);
    p.then(() => {
      if (this.tokenHandler.currentPair === pair) {
        this.tokenHandler.setAsCurrent(pair);
        this.notifyIfIdentityChanged();
      }
    }).catch(() => {
    });
    return p.catch(async (err) => {
      if (this.tokenHandler.currentPair !== pair) throw err;
      const provider = this.providers.find((p2) => p2.getPlatformId() === pair.platform);
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
  async refreshTokens() {
    const cur = this.tokenHandler.currentPair;
    const cached = this.ongoingRefresh;
    if (cached?.pair === cur) return cached.promise;
    const promise = (this.isExternalSession() ? this.refreshExternalSession() : this.refreshNormalPair(cur)).then(
      (ok) => {
        if (this.ongoingRefresh?.pair === cur) this.ongoingRefresh = void 0;
        return ok;
      },
      (err) => {
        this.noteRefreshFailure(cur);
        if (this.tokenHandler.currentPair === cur && this.isLoggedIn()) this.updateProactiveRefresh();
        throw err;
      }
    );
    const wrapped = promise.finally(() => {
      if (this.ongoingRefresh?.promise === wrapped) this.ongoingRefresh = void 0;
    });
    this.ongoingRefresh = { pair: cur, promise: wrapped };
    return wrapped;
  }
  async refreshNormalPair(pair) {
    return this.refreshCurrentPair(pair).then(async (ok) => {
      if (ok === true || this.tokenHandler.currentPair === pair) {
        for (const p of this.providers) {
          if (p.onFRVRTokensReceived) await p.onFRVRTokensReceived(this.tokenHandler.currentPair);
        }
      }
      return ok;
    });
  }
  async refreshExternalSession() {
    const provider = this.providers.find((p) => p.refreshExternalSession);
    if (!provider) return false;
    let newToken;
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
  updateProactiveRefresh() {
    window.clearTimeout(this.proactiveRefreshTimeoutID);
    if (!this.isLoggedIn()) return;
    let seconds = this.getTimeTillProactiveRefresh();
    if (seconds >= Number.MAX_SAFE_INTEGER) return;
    if (!Number.isFinite(seconds)) seconds = 30;
    let ms = 1e3 * seconds;
    if (this.inRefreshBackoff()) ms = Math.max(ms, this.refreshBackoff.retryAt - Date.now());
    this.proactiveRefreshTimeoutID = window.setTimeout(() => {
      this.refreshTokens().catch((err) => this.logger?.warn("Proactive token refresh failed", err));
    }, Math.min(ms, 2147483647));
  }
  inRefreshBackoff() {
    const b = this.refreshBackoff;
    return !!b && b.pair === this.tokenHandler.currentPair && Date.now() < b.retryAt;
  }
  noteRefreshFailure(pair) {
    const failures = this.refreshBackoff?.pair === pair ? this.refreshBackoff.failures + 1 : 1;
    const seconds = Math.min(5 * Math.pow(2, failures - 1), 300);
    this.refreshBackoff = { pair, failures, retryAt: Date.now() + 1e3 * seconds };
    this.logger?.warn(`Token refresh failed ${failures} time(s), next attempt in ${seconds}s`);
  }
  getTimeTillProactiveRefresh() {
    if (!this.tokenHandler.isRefreshValid() && !this.isExternalSession()) return Number.MAX_SAFE_INTEGER;
    const pair = this.tokenHandler.currentPair;
    const half = 0.4 * ((pair.accessIssuedAt ?? Date.now() / 1e3) + pair.accessLifespan - Math.floor(Date.now() / 1e3));
    return Math.max(30, half);
  }
  get responseTypes() {
    return RESPONSE_TYPES;
  }
  get Platform() {
    return Platform;
  }
};
function omit(obj, ...keys) {
  const out = {};
  for (const k in obj) if (Object.prototype.hasOwnProperty.call(obj, k) && keys.indexOf(k) < 0) out[k] = obj[k];
  return out;
}
function addSdkStatusChangeListener(auth, cb) {
  if (typeof auth.addInternalStatusChangeListener === "function") auth.addInternalStatusChangeListener(cb);
  else auth.addStatusChangeListener(cb);
}
var SocialAPI = /* @__PURE__ */ ((SocialAPI2) => {
  SocialAPI2[SocialAPI2["shareMessage"] = 0] = "shareMessage";
  SocialAPI2[SocialAPI2["sendUpdate"] = 1] = "sendUpdate";
  SocialAPI2[SocialAPI2["invite"] = 2] = "invite";
  SocialAPI2[SocialAPI2["getFriends"] = 3] = "getFriends";
  SocialAPI2[SocialAPI2["getContextId"] = 4] = "getContextId";
  SocialAPI2[SocialAPI2["getContextData"] = 5] = "getContextData";
  SocialAPI2[SocialAPI2["getContextPlayers"] = 6] = "getContextPlayers";
  return SocialAPI2;
})(SocialAPI || {});
var SocialEvents = /* @__PURE__ */ ((SocialEvents2) => {
  SocialEvents2["onConnect"] = "ON_CONNECT";
  SocialEvents2["onGameInvite"] = "RECEIVE_GAME_INVITE";
  SocialEvents2["onError"] = "ON_ERROR";
  return SocialEvents2;
})(SocialEvents || {});
var WebsocketEventTypes = /* @__PURE__ */ ((WebsocketEventTypes2) => {
  WebsocketEventTypes2["open"] = "open";
  WebsocketEventTypes2["close"] = "close";
  WebsocketEventTypes2["error"] = "error";
  WebsocketEventTypes2["message"] = "message";
  WebsocketEventTypes2["retry"] = "retry";
  return WebsocketEventTypes2;
})(WebsocketEventTypes || {});
var WebsocketClient = class {
  constructor(config) {
    this.config = config;
    this.retries = 0;
    this.closedByUser = false;
    this.RECONNECT_RETRY_MS = 1e3;
    this.RECONNECT_DEFAULT_BACKOFF_MS = 500;
    this.eventListeners = {
      open: [],
      close: [],
      error: [],
      message: [],
      retry: []
    };
    this.onOpen = (ev) => this.handleEvent("open" /* open */, ev);
    this.onClose = (ev) => this.handleEvent("close" /* close */, ev);
    this.onError = (ev) => this.handleEvent("error" /* error */, ev);
    this.onMessage = (ev) => this.handleEvent("message" /* message */, ev);
  }
  send(msg) {
    if (this.ws) {
      if (this.ws.readyState === WebSocket.OPEN) {
        if (this.closedByUser) this.config.logger?.error("WebsocketClient: Cannot send message, closed by user");
        else this.ws.send(msg);
      } else this.config.logger?.error("WebsocketClient: Cannot send message, not connected");
    } else {
      this.config.logger?.error("WebsocketClient: Cannot send message, not initialised");
    }
  }
  async connect() {
    this.closedByUser = false;
    if (this.ws) {
      this.ws.removeEventListener("open" /* open */, this.onOpen);
      this.ws.removeEventListener("close" /* close */, this.onClose);
      this.ws.removeEventListener("error" /* error */, this.onError);
      this.ws.removeEventListener("message" /* message */, this.onMessage);
      this.ws.close();
    }
    const url = typeof this.config.url === "function" ? await this.config.url() : this.config.url;
    const ws = this.config.webSocketClientBuilder ? this.config.webSocketClientBuilder(url) : new WebSocket(url);
    this.ws = ws;
    ws.addEventListener("open" /* open */, this.onOpen);
    ws.addEventListener("close" /* close */, this.onClose);
    ws.addEventListener("error" /* error */, this.onError);
    ws.addEventListener("message" /* message */, this.onMessage);
  }
  close(code = 1e3, reason = "client close") {
    this.closedByUser = true;
    this.ws?.close(code, reason);
  }
  on(event, fn) {
    const listeners = this.eventListeners[event];
    if (!listeners) throw new Error(`event type "${event}" is not supported`);
    listeners.push({ listener: fn });
  }
  removeListener(event, fn) {
    const listeners = this.eventListeners[event];
    if (!listeners) throw new Error(`event type "${event}" is not supported`);
    this.eventListeners[event] = listeners.filter((l) => l.listener !== fn);
  }
  getConnectionStatus() {
    return this.ws ? this.ws.readyState : WebSocket.CLOSED;
  }
  handleEvent(type, ev) {
    switch (type) {
      case "close" /* close */:
        if (!this.closedByUser) this.reconnect();
        break;
      case "open" /* open */:
        this.retries = 0;
        break;
      case "error" /* error */:
      case "message" /* message */:
        break;
    }
    this.dispatchEvent(type, ev);
  }
  reconnect() {
    const backoff = this.RECONNECT_DEFAULT_BACKOFF_MS * this.retries + this.RECONNECT_DEFAULT_BACKOFF_MS;
    const detail = { detail: { retries: this.retries++, backoff } };
    setTimeout(() => {
      if (this.closedByUser) return;
      this.dispatchEvent("retry" /* retry */, new CustomEvent("retry" /* retry */, detail));
      this.connect();
    }, backoff);
  }
  dispatchEvent(event, ev) {
    this.eventListeners[event]?.forEach((l) => l.listener(ev));
  }
};
var SocialWebsocketClient = class {
  constructor(config, container) {
    this.config = config;
    this.container = container;
    this.friendsStatus = /* @__PURE__ */ new Map();
    this.SocialEvents = SocialEvents;
    this.eventListeners = {
      ["ON_CONNECT" /* onConnect */]: [],
      ["RECEIVE_GAME_INVITE" /* onGameInvite */]: [],
      ["ON_ERROR" /* onError */]: []
    };
    this.wsClient = config.webSocketBuilder?.() ?? new WebsocketClient({
      logger: config.logger,
      url: () => this.getFreshUrl(config.apiHost, config.gameId)
    });
    if (!this.wsClient) throw new Error("websocket client is not defined");
    this.on("ON_CONNECT" /* onConnect */, ({ data }) => {
      for (const f of data.friends) this.friendsStatus.set(f.userId, f);
    });
    this.on("ON_CONNECT" /* onConnect */, ({ data }) => this.friendsStatus.set(data.userId, data));
    this.wsClient.on("open" /* open */, () => config.logger.log("connected to social server"));
    this.wsClient.on("close" /* close */, (ev) => config.logger.debug("websocket client closed", ev));
    this.wsClient.on("error" /* error */, (ev) => config.logger.error("websocket client error", ev));
    this.wsClient.on("message" /* message */, (ev) => {
      const msg = JSON.parse(ev.data);
      if (Object.values(SocialEvents).includes(msg.type)) this.dispatchEvent(msg.type, msg);
      else config.logger.error("event type is not supported");
    });
    addSdkStatusChangeListener(container.auth, (loggedIn) => this.onAuthStatusChange(loggedIn));
  }
  connect() {
    const shouldReconnect = this.lastUserId === this.container.auth.getFRVRID();
    const status = this.wsClient.getConnectionStatus();
    if (status !== WebSocket.OPEN && status !== WebSocket.CONNECTING || !shouldReconnect) {
      this.lastUserId = this.container.auth.getFRVRID();
      this.wsClient.connect();
    }
  }
  close() {
    this.friendsStatus.clear();
    this.lastUserId = void 0;
    this.wsClient.close();
  }
  on(event, fn) {
    const l = { listener: fn };
    const list = this.eventListeners[event];
    if (!list) throw new Error(`event type "${event}" is not supported`);
    list.push(l);
  }
  getFriendsStatus() {
    return Array.from(this.friendsStatus.values());
  }
  sendGameInvite(recipientId, lobbyId, metadata) {
    this.send({
      code: "SEND_GAME_INVITE",
      data: { recipientId, lobbyId, gameId: this.config.gameId, metadata }
    });
  }
  updateStatus(metadata) {
    this.send({ code: "UPDATE_STATUS", data: { metadata, gameId: this.config.gameId } });
  }
  dispatchEvent(event, msg) {
    this.eventListeners[event].forEach((l) => l.listener(msg));
  }
  send(msg) {
    this.wsClient.send(JSON.stringify(msg));
  }
  async onAuthStatusChange(loggedIn) {
    if (loggedIn) {
      const status = this.wsClient.getConnectionStatus();
      if (status === WebSocket.CLOSED || status === WebSocket.CONNECTING) this.connect();
    } else {
      this.close();
    }
  }
  async getFreshUrl(apiHost, gameId) {
    const token = await this.container.auth.getFreshAccessToken();
    return `wss://${apiHost}/ws?token=${token}&gameId=${gameId}`;
  }
};
var SocialResponseError = class extends Error {
  constructor(response) {
    super(response.statusText);
    this.response = response;
    this.name = "ResponseError";
  }
};
var SocialHttpClient = class {
  constructor(baseUrl, auth) {
    this.auth = auth;
    this.baseUrl = baseUrl.replace(/\/$/, "");
  }
  async getFriends(userId) {
    const response = await this.auth.authenticatedFetch(`${this.baseUrl}/friends/${userId}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" }
    });
    if (!response.ok) throw new SocialResponseError(response);
    return response.json();
  }
  async addFriend(userId, body) {
    const response = await this.auth.authenticatedFetch(`${this.baseUrl}/friends/${userId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    if (!response.ok) throw new SocialResponseError(response);
    return response.json();
  }
  async removeFriend(userId, body) {
    const response = await this.auth.authenticatedFetch(`${this.baseUrl}/friends/${userId}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    if (!response.ok) throw new SocialResponseError(response);
  }
  async syncFriends(userId, body) {
    const response = await this.auth.authenticatedFetch(`${this.baseUrl}/friends/${userId}/sync`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    if (!response.ok) throw new SocialResponseError(response);
    return response.json();
  }
};
var emptySocialProvider = {
  shareMessage: async () => {
  },
  sendUpdate: async () => {
  },
  canInvite: async () => false,
  invite: async () => {
  },
  getContextId: async () => "",
  getContextData: async () => ({}),
  getContextPlayers: async () => [],
  getFriends: async () => [],
  getSupportedAPIs: () => []
};
var Social = class {
  constructor(config, container) {
    this.config = config;
    this.container = container;
    this.friendsByFRVRID = {};
    this.friendsByChannelUserId = {};
    this.providerFriendsCache = {};
    this.API = SocialAPI;
    this.auth = container.auth;
    this.gameId = config.gameId;
    this.provider = container.provider ?? emptySocialProvider;
    const host = config.apiHostOverride ?? (config.env === "production" /* PRODUCTION */ ? "crucible.frvr.com" : "staging.crucible.frvr.com");
    const apiHost = `${host}/v1/social`;
    this.webClient = new SocialHttpClient(`https://${apiHost}`, this.auth);
    this.websocketClient = new SocialWebsocketClient({ ...config, apiHost }, container);
    this.socialPlatform = new SocialPlatform({ provider: this.provider });
    if (config.syncFriendsOnLogin ?? true) {
      addSdkStatusChangeListener(this.auth, this.onAuthStatusChange.bind(this));
    }
  }
  get wsClient() {
    return this.websocketClient;
  }
  get platform() {
    return this.socialPlatform;
  }
  async getFriends() {
    return this.socialPlatform.getFriends();
  }
  async syncFriends() {
    const res = await this.socialPlatform.getFriends();
    const byChannel = res.reduce((acc, f) => {
      const list = acc.get(f.channel) ?? [];
      list.push(f.id);
      acc.set(f.channel, list);
      return acc;
    }, /* @__PURE__ */ new Map());
    const out = [];
    for (const [channel, ids] of Array.from(byChannel.entries())) {
      const synced = await this.webClient.syncFriends(this.getUserId(), {
        channel,
        gameId: this.gameId,
        friendIds: ids
      });
      out.push(...synced);
    }
    this.friendsByFRVRID = out.reduce((acc, f) => (acc[f.userId] = f, acc), {});
    this.friendsByChannelUserId = out.reduce(
      (acc, f) => (acc[f.channelUserId] = f, acc),
      {}
    );
    this.providerFriendsCache = res.reduce(
      (acc, f) => (acc[f.id] = f, acc),
      {}
    );
    return out;
  }
  async getFriendsStatus() {
    return this.websocketClient.getFriendsStatus();
  }
  async getAllFriends() {
    return this.webClient.getFriends(this.getUserId());
  }
  async getFriendByFRVRID(frvrId) {
    const f = this.friendsByFRVRID[frvrId];
    if (!f) return;
    const p = this.providerFriendsCache[f.channelUserId];
    return { ...f, name: p?.name, image: p?.image };
  }
  async getFriendByChannelId(channelUserId) {
    const f = this.friendsByChannelUserId[channelUserId];
    if (!f) return;
    const p = this.providerFriendsCache[channelUserId];
    return { ...f, name: p?.name, image: p?.image };
  }
  async addFriend(friendId) {
    return this.webClient.addFriend(this.getUserId(), { friendId });
  }
  async removeFriend(friendId) {
    return this.webClient.removeFriend(this.getUserId(), { friendId });
  }
  getUserId() {
    const id = this.container.auth.getFRVRID();
    if (id === null) throw new Error("Player is not logged in");
    return id;
  }
  onAuthStatusChanged(loggedIn) {
    if (loggedIn) void this.syncFriends();
  }
  onAuthStatusChange(loggedIn) {
    this.onAuthStatusChanged(loggedIn);
  }
  getFriendsStatusForId(id) {
    return this.webClient.getFriends(id);
  }
  shareMessage(data) {
    return this.socialPlatform.shareMessage(data);
  }
  sendUpdate(data) {
    return this.socialPlatform.sendUpdate(data);
  }
  canInvite() {
    return this.socialPlatform.canInvite();
  }
  invite(data) {
    return this.socialPlatform.invite(data);
  }
  getContextId() {
    return this.socialPlatform.getContextId();
  }
  getContextData() {
    return this.socialPlatform.getContextData();
  }
  getContextPlayers() {
    return this.socialPlatform.getContextPlayers();
  }
  getSupportedAPIs() {
    return this.socialPlatform.getSupportedAPIs();
  }
  isSupportedAPI(api) {
    return this.socialPlatform.getSupportedAPIs().indexOf(api) !== -1;
  }
};
var SocialPlatform = class {
  constructor(config) {
    this.config = config;
    this.API = SocialAPI;
  }
  shareMessage(data) {
    return this.config.provider.shareMessage(data);
  }
  sendUpdate(data) {
    return this.config.provider.sendUpdate(data);
  }
  canInvite() {
    return this.config.provider.canInvite();
  }
  invite(data) {
    return this.config.provider.invite(data);
  }
  getFriends() {
    return this.config.provider.getFriends();
  }
  getContextId() {
    return this.config.provider.getContextId();
  }
  getContextData() {
    return this.config.provider.getContextData();
  }
  getContextPlayers() {
    return this.config.provider.getContextPlayers();
  }
  getSupportedAPIs() {
    return this.config.provider.getSupportedAPIs();
  }
  isSupportedAPI(api) {
    return this.getSupportedAPIs().includes(api);
  }
};
var LeaderboardEntry2 = class {
  constructor(data) {
    this.id = data.id;
    this.name = data.name;
    this.photo = data.photo;
    this.rank = data.rank;
    if (data.updated) this.updated = data.updated;
    this.score = data.score;
    this.payload = data.payload;
  }
};
var Tournament2 = class {
  constructor(data) {
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
};
var LeaderboardClient2 = class {
  constructor(channel) {
    this.channel = channel;
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
  async createLeaderboard(type, opts) {
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
    const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const json = await res.json();
    if (!res.ok) throw new LeaderboardError2(json.error);
    return json.id;
  }
  async getLeaderboard(id, count = 30, offset = 0, cachePolicy = "highest" /* HIGHEST */) {
    const url = `${this.apiUrl}/v1/leaderboards/${this.gameId}/${id}`;
    const res = await fetch(`${url}?${new URLSearchParams({ count: count.toString(), offset: offset.toString() })}`);
    const json = await res.json();
    if (!res.ok) throw new LeaderboardError2(json.error);
    json.payload = json.data;
    if (json.players) {
      json.players = json.players.map((p) => {
        const entry = new LeaderboardEntry2(p);
        entry.score = this.getCachedScore(id, entry.id, entry.score, cachePolicy);
        return entry;
      });
    }
    return new Tournament2(json);
  }
  async getLeaderboardEntry(id, playerId, cachePolicy = "highest" /* HIGHEST */) {
    const url = `${this.apiUrl}/v1/leaderboards/${this.gameId}/${id}/${playerId}`;
    const res = await fetch(`${url}?${new URLSearchParams({ platform: this.channel })}`);
    const json = await res.json();
    if (!res.ok) throw new LeaderboardError2(json.error);
    json.payload = json.data;
    json.score = this.getCachedScore(id, playerId, json.score, cachePolicy);
    return new LeaderboardEntry2(json);
  }
  async submitScore(leaderboardId, playerId, score, name, photo, cachePolicy = "highest" /* HIGHEST */) {
    this.applyStatus(leaderboardId, playerId, score, cachePolicy);
    const url = `${this.apiUrl}/v1/leaderboards/${this.gameId}/${leaderboardId}`;
    const body = {
      id: playerId,
      score,
      platform: this.channel,
      disableSortOrder: cachePolicy === "latest" /* LATEST */
    };
    if (name) body.name = name;
    if (photo) body.photo = photo;
    const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const json = await res.json();
    if (!res.ok) throw new LeaderboardError2(json.error);
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
      sortOrder: opts.sortOrder || "desc",
      sortBy: opts.sortBy || "created",
      count: (opts.count || 30).toString(),
      offset: (opts.offset || 0).toString(),
      verbose: opts.verbose ? "true" : "false"
    };
    const res = await fetch(`${url}?${new URLSearchParams(params)}`);
    const json = await res.json();
    if (!res.ok) throw new LeaderboardError2(json.error);
    return json;
  }
  async getLeaderboardEntries(leaderboardId, players, cachePolicy = "highest" /* HIGHEST */) {
    if (!players.length) return [];
    const url = `${this.apiUrl}/v1/leaderboards/${this.gameId}/${leaderboardId}/entries`;
    const params = { platform: this.channel, players: players.join(",") };
    const res = await fetch(`${url}?${new URLSearchParams(params)}`);
    const json = await res.json();
    if (!res.ok) throw new LeaderboardError2(json.error);
    return (json?.entries || []).map((e) => {
      e.payload = e.data;
      e.score = this.getCachedScore(leaderboardId, e.id, e.score, cachePolicy);
      return new LeaderboardEntry2(e);
    });
  }
  async getTimelineEntries(opts) {
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
    if (!res.ok) throw new LeaderboardError2(json.error);
    return (json?.entries || []).map((e) => new LeaderboardEntry2(e));
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
    }
    cache.scores[playerId] = score;
  }
};
var LeaderboardError2 = class extends Error {
  constructor(code, message) {
    super(message ?? code);
    this.name = "LeaderboardError";
    this.code = code;
  }
};
var TournamentAPI = /* @__PURE__ */ ((TournamentAPI2) => {
  TournamentAPI2[TournamentAPI2["getCurrentTournament"] = 0] = "getCurrentTournament";
  TournamentAPI2[TournamentAPI2["getActiveTournaments"] = 1] = "getActiveTournaments";
  TournamentAPI2[TournamentAPI2["create"] = 2] = "create";
  TournamentAPI2[TournamentAPI2["getLeaderboardEntry"] = 3] = "getLeaderboardEntry";
  TournamentAPI2[TournamentAPI2["join"] = 4] = "join";
  TournamentAPI2[TournamentAPI2["leave"] = 5] = "leave";
  TournamentAPI2[TournamentAPI2["share"] = 6] = "share";
  TournamentAPI2[TournamentAPI2["invitePlayers"] = 7] = "invitePlayers";
  return TournamentAPI2;
})(TournamentAPI || {});
var emptyTournamentsProvider = {
  isSupported: () => false,
  getSupportedAPIs: () => [],
  getLeaderboardsChannelId: () => "empty",
  getCurrentTournament: async () => null,
  create: async () => null,
  postScore: async () => {
  },
  share: async () => {
  },
  getActiveTournaments: async () => [],
  join: async () => {
  },
  leave: async () => {
  },
  invitePlayers: async () => {
  }
};
var Tournaments = class {
  constructor(provider) {
    this.provider = provider;
  }
  isSupported() {
    return this.provider.isSupported();
  }
  isSupportedAPI(api) {
    return this.provider.getSupportedAPIs().indexOf(api) !== -1;
  }
  getSupportedAPIs() {
    return this.provider.getSupportedAPIs();
  }
  getCurrentTournament() {
    return this.provider.getCurrentTournament();
  }
  getActiveTournaments() {
    return this.provider.getActiveTournaments();
  }
  join(id) {
    return this.provider.join(id);
  }
  leave(id) {
    return this.provider.leave(id);
  }
  share(id, data) {
    return this.provider.share(id, data);
  }
  invitePlayers(data) {
    return this.provider.invitePlayers(data);
  }
  updateScore(id, score, name, photo) {
    return this.provider.updateScore(id, score, name, photo);
  }
};
var IAPError2 = class extends Error {
  constructor(message, options, code = "UNKNOWN" /* UNKNOWN */) {
    super(message);
    this.code = code;
    if (options && "cause" in options) this.cause = options.cause;
  }
};
var IAPPurchaseErrorUnknownProduct = class extends IAPError2 {
  constructor(msg, opts) {
    super(msg, opts, "INVALID_PARAM" /* INVALID_PARAM */);
  }
};
var IAPPurchaseErrorCancelledByUser2 = class extends IAPError2 {
  constructor(msg = "Purchase cancelled by user", opts) {
    super(msg, opts, "USER_INPUT" /* USER_INPUT */);
    this.name = "IAPPurchaseErrorCancelledByUser";
  }
};
function isPurchaseCancelled(e) {
  return e instanceof IAPPurchaseErrorCancelledByUser2 || e?.name === "IAPPurchaseErrorCancelledByUser";
}
var IAPPurchaseErrorAlreadyOwned = class extends IAPError2 {
  constructor(msg = "Purchase already owned", opts) {
    super(msg, opts, "ALREADY_OWNED" /* ALREADY_OWNED */);
  }
};
function isAlreadyOwned(e) {
  return e instanceof IAPPurchaseErrorAlreadyOwned || e?.code === "ALREADY_OWNED" /* ALREADY_OWNED */;
}
var IAPPurchaseErrorInProgress = class extends IAPError2 {
  constructor(msg = "A purchase is already in progress", opts) {
    super(msg, opts, "IN_PROGRESS" /* IN_PROGRESS */);
    this.name = "IAPPurchaseErrorInProgress";
  }
};
var IAPPurchaseErrorHeldByEconomy = class extends IAPError2 {
  constructor(msg = "Purchase held by the economy until it is granted", opts) {
    super(msg, opts, "HELD_BY_ECONOMY" /* HELD_BY_ECONOMY */);
    this.maybePaid = true;
    this.name = "IAPPurchaseErrorHeldByEconomy";
  }
};
var IAPPurchaseErrorPopupBlocked = class extends IAPError2 {
  constructor(msg = "The payment window was blocked by the browser", opts) {
    super(msg, opts, "POPUP_BLOCKED" /* POPUP_BLOCKED */);
    this.name = "IAPPurchaseErrorPopupBlocked";
  }
};
function isPopupBlocked(e) {
  return e instanceof IAPPurchaseErrorPopupBlocked || e?.name === "IAPPurchaseErrorPopupBlocked";
}
var IAPPurchaseErrorPending = class extends IAPError2 {
  constructor(msg = "Payment received; the purchase is still being confirmed", opts) {
    super(msg, opts, "PENDING" /* PENDING */);
    this.pending = true;
    this.name = "IAPPurchaseErrorPending";
  }
};
function isPurchasePending(e) {
  return e instanceof IAPPurchaseErrorPending || e?.name === "IAPPurchaseErrorPending";
}
var emptyIAPProvider = {
  getName: () => "Empty Provider",
  init: async () => {
  },
  configure: async () => {
  },
  isReady: () => false,
  getCatalog: () => ({}),
  getProductById: () => void 0,
  purchase: async () => {
    throw new Error("no products");
  },
  consumePurchase: () => {
    throw new Error("no products");
  },
  getUnconsumedPurchases: async () => [],
  onIsReadyChanged: () => {
  }
};
var IAP = class {
  constructor(opts) {
    this.providers = [];
    this.selected = null;
    this.selectionFresh = false;
    this.backfill = /* @__PURE__ */ new Map();
    this.ready = false;
    this.readyWaiters = /* @__PURE__ */ new Set();
    this.consumed = /* @__PURE__ */ new Set();
    this.consumedByEconomy = /* @__PURE__ */ new Set();
    this.finishedByEconomy = /* @__PURE__ */ new Set();
    this.consuming = /* @__PURE__ */ new Map();
    this.managed = /* @__PURE__ */ new Map();
    this.errors = { IAPError: IAPError2, IAPPurchaseErrorCancelledByUser: IAPPurchaseErrorCancelledByUser2, IAPPurchaseErrorAlreadyOwned, IAPPurchaseErrorInProgress, IAPPurchaseErrorHeldByEconomy, IAPPurchaseErrorPopupBlocked, IAPPurchaseErrorPending };
    if (opts.providers) this.providersThunk = opts.providers;
    else this.adoptProviders([opts.provider || emptyIAPProvider]);
    this.logger = opts.logger || emptyLogger2;
    this.ensureLogin = opts.ensureLogin;
    this.iapTracker = opts.iapTracker;
  }
  adoptProviders(list) {
    this.providers = list;
    this.selected = list.length === 1 ? list[0] : null;
    const backfilled = [...this.backfill.values()];
    for (const p of list) {
      p.onIsReadyChanged?.(() => this.emitReady());
      if (backfilled.length > 0) p.addProducts?.(backfilled);
    }
  }
  getReadyProviders() {
    return this.providers.filter((p) => p.isReady());
  }
  currentProvider() {
    if (this.selected?.isReady()) return this.selected;
    return this.getReadyProviders()[0] ?? this.selected ?? this.providers[0] ?? emptyIAPProvider;
  }
  emitReady() {
    const isReady = this.isReady();
    if (isReady) this.readyWaiters.forEach((cb) => cb());
    if (isReady !== this.ready) {
      this.ready = isReady;
      this.onReadyHandler?.(isReady);
    }
  }
  async init() {
    if (this.providersThunk) {
      let list = [];
      try {
        list = await this.providersThunk() ?? [];
      } catch (err) {
        this.logger.error("Economy.purchase: no provider mapping for IAP", err);
      }
      this.adoptProviders(list.length > 0 ? list : [emptyIAPProvider]);
    }
    await Promise.all(
      this.providers.map(
        (p) => Promise.resolve(p.init()).catch((err) => {
          this.logger.error(`IAP provider ${p.getName()} init failed`, err);
        })
      )
    );
    this.emitReady();
  }
  async configure(config) {
    await Promise.all(this.providers.map((p) => p.configure(config)));
  }
  isReady() {
    return this.providers.some((p) => p.isReady());
  }
  onReady(cb) {
    this.onReadyHandler = cb;
  }
  emitReadyNow() {
    if (this.isReady()) {
      this.ready = true;
      this.onReadyHandler?.(true);
    }
  }
  getProviderName() {
    if (this.selected) return this.selected.getName();
    if (this.providers.length === 1) return this.providers[0].getName();
    return "multi";
  }
  getRegisteredProviders() {
    return this.providers.map((p) => ({
      id: p.getName(),
      displayName: p.getDisplayName?.() ?? p.getName(),
      ready: p.isReady()
    }));
  }
  backfillProducts(products) {
    for (const p of products) this.backfill.set(p.sku, p);
    for (const provider of this.providers) provider.addProducts?.(products);
  }
  async selectProvider(id) {
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
      providers: ready.map((p) => ({ id: p.getName(), displayName: p.getDisplayName?.() ?? p.getName() }))
    });
    if (chosen != null) {
      this.selected = ready.find((p) => p.getName() === chosen) ?? this.selected;
      this.selectionFresh = !!this.selected;
      return this.selectionFresh;
    }
    return false;
  }
  getProviderCatalog(sku) {
    const p = this.selected ?? (this.providers.length === 1 ? this.providers[0] : null);
    return p?.getProductById?.(sku);
  }
  getCatalog() {
    return this.providers.reduce((acc, p) => ({ ...acc, ...p.getCatalog?.() ?? {} }), {});
  }
  getProductForSku(sku) {
    return this.getProviderCatalog(sku) ?? this.backfill.get(sku);
  }
  getProductById(sku) {
    return this.getProductForSku(sku);
  }
  async purchase(sku, fields = {}, context = {}, isManaged = false) {
    await this.requireLogin();
    if (fields.payment_id && context.provider == null && this.providers.some((p) => p.getName() === "stripe")) {
      context = { ...context, provider: "stripe" };
    }
    if (context.provider != null) {
      if (!await this.selectProvider(context.provider)) {
        throw new IAPError2(`Unknown payment option "${context.provider}"`);
      }
    } else {
      if (!(this.selectionFresh && this.selected || await this.selectProvider(void 0))) {
        throw new IAPPurchaseErrorCancelledByUser2();
      }
    }
    this.selectionFresh = false;
    const provider = this.selected ?? this.currentProvider();
    await provider.ensureReady?.().catch(() => {
    });
    const hasPaymentId = !!fields.payment_id;
    const product = hasPaymentId ? void 0 : this.getProductForSku(sku);
    this.iapTracker?.logRequestPayment(product);
    const bypassProduct = !!fields.real || hasPaymentId;
    if (!product && !bypassProduct) throw new IAPPurchaseErrorUnknownProduct(`Unknown product "${sku}"`);
    try {
      const purchase = await provider.purchase(product?.productId ?? sku, fields);
      if (isManaged) this.managePurchase(purchase);
      this.iapTracker?.logRequestPaymentSuccess(product, purchase);
      return purchase;
    } catch (err) {
      const msg = err.message || String(err);
      this.iapTracker?.logRequestPaymentError(product, msg);
      if (isPurchaseCancelled(err)) {
        this.logger.debug("IAP: purchase cancelled");
        throw err;
      }
      if (isPopupBlocked(err)) {
        this.logger.warn("IAP: purchase window blocked by the browser");
        throw err;
      }
      if (isPurchasePending(err)) {
        this.logger.warn("IAP: payment received, still being confirmed", sku);
        throw err;
      }
      if (isAlreadyOwned(err) && (hasPaymentId || provider.reportsAlreadyOwned)) {
        this.logger.warn(hasPaymentId ? "IAP: this payment was already completed" : "IAP: product already owned", sku);
        throw err;
      }
      this.logger.error("Error in purchase: " + msg, err);
      throw new IAPError2("Unexpected purchase error", { cause: err });
    }
  }
  async requireLogin() {
    if (!this.ensureLogin) return;
    let res = { proceed: false, loggedIn: false };
    try {
      res = await this.ensureLogin();
    } catch (err) {
      this.logger.error("IAP: pre-purchase login failed", err);
    }
    if (!res?.proceed) throw new IAPPurchaseErrorCancelledByUser2();
    if (res.loggedIn) await this.waitUntilReady(1e4);
  }
  waitUntilReady(timeout = 1e4) {
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
  async consumeManagedPurchase(purchase) {
    const id = purchaseIdOf(purchase);
    let m = id == null ? void 0 : this.managed.get(id);
    while (m && !m.released) {
      await m.promise;
      m = id == null ? void 0 : this.managed.get(id);
    }
    if (m?.released) {
      this.logger.warn("IAP: not consuming a purchase economy has not granted; the next launch recovers it", id);
      throw new IAPPurchaseErrorHeldByEconomy();
    }
    if (id != null && !this.consumed.has(id) && !this.consumedByEconomy.has(id)) {
      await this.trackConsumption(id, this.consumeNative(purchase, isConsumable(purchase)));
    }
    return purchase.purchaseId;
  }
  managePurchase(purchase) {
    const id = purchaseIdOf(purchase);
    if (id == null || this.consumed.has(id) || this.consuming.has(id)) return false;
    const existing = this.managed.get(id);
    if (existing && !existing.released) return false;
    let settle;
    const promise = new Promise((res) => settle = res);
    this.managed.set(id, { promise, settle, released: false });
    return true;
  }
  async consumePurchase(purchase) {
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
  isConsumable(purchase) {
    try {
      return this.providerOf(purchase).isConsumable?.(purchase);
    } catch (err) {
      this.logger.error("[FRVR-Economy] reading the item type failed", err);
    }
  }
  releasePurchase(purchase, forget = false) {
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
  managedOf(id) {
    return id != null ? this.managed.get(id) : void 0;
  }
  forgetManaged(id) {
    if (id == null) return;
    const m = this.managed.get(id);
    if (m) {
      this.managed.delete(id);
      m.settle();
    }
  }
  consumeOnce(purchase, finishNonConsumable = false) {
    const id = purchaseIdOf(purchase);
    if (id == null) return this.consumeNative(purchase, finishNonConsumable);
    if (this.consumed.has(id)) return Promise.resolve();
    return this.consuming.get(id) ?? this.trackConsumption(id, this.consumeNative(purchase, finishNonConsumable));
  }
  trackConsumption(id, promise) {
    if (id == null) return promise;
    const tracked = promise.then(() => this.consumed.add(id)).finally(() => {
      if (this.consuming.get(id) === tracked) this.consuming.delete(id);
    });
    this.consuming.set(id, tracked);
    return tracked;
  }
  async consumeNative(purchase, finishNonConsumable = false) {
    const provider = this.providerOf(purchase);
    if (finishNonConsumable && provider.finishNonConsumable) {
      try {
        await provider.finishNonConsumable(purchase);
      } catch (err) {
        throw new IAPError2("IAP: isConsumable failed", { cause: err });
      }
    } else {
      this.iapTracker?.logConsumePurchase(this.getProductForSku(purchase.productId), purchase);
      try {
        await provider.consumePurchase(purchase);
      } catch (err) {
        throw new IAPError2("IAP: isConsumable failed", { cause: err });
      }
    }
  }
  providerOf(purchase) {
    const p = this.providers.find((x) => x.getName() === purchase.channelId);
    return p ?? this.selected ?? this.currentProvider();
  }
  getBackendProviderName(purchase) {
    const p = this.providerOf(purchase);
    return { name: p.getName(), backendProvider: p.getBackendProvider?.() };
  }
  getBackendProvider() {
    const name = this.getProviderName();
    return this.selected?.getBackendProvider?.() ?? RECOVERY_PROVIDER_MAP[name];
  }
  prepareCheckout(fields) {
    return this.selected?.prepareCheckout?.(fields);
  }
  purchaseManaged(sku, fields) {
    return this.purchase(sku, fields, {}, true);
  }
  getUnconsumedPurchases() {
    return this.getUnconsumedPurchasesUntracked(true);
  }
  getPurchases() {
    return this.getUnconsumedPurchases();
  }
  async getUnconsumedPurchasesUntracked(tracked = false) {
    const [unconsumed, recover] = await Promise.all([
      this.unconsumedPurchases(!tracked),
      this.getPurchasesToRecover(tracked)
    ]);
    const known = new Set(unconsumed.map(purchaseIdOf).filter((id) => id != null));
    return [...unconsumed, ...recover.filter((p) => !known.has(purchaseIdOf(p)))];
  }
  async getPurchasesToRecover(tracked = false) {
    const results = await Promise.all(
      this.providers.map(
        (p) => Promise.resolve(p.getPurchasesToRecover?.()).catch((err) => {
          this.logger.error(`IAP provider ${p.getName()} purchases to recover failed`, err);
          return [];
        })
      )
    );
    return results.flatMap((r) => r ?? []);
  }
  async unconsumedPurchases(untracked = false) {
    if (untracked) this.iapTracker?.logRestorePurchases();
    try {
      const seen = /* @__PURE__ */ new Set();
      const providers = [];
      for (const p of this.providers) {
        const name = p.getBackendProvider?.() ?? p.getName();
        if (seen.has(name)) continue;
        seen.add(name);
        providers.push(p);
      }
      const results = await Promise.allSettled(providers.map((p) => p.getUnconsumedPurchases()));
      const failures = results.filter((r) => r.status === "rejected");
      if (failures.length > 0 && failures.length === results.length) throw failures[0].reason;
      const out = results.flatMap((r) => r.status === "fulfilled" ? r.value ?? [] : []).filter((p) => !this.consumedByEconomy.has(purchaseIdOf(p)));
      if (untracked) this.iapTracker?.logRestorePurchasesSuccess();
      return out;
    } catch (err) {
      const msg = err.message || String(err);
      if (untracked) this.iapTracker?.logRestorePurchasesError(msg);
      this.logger.error("[FRVR-Economy] purchase recovery failed", err);
    }
    return [];
  }
  purchaseWith(purchaseId, fields = {}) {
    return this.purchase(purchaseId, fields);
  }
  restorePurchases() {
    const p = this.currentProvider();
    if (p.restorePurchases) {
      this.iapTracker?.logRestorePurchases();
      return p.restorePurchases();
    }
    return this.getUnconsumedPurchases();
  }
};
function purchaseIdOf(purchase) {
  return purchase?.purchaseId ?? purchase?.transactionId;
}
function isConsumable(purchase) {
  try {
    return purchase.consumable !== false;
  } catch {
    return true;
  }
}
function showProviderSelectPopup({
  providers
}) {
  if (typeof document === "undefined" || !document.body) return Promise.resolve(null);
  if (providers.length === 1) return Promise.resolve(providers[0].id);
  if (providers.length === 0) return Promise.resolve(null);
  hideProviderSelectPopup();
  const container = document.createElement("div");
  container.innerHTML = PROVIDER_POPUP_HTML;
  const el = container.firstElementChild;
  document.body.appendChild(el);
  activePopup = el;
  const list = el.querySelector(".frvr-iap-provider-popup-options");
  const cancel = el.querySelector(".frvr-iap-provider-popup-cancel");
  return new Promise((resolve) => {
    const done = (id) => {
      pendingCancel = null;
      hideProviderSelectPopup();
      resolve(id);
    };
    pendingCancel = () => resolve(null);
    for (const p of providers) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "frvr-iap-provider-popup-option";
      btn.dataset.providerId = p.id;
      btn.textContent = p.displayName;
      btn.addEventListener("click", () => done(p.id));
      list.appendChild(btn);
    }
    list.firstElementChild?.focus();
    cancel.addEventListener("click", () => done(null));
  });
}
var activePopup = null;
var pendingCancel = null;
function hideProviderSelectPopup() {
  activePopup?.remove();
  activePopup = null;
  pendingCancel?.();
  pendingCancel = null;
}
var PROVIDER_POPUP_HTML = `
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
var EconomyError = class extends Error {
  constructor(message, code = "UNKNOWN" /* UNKNOWN */, cause) {
    super(message);
    this.code = code;
    this.cause = cause;
  }
};
var IAP_API_HOST_PRODUCTION = "https://crucible.frvr.com/v1/iap";
var IAP_API_HOST_STAGING = "https://staging.crucible.frvr.com/v1/iap";
function resolveIapHost(env, override) {
  if (override != null) return override;
  return env === "production" /* PRODUCTION */ ? IAP_API_HOST_PRODUCTION : IAP_API_HOST_STAGING;
}
var PROVIDER_MAP = {
  "ios-iap-provider": "apple",
  "google-play-iap-provider": "google",
  "samsung-galaxy-iap-provider": "samsung_galaxy_store",
  "samsung_instant_play": "samsung_galaxy_store",
  "fbi-iap-provider": "facebook",
  "web-xsolla": "xsolla",
  discord: "discord",
  microsoft: "microsoft"
};
var WALLET_MAP = {
  "web-google-pay": "google-pay",
  "web-apple-pay": "apple-pay",
  "web-card": "card"
};
var PROVIDERS_WITH_RECOVER = /* @__PURE__ */ new Set(["web-xsolla", "stripe"]);
var RECOVERY_PROVIDER_MAP = {
  "ios-iap-provider": "apple",
  "google-play-iap-provider": "google",
  "samsung-galaxy-iap-provider": "samsung",
  samsung_instant_play: "samsung",
  samsung_galaxy_store: "samsung",
  "fbi-iap-provider": "facebook",
  "web-xsolla": "xsolla",
  stripe: "stripe",
  apple: "apple",
  google: "google",
  facebook: "facebook",
  samsung: "samsung",
  discord: "discord",
  microsoft: "microsoft"
};
var REAL_MONEY_RECOVERY_PROVIDERS = /* @__PURE__ */ new Set([
  "apple",
  "google",
  "facebook",
  "samsung",
  "discord",
  "microsoft"
]);
var IAPServiceClient = class {
  constructor(config) {
    this.config = config;
    this.cache = /* @__PURE__ */ new Map();
    this.walletTransactions = null;
    this.json = this.validateAndReturnJSON;
  }
  get auth() {
    return this.config.auth;
  }
  get channelId() {
    return this.config.channelId;
  }
  get apiHost() {
    return this.config.apiHost ?? resolveIapHost(this.config.env, this.config.hostOverride);
  }
  get purchaseSource() {
    return this.config.purchaseSource;
  }
  getBaseConfig() {
    return {
      environment: this.config.env,
      channelId: this.channelId,
      apiHost: this.apiHost,
      purchaseSource: this.purchaseSource
    };
  }
  getXsollaProducts() {
    return this.cachedFetch(this.apiHost + "/xsolla/transactions");
  }
  getXsollaTransaction(id) {
    return this.cachedFetch(`${this.apiHost}/xsolla/transactions/${id}`);
  }
  createXsollaPaymentUrl(body) {
    return this.postWithAuth(`${this.apiHost}/xsolla/create-payment-url`, {
      sandbox: this.config.env !== "production" /* PRODUCTION */,
      ...body
    });
  }
  consumeXsollaTransaction(id) {
    return this.postWithAuth(`${this.apiHost}/xsolla/transactions/${id}/consume`, {});
  }
  listXsollaTransactions() {
    return this.cachedFetch(`${this.apiHost}/xsolla/transactions?consumed=false&status=SUCCESS`);
  }
  getWalletTransaction(id) {
    return this.cachedFetch(`${this.apiHost}/wallet/transactions/${id}`);
  }
  listWalletTransactions() {
    return this.cachedFetch(`${this.apiHost}/wallet/transactions?consumed=false&status=SUCCESS`);
  }
  listPaidWalletTransactions() {
    return this.cachedFetch(`${this.apiHost}/wallet/transactions?status=SUCCESS`);
  }
  createWalletPaymentIntent(body) {
    return this.postWithAuth(`${this.apiHost}/wallet/payment-intent/${this.config.gameId}`, body);
  }
  consumeWalletTransaction(id) {
    return this.postWithAuth(`${this.apiHost}/wallet/transactions/${id}/consume`, {});
  }
  invalidateWalletTransactions() {
    this.walletTransactions = null;
  }
  async postWithAuth(url, body) {
    const res = await this.auth.authenticatedFetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(this.withSource(body))
    });
    return this.validateAndReturnJSON(res);
  }
  cachedFetch(url) {
    let p = this.cache.get(url);
    if (!p) {
      p = fetch(url, { method: "GET" }).then(this.validateAndReturnJSON).catch(() => {
        this.cache.delete(url);
        throw new Error("Failed to fetch " + url);
      });
      this.cache.set(url, p);
    }
    return p;
  }
  withSource(body) {
    if (this.purchaseSource && body && typeof body === "object" && !Array.isArray(body)) {
      return { ...body, source: this.purchaseSource };
    }
    return body;
  }
  validateAndReturnJSON(res) {
    if (!res.ok) {
      throw new Error(`IAPServiceClient bad response: ${res.status} ${res.statusText}`);
    }
    return res.json();
  }
};
var EconomyServiceClient = class {
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
    purchaseSource
  }) {
    this.cache = /* @__PURE__ */ new Map();
    this.auth = auth;
    this.gameId = gameId;
    this.baseUrl = apiHostOverride ?? overrideBackendURL ?? apiUrl ?? (env === "production" /* PRODUCTION */ ? "https://crucible.frvr.com/v1/economy" : "https://staging.crucible.frvr.com/v1/economy");
    this.iapHost = resolveIapHost(env, iapHostOverride);
    this.purchaseSource = purchaseSource;
  }
  myWallets() {
    const playerId = this.auth.getFRVRID();
    return this.auth.authenticatedFetch(
      `${this.baseUrl}/games/${encodeURIComponent(this.gameId)}/players/${encodeURIComponent(playerId)}/wallets`,
      { method: "GET" }
    ).then(this.json);
  }
  getMyWallets() {
    return this.myWallets();
  }
  defaultWallet() {
    return this.auth.authenticatedFetch(`${this.baseUrl}/games/${encodeURIComponent(this.gameId)}/wallets/default`, { method: "GET" }).then(this.json);
  }
  wallet(id) {
    return this.auth.authenticatedFetch(`${this.baseUrl}/wallets/${encodeURIComponent(id)}`, { method: "GET" }).then(this.json);
  }
  transactions(walletId, opts) {
    const query = opts?.limit ? `?limit=${opts.limit}` : "";
    return this.auth.authenticatedFetch(
      `${this.baseUrl}/wallets/${encodeURIComponent(walletId)}/transactions${query}`,
      { method: "GET" }
    ).then(this.json);
  }
  listWalletTransactions(walletId, opts) {
    return this.transactions(walletId, opts);
  }
  itemDefinitions() {
    return this.auth.authenticatedFetch(`${this.baseUrl}/games/${encodeURIComponent(this.gameId)}/item-definitions`, { method: "GET" }).then(this.json);
  }
  currencies() {
    return this.auth.authenticatedFetch(`${this.baseUrl}/currencies?game=${encodeURIComponent(this.gameId)}`, { method: "GET" }).then(this.json);
  }
  getShops() {
    return this.auth.authenticatedFetch(`${this.baseUrl}/games/${encodeURIComponent(this.gameId)}/shop/displays`, { method: "GET" }).then(this.json);
  }
  getShop(shopfrontId = "") {
    return this.auth.authenticatedFetch(
      `${this.baseUrl}/games/${encodeURIComponent(this.gameId)}/shop/displays/${encodeURIComponent(shopfrontId)}`,
      { method: "GET" }
    ).then(this.json);
  }
  shopProducts() {
    return this.auth.authenticatedFetch(`${this.baseUrl}/games/${encodeURIComponent(this.gameId)}/shop/products`, { method: "GET" }).then(this.json);
  }
  allShopProducts() {
    return this.shopProducts();
  }
  shopProduct(id) {
    return this.auth.authenticatedFetch(
      `${this.baseUrl}/games/${encodeURIComponent(this.gameId)}/shop/products/${encodeURIComponent(id)}`,
      { method: "GET" }
    ).then(this.json);
  }
  getProducts(ids) {
    return Promise.all(ids.map((id) => this.shopProduct(id)));
  }
  timed(fn) {
    const controller = typeof AbortController !== "undefined" ? new AbortController() : void 0;
    let timer;
    const timeout = new Promise((_, reject) => {
      timer = setTimeout(() => {
        controller?.abort();
        reject(new EconomyError("economy request timed out after 15000ms", "NETWORK_ERROR" /* NETWORK_ERROR */));
      }, 15e3);
    });
    return Promise.race([fn(controller?.signal), timeout]).finally(() => clearTimeout(timer));
  }
  async json(res) {
    if (res.ok) return res.json();
    const text = await res.text();
    let body;
    try {
      body = JSON.parse(text);
    } catch {
    }
    const code = body?.error?.code;
    const msg = body?.message ?? text;
    if (code === "ANONYMOUS_NOT_ALLOWED" /* ANONYMOUS_NOT_ALLOWED */) throw new EconomyError(msg, "ANONYMOUS_NOT_ALLOWED" /* ANONYMOUS_NOT_ALLOWED */);
    throw new EconomyError(`economy response error: ${res.status}: ${msg}`, res.status >= 500 ? "SERVER_ERROR" /* SERVER_ERROR */ : "NETWORK_ERROR" /* NETWORK_ERROR */, { status: res.status, body: text });
  }
  async resolveProductAndPrice(productRef, priceRef) {
    let shop = this.cache.get(productRef);
    if (!shop) {
      shop = await this.fetchShop(productRef);
      this.cache.set(String(shop.id), shop);
      this.cache.set(shop.shopfrontId, shop);
      this.cacheShops([shop]);
    }
    const price = shop.prices.find((p) => p.shopfrontId === priceRef || String(p.id) === priceRef);
    if (!price) throw new Error(`Economy.purchase: price ${priceRef} not on product ${productRef}`);
    return { product: shop, price };
  }
  async fetchShop(productRef) {
    const res = await this.auth.authenticatedFetch(
      `${this.baseUrl}/games/${encodeURIComponent(this.gameId)}/shop/products/${encodeURIComponent(productRef)}`,
      { method: "GET" }
    );
    if (!res.ok) throw new EconomyError("Failed to fetch shop data: " + res.status + " " + res.statusText, res.status);
    return res.json();
  }
  cacheShops(shops) {
    for (const s of shops) {
      for (const [id, p] of Object.entries(s.products ?? {})) this.cache.set(id, p);
      this.cache.set(s.shopfrontId, s);
    }
  }
  async createShopIntent(body) {
    const headers = { "Content-Type": "application/json" };
    if (body.idempotencyKey) headers["Idempotency-Key"] = body.idempotencyKey;
    return this.timed(
      (signal) => this.auth.authenticatedFetch(`${this.iapHost}/shop/intent/${this.gameId}`, {
        method: "POST",
        headers,
        signal,
        body: JSON.stringify({
          productRef: body.productRef,
          priceRef: body.priceRef,
          walletId: body.walletId,
          provider: body.provider,
          channelId: body.channelId,
          ...body.quantity != null ? { quantity: body.quantity } : {},
          ...body.wallet ? { wallet: body.wallet } : {},
          ...body.checkout ? { checkout: body.checkout } : {},
          ...body.checkout && body.returnUrl ? { returnUrl: body.returnUrl } : {},
          ...this.purchaseSource ? { source: this.purchaseSource } : {}
        })
      }).then(this.json)
    );
  }
  finalizeShopPurchase(body) {
    return this.timed(
      (signal) => this.auth.authenticatedFetch(`${this.iapHost}/shop/finalize/${this.gameId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal,
        body: JSON.stringify({
          iapTransactionId: body.iapTransactionId,
          provider: body.provider,
          externalRef: body.externalRef,
          payload: body.payload
        })
      }).then(this.json)
    );
  }
  recoverShopPurchase(body) {
    const statuses = /* @__PURE__ */ new Map([
      [200, "settled"],
      [202, "pending"],
      [400, "failed"],
      [404, "refunded"],
      [409, "rejected"]
    ]);
    return this.timed(
      (signal) => this.auth.authenticatedFetch(`${this.iapHost}/shop/recover/${this.gameId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal,
        body: JSON.stringify({
          provider: body.provider,
          ...body.externalRef != null ? { externalRef: body.externalRef } : {},
          ...body.iapTransactionId != null ? { iapTransactionId: body.iapTransactionId } : {},
          ...body.payload ? { payload: body.payload } : {}
        })
      }).then(async (res) => {
        if (!statuses.has(res.status)) return this.json(res);
        const payload = await res.json().catch(() => ({}));
        const mapped = statuses.get(res.status);
        return { ...payload, status: mapped, consume: res.status === 200 && payload.consume === true };
      })
    );
  }
  getIAPTransaction(id) {
    return this.timed((signal) => this.auth.authenticatedFetch(`${this.iapHost}/shop/${this.gameId}/transactions/${id}`, { method: "GET", signal }).then(this.json));
  }
  applyVirtualPurchase(body) {
    const headers = {};
    if (body.idempotencyKey) headers["Idempotency-Key"] = body.idempotencyKey;
    return this.timed(
      (signal) => this.auth.authenticatedFetch(`${this.iapHost}/shop/${this.gameId}/consume/virtual`, {
        method: "POST",
        headers,
        signal,
        body: JSON.stringify({
          productRef: body.productRef,
          priceRef: body.priceRef,
          walletId: body.walletId,
          ...body.quantity != null ? { quantity: body.quantity } : {},
          ...this.purchaseSource ? { source: this.purchaseSource } : {}
        })
      }).then(this.json)
    );
  }
  playerId() {
    return this.auth.getFRVRID();
  }
  getGameId() {
    return this.gameId;
  }
  isAnonymous() {
    return this.auth.getCurrentPlatform() === "anonymous" /* ANONYMOUS */;
  }
};
var FRVRSDK = class {
  constructor() {
    this.config = { init: async () => {
    } };
    this.shield = new ShieldOverlay();
    this.lifecycleEvents = { ...defaultLifecycle };
    this.postCompleteHookCalled = false;
    this.completionPromise = new Deferred();
    this.lifecycle = new RefcountedLifecycle({
      onSuspend: () => this.lifecycleEvents.onSuspend(),
      onResume: () => this.lifecycleEvents.onResume(),
      onAudioSuspend: () => this.lifecycleEvents.onAudioSuspend(),
      onAudioResume: () => this.lifecycleEvents.onAudioResume(),
      onShow: () => this.lifecycleEvents.onShow?.(),
      onHide: () => this.lifecycleEvents.onHide?.(),
      onGamePause: () => this.lifecycleEvents.onGamePause?.()
    });
  }
  setChannel(channel) {
    if (this.channel) {
      if (this.initPromise) {
        this.logger?.error("[FRVR-SDK] channel cannot be set after init");
        return;
      }
      this.logger?.warn("[FRVR-SDK] setting channel multiple times");
    }
    this.channel = channel;
  }
  getId() {
    return this.channel?.getId?.() ?? this.channel?.getChannelId?.() ?? "";
  }
  init(env = "production" /* PRODUCTION */) {
    if (this.initPromise) return this.initPromise;
    if (!this.channel) {
      return Promise.reject(new Error("[FRVR-SDK] no channel has been configured"));
    }
    const requestedEnv = env;
    env = resolveEnv(requestedEnv, env);
    if (env !== "production" /* PRODUCTION */) {
      console.warn(
        `%c[FRVR-SDK] Environment: ${env} (Running in non production environment)`,
        "color:white;background:red;"
      );
    }
    this.logger = this.logger ?? emptyLogger2;
    this.channel.setEnv?.(env);
    this.channel?.setConfig?.(this.config);
    this.buildComponents(env);
    const initPromise = Promise.resolve().then(() => this.config.init?.()).then(() => this.auth.init()).then(() => this.initTracker()).then(() => this.postInit(env));
    this.initPromise = initPromise;
    return initPromise;
  }
  buildComponents(env) {
    this.logger.debug("[FRVR-SDK] building components");
    this.bootstrapper = this.channel.getBootstrapper?.() ?? new ChannelWebBootstrapper(this.logger);
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
      logger: this.logger
    });
    this.channel.onModulesUpdated?.({
      logger: this.logger,
      auth: this.auth
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
        app_build: this.config.tracker?.appBuild
      }
    });
    this.channel.onModulesUpdated?.({
      logger: this.logger,
      tracker: this.tracker,
      auth: this.auth
    });
    this.ads = this.ads ?? new AdsManager({
      env,
      logger: this.logger,
      storage: this.localStorage,
      tracker: this.tracker,
      controls: this.lifecycle,
      onBeforeInit: () => this.configAds(env)
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
      purchaseSource: this.purchaseSource
    });
    this.iap = this.iap ?? new IAP({
      logger: this.logger,
      providers: () => this.channel.getIAPProviders?.(this.config.iap, this.iapServiceClient, this.auth) ?? []
    });
    this.economy = this.economy ?? new Economy({
      client: new EconomyServiceClient({
        env,
        auth: this.auth,
        gameId: this.config.gameId,
        apiHostOverride: this.config.economy?.overrideBackendURL,
        iapHostOverride: this.config.iap?.hostOverride,
        purchaseSource: this.purchaseSource
      }),
      iap: this.iap,
      channelId: this.channel.getId(),
      ensureLogin: this.ensureLogin(),
      logger: this.logger,
      storage: this.localStorage
    });
    this.features = this.features ?? new Features({
      logger: this.logger,
      auth: this.auth,
      tracker: this.tracker,
      localStorage: this.localStorage,
      remoteABTests: new ABTests(this.tracker),
      config: { ...this.config.features ?? {}, gameId: this.config.features?.gameId ?? this.config.gameId },
      channelId: this.channel.getId(),
      env
    });
    this.social = this.social ?? new Social(
      { env, ...this.config.social, gameId: this.config.social?.gameId ?? this.config.gameId },
      { logger: this.logger, provider: this.channel.getSocialProvider(), auth: this.auth }
    );
    this.liveRoom = this.liveRoom ?? new LiveRoom({
      logger: this.logger,
      provider: this.channel.getLiveRoomProvider(),
      auth: this.auth
    });
    this.tournaments = this.tournaments ?? new Tournaments({
      logger: this.logger,
      provider: this.channel.getTournamentsProvider(),
      auth: this.auth
    });
    this.challenges = new Challenges({ logger: this.logger, provider: this.channel.getChallengesProvider() });
    this.leaderboards = new Leaderboards({ provider: this.channel.getLeaderboardsProvider() });
    this.profile = this.profile ?? this.channel.getProfile();
    this.navigation = this.navigation ?? this.channel.getNavigationProvider();
    this.audio = this.audio ?? this.channel.getAudioStateProvider();
    this.shield.setup(!!this.config.shield, this.logger);
  }
  ensureLogin() {
    const ch = this.channel;
    if (ch?.requestPurchaseLogin) {
      return async () => {
        const prevId = this.auth?.getFRVRID?.() ?? null;
        const proceed = await ch.requestPurchaseLogin();
        const newId = this.auth?.getFRVRID?.() ?? null;
        return { proceed, loggedIn: proceed && newId !== prevId };
      };
    }
    return void 0;
  }
  async initTracker() {
    await this.tracker.init();
    if (!this.channel.getSkippedAnalyticsEvents?.()?.includes?.("page_loading")) {
      this.tracker.logEvent("page_loading", {});
    }
  }
  async postInit(env) {
    this.logger.debug("[FRVR-SDK] post init");
    this.addDefaultWebListeners(env);
    await Promise.all([this.ads.init(), this.features.init()]);
    if (this.config.gameId) await this.notifications.configure({ game: this.config.gameId });
    await this.notifications.init();
    if (this.ads.needsConfiguration()) {
      this.config.ads ? this.ads.setConfig(this.config.ads) : this.logger.error("[FRVR-SDK] Missing game's name in configuration");
    }
    await Promise.all([
      (async () => {
        let cloud;
        try {
          cloud = await this.channel.getCloudStorageProvider(this.config.cloudStorage, env);
        } catch (err) {
          this.logger.error("[FRVR-SDK] error initialising cloud storage", err);
        }
        if (!cloud) this.logger.warn("[FRVR-SDK] no cloud storage provider available, falling back to prefixed local storage solution");
        this.cloud = new CloudStorage({
          provider: cloud ?? new PrefixedStorageProvider("frvr-sdk-", this.channel.getLocalStorageProvider(this.config.storage)),
          logger: this.logger
        });
      })(),
      (async () => {
        await this.iap.init();
        await this.iap.configure(this.config.iap);
      })(),
      this.challenges.init(this.config.gameId, this.channel, env),
      this.leaderboards.init(this.config.gameId, env)
    ]);
    this.startPurchaseRecovery();
  }
  async configAds(env) {
    this.logger.debug("[FRVR-SDK] configuring ads");
    const cfg = await this.channel.getAdsConfig(this.config.ads);
    if (cfg) this.config.ads = { ...cfg };
    if (this.ads.needsConfiguration()) this.ads.setConfig(this.config.ads ?? DEFAULT_ADS_CONFIG);
  }
  addDefaultWebListeners(env) {
    if (this.channelCharacteristics?.usesPlatformLifecycle) return;
    if (typeof window !== "undefined") addSuspendResumeWebListeners(this.lifecycle);
    if (env !== "development" /* DEVELOPMENT */) addGamePauseWebListeners(this.lifecycle);
  }
  complete() {
    return this.bootstrapper.complete();
  }
  startPurchaseRecovery() {
    const recover = () => {
      if (this.auth.isLoggedIn()) {
        this.economy.runRecovery().catch((err) => this.logger.warn("[FRVR-SDK] purchase recovery failed", err));
      }
    };
    let lastId = this.auth.isLoggedIn() ? this.auth.getFRVRID() : null;
    addSdkStatusChangeListener(this.auth, (loggedIn) => {
      if (loggedIn) recover();
      const id = loggedIn ? this.auth.getFRVRID() : null;
      if (id && id !== lastId) this.economy.runRecovery();
      lastId = id;
    });
    recover();
  }
  getUserSource() {
    return this.tracker.getUserSource();
  }
  getChannelCharacteristics() {
    return this.channelCharacteristics;
  }
  get channelCharacteristics() {
    return this.channel?.getCharacteristics?.() ?? {};
  }
  get adsManager() {
    return this.ads;
  }
  get purchaseSource() {
    try {
      const source = new URLSearchParams(window.location.search).get("utm_source")?.trim();
      if (source) {
        window.localStorage?.setItem("frvr.purchase.source", source);
        return source;
      }
      return window.localStorage?.getItem("frvr.purchase.source") ?? void 0;
    } catch {
      return void 0;
    }
  }
};
var AdsManager = class {
  constructor(config) {
    this.config = config;
    this.providers = {};
    this.registeredProviders = [];
    this.adShownCount = {
      ["interstitial" /* INTERSTITIAL */]: 0,
      ["reward" /* REWARD */]: 0,
      ["banner" /* BANNER */]: 0,
      ["survey" /* SURVEY */]: 0,
      ["rewarded-interstitial" /* REWARDED_INTERSTITIAL */]: 0
    };
    this.adShownListeners = [];
    this.throttlerState = { initTime: Date.now(), isFirstAd: true, isFirstAdEver: false, lastShownAd: 0 };
    this.throttleFirstAdStorage = "__ads_firstTimeView";
    this.logger = emptyLogger2;
    this.throttler = config.throttler || new AdsThrottler();
    this.storage = config.storage || defaultStorage;
    this.tracker = config.tracker || emptyTracker;
    this.controls = config.controls || defaultLifecycle;
    this.onBeforeInit = config.onBeforeInit || (() => Promise.resolve());
  }
  registerProvider(provider) {
    const key = provider.getName() + "#" + provider.getType();
    this.providers[key] = provider;
  }
  setConfig(config) {
    this.config = config;
  }
  needsConfiguration() {
    return !Array.isArray(this.config.providers);
  }
  async init() {
    await this.onBeforeInit?.();
    this.throttlerState.isFirstAdEver = Boolean(await this.storage.getItem(this.throttleFirstAdStorage, true));
    this.logger?.debug("[ads] first time ever?", this.throttlerState.isFirstAdEver);
    this.throttler.init(this.config.throttling ?? {});
    const configs = [...this.config.providers ?? []].sort((a, b) => a.priority - b.priority);
    const promises = configs.map((p) => ({ provider: this.providers[p.name + "#" + p.type], providerConfig: p, key: p.name + "#" + p.type })).filter(({ provider }) => provider).map(async ({ provider, providerConfig, key }) => {
      const tracker = new AdTrackerImpl(this.tracker, { adType: provider.getType(), provider: provider.getName() });
      await provider.init(providerConfig, this.controls, tracker).then(() => provider);
      return provider;
    });
    this.registeredProviders = (await Promise.all(promises)).filter((p) => p !== void 0);
  }
  getProviders() {
    return this.registeredProviders;
  }
  getProvidersByType(type) {
    return this.registeredProviders.filter((p) => p.getType() === type);
  }
  hasProviders(type) {
    return this.getProvidersByType(type).length > 0;
  }
  isProviderReady(type) {
    if (this.getProvidersByType(type).find((p) => p.isReady()) === void 0) return false;
    if (AdTypeProperties[type].throttleable) {
      if (this.throttler.mustThrottle(this.throttlerState)) return false;
    }
    return true;
  }
  async show(type) {
    const throttleable = AdTypeProperties[type].throttleable;
    if (throttleable) {
      const throttle = this.throttler.mustThrottle(this.throttlerState);
      if (throttle) {
        this.logger?.debug("[ads] Ad was throttled, reason =", throttle);
        return Promise.resolve("not_displayed" /* NOT_DISPLAYED */);
      }
    }
    const providers = this.getProvidersByType(type);
    if (providers.length === 0) this.logger?.error("[ads] no providers for", type);
    let suspended = false;
    const code = await firstSuccess(providers, async (provider) => {
      try {
        if (!provider.isReady()) {
          this.logger?.warn("[ads] Ad provider", provider.getName(), "not ready");
          return;
        }
        if (!suspended && AdTypeProperties[type].stopsGameFlow && !provider.isAdActive()) {
          if (this.controls instanceof RefcountedLifecycle) {
            this.controls.gameSuspend("ad" /* AD */);
            this.controls.audioSuspend("ad" /* AD */);
          } else {
            this.controls.onSuspend();
            this.controls.onAudioSuspend();
          }
          suspended = true;
        }
        this.logger?.debug("[ads] showing", provider.getName(), "of type", type);
        const res = await provider.show();
        if (res.success === false) {
          this.logger?.error("[ads] show error", res.message);
          this.trackAdError(provider, type, res);
        }
        return res.success ? res.code : void 0;
      } catch (err) {
        this.logger?.error("[ads] hide error", err);
      }
    });
    if (suspended) {
      if (this.controls instanceof RefcountedLifecycle) {
        this.controls.audioResume("ad" /* AD */);
        this.controls.gameResume("ad" /* AD */);
      } else {
        this.controls.onAudioResume();
        this.controls.onResume();
      }
    }
    if (code !== void 0) {
      if (throttleable) {
        this.throttlerState = this.throttler.notifyAdShown(this.throttlerState);
        await this.storage.setItem(this.throttleFirstAdStorage, false);
      }
      this.adShownCount[type] = (this.adShownCount[type] || 0) + 1;
      this.notifyAdShown(type, code);
      return code === "completed" /* COMPLETED */ ? "completed" /* COMPLETED */ : "delivered" /* DELIVERED */;
    }
    return "not_displayed" /* NOT_DISPLAYED */;
  }
  trackAdError(provider, type, res) {
    this.tracker.logEvent("error", { msg: res.message + " in: " + JSON.stringify({ provider: provider.getName(), type, code: res.code }), line: 0, col: 0, label: JSON.stringify({ provider: provider.getName(), type, code: res.code }) }, 0 /* None */);
  }
  onAdShown(listener) {
    this.adShownListeners.push(listener);
    return () => {
      const i = this.adShownListeners.indexOf(listener);
      if (i >= 0) this.adShownListeners.splice(i, 1);
    };
  }
  notifyAdShown(type, code) {
    this.adShownListeners.forEach((l) => l(type, this.adShownCount, code));
  }
  getAdShownCount() {
    return this.adShownCount;
  }
};
async function firstSuccess(items, fn) {
  const tryOne = (i) => {
    if (i >= items.length) return Promise.resolve(void 0);
    return Promise.resolve(fn(items[i])).then((res) => res === void 0 ? tryOne(i + 1) : res);
  };
  return tryOne(0);
}
var Notifications = class {
  constructor(config) {
    this.config = config;
    this.initialized = false;
    this.provider = config.provider ?? emptyNotificationsProvider;
  }
  async init() {
    if (this.initialized) {
      this.logger?.error("Notifications class should be configured before it is initialized");
    } else {
      this.initialized = true;
      await this.provider.init?.();
    }
  }
  async configure(cfg) {
    await this.provider.configure?.(cfg);
  }
  get logger() {
    return this.config.logger;
  }
  get tracker() {
    return this.config.tracker;
  }
  getProviderId() {
    return this.provider?.getId?.() ?? "";
  }
  subscribeScheduleMessages() {
    this.tracker.logEvent("bot_subscribe_show", {});
    return this.provider.subscribeScheduleMessages().then((ok) => {
      if (ok) this.tracker.logEvent("bot_subscribe_success", {});
      else this.tracker.logEvent("bot_subscribe_failure", {});
      return ok;
    }).catch(() => {
      this.tracker.logEvent("bot_subscribe_failure", {});
      return false;
    });
  }
  scheduleMessage(title, description, type, minDelay) {
    return this.provider.scheduleMessage(title, description, type, minDelay);
  }
};
var emptyNotificationsProvider = {
  getName: () => "",
  canScheduleMessages: async () => false,
  subscribeScheduleMessages: async () => false,
  scheduleLocalNotification: () => Promise.reject(new Error("no schedule support"))
};
var ChallengesAPI = /* @__PURE__ */ ((ChallengesAPI2) => {
  ChallengesAPI2[ChallengesAPI2["getCurrentChallengeData"] = 0] = "getCurrentChallengeData";
  ChallengesAPI2[ChallengesAPI2["getCurrentChallengeId"] = 1] = "getCurrentChallengeId";
  ChallengesAPI2[ChallengesAPI2["getPossibleOpponents"] = 2] = "getPossibleOpponents";
  ChallengesAPI2[ChallengesAPI2["getLeaderboard"] = 3] = "getLeaderboard";
  ChallengesAPI2[ChallengesAPI2["join"] = 4] = "join";
  ChallengesAPI2[ChallengesAPI2["leave"] = 5] = "leave";
  ChallengesAPI2[ChallengesAPI2["share"] = 6] = "share";
  ChallengesAPI2[ChallengesAPI2["invitePlayers"] = 7] = "invitePlayers";
  return ChallengesAPI2;
})(ChallengesAPI || {});
var emptyChallengesProvider = {
  platform: {
    API: ChallengesAPI,
    getSupportedAPIs: () => [],
    isSupportedAPI: () => false,
    getID: () => "",
    getType: () => "context.getType",
    isSizeBetween: () => ({ answer: false, minSize: 0, maxSize: 0 }),
    switch: () => Promise.resolve(),
    choose: () => Promise.resolve(),
    create: () => Promise.resolve(),
    getPlayers: () => Promise.resolve([]),
    update: () => Promise.resolve()
  },
  init: async () => {
  },
  create: async () => "",
  challengeByPlayerId: async () => "",
  getPossibleOpponents: async () => [],
  challengeByContextId: async () => "",
  getCurrentChallengeData: async () => {
  },
  leave: async () => {
  },
  getCurrentChallengeId: () => "",
  getPlayerEntries: async () => [],
  getAllChallenges: async () => {
  },
  getLeaderboardEntry: async () => {
  },
  getLeaderboardById: async () => {
  },
  postScore: async () => {
  },
  join: async () => {
  },
  nudge: async () => {
  },
  getOpponentsFromChallenges: async () => {
  },
  getChallengesByOpponents: async () => {
  },
  getEntryPayload: () => ({}),
  isSupported: () => false
};
var Challenges = class {
  constructor(config) {
    this.config = config;
    this.provider = config.provider;
  }
  init(gameId, env, container) {
    return this.provider.init?.(gameId, env, container);
  }
  isSupported() {
    return this.provider.isSupported?.() ?? false;
  }
};
var emptyLiveRoomProvider = {
  getId: () => "",
  isInRoom: async () => false,
  getRoomData: async () => ({}),
  getRoomId: async () => "",
  getPlayers: async () => [],
  getSupportedAPIs: () => [],
  isSupportedAPI: () => false
};
var LiveRoom = class {
  constructor(config) {
    this.config = config;
    this.provider = config.provider ?? emptyLiveRoomProvider;
  }
  isInRoom() {
    return this.provider.isInRoom();
  }
  getRoomId() {
    return this.provider.getRoomId();
  }
  getRoomData() {
    return this.provider.getRoomData();
  }
  getPlayers() {
    return this.provider.getPlayers();
  }
  getSupportedAPIs() {
    return this.provider.getSupportedAPIs();
  }
  isSupportedAPI(api) {
    return this.provider.isSupportedAPI(api);
  }
};
var Leaderboards = class {
  constructor(config) {
    this.config = config;
    this.provider = config.provider ?? emptyLeaderboardProvider;
  }
  isSupported() {
    return this.provider.isSupported?.() ?? false;
  }
  async init(gameId, env) {
    return this.provider.init?.(gameId, env);
  }
  getLeaderboardEntries(id, players, policy) {
    return this.provider.getLeaderboardEntries(id, players, policy);
  }
  getLeaderboardEntry(id, playerId, policy) {
    return this.provider.getLeaderboardEntry(id, playerId, policy);
  }
  getLeaderboard(id, count, offset, policy) {
    return this.provider.getLeaderboard(id, count, offset, policy);
  }
  postScore(id, score, extra) {
    return this.provider.postScore(id, score, extra);
  }
  create(id, opts) {
    return this.provider.create(id, opts);
  }
  getTimelineEntries(opts) {
    return this.provider.getTimelineEntries(opts);
  }
};
var emptyLeaderboardProvider = {
  init() {
  },
  isSupported: () => false,
  getLeaderboardEntries: async () => [],
  getLeaderboardEntry: async () => ({}),
  getLeaderboard: async () => ({}),
  postScore: async () => {
  },
  create: async () => "",
  getTimelineEntries: async () => []
};
var Economy = class {
  constructor(config) {
    this.config = config;
    this.grantedListeners = [];
    this.recovered = [];
    this.client = config.client;
    this.iap = config.iap;
    this.channelId = config.channelId;
    this.ensureLogin = config.ensureLogin;
    this.logger = config.logger ?? emptyLogger2;
    this.storage = config.storage;
    this.iapTracker = config.iapTracker ?? { logRequestPayment: () => {
    }, logRequestPaymentSuccess: () => {
    }, logRequestPaymentError: () => {
    }, logConsumePurchase: () => {
    }, logRestorePurchases: () => {
    }, logRestorePurchasesSuccess: () => {
    }, logRestorePurchasesError: () => {
    } };
    this.shopCache = /* @__PURE__ */ new Map();
    this.recoveredListeners = [];
    this.recoveryAttempts = /* @__PURE__ */ new Set();
  }
  async init() {
    this.logger.log("[FRVR-Economy] init");
  }
  async getMyWallets() {
    return this.client.getMyWallets();
  }
  async defaultWallet() {
    return this.client.defaultWallet();
  }
  async wallet(id) {
    return this.client.wallet(id);
  }
  listWalletTransactions(walletId, opts) {
    return this.client.listWalletTransactions(walletId, opts);
  }
  itemDefinitions() {
    return this.client.itemDefinitions();
  }
  allShopProducts() {
    return this.client.allShopProducts();
  }
  async getShop(shopfrontId = "") {
    let shop = await this.client.getShop(shopfrontId);
    if (!shop) return emptyShop;
    this.cacheShop(shop);
    return this.pruneShop(shop) ?? { ...shop, tree: [], products: {} };
  }
  async getProducts(ids) {
    if (!ids.length) return [];
    return this.client.getProducts(ids);
  }
  cacheShop(shop) {
    this.shopCache.set(String(shop.id), shop);
    if (shop.shopfrontId) this.shopCache.set(shop.shopfrontId, shop);
    for (const [id, product] of Object.entries(shop.products ?? {})) {
      this.shopCache.set(id, product);
    }
  }
  pruneShop(shop) {
    const activeProduct = (product) => {
      const prices = (product.prices ?? []).filter((price) => !price.deletedAt);
      return prices.length ? { ...product, prices } : null;
    };
    const products = {};
    const pruneTree = (nodes) => {
      const result = [];
      for (const node of nodes) {
        if (node.type === "product") {
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
  async purchase(args) {
    if (!args.walletId) throw new Error("Economy.purchase: walletId required");
    const { productRef, priceRef, walletId, quantity, idempotencyKey } = args;
    const { price } = await this.client.resolveProductAndPrice(productRef, priceRef);
    if (price.kind === "virtual") {
      return this.client.applyVirtualPurchase({ productRef, priceRef, walletId, quantity, idempotencyKey });
    }
    if (price.kind !== "real") throw new Error(`Economy.purchase: unsupported price kind ${price.kind}`);
    let effectiveWalletId = walletId;
    if (this.ensureLogin) {
      const oldPlayerId = this.client.playerId();
      let loginResult;
      try {
        loginResult = await this.ensureLogin();
      } catch (err) {
        this.logger.error("[FRVR-Economy] pre-purchase login failed", err);
      }
      if (!loginResult?.proceed) {
        throw new EconomyError("purchase cancelled", "PURCHASE_CANCELLED" /* PURCHASE_CANCELLED */);
      }
      if (loginResult.loggedIn) await this.iap?.waitUntilReady?.(1e4);
      if (loginResult.loggedIn || this.client.playerId() !== oldPlayerId) {
        effectiveWalletId = await this.walletOfCurrentPlayer(effectiveWalletId);
      }
    }
    if (this.client.isAnonymous()) {
      throw new EconomyError(
        "real-money purchases require a non-anonymous account",
        "ANONYMOUS_NOT_ALLOWED" /* ANONYMOUS_NOT_ALLOWED */
      );
    }
    if (!price.real) throw new Error(`Economy.purchase: price ${price.friendlyId} missing real block`);
    if (!this.iap) throw new Error("Economy.purchase: real-money requires IAP module");
    if (this.iap.selectProvider && !await this.iap.selectProvider(args.provider)) {
      throw new EconomyError("purchase cancelled", "PURCHASE_CANCELLED" /* PURCHASE_CANCELLED */);
    }
    const checkout = this.iap.prepareCheckout?.({
      ...price.real.providerSku ? { productId: price.real.providerSku } : {},
      ...quantity != null ? { quantity } : {}
    });
    let intent;
    try {
      const providerName = this.iap.getProviderName?.();
      if (!providerName) throw new Error("Economy.purchase: real-money requires IAP module with getProviderName()");
      const backendProvider = this.iap.getBackendProvider?.();
      const provider = (backendProvider && RECOVERY_PROVIDER_MAP[backendProvider]) ?? backendProvider ?? RECOVERY_PROVIDER_MAP[providerName];
      if (!provider) throw new Error(`Economy.purchase: no provider mapping for IAP "${providerName}"`);
      if (!this.channelId) {
        throw new Error("Economy.purchase: real-money requires a channelId (FRVR.channel.getId())");
      }
      intent = await this.client.createShopIntent({
        productRef,
        priceRef,
        walletId: effectiveWalletId,
        quantity,
        provider,
        channelId: this.channelId,
        wallet: WALLET_MAP[providerName],
        ...checkout ? { checkout: checkout.checkout, returnUrl: checkout.returnUrl } : {},
        idempotencyKey
      });
    } catch (err) {
      checkout?.abort?.();
      throw err;
    }
    const recoverable = PROVIDERS_WITH_RECOVER.has(intent.provider);
    let settledResult;
    let settledPayment;
    const settle = async (options) => {
      const settled = await this.waitForIAPTransaction(intent.iapTransactionId, options?.timeoutMs ?? 3e4);
      settledResult = settled?.result ?? null;
      settledPayment = settled?.payment ?? settledPayment;
      return {
        settled: !!settledResult,
        ...settledPayment ? { payment: settledPayment } : {}
      };
    };
    const purchaseManaged = recoverable ? void 0 : this.iap.purchaseManaged?.bind(this.iap);
    let purchase;
    let finalized;
    try {
      const purchaseFields = {
        ...args.meta,
        ...quantity != null ? { quantity } : {},
        iap_transaction_id: intent.iapTransactionId,
        payment_url: intent.paymentUrl,
        provider_data: intent.providerData,
        ...recoverable ? { settle } : {}
      };
      purchase = await (purchaseManaged ?? this.iap.purchase.bind(this.iap))(
        intent.storeSku ?? intent.providerSku,
        purchaseFields
      );
    } catch (err) {
      checkout?.abort?.(
        err != null && typeof err === "object" && err.name === "IAPPurchaseErrorCancelledByUser" ? "cancelled" : "failed"
      );
      if (err != null && typeof err === "object" && err.name === "IAPPurchaseErrorCancelledByUser") {
        throw new EconomyError("purchase cancelled", "PURCHASE_CANCELLED" /* PURCHASE_CANCELLED */);
      }
      const cause = err != null && typeof err === "object" ? err.cause : void 0;
      if (isAlreadyOwned(err) || isAlreadyOwned(cause)) void this.recoverPendingPurchases();
      throw err;
    }
    if (recoverable) {
      if (settledResult === void 0) await settle();
      if (settledResult) {
        return settledPayment && !settledResult.payment ? { ...settledResult, payment: settledPayment } : settledResult;
      }
      return {
        transactionId: "",
        productId: 0,
        priceId: 0,
        rewards: [],
        iapTransactionId: intent.iapTransactionId,
        pending: true
      };
    }
    try {
      const recovery = this.purchaseRecoveryPayload(intent.provider, purchase);
      finalized = await this.client.finalizeShopPurchase({
        iapTransactionId: intent.iapTransactionId,
        provider: intent.provider,
        ...recovery
      });
    } catch (err) {
      this.iap.releasePurchase?.(purchase);
      if (err != null && typeof err === "object") {
        err.pending = true;
        throw err;
      }
      const pendingError = new EconomyError(String(err), "UNKNOWN" /* UNKNOWN */, err);
      pendingError.pending = true;
      throw pendingError;
    }
    if (await this.consumeGranted(purchase)) await this.rememberFinishedNonConsumable(purchase);
    return finalized;
  }
  async applyVirtualPurchase(body) {
    return this.client.applyVirtualPurchase(body);
  }
  async runRecovery() {
    const iap = this.iap;
    if (!iap || !this.storage || this.client.isAnonymous()) return [];
    const getPurchases = iap.getUnconsumedPurchasesUntracked ?? iap.getUnconsumedPurchases;
    if (!getPurchases) return [];
    const [purchases, answered] = await Promise.all([
      getPurchases.call(iap),
      this.loadAnswered(this.client.playerId())
    ]);
    const candidates = [];
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
    const batch = [];
    for (const candidate of candidates) {
      if (this.recoveryAttempts.size >= 10) iap.releasePurchase?.(candidate[0], true);
      else {
        this.recoveryAttempts.add(candidate[3]);
        batch.push(candidate);
      }
    }
    const results = [];
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
  onPurchaseRecovered(listener) {
    this.recoveredListeners.push(listener);
    for (const [result, purchase] of this.recovered) this.notifyRecovered(listener, result, purchase);
  }
  recoverPendingPurchases() {
    if (!this.recoveringPromise) {
      this.recoveringPromise = this.runRecovery().catch((err) => {
        this.logger.warn("[FRVR-Economy] purchase recovery failed", err);
        return [];
      }).finally(() => {
        this.recoveringPromise = void 0;
      });
    }
    return this.recoveringPromise;
  }
  async walletOfCurrentPlayer(walletId) {
    const wallets = await this.client.myWallets();
    if (wallets.some((wallet) => wallet.id === walletId)) return walletId;
    return (await this.client.defaultWallet()).id;
  }
  async realMoneySkus() {
    let products;
    try {
      products = await this.client.allShopProducts();
    } catch (err) {
      this.logger.warn("[FRVR-Economy] reading the shop for recovery failed; asking about every purchase", err);
      return;
    }
    if (!Array.isArray(products)) return;
    const skus = /* @__PURE__ */ new Set();
    for (const product of products) {
      for (const price of product.prices ?? []) {
        if (price.kind !== "real" || !price.real) continue;
        if (price.real.providerSku) skus.add(price.real.providerSku);
        for (const sku of Object.values(price.real.providerSkus ?? {})) {
          if (sku) skus.add(String(sku));
        }
      }
    }
    return skus;
  }
  backendProviderOf(purchase) {
    const providerInfo = this.iap.getBackendProviderName?.(purchase);
    if (providerInfo) {
      return RECOVERY_PROVIDER_MAP[providerInfo.backendProvider ?? ""] ?? providerInfo.backendProvider ?? RECOVERY_PROVIDER_MAP[providerInfo.name];
    }
    const providerName = this.iap.getProviderName?.();
    return providerName ? RECOVERY_PROVIDER_MAP[providerName] : void 0;
  }
  recoveryPayload(provider, purchase) {
    if (REAL_MONEY_RECOVERY_PROVIDERS.has(provider)) {
      try {
        return this.purchaseRecoveryPayload(provider, purchase).payload;
      } catch {
        return null;
      }
    }
    if (PROVIDERS_WITH_RECOVER.has(provider)) {
      const transactionId = purchase.channelData?.iapTransactionId;
      if (typeof transactionId === "number" && Number.isInteger(transactionId) && transactionId > 0) {
        return { iapTransactionId: transactionId };
      }
      const externalRef = purchase.transactionId ?? purchase.purchaseId;
      return externalRef ? { externalRef } : null;
    }
    return null;
  }
  async recoverOne(provider, purchase, payload) {
    let response;
    try {
      response = await this.client.recoverShopPurchase({ provider, ...payload });
    } catch (err) {
      this.logger.warn(
        "[FRVR-Economy] recovering purchase failed, retrying next boot",
        payload.externalRef ?? payload.iapTransactionId,
        err
      );
      this.iap.releasePurchase?.(purchase, true);
      return { result: null, final: false };
    }
    this.logger.log(
      "[FRVR-Economy] recovering purchase",
      payload.externalRef ?? payload.iapTransactionId,
      response.status,
      response.code ?? ""
    );
    if (!response.consume) {
      const final = response.status === "no-intent" || response.status === "rejected" || response.status === "refused" && response.code === "RECEIPT_INVALID";
      this.iap.releasePurchase?.(
        purchase,
        response.status !== "pending" && response.status !== "settled"
      );
      return { result: null, final };
    }
    const consumed = await this.consumeGranted(purchase) && response.status === "settled";
    if (response.status !== "settled" || !response.result) return { result: null, final: consumed };
    this.recovered.push([response.result, purchase]);
    for (const listener of this.recoveredListeners) {
      this.notifyRecovered(listener, response.result, purchase);
    }
    return { result: response.result, final: consumed };
  }
  async loadAnswered(playerId) {
    if (!this.storage || !playerId) return null;
    const storageKey = `frvr.economy.recovery.answered.${this.client.getGameId()}.${playerId}`;
    let value;
    try {
      value = await this.storage.getItem(storageKey);
    } catch (err) {
      this.logger.warn("[FRVR-Economy] reading answered purchases failed", err);
    }
    return {
      storageKey,
      keys: Array.isArray(value) ? value.filter((key) => typeof key === "string") : []
    };
  }
  async rememberAnswered(answered, id) {
    answered.keys = [...answered.keys.filter((key) => key !== id), id].slice(-200);
    try {
      await this.storage.setItem(answered.storageKey, answered.keys);
    } catch (err) {
      this.logger.warn("[FRVR-Economy] storing answered purchases failed", err);
    }
  }
  async rememberFinishedNonConsumable(purchase) {
    const id = purchase.purchaseId ?? purchase.transactionId;
    if (!id || !this.iap || this.iap.isConsumable(purchase) !== false) return;
    const answered = await this.loadAnswered(this.client.playerId());
    if (answered) await this.rememberAnswered(answered, id);
  }
  async consumeGranted(purchase) {
    if (!this.iap?.consumeManagedPurchase && !this.iap?.consumePurchase) return true;
    try {
      if (this.iap.consumeManagedPurchase) await this.iap.consumeManagedPurchase(purchase);
      else await this.iap.consumePurchase(purchase);
      return true;
    } catch (err) {
      this.logger.warn("[FRVR-Economy] consume after finalize failed", err);
      return false;
    }
  }
  notifyRecovered(listener, result, purchase) {
    try {
      listener(result, purchase);
    } catch (err) {
      this.logger.error("[FRVR-Economy] onPurchaseRecovered listener threw", err);
    }
  }
  async waitForIAPTransaction(id, timeoutMs) {
    const deadline = Date.now() + timeoutMs;
    let first = true;
    while (first || Date.now() < deadline) {
      first = false;
      try {
        const response = await this.client.getIAPTransaction(id);
        if (response.status === "success" && response.result) {
          const payment = response.payment ?? response.result.payment;
          return payment ? { result: response.result, payment } : { result: response.result };
        }
        if (response.status === "rejected") {
          throw new EconomyError("payment was rejected", "PAYMENT_REJECTED" /* PAYMENT_REJECTED */);
        }
        if (response.status === "refunded") {
          throw new EconomyError("payment was refunded", "PAYMENT_REFUNDED" /* PAYMENT_REFUNDED */);
        }
      } catch (err) {
        if (err instanceof EconomyError && (err.code === "PAYMENT_REJECTED" /* PAYMENT_REJECTED */ || err.code === "PAYMENT_REFUNDED" /* PAYMENT_REFUNDED */)) {
          throw err;
        }
      }
      if (Date.now() >= deadline) break;
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
    return null;
  }
  purchaseRecoveryPayload(provider, purchase) {
    const receipt = purchase.transactionReceipt;
    let payload;
    switch (provider) {
      case "apple": {
        let receiptData = receipt;
        if (typeof receipt === "object" && receipt) {
          try {
            receiptData = JSON.parse(String(receipt.receipt))?.jws;
          } catch {
            receiptData = void 0;
          }
        }
        if (typeof receiptData !== "string" || !receiptData) {
          throw new Error("Economy.purchase: apple receipt missing \u2014 contact support, do not retry");
        }
        payload = { receiptData };
        break;
      }
      case "google": {
        const rawReceipt = receipt?.receipt;
        let data = {};
        try {
          if (typeof rawReceipt === "string") data = JSON.parse(rawReceipt);
          else if (typeof receipt === "object" && receipt) data = receipt;
        } catch {
          throw new Error("Economy.purchase: google receipt malformed \u2014 contact support, do not retry");
        }
        const packageName = data.packageName ?? purchase.channelData?.packageName;
        const productId = purchase.productId ?? data.productId;
        const purchaseToken = purchase.purchaseId ?? data.purchaseToken;
        if (!productId || !purchaseToken) {
          throw new Error("Economy.purchase: google receipt missing productId/purchaseToken \u2014 contact support, do not retry");
        }
        payload = {
          ...packageName ? { packageName } : {},
          productId,
          purchaseToken
        };
        break;
      }
      case "facebook":
        if (typeof receipt !== "string" || !receipt) {
          throw new Error("Economy.purchase: facebook signedRequest missing \u2014 contact support, do not retry");
        }
        if (!purchase.productId || !purchase.transactionId) {
          throw new Error("Economy.purchase: facebook productId/paymentId missing \u2014 contact support, do not retry");
        }
        payload = {
          signedRequest: receipt,
          productId: purchase.productId,
          paymentId: purchase.transactionId
        };
        break;
      case "samsung": {
        if (!purchase.purchaseId) {
          throw new Error("Economy.purchase: samsung purchaseId missing \u2014 contact support, do not retry");
        }
        payload = { purchaseId: purchase.purchaseId };
        if (purchase.productId) payload.productId = purchase.productId;
        if (typeof purchase.channelData?.nativePayload === "string" && purchase.channelData.nativePayload) {
          payload.receipt = purchase.channelData.nativePayload;
        }
        break;
      }
      case "discord":
        if (typeof receipt !== "object" || !receipt) {
          throw new Error("Economy.purchase: discord receipt missing \u2014 contact support, do not retry");
        }
        payload = receipt;
        break;
      case "microsoft": {
        const data = purchase.channelData;
        if (typeof receipt !== "string" || !receipt || !purchase.purchaseId || !data?.receipts && !data?.receipt) {
          throw new Error("Economy.purchase: microsoft receipt missing \u2014 contact support, do not retry");
        }
        payload = data.receipts ? { receipts: data.receipts, receiptSignature: receipt, orderId: purchase.purchaseId } : { receipt: data.receipt, receiptSignature: receipt };
        break;
      }
      default:
        throw new Error(`Economy.purchase: unsupported provider ${provider}`);
    }
    const externalRef = provider === "samsung" || provider === "microsoft" ? purchase.purchaseId : purchase.transactionId ?? purchase.purchaseId;
    if (!externalRef) throw new Error("Economy.purchase: IAP result missing transactionId/purchaseId");
    return { externalRef, payload };
  }
};
var Shop = class {
  constructor(config) {
    this.config = config;
    this.client = config.client ?? new ShopClient(config);
    this.logger = config.logger;
    this.iap = config.iap;
    this.shopfrontModuleCache = /* @__PURE__ */ new Map();
  }
  async getShop(shopfrontId = "") {
    let res;
    try {
      res = await this.client.getShop(shopfrontId, sanitizeDates);
    } catch (err) {
      if (err.code === 404) return emptyShop;
      throw err;
    }
    return this.withFormattedPrices(res);
  }
  async getProducts(ids) {
    if (!ids.length) return [];
    try {
      return await this.client.getProducts(ids, sanitizeDates);
    } catch (err) {
      if (err.code === 404) return [];
      throw err;
    }
  }
  withFormattedPrices(shop) {
    return {
      ...shop,
      modules: shop.modules.map((m) => ({
        ...m,
        products: m.products.map(
          (p) => p.price.currency === "iap" ? { ...p, price: { ...p.price, formattedAmount: this.getFormattedPrice(p) } } : p
        )
      }))
    };
  }
  getFormattedPrice(product) {
    const name = this.iap.getProviderName();
    const channel = PROVIDER_MAP[name];
    const sku = product.channels?.[channel]?.sku;
    const catalog = this.iap.getProductById(sku);
    if (catalog) return catalog.price;
    this.logger?.warn(`[shop] No IAP product found for sku ${product.sku}/${sku} on provider ${name}`);
  }
};
var emptyShop = { _id: "", gameId: "", currencies: [], modules: [], metadata: {}, defaultShopfrontId: "" };
function sanitizeDates(obj) {
  if (typeof obj !== "object" || obj === null) return obj;
  if (Array.isArray(obj)) return obj.map(sanitizeDates);
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    out[k] = ["createdAt", "archivedAt", "deletedAt", "updatedAt"].includes(k) ? v ? new Date(v) : v : sanitizeDates(v);
  }
  return out;
}
var ShopClient = class {
  constructor(config) {
    this.config = config;
  }
  get baseUrl() {
    return this.config.apiUrl ?? "https://crucible.frvr.com";
  }
  async getShop(shopfrontId = "", sanitize) {
    const params = new URLSearchParams();
    if (shopfrontId) params.set("shopfront", shopfrontId);
    const headers = { "Content-Type": "application/json" };
    const token = this.config.accessProvider.getAccessToken();
    if (!token) throw new ShopError("Shop access token is required", 0);
    headers.Authorization = "Bearer " + token;
    const res = await fetch(`${this.baseUrl}/v1/shop/${this.config.gameId}${params.toString() ? "?" + params.toString() : ""}`, { headers });
    if (!res.ok) throw new ShopError(`Failed to fetch shop data: ${res.status} ${res.statusText}`, res.status);
    const body = await res.json();
    return sanitize?.(body) ?? body;
  }
  async getProducts(ids, sanitize) {
    const headers = { "Content-Type": "application/json" };
    const token = this.config.accessProvider.getAccessToken();
    if (!token) throw new ShopError("Shop access token is required", 0);
    headers.Authorization = "Bearer " + token;
    const products = ids.length ? `?productSKUs=${ids.toString()}` : "";
    const res = await fetch(`${this.baseUrl}/v1/shop/${this.config.gameId}/products${products}`, { headers });
    if (!res.ok) throw new ShopError(`Failed to fetch shop data: ${res.status} ${res.statusText}`, res.status);
    const body = (await res.json()).products;
    return sanitize?.(body) ?? body;
  }
};
var ShopError = class extends Error {
  constructor(message, code) {
    super(message);
    this.code = code;
    this.name = "ShopError";
  }
};
var FeaturesClient = class {
  constructor(config) {
    this.config = config;
  }
  async getFeatures() {
    const params = new URLSearchParams();
    if (this.config.debugProvider) {
      const debug = await this.config.debugProvider.getProperty("abt");
      if (debug) params.append("abt", debug);
    }
    if (this.config.channelId) params.append("ch", this.config.channelId);
    const headers = { "Content-Type": "application/json" };
    const token = await this.config.accessProvider.getAccessToken();
    if (token) headers.Authorization = "Bearer " + token;
    else params.append("userId", await this.config.accessProvider.getUserId());
    const qs = params.toString() ? "?" + params.toString() : "";
    const url = token ? `${this.config.baseUrl}/v1/tailor/${this.config.gameId}/config${qs}` : `${this.config.baseUrl}/v1/tailor/guest/${this.config.gameId}/config${qs}`;
    const res = await fetch(url, { headers });
    if (!res.ok) throw new FeaturesClientNetworkError(`Failed to fetch features: ${res.status} ${res.statusText}`, res.status);
    return res.json();
  }
};
var FeaturesClientNetworkError = class extends Error {
  constructor(message, code) {
    super(message);
    this.code = code;
    this.name = "FeaturesClientNetworkError";
  }
};
var Features = class {
  constructor(opts) {
    this.anonymousUserId = "";
    this.fetchingFeatures = false;
    this.auth = opts.auth;
    this.tracker = opts.tracker;
    this.anonymousIdProvider = createAnonymousIdProvider(opts.localStorage);
    this.client = opts.client ?? new FeaturesClient({
      accessProvider: {
        getAccessToken: async () => await this.auth.getAccessToken() ?? await this.auth.getStorageAccessToken(),
        getUserId: async () => this.anonymousUserId
      },
      debugProvider: opts.debugProvider,
      gameId: opts.config.gameId,
      apiUrl: opts.config.apiUrl,
      channelId: opts.channelId,
      env: opts.env
    });
    this.localStorage = opts.localStorage;
    this.tracker = opts.tracker;
    this.remoteABTests = opts.remoteABTests;
    this.defaultFeatures = opts.config.defaultFeatures ?? {};
    this.timeout = new TimeoutHelper(opts.config.timeoutMs ?? 1e3);
    this.config = opts.config;
    if (!this.config.activateTimeout) this.timeout.activate();
  }
  async init() {
    if (!this.initPromise) {
      this.initPromise = (async () => {
        this.preStoredConfig = await this.localStorage.getItem("__frvr_features");
        this.remoteConfig = await this.fetchFeatures();
      })();
    }
    return this.initPromise;
  }
  activateTimeout() {
    this.timeout.activate();
  }
  async getFeatures(keys, override) {
    await this.fetchFeatures(override);
    const source = this.remoteConfig ?? this.preStoredConfig;
    const features = source?.config ?? this.defaultFeatures;
    if (this.remoteConfig && this.remoteConfig.tests) {
      this.applyRemoteABTests(this.remoteConfig.tests);
    }
    if (keys && keys.length !== 0) {
      return keys.reduce((acc, k) => (acc[k] = features[k], acc), {});
    }
    return features;
  }
  applyRemoteABTests(tests) {
    if (!this.remoteABTestsApplied) {
      this.remoteABTestsApplied = tests;
      if (tests.length > 0) this.remoteABTests?.setGroups(tests);
    }
  }
  async fetchFeatures(override) {
    if (this.fetchPromise) return this.fetchPromise;
    if (!this.remoteABTestsApplied && !override) return;
    this.remoteABTestsApplied = void 0;
    this.fetchingFeatures = true;
    const userId = this.getUserId();
    if (userId && this.preStoredConfig && userId !== this.preStoredConfig.userId) {
      await this.clearPreStoredConfig();
    }
    this.tracker.logEvent("features_loading", {});
    this.fetchPromise = this.timeout.wrap(
      () => (async () => {
        let res;
        try {
          await this.auth.awaitSettledSession?.();
          res = await this.client.getFeatures();
        } catch (err) {
          this.logger?.error(
            ["Failed to fetch features:", err.code, err.message].filter(Boolean).join(" ")
          );
          if (err instanceof FeaturesClientNetworkError && err.code === 404) {
            await this.clearPreStoredConfig();
          }
          throw err;
        }
        if (res) await this.savePreStoredConfig(res);
        return res;
      })()
    ).then((remoteConfig) => {
      this.remoteConfig = remoteConfig;
      this.fetchPromise = void 0;
      this.tracker.logEvent("features_loaded", {});
    }).catch((err) => {
      this.fetchPromise = void 0;
      if (err instanceof TimeoutError) this.logger?.error("Timeout while fetching features: " + err.message);
      this.tracker.logEvent("features_loading_error", { error: err.message });
    });
    return this.fetchPromise;
  }
  async savePreStoredConfig(config) {
    this.preStoredConfig = { ...config, userId: this.getUserId() };
    await this.localStorage.setItem("__frvr_features", this.preStoredConfig);
  }
  async clearPreStoredConfig() {
    this.preStoredConfig = void 0;
    await this.localStorage.removeItem("__frvr_features");
  }
  getUserId() {
    return this.auth.getFRVRID();
  }
  get logger() {
    return this.tracker ? this.config.logger ?? emptyLogger2 : emptyLogger2;
  }
};
function createAnonymousIdProvider(storage) {
  return function() {
    const key = "__frvr_rfc_uuidv4";
    return storage.getItem(key, { value: void 0, createdAt: 0 }).value ?? (() => {
      const uuid = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
        const r = 16 * Math.random() | 0;
        return (c === "x" ? r : 3 & r | 8).toString(16);
      });
      storage.setItem(key, { value: uuid, createdAt: Date.now() });
      return uuid;
    })();
  }.bind(null);
}
var TimeoutHelper = class {
  constructor(timeoutMs) {
    this.timeoutMs = timeoutMs;
    this.timeoutActivePromise = new Deferred();
  }
  activate() {
    this.timeoutActivePromise.resolve(false);
  }
  async wrap(fn) {
    const deadline = Date.now() + this.timeoutMs;
    const promise = fn().finally(() => this.timeoutActivePromise.resolve(true));
    if (await this.timeoutActivePromise) return promise;
    const remaining = Math.max(0, deadline - Date.now());
    return new Promise((resolve, reject) => {
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
};
var TimeoutError = class _TimeoutError extends Error {
  constructor(message) {
    super(message);
    this.name = "TimeoutError";
    Object.setPrototypeOf(this, _TimeoutError.prototype);
  }
};
var ABTests = class {
  constructor(tracker) {
    this.tracker = tracker;
  }
  setGroups(groups) {
    const sessionId = this.tracker.getPlaySessionId?.();
    if (sessionId === this.playSessionId) return;
    this.tracker.addExtraFieldFunction?.((ctx) => {
    });
    if (!groups.length) return;
    this.playSessionId = sessionId;
    const names = {};
    for (const g of groups) {
      const label = g.group === 0 ? "control" : g.group <= 26 ? String.fromCharCode(96 + g.group) : `${g.group}`;
      names[g.testName] = g.testName + "__" + label;
    }
    const fields = Object.fromEntries(Object.entries(names).map(([k, v]) => ["abt_" + k, v]));
    for (const name in names) {
      this.tracker.logValuedEvent?.("ab_test_activation", 1, { ab_test_name: name, ab_test_group: names[name] });
    }
    this.tracker.addExtraFieldFunction?.((ctx) => Object.assign(ctx, fields));
  }
};
var DebugProvider = class {
  constructor(primaryDebugProvider, fallback) {
    this.primaryDebugProvider = primaryDebugProvider;
    this.fallback = fallback;
  }
  async getProperty(key) {
    const v = await this.primaryDebugProvider?.getProperty(key);
    return v === void 0 ? this.fallback.getItem(key) : v;
  }
};
var ShieldOverlay = class {
  constructor() {
    this.enabled = false;
  }
  setup(enabled, logger) {
    this.enabled = enabled;
    this.logger = logger;
  }
  async createOverlay(opts) {
    if (!this.enabled) {
      this.logger?.warn("Shield is not enabled in this environment");
      return null;
    }
    if (typeof window === "undefined" || window.FBInstant === void 0) {
      this.logger?.warn("Shield overlay is not supported in this channel");
      return null;
    }
    try {
      const fbi = this.getFBIChannel();
      if (fbi && fbi.isShieldSupported) {
        return fbi.createShieldOverlay({ ...opts, logger: this.logger });
      }
      this.logger?.warn("Shield overlay is not supported in this channel");
      return null;
    } catch (err) {
      this.logger?.warn("Failed to load Facebook Instant channel:", err);
      return null;
    }
  }
  isOverlayActive() {
    try {
      const fbi = this.getFBIChannel();
      return !!(fbi && fbi.isShieldSupported && fbi.isOverlayActive());
    } catch (err) {
      this.logger?.warn("Failed to load Facebook Instant channel:", err);
      return false;
    }
  }
  getFBIChannel() {
    return window.FRVRFBIChannel || null;
  }
};
function pad(n) {
  return (n < 10 ? "0" : "") + n;
}
function randomId() {
  const SEG = "-";
  function rand() {
    return (65536 * (1 + Math.random()) | 0).toString(16).slice(1);
  }
  const time = (/* @__PURE__ */ new Date()).getTime().toString(16).slice(0, 11) + (65536 * (1 + Math.random()) | 0).toString(16).slice(1, 2);
  return rand() + rand() + SEG + rand() + SEG + rand() + SEG + rand() + SEG + time;
}
function resolveEnv(requested, current) {
  const aliases = {
    prod: "production" /* PRODUCTION */,
    production: "production" /* PRODUCTION */,
    beta: "beta" /* BETA */,
    staging: "beta" /* BETA */,
    dev: "development" /* DEVELOPMENT */,
    development: "development" /* DEVELOPMENT */
  };
  return aliases[String(requested).toLowerCase()] ?? aliases[String(current).toLowerCase()] ?? current;
}
function installErrorHandlers(handler) {
  const prev = window.onerror;
  window.onerror = (msg, url, line, col, error) => {
    try {
      prev?.(msg, url, line, col, error);
    } catch {
    }
    if (msg = String(msg), error = error || new Error(msg)) {
      try {
        handler({ msg, line, col, label: error.stack || JSON.stringify(error) });
      } catch {
      }
    }
    return false;
  };
  const prevRej = window.onunhandledrejection;
  window.onunhandledrejection = (ev) => {
    try {
      prevRej?.call(window, ev);
    } catch {
    }
    try {
      const reason = ev?.reason || {};
      handler({ msg: reason.message, line: 0, col: 0, label: "unhandled_rejection: " + (reason.stack || JSON.stringify(reason)) });
    } catch {
    }
  };
}
function addSuspendResumeWebListeners(lifecycle) {
  addWebVisibilityListeners(lifecycle, ["onAudioSuspend", "onAudioResume"], ["onGamePause", "onResume"]);
}
function addGamePauseWebListeners(lifecycle) {
  addWebVisibilityListeners(lifecycle, ["onSuspend"], ["onResume"]);
}
function addWebVisibilityListeners(lifecycle, onHidden, onVisible) {
  if (typeof window === "undefined") return;
  const hasDocument = typeof document !== "undefined";
  const isAdActive = () => lifecycle instanceof RefcountedLifecycle && lifecycle.isAdActive();
  const handleHide = () => {
    for (const k of onHidden) lifecycle[k]();
  };
  window.addEventListener("focus", () => {
    if (isAdActive()) return;
    handleHide();
    if (hasDocument) document.removeEventListener("pointerdown", handleHide, true);
  });
  window.addEventListener("blur", () => {
    if (!isAdActive()) {
      for (const k of onVisible) lifecycle[k]();
      if (hasDocument) document.addEventListener("pointerdown", handleHide, { capture: true, once: true });
    }
  });
}
window.FRVR = new FRVRSDK();
var FRVR_SDK = {
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
  LeaderboardClient: LeaderboardClient2,
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
  emptyLogger: emptyLogger2,
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
  IAP_API_HOST_STAGING
};
if (typeof window !== "undefined") {
  window.FRVR_SDK = FRVR_SDK;
}
export {
  ABTests,
  AUTH_ENDPOINTS,
  AdError,
  AdFinishedStatus,
  AdResponseStatus,
  AdShowResult,
  AdSuccess,
  AdTrackerImpl,
  AdType,
  AdTypeProperties,
  AdsManager,
  AdsThrottler,
  AdsThrottlerResult,
  AnalyticsIDProviderStorageType,
  AuthClient,
  AuthManager,
  Challenges,
  ChallengesAPI,
  CloudStorage,
  ConsentOptions,
  DEFAULT_ADS_CONFIG,
  DebugProvider,
  Deferred,
  Economy,
  EconomyError,
  EconomyErrorCode,
  EconomyServiceClient,
  EmptyNavigationError,
  EmptyShortcutError,
  Env,
  FRVRSDK,
  FRVR_SDK,
  Features,
  FeaturesClient,
  FeaturesClientNetworkError,
  IAP,
  IAPError2 as IAPError,
  IAPErrorCode,
  IAPPurchaseErrorAlreadyOwned,
  IAPPurchaseErrorCancelledByUser2 as IAPPurchaseErrorCancelledByUser,
  IAPPurchaseErrorHeldByEconomy,
  IAPPurchaseErrorInProgress,
  IAPPurchaseErrorPending,
  IAPPurchaseErrorPopupBlocked,
  IAPPurchaseErrorUnknownProduct,
  IAPServiceClient,
  IAP_API_HOST_PRODUCTION,
  IAP_API_HOST_STAGING,
  LeaderboardClient2 as LeaderboardClient,
  LeaderboardEntry2 as LeaderboardEntry,
  LeaderboardError2 as LeaderboardError,
  Leaderboards,
  LifecycleSuspendReason,
  LiveRoom,
  MemoryAsyncStorageProvider,
  Notifications,
  Platform,
  PrefixedStorageProvider,
  RESPONSE_DEFINITIONS,
  RESPONSE_TYPES,
  RandomIdProvider,
  RefcountedLifecycle,
  SDK_VERSION,
  ScoreCachePolicy,
  ShieldOverlay,
  Shop,
  ShopClient,
  ShopError,
  Social,
  SocialAPI,
  SocialEvents,
  SocialWebsocketClient,
  Storage,
  StorageIDProvider,
  TcfBitSet,
  TcfV2ConsentProvider,
  TimeoutError,
  TimeoutHelper,
  TokenHandler,
  TokenPair,
  Tournament2 as Tournament,
  TournamentAPI,
  Tournaments,
  TrackerImpl,
  WebLocalStorageProvider,
  WebsocketClient,
  WebsocketEventTypes,
  addSdkStatusChangeListener,
  buildStorageProvider,
  decodeTokenPayload,
  defaultLifecycle,
  defaultStorage,
  emptyAnalyticsIDProvider,
  emptyBootstrapper,
  emptyChallengesProvider,
  emptyConsentProvider,
  emptyCrosspromo,
  emptyIAPProvider,
  emptyLeaderboardProvider,
  emptyLiveRoomProvider,
  emptyLogger2 as emptyLogger,
  emptyNavigationProvider,
  emptyNotificationsProvider,
  emptyShortcutProvider,
  emptyTournamentsProvider,
  emptyTracker,
  isAlreadyOwned,
  isPopupBlocked,
  isPurchaseCancelled,
  isPurchasePending,
  noConsentConsentProvider,
  resolveIapHost,
  tokenStorageKeys
};
