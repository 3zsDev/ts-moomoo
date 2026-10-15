// src/sdk-libs/howler.ts
/*! howler.js v2.0.4 | (c) 2013-2017, James Simpson of GoldFire Studios | MIT License | howlerjs.com */
var audioCache = {};
var HowlerGlobal = class {
  constructor() {
    this._counter = 1e3;
    this._codecs = {};
    this._howls = [];
    this._muted = false;
    this._volume = 1;
    this._canPlayEvent = "canplaythrough";
    this._navigator = typeof window !== "undefined" && window.navigator ? window.navigator : null;
    this.masterGain = null;
    this.noAudio = false;
    this.usingWebAudio = true;
    this.autoSuspend = true;
    this.ctx = null;
    this.mobileAutoEnable = true;
    this._mobileEnabled = false;
    this._mobileUnloaded = false;
    this._scratchBuffer = null;
    this._suspendTimer = null;
    this._resumeAfterSuspend = false;
    this._autoSuspended = false;
    this.state = "running";
    this.init();
  }
  init() {
    this._counter = 1e3;
    this._codecs = {};
    this._howls = [];
    this._muted = false;
    this._volume = 1;
    this._canPlayEvent = "canplaythrough";
    this._navigator = typeof window !== "undefined" && window.navigator ? window.navigator : null;
    this.masterGain = null;
    this.noAudio = false;
    this.usingWebAudio = true;
    this.autoSuspend = true;
    this.ctx = null;
    this.mobileAutoEnable = true;
    this._setup();
    return this;
  }
  volume(vol) {
    const self = this;
    vol = parseFloat(vol);
    if (!self.ctx) createAudioContext();
    if (vol !== void 0 && vol >= 0 && vol <= 1) {
      self._volume = vol;
      if (self._muted) return self;
      if (self.usingWebAudio) self.masterGain.gain.value = vol;
      for (let i = 0; i < self._howls.length; i++) {
        if (!self._howls[i]._webAudio) {
          const ids = self._howls[i]._getSoundIds();
          for (let j = 0; j < ids.length; j++) {
            const sound = self._howls[i]._soundById(ids[j]);
            if (sound && sound._node) sound._node.volume = sound._volume * vol;
          }
        }
      }
      return self;
    }
    return self._volume;
  }
  mute(muted) {
    const self = this;
    if (!self.ctx) createAudioContext();
    self._muted = muted;
    if (self.usingWebAudio) {
      self.masterGain.gain.value = muted ? 0 : self._volume;
    }
    for (let i = 0; i < self._howls.length; i++) {
      if (!self._howls[i]._webAudio) {
        const ids = self._howls[i]._getSoundIds();
        for (let j = 0; j < ids.length; j++) {
          const sound = self._howls[i]._soundById(ids[j]);
          if (sound && sound._node) sound._node.muted = !!muted || sound._muted;
        }
      }
    }
    return self;
  }
  unload() {
    const self = this;
    for (let i = self._howls.length - 1; i >= 0; i--) self._howls[i].unload();
    if (self.usingWebAudio && self.ctx && self.ctx.close !== void 0) {
      self.ctx.close();
      self.ctx = null;
      createAudioContext();
    }
    return self;
  }
  codecs(ext) {
    return this._codecs[ext.replace(/^x-/, "")];
  }
  _setup() {
    const self = this;
    self.state = self.ctx ? self.ctx.state || "running" : "running";
    self._autoSuspend();
    if (!self.usingWebAudio) {
      if (typeof Audio !== "undefined") {
        try {
          const test = new Audio();
          if (test.oncanplaythrough === void 0) self._canPlayEvent = "canplay";
        } catch {
          self.noAudio = true;
        }
      } else {
        self.noAudio = true;
      }
    }
    try {
      const test = new Audio();
      if (test.muted) self.noAudio = true;
    } catch {
    }
    if (!self.noAudio) self._setupCodecs();
    return self;
  }
  _setupCodecs() {
    const self = this;
    let test = null;
    try {
      test = typeof Audio !== "undefined" ? new Audio() : null;
    } catch {
      return self;
    }
    if (!test || typeof test.canPlayType !== "function") return self;
    const mpegPlayable = test.canPlayType("audio/mpeg;").replace(/^no$/, "");
    const operaMatch = self._navigator && self._navigator.userAgent.match(/OPR\/([0-6].)/g);
    const isOldOpera = operaMatch && parseInt(operaMatch[0].split("/")[1], 10) < 33;
    self._codecs = {
      mp3: !(isOldOpera || !mpegPlayable && !test.canPlayType("audio/mp3;").replace(/^no$/, "")),
      mpeg: !!mpegPlayable,
      opus: !!test.canPlayType('audio/ogg; codecs="opus"').replace(/^no$/, ""),
      ogg: !!test.canPlayType('audio/ogg; codecs="vorbis"').replace(/^no$/, ""),
      oga: !!test.canPlayType('audio/ogg; codecs="vorbis"').replace(/^no$/, ""),
      wav: !!test.canPlayType('audio/wav; codecs="1"').replace(/^no$/, ""),
      aac: !!test.canPlayType("audio/aac;").replace(/^no$/, ""),
      caf: !!test.canPlayType("audio/x-caf;").replace(/^no$/, ""),
      m4a: !!(test.canPlayType("audio/x-m4a;") || test.canPlayType("audio/m4a;") || test.canPlayType("audio/aac;")).replace(/^no$/, ""),
      mp4: !!(test.canPlayType("audio/x-mp4;") || test.canPlayType("audio/mp4;") || test.canPlayType("audio/aac;")).replace(/^no$/, ""),
      weba: !!test.canPlayType('audio/webm; codecs="vorbis"').replace(/^no$/, ""),
      webm: !!test.canPlayType('audio/webm; codecs="vorbis"').replace(/^no$/, ""),
      dolby: !!test.canPlayType('audio/mp4; codecs="ec-3"').replace(/^no$/, ""),
      flac: !!(test.canPlayType("audio/x-flac;") || test.canPlayType("audio/flac;")).replace(/^no$/, "")
    };
    return self;
  }
  _enableMobileAudio() {
    const self = this;
    const isMobile = /iPhone|iPad|iPod|Android|BlackBerry|BB10|Silk|Mobi/i.test(
      self._navigator && self._navigator.userAgent || ""
    );
    const hasTouch = "ontouchend" in window || self._navigator && self._navigator.maxTouchPoints > 0 || self._navigator && self._navigator.msMaxTouchPoints > 0;
    if (!self._mobileEnabled && self.ctx && (isMobile || hasTouch)) {
      self._mobileEnabled = false;
      if (!self._mobileUnloaded && self.ctx.sampleRate !== 44100) {
        self._mobileUnloaded = true;
        self.unload();
      }
      self._scratchBuffer = self.ctx.createBuffer(1, 1, 22050);
      const unlock = () => {
        self._autoResume();
        const source = self.ctx.createBufferSource();
        source.buffer = self._scratchBuffer;
        source.connect(self.ctx.destination);
        if (source.start === void 0) source.noteOn(0);
        else source.start(0);
        if (typeof self.ctx.resume === "function") self.ctx.resume();
        source.onended = () => {
          source.disconnect(0);
          self._mobileEnabled = true;
          self.mobileAutoEnable = false;
          document.removeEventListener("touchend", unlock, true);
        };
      };
      document.addEventListener("touchend", unlock, true);
    }
    return self;
  }
  _autoSuspend() {
    const self = this;
    if (self.autoSuspend && self.ctx && self.ctx.suspend !== void 0 && howler.usingWebAudio) {
      for (let i = 0; i < self._howls.length; i++) {
        if (self._howls[i]._webAudio) {
          for (let j = 0; j < self._howls[i]._sounds.length; j++) {
            if (!self._howls[i]._sounds[j]._paused) return self;
          }
        }
      }
      if (self._suspendTimer) clearTimeout(self._suspendTimer);
      self._suspendTimer = window.setTimeout(() => {
        if (!self.autoSuspend) return;
        self._suspendTimer = null;
        self.state = "suspending";
        self.ctx.suspend().then(() => {
          self.state = "suspended";
          if (self._resumeAfterSuspend) {
            delete self._resumeAfterSuspend;
            self._autoResume();
          }
        });
      }, 3e4);
    }
    return self;
  }
  _autoResume() {
    const self = this;
    if (self.ctx && self.ctx.resume !== void 0 && howler.usingWebAudio) {
      if (self.state === "running" && self._suspendTimer) {
        clearTimeout(self._suspendTimer);
        self._suspendTimer = null;
      } else if (self.state === "suspended") {
        self.ctx.resume().then(() => {
          self.state = "running";
          for (let i = 0; i < self._howls.length; i++) {
            self._howls[i]._emit("resume");
          }
        });
        if (self._suspendTimer) {
          clearTimeout(self._suspendTimer);
          self._suspendTimer = null;
        }
      } else if (self.state === "suspending") {
        self._resumeAfterSuspend = true;
      }
    }
    return self;
  }
};
var Howl = class {
  constructor(options) {
    this._autoplay = false;
    this._format = [];
    this._html5 = false;
    this._muted = false;
    this._loop = false;
    this._pool = 5;
    this._preload = true;
    this._rate = 1;
    this._sprite = {};
    this._src = "";
    this._volume = 1;
    this._duration = 0;
    this._state = "unloaded";
    this._sounds = [];
    this._endTimers = {};
    this._queue = [];
    this._webAudio = false;
    this._onend = [];
    this._onfade = [];
    this._onload = [];
    this._onloaderror = [];
    this._onpause = [];
    this._onplay = [];
    this._onstop = [];
    this._onmute = [];
    this._onvolume = [];
    this._onrate = [];
    this._onseek = [];
    this._onresume = [];
    if (!options.src || options.src.length === 0) {
      console.error("An array of source files must be passed with any new Howl.");
      return;
    }
    this.init(options);
  }
  init(options) {
    const self = this;
    if (!howler.ctx) createAudioContext();
    self._autoplay = options.autoplay || false;
    self._format = typeof options.format !== "string" ? options.format : [options.format];
    self._html5 = options.html5 || false;
    self._muted = options.mute || false;
    self._loop = options.loop || false;
    self._pool = options.pool || 5;
    self._preload = typeof options.preload !== "boolean" || options.preload;
    self._rate = options.rate || 1;
    self._sprite = options.sprite || {};
    self._src = typeof options.src !== "string" ? options.src : [options.src];
    self._volume = options.volume !== void 0 ? options.volume : 1;
    self._duration = 0;
    self._state = "unloaded";
    self._sounds = [];
    self._endTimers = {};
    self._queue = [];
    self._onend = options.onend ? [{ fn: options.onend }] : [];
    self._onfade = options.onfade ? [{ fn: options.onfade }] : [];
    self._onload = options.onload ? [{ fn: options.onload }] : [];
    self._onloaderror = options.onloaderror ? [{ fn: options.onloaderror }] : [];
    self._onpause = options.onpause ? [{ fn: options.onpause }] : [];
    self._onplay = options.onplay ? [{ fn: options.onplay }] : [];
    self._onstop = options.onstop ? [{ fn: options.onstop }] : [];
    self._onmute = options.onmute ? [{ fn: options.onmute }] : [];
    self._onvolume = options.onvolume ? [{ fn: options.onvolume }] : [];
    self._onrate = options.onrate ? [{ fn: options.onrate }] : [];
    self._onseek = options.onseek ? [{ fn: options.onseek }] : [];
    self._onresume = [];
    self._webAudio = howler.usingWebAudio && !self._html5;
    if (howler.ctx !== void 0 && howler.ctx && howler.mobileAutoEnable) {
      howler._enableMobileAudio();
    }
    howler._howls.push(self);
    if (self._autoplay) self._queue.push({ event: "play", action: () => self.play() });
    if (self._preload) self.load();
    return self;
  }
  load() {
    const self = this;
    let src = null;
    if (howler.noAudio) {
      self._emit("loaderror", null, "No audio support.");
      return self;
    }
    if (typeof self._src === "string") self._src = [self._src];
    for (let i = 0; i < self._src.length; i++) {
      let ext;
      let srcStr;
      if (self._format && self._format[i]) {
        ext = self._format[i];
      } else {
        srcStr = self._src[i];
        if (typeof srcStr !== "string") {
          self._emit("loaderror", null, "Non-string found in selected audio sources - ignoring.");
          continue;
        }
        const m = /^data:audio\/([^;,]+);/i.exec(srcStr);
        ext = m ? m[1].toLowerCase() : void 0;
        if (!ext) {
          const m2 = /\.([^.]+)$/.exec(srcStr.split("?", 1)[0]);
          if (m2) ext = m2[1].toLowerCase();
        }
      }
      if (!ext) {
        console.warn(
          'No file extension was found. Consider using the "format" property or specify an extension.'
        );
      }
      if (ext && howler.codecs(ext)) {
        src = self._src[i];
        break;
      }
    }
    if (src) {
      self._src = src;
      self._state = "loading";
      if (window.location.protocol === "https:" && src.slice(0, 5) === "http:") {
        self._html5 = true;
        self._webAudio = false;
      }
      new Sound(self);
      if (self._webAudio) loadBuffer(self);
      return self;
    }
    self._emit("loaderror", null, "No codec support for selected audio sources.");
    return self;
  }
  play(spriteOrId, internal) {
    const self = this;
    let id = null;
    let sprite;
    if (typeof spriteOrId === "number") {
      id = spriteOrId;
      spriteOrId = void 0;
    } else {
      if (typeof spriteOrId === "string" && self._state === "loaded" && !self._sprite[spriteOrId]) {
        return null;
      }
      if (spriteOrId === void 0) {
        spriteOrId = "__default";
        let pausedCount = 0;
        for (let i = 0; i < self._sounds.length; i++) {
          if (self._sounds[i]._paused && !self._sounds[i]._ended) {
            pausedCount++;
            id = self._sounds[i]._id;
          }
        }
        if (pausedCount === 1) spriteOrId = void 0;
        else id = null;
      }
    }
    const sound = id ? self._soundById(id) : self._inactiveSound();
    if (!sound) return null;
    if (id && !spriteOrId) spriteOrId = sound._sprite || "__default";
    if (self._state !== "loaded") {
      sound._sprite = spriteOrId;
      sound._ended = false;
      const soundId = sound._id;
      self._queue.push({ event: "play", action: () => self.play(soundId) });
      return soundId;
    }
    if (id && !sound._paused) {
      if (!internal) setTimeout(() => self._emit("play", sound._id), 0);
      return sound._id;
    }
    if (self._webAudio) howler._autoResume();
    const seek = Math.max(
      0,
      sound._seek > 0 ? sound._seek : self._sprite[spriteOrId][0] / 1e3
    );
    const duration = Math.max(
      0,
      (self._sprite[spriteOrId][0] + self._sprite[spriteOrId][1]) / 1e3 - seek
    );
    const timeout = 1e3 * duration / Math.abs(sound._rate);
    sound._paused = false;
    sound._ended = false;
    sound._sprite = spriteOrId;
    sound._seek = seek;
    sound._start = self._sprite[spriteOrId][0] / 1e3;
    sound._stop = (self._sprite[spriteOrId][0] + self._sprite[spriteOrId][1]) / 1e3;
    sound._loop = !(!sound._loop && !self._sprite[spriteOrId][2]);
    const node = sound._node;
    if (self._webAudio) {
      const playSound = () => {
        self._refreshBuffer(sound);
        const vol = sound._muted || self._muted ? 0 : sound._volume;
        node.gain.gain.setValueAtTime(vol, howler.ctx.currentTime);
        sound._playStart = howler.ctx.currentTime;
        const src = node.bufferSource;
        if (src.start === void 0) {
          if (sound._loop) src.noteGrainOn(0, seek, 86400);
          else src.noteGrainOn(0, seek, duration);
        } else {
          if (sound._loop) src.start(0, seek, 86400);
          else src.start(0, seek, duration);
        }
        if (timeout !== Infinity) {
          self._endTimers[sound._id] = window.setTimeout(
            self._ended.bind(self, sound),
            timeout
          );
        }
        if (!internal) setTimeout(() => self._emit("play", sound._id), 0);
      };
      const isRunning = howler.state === "running";
      if (self._state === "loaded" && isRunning) {
        playSound();
      } else {
        const event = isRunning || self._state !== "loaded" ? "load" : "resume";
        self.once(event, playSound, isRunning ? sound._id : void 0);
        self._clearTimer(sound._id);
      }
    } else {
      const playHtml5 = () => {
        node.currentTime = seek;
        node.muted = sound._muted || self._muted || howler._muted || node.muted;
        node.volume = sound._volume * howler.volume();
        node.playbackRate = sound._rate;
        node.play();
        if (timeout !== Infinity) {
          self._endTimers[sound._id] = window.setTimeout(
            self._ended.bind(self, sound),
            timeout
          );
        }
        if (!internal) self._emit("play", sound._id);
      };
      const canPlay = self._state === "loaded" && (window && window.ejecta || !node.readyState && howler._navigator.isCocoonJS);
      if (node.readyState === 4 || canPlay) {
        playHtml5();
      } else {
        const onCanPlay = () => {
          playHtml5();
          node.removeEventListener(howler._canPlayEvent, onCanPlay, false);
        };
        node.addEventListener(howler._canPlayEvent, onCanPlay, false);
        self._clearTimer(sound._id);
      }
    }
    return sound._id;
  }
  pause(id, internal = false) {
    const self = this;
    if (self._state !== "loaded") {
      self._queue.push({ event: "pause", action: () => self.pause(id) });
      return self;
    }
    const ids = self._getSoundIds(id);
    for (let i = 0; i < ids.length; i++) {
      self._clearTimer(ids[i]);
      const sound = self._soundById(ids[i]);
      if (sound && !sound._paused) {
        const seek = self.seek(ids[i]);
        if (typeof seek === "number") sound._seek = seek;
        sound._rateSeek = 0;
        sound._paused = true;
        self._stopFade(ids[i]);
        if (sound._node) {
          if (self._webAudio) {
            if (!sound._node.bufferSource) continue;
            if (sound._node.bufferSource.stop === void 0) {
              sound._node.bufferSource.noteOff(0);
            } else {
              sound._node.bufferSource.stop(0);
            }
            self._cleanBuffer(sound._node);
          } else if (isNaN(sound._node.duration) && sound._node.duration !== Infinity) {
          } else {
            sound._node.pause();
          }
        }
        if (!internal) self._emit("pause", sound ? sound._id : null);
      }
    }
    return self;
  }
  stop(id, internal) {
    const self = this;
    if (self._state !== "loaded") {
      self._queue.push({ event: "stop", action: () => self.stop(id) });
      return self;
    }
    const ids = self._getSoundIds(id);
    for (let i = 0; i < ids.length; i++) {
      self._clearTimer(ids[i]);
      const sound = self._soundById(ids[i]);
      if (sound) {
        sound._seek = sound._start || 0;
        sound._rateSeek = 0;
        sound._paused = true;
        sound._ended = true;
        self._stopFade(ids[i]);
        if (sound._node) {
          if (self._webAudio) {
            if (sound._node.bufferSource) {
              if (sound._node.bufferSource.stop === void 0) {
                sound._node.bufferSource.noteOff(0);
              } else {
                sound._node.bufferSource.stop(0);
              }
              self._cleanBuffer(sound._node);
            }
          } else if (isNaN(sound._node.duration) && sound._node.duration !== Infinity) {
          } else {
            sound._node.currentTime = sound._start || 0;
            sound._node.pause();
          }
        }
        if (!internal) self._emit("stop", sound._id);
      }
    }
    return self;
  }
  mute(muted, id) {
    const self = this;
    if (self._state !== "loaded") {
      self._queue.push({ event: "mute", action: () => self.mute(muted, id) });
      return self;
    }
    if (id === void 0) {
      if (typeof muted !== "boolean") return self._muted;
      self._muted = muted;
    }
    const ids = self._getSoundIds(id);
    for (let i = 0; i < ids.length; i++) {
      const sound = self._soundById(ids[i]);
      if (sound) {
        sound._muted = muted;
        if (self._webAudio && sound._node) {
          sound._node.gain.gain.setValueAtTime(
            muted ? 0 : sound._volume,
            howler.ctx.currentTime
          );
        } else if (sound._node) {
          sound._node.muted = !!howler._muted || muted;
        }
        self._emit("mute", sound._id);
      }
    }
    return self;
  }
  volume(...args) {
    const self = this;
    let vol;
    let id;
    if (args.length === 0) return self._volume;
    if (args.length === 1 || args.length === 2 && args[1] === void 0) {
      if (self._getSoundIds().indexOf(args[0]) >= 0) id = parseInt(args[0], 10);
      else vol = parseFloat(args[0]);
    } else if (args.length >= 2) {
      vol = parseFloat(args[0]);
      id = parseInt(args[1], 10);
    }
    let sound;
    if (!(vol !== void 0 && vol >= 0 && vol <= 1)) {
      sound = id ? self._soundById(id) : self._sounds[0];
      return sound ? sound._volume : 0;
    }
    if (self._state !== "loaded") {
      self._queue.push({ event: "volume", action: () => self.volume(...args) });
      return self;
    }
    if (id === void 0) self._volume = vol;
    const ids = self._getSoundIds(id);
    for (let i = 0; i < ids.length; i++) {
      sound = self._soundById(ids[i]);
      if (sound) {
        sound._volume = vol;
        if (!args[2]) self._stopFade(ids[i]);
        if (self._webAudio && sound._node && !sound._muted) {
          sound._node.gain.gain.setValueAtTime(vol, howler.ctx.currentTime);
        } else if (sound._node && !sound._muted) {
          sound._node.volume = vol * howler.volume();
        }
        self._emit("volume", sound._id);
      }
    }
    return self;
  }
  _stopFade(id) {
    const sound = this._soundById(id);
    if (sound?._interval !== null && sound?._interval !== void 0) {
      clearInterval(sound._interval);
      sound._interval = null;
    }
    return this;
  }
  fade(from, to, len, id) {
    const self = this;
    const delta = Math.abs(from - to);
    const direction = from > to ? "out" : "in";
    let steps = delta / 0.01;
    let interval = steps > 0 ? len / steps : len;
    if (interval < 4) {
      steps = Math.ceil(steps / (4 / interval));
      interval = 4;
    }
    if (self._state !== "loaded") {
      self._queue.push({ event: "fade", action: () => self.fade(from, to, len, id) });
      return self;
    }
    self.volume(from, id);
    const ids = self._getSoundIds(id);
    for (let i = 0; i < ids.length; i++) {
      const sound = self._soundById(ids[i]);
      if (sound) {
        if (!id) self._stopFade(ids[i]);
        if (self._webAudio && !sound._muted) {
          const now = howler.ctx.currentTime;
          const end = now + len / 1e3;
          sound._volume = from;
          sound._node.gain.gain.setValueAtTime(from, now);
          sound._node.gain.gain.linearRampToValueAtTime(to, end);
        }
        let current = from;
        sound._interval = window.setInterval(
          function(_id, snd) {
            if (steps > 0) current += direction === "in" ? 0.01 : -0.01;
            current = Math.max(0, current);
            current = Math.min(1, current);
            current = Math.round(current * 100) / 100;
            if (self._webAudio) {
              if (id === void 0) self._volume = current;
              snd._volume = current;
            } else {
              self.volume(current, _id, true);
            }
            if (to < from && current <= to || to > from && current >= to) {
              clearInterval(snd._interval);
              snd._interval = null;
              self.volume(to, _id);
              self._emit("fade", _id);
            }
          }.bind(self, ids[i], sound),
          interval
        );
      }
    }
    return self;
  }
  loop(...args) {
    const self = this;
    let loop;
    let id;
    if (args.length === 0) return self._loop;
    if (args.length === 1) {
      if (typeof args[0] !== "boolean") {
        const s = self._soundById(parseInt(args[0], 10));
        return !!s && s._loop;
      }
      loop = args[0];
      self._loop = loop;
    } else if (args.length === 2) {
      loop = args[0];
      id = parseInt(args[1], 10);
    } else {
      return self;
    }
    const ids = self._getSoundIds(id);
    for (let i = 0; i < ids.length; i++) {
      const sound = self._soundById(ids[i]);
      if (sound) {
        sound._loop = loop;
        if (self._webAudio && sound._node && sound._node.bufferSource) {
          sound._node.bufferSource.loop = loop;
          if (loop) {
            sound._node.bufferSource.loopStart = sound._start || 0;
            sound._node.bufferSource.loopEnd = sound._stop;
          }
        }
      }
    }
    return self;
  }
  rate(...args) {
    const self = this;
    let rate;
    let id;
    if (args.length === 0) {
      id = self._sounds[0]._id;
    } else if (args.length === 1) {
      const ids2 = self._getSoundIds();
      if (ids2.indexOf(args[0]) >= 0) id = parseInt(args[0], 10);
      else rate = parseFloat(args[0]);
    } else if (args.length === 2) {
      rate = parseFloat(args[0]);
      id = parseInt(args[1], 10);
    }
    let sound;
    if (typeof rate !== "number") {
      sound = self._soundById(id);
      return sound ? sound._rate : self._rate;
    }
    if (self._state !== "loaded") {
      self._queue.push({ event: "rate", action: () => self.rate(...args) });
      return self;
    }
    if (id === void 0) self._rate = rate;
    const ids = self._getSoundIds(id);
    for (let i = 0; i < ids.length; i++) {
      sound = self._soundById(ids[i]);
      if (sound) {
        sound._rateSeek = self.seek(ids[i]);
        sound._playStart = self._webAudio ? howler.ctx.currentTime : sound._playStart;
        sound._rate = rate;
        if (self._webAudio && sound._node && sound._node.bufferSource) {
          sound._node.bufferSource.playbackRate.value = rate;
        } else if (sound._node) {
          sound._node.playbackRate = rate;
        }
        const seek = self.seek(ids[i]);
        const duration = (self._sprite[sound._sprite][0] + self._sprite[sound._sprite][1]) / 1e3 - seek;
        const timeout = 1e3 * duration / Math.abs(sound._rate);
        if (!self._endTimers[ids[i]] && sound._paused) {
        } else {
          self._clearTimer(ids[i]);
          self._endTimers[ids[i]] = window.setTimeout(
            self._ended.bind(self, sound),
            timeout
          );
        }
        self._emit("rate", sound._id);
      }
    }
    return self;
  }
  seek(...args) {
    const self = this;
    let seek;
    let id;
    if (args.length === 0) {
      id = self._sounds[0]._id;
    } else if (args.length === 1) {
      const ids = self._getSoundIds();
      if (ids.indexOf(args[0]) >= 0) id = parseInt(args[0], 10);
      else {
        id = self._sounds[0]._id;
        seek = parseFloat(args[0]);
      }
    } else if (args.length === 2) {
      seek = parseFloat(args[0]);
      id = parseInt(args[1], 10);
    }
    if (id === void 0) return self;
    if (self._state !== "loaded") {
      self._queue.push({ event: "seek", action: () => self.seek(...args) });
      return self;
    }
    const sound = self._soundById(id);
    if (sound) {
      if (!(typeof seek === "number" && seek >= 0)) {
        if (self._webAudio) {
          const elapsed = self.playing(id) ? howler.ctx.currentTime - sound._playStart : 0;
          const rateSeek = sound._rateSeek ? sound._rateSeek - sound._seek : 0;
          return sound._seek + (rateSeek + elapsed * Math.abs(sound._rate));
        }
        return sound._node.currentTime;
      }
      const wasPlaying = self.playing(id);
      if (wasPlaying) self.pause(id, true);
      sound._seek = seek;
      sound._ended = false;
      self._clearTimer(id);
      if (wasPlaying) self.play(id, true);
      if (!self._webAudio && sound._node) {
        sound._node.currentTime = seek;
      }
      self._emit("seek", id);
    }
    return self;
  }
  playing(id) {
    const self = this;
    if (typeof id === "number") {
      const sound = self._soundById(id);
      return !!sound && !sound._paused;
    }
    for (let i = 0; i < self._sounds.length; i++) {
      if (!self._sounds[i]._paused) return true;
    }
    return false;
  }
  duration(id) {
    const self = this;
    let duration = self._duration;
    const sound = self._soundById(id);
    if (sound) duration = self._sprite[sound._sprite][1] / 1e3;
    return duration;
  }
  state() {
    return this._state;
  }
  unload() {
    const self = this;
    const sounds = self._sounds;
    for (let i = 0; i < sounds.length; i++) {
      if (!sounds[i]._paused) self.stop(sounds[i]._id);
      if (!self._webAudio) {
        if (!/MSIE |Trident\//.test(howler._navigator && howler._navigator.userAgent || "")) {
          sounds[i]._node.src = "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA";
        }
        sounds[i]._node.removeEventListener("error", sounds[i]._errorFn, false);
        sounds[i]._node.removeEventListener(
          howler._canPlayEvent,
          sounds[i]._loadFn,
          false
        );
      }
      delete sounds[i]._node;
      self._clearTimer(sounds[i]._id);
      const idx = howler._howls.indexOf(self);
      if (idx >= 0) howler._howls.splice(idx, 1);
    }
    let shared = true;
    for (let i = 0; i < howler._howls.length; i++) {
      if (howler._howls[i]._src === self._src) {
        shared = false;
        break;
      }
    }
    if (audioCache && shared) delete audioCache[self._src];
    howler.noAudio = false;
    self._state = "unloaded";
    self._sounds = [];
    return null;
  }
  on(event, fn, id, once) {
    const self = this;
    const list = self["_on" + event];
    if (typeof fn === "function") {
      list.push(once ? { id, fn, once } : { id, fn });
    }
    return self;
  }
  off(event, fn, id) {
    const self = this;
    const list = self["_on" + event];
    let i = 0;
    if (typeof fn === "number") {
      id = fn;
      fn = void 0;
    }
    if (fn || id) {
      for (i = 0; i < list.length; i++) {
        const isId = id === list[i].id;
        if (fn === list[i].fn && isId || !fn && isId) {
          list.splice(i, 1);
          break;
        }
      }
    } else if (event) {
      self["_on" + event] = [];
    } else {
      const keys = Object.keys(self);
      for (i = 0; i < keys.length; i++) {
        if (keys[i].indexOf("_on") === 0 && Array.isArray(self[keys[i]])) {
          self[keys[i]] = [];
        }
      }
    }
    return self;
  }
  once(event, fn, id) {
    const self = this;
    self.on(event, fn, id, true);
    return self;
  }
  _emit(event, id, msg) {
    const self = this;
    const list = self["_on" + event];
    for (let i = list.length - 1; i >= 0; i--) {
      if (!list[i].id || list[i].id === id || event === "load") {
        setTimeout(
          function(fn) {
            fn.call(this, id, msg);
          }.bind(self, list[i].fn),
          0
        );
        if (list[i].once) self.off(event, list[i].fn, list[i].id);
      }
    }
    return self;
  }
  _loadQueue() {
    const self = this;
    if (self._queue.length > 0) {
      const queued = self._queue[0];
      self.once(queued.event, () => {
        self._queue.shift();
        self._loadQueue();
      });
      queued.action();
    }
    return self;
  }
  _ended(sound) {
    const self = this;
    const sprite = sound._sprite;
    if (!self._webAudio && sound._node && !sound._node.ended) {
      setTimeout(self._ended.bind(self, sound), 100);
      return self;
    }
    const looping = !(!sound._loop && !self._sprite[sprite][2]);
    self._emit("end", sound._id);
    if (!self._webAudio && looping) self.stop(sound._id, true).play(sound._id);
    if (self._webAudio && looping) {
      self._emit("play", sound._id);
      sound._seek = sound._start || 0;
      sound._rateSeek = 0;
      sound._playStart = howler.ctx.currentTime;
      const duration = 1e3 * (sound._stop - sound._start) / Math.abs(sound._rate);
      self._endTimers[sound._id] = window.setTimeout(
        self._ended.bind(self, sound),
        duration
      );
    }
    if (self._webAudio && !looping) {
      sound._paused = true;
      sound._ended = true;
      sound._seek = sound._start || 0;
      sound._rateSeek = 0;
      self._clearTimer(sound._id);
      self._cleanBuffer(sound._node);
      howler._autoSuspend();
    }
    if (!self._webAudio && !looping) self.stop(sound._id);
    return self;
  }
  _clearTimer(id) {
    const self = this;
    if (self._endTimers[id]) {
      clearTimeout(self._endTimers[id]);
      delete self._endTimers[id];
    }
    return self;
  }
  _soundById(id) {
    const self = this;
    for (let i = 0; i < self._sounds.length; i++) {
      if (id === self._sounds[i]._id) return self._sounds[i];
    }
    return null;
  }
  _inactiveSound() {
    const self = this;
    self._drain();
    for (let i = 0; i < self._sounds.length; i++) {
      if (self._sounds[i]._ended) return self._sounds[i].reset();
    }
    return new Sound(self);
  }
  _drain() {
    const self = this;
    const max = self._pool;
    let endedCount = 0;
    let i;
    if (self._sounds.length < max) return;
    for (i = 0; i < self._sounds.length; i++) {
      if (self._sounds[i]._ended) endedCount++;
    }
    for (i = self._sounds.length - 1; i >= 0; i--) {
      if (endedCount <= max) return;
      if (self._sounds[i]._ended) {
        if (self._webAudio && self._sounds[i]._node) {
          self._sounds[i]._node.disconnect(0);
        }
        self._sounds.splice(i, 1);
        endedCount--;
      }
    }
  }
  _getSoundIds(id) {
    const self = this;
    if (id === void 0) {
      const ids = [];
      for (let i = 0; i < self._sounds.length; i++) ids.push(self._sounds[i]._id);
      return ids;
    }
    return [id];
  }
  _refreshBuffer(sound) {
    const self = this;
    sound._node.bufferSource = howler.ctx.createBufferSource();
    sound._node.bufferSource.buffer = audioCache[self._src];
    if (self._panner) {
      sound._node.bufferSource.connect(self._panner);
    } else {
      sound._node.bufferSource.connect(sound._node);
    }
    sound._node.bufferSource.loop = self._loop;
    if (self._loop) {
      sound._node.bufferSource.loopStart = sound._start || 0;
      sound._node.bufferSource.loopEnd = sound._stop;
    }
    sound._node.bufferSource.playbackRate.value = sound._rate;
    return self;
  }
  _cleanBuffer(node) {
    const self = this;
    if (self._scratchBuffer) {
      node.bufferSource.onended = null;
      node.bufferSource.disconnect(0);
      try {
        node.bufferSource.buffer = self._scratchBuffer;
      } catch {
      }
    }
    node.bufferSource = null;
    return self;
  }
  // scratch buffer lives on HowlerGlobal
  get _scratchBuffer() {
    return howler._scratchBuffer;
  }
};
var Sound = class {
  constructor(parent) {
    this._muted = false;
    this._loop = false;
    this._volume = 1;
    this._rate = 1;
    this._seek = 0;
    this._rateSeek = 0;
    this._playStart = 0;
    this._start = 0;
    this._stop = 0;
    this._paused = true;
    this._ended = true;
    this._sprite = "__default";
    this._id = 0;
    this._node = null;
    this._interval = null;
    this._parent = parent;
    this.init();
  }
  init() {
    const self = this;
    const parent = self._parent;
    self._muted = parent._muted;
    self._loop = parent._loop;
    self._volume = parent._volume;
    self._rate = parent._rate;
    self._seek = 0;
    self._paused = true;
    self._ended = true;
    self._sprite = "__default";
    self._id = ++howler._counter;
    parent._sounds.push(self);
    self.create();
    return self;
  }
  create() {
    const self = this;
    const parent = self._parent;
    const vol = howler._muted || self._muted || self._parent._muted ? 0 : self._volume;
    if (parent._webAudio) {
      self._node = {};
      self._node.gain = howler.ctx.createGain === void 0 ? howler.ctx.createGainNode() : howler.ctx.createGain();
      self._node.gain.gain.setValueAtTime(vol, howler.ctx.currentTime);
      self._node.paused = true;
      self._node.gain.connect(howler.masterGain);
    } else {
      const node = new Audio();
      self._node = node;
      self._errorFn = self._errorListener.bind(self);
      node.addEventListener("error", self._errorFn, false);
      self._loadFn = self._loadListener.bind(self);
      node.addEventListener(howler._canPlayEvent, self._loadFn, false);
      node.src = parent._src;
      node.preload = "auto";
      node.volume = vol * howler.volume();
      node.load();
    }
    return self;
  }
  reset() {
    const self = this;
    const parent = self._parent;
    self._muted = parent._muted;
    self._loop = parent._loop;
    self._volume = parent._volume;
    self._rate = parent._rate;
    self._seek = 0;
    self._rateSeek = 0;
    self._paused = true;
    self._ended = true;
    self._sprite = "__default";
    self._id = ++howler._counter;
    return self;
  }
  _errorListener() {
    const self = this;
    self._parent._emit(
      "loaderror",
      self._id,
      self._node.error ? self._node.error.code : 0
    );
    self._node.removeEventListener("error", self._errorFn, false);
  }
  _loadListener() {
    const self = this;
    const parent = self._parent;
    parent._duration = Math.ceil(10 * self._node.duration) / 10;
    if (Object.keys(parent._sprite).length === 0) {
      parent._sprite = { __default: [0, 1e3 * parent._duration] };
    }
    if (parent._state !== "loaded") {
      parent._state = "loaded";
      parent._emit("load");
      parent._loadQueue();
    }
    self._node.removeEventListener(howler._canPlayEvent, self._loadFn, false);
  }
};
function loadBuffer(howl) {
  const src = howl._src;
  if (audioCache[src]) {
    howl._duration = audioCache[src].duration;
    loadBufferAfterDecode(howl);
    return;
  }
  if (/^data:[^;]+;base64,/.test(src)) {
    const binary = atob(src.split(",")[1]);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    decodeAudioData(bytes.buffer, howl);
    return;
  }
  const xhr = new XMLHttpRequest();
  xhr.open("GET", src, true);
  xhr.responseType = "arraybuffer";
  xhr.onload = function() {
    const statusClass = (xhr.status + "")[0];
    if (statusClass !== "0" && statusClass !== "2" && statusClass !== "3") {
      howl._emit(
        "loaderror",
        null,
        "Failed loading audio file with status: " + xhr.status + "."
      );
      return;
    }
    decodeAudioData(xhr.response, howl);
  };
  xhr.onerror = function() {
    if (howl._webAudio) {
      howl._html5 = true;
      howl._webAudio = false;
      howl._sounds = [];
      delete audioCache[src];
      howl.load();
    }
  };
  sendXhr(xhr);
}
function sendXhr(xhr) {
  try {
    xhr.send();
  } catch {
    xhr.onerror(new Event("error"));
  }
}
function decodeAudioData(buffer, howl) {
  howler.ctx.decodeAudioData(
    buffer,
    (decoded) => {
      if (decoded && howl._sounds.length > 0) {
        audioCache[howl._src] = decoded;
        loadBufferAfterDecode(howl, decoded);
      }
    },
    () => {
      howl._emit("loaderror", null, "Decoding audio data failed.");
    }
  );
}
function loadBufferAfterDecode(howl, decoded) {
  if (decoded && !howl._duration) howl._duration = decoded.duration;
  if (Object.keys(howl._sprite).length === 0) {
    howl._sprite = { __default: [0, 1e3 * howl._duration] };
  }
  if (howl._state !== "loaded") {
    howl._state = "loaded";
    howl._emit("load");
    howl._loadQueue();
  }
}
function createAudioContext() {
  try {
    if (typeof AudioContext !== "undefined") {
      howler.ctx = new AudioContext();
    } else if (typeof window.webkitAudioContext !== "undefined") {
      howler.ctx = new window.webkitAudioContext();
    } else {
      howler.usingWebAudio = false;
    }
  } catch {
    howler.usingWebAudio = false;
  }
  const isOldIOS = /iP(hone|od|ad)/.test(
    howler._navigator && howler._navigator.platform || ""
  );
  const versionMatch = howler._navigator && howler._navigator.appVersion.match(/OS (\d+)_(\d+)_?(\d+)?/);
  const version = versionMatch ? parseInt(versionMatch[1], 10) : null;
  if (isOldIOS && version && version < 9) {
    const isSafari = /safari/.test(
      howler._navigator && howler._navigator.userAgent.toLowerCase() || ""
    );
    if (howler._navigator && howler._navigator.standalone && !isSafari || howler._navigator && !howler._navigator.standalone && !isSafari) {
      howler.usingWebAudio = false;
    }
  }
  if (howler.usingWebAudio) {
    howler.masterGain = howler.ctx.createGain === void 0 ? howler.ctx.createGainNode() : howler.ctx.createGain();
    const masterGain = howler.masterGain;
    masterGain.gain.value = howler._muted ? 0 : 1;
    masterGain.connect(howler.ctx.destination);
  }
  howler._setup();
}
var howler = new HowlerGlobal();
var Howler = howler;
var HowlClass = Howl;
var SoundClass = Sound;
if (typeof define === "function" && define.amd) {
  define([], function() {
    return { Howler: howler, Howl };
  });
}
if (typeof window !== "undefined") {
  window.HowlerGlobal = HowlerGlobal;
  window.Howler = howler;
  window.Howl = Howl;
  window.Sound = Sound;
} else if (typeof global !== "undefined") {
  global.HowlerGlobal = HowlerGlobal;
  global.Howler = howler;
  global.Howl = Howl;
  global.Sound = Sound;
}
export {
  Howl,
  HowlClass,
  Howler,
  HowlerGlobal,
  Sound,
  SoundClass,
  howler
};
