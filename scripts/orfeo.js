/* =====================================================================
 * Orfeo — a generative ambient installation.
 *
 * Light blooms open and settle across a quiet field while tuned bowls,
 * chimes and a slow drone weave a soundscape. Everything is synthesised
 * in the browser; there are no samples and no dependencies.
 *
 * Layout of this file
 *   0. helpers
 *   1. theme
 *   2. canvas + sprite cache
 *   3. audio engine
 *   4. visual world
 *   5. main loop
 *   6. interaction + interface
 * ===================================================================== */

(() => {
  "use strict";

  /* ------------------------------------------------------------------ */
  /* 0. helpers                                                         */
  /* ------------------------------------------------------------------ */

  const TAU = Math.PI * 2;
  const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
  const lerp = (a, b, t) => a + (b - a) * t;
  const rand = (lo, hi) => lo + Math.random() * (hi - lo);
  const randInt = (lo, hi) => Math.floor(rand(lo, hi + 1));
  const pick = (list) => list[(Math.random() * list.length) | 0];
  const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

  const ENV = {
    reduced: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    coarse: window.matchMedia("(pointer: coarse)").matches,
  };

  /** Motion scale — a gentle but real acknowledgement of the media query. */
  const MOTION = ENV.reduced ? 0.3 : 1;
  /** Device pixel ratio, capped so retina phones do not melt. */
  const DPR_CAP = ENV.coarse ? 1.5 : 2;

  /* ------------------------------------------------------------------ */
  /* 1. theme                                                           */
  /* ------------------------------------------------------------------ */

  const theme = {
    name: "dark",
    bg: "#0c0f17",
    bgTop: "#0c0f17",
    bgBottom: "#191430",
    blend: "lighter",
    glow: 1,
    vignette: "rgba(0, 0, 0, 0.34)",
  };

  const THEMES = {
    dark: {
      name: "dark",
      bg: "#0c0f17",
      bgTop: "#0c0f17",
      bgBottom: "#191430",
      blend: "lighter",
      glow: 1,
      vignette: "rgba(0, 0, 0, 0.34)",
    },
    light: {
      name: "light",
      bg: "#f3efe7",
      bgTop: "#f6f3ec",
      bgBottom: "#e7e0d4",
      blend: "source-over",
      glow: 0.62,
      vignette: "rgba(96, 74, 52, 0.16)",
    },
  };

  function applyTheme(name) {
    theme.name = name;
    Object.assign(theme, THEMES[name] || THEMES.dark);
    document.documentElement.setAttribute("data-theme", name);
    // Keep the browser chrome in sync when the toggle disagrees with the
    // OS preference; collapse the pair of media-qualified tags into one.
    const metas = document.querySelectorAll('meta[name="theme-color"]');
    metas.forEach((m, i) => {
      if (i === 0) {
        m.removeAttribute("media");
        m.setAttribute("content", theme.bg);
      } else m.remove();
    });
    // Edge colours are theme-dependent, so refresh the cached strings on
    // everything still alive. (world is always initialised by the time
    // this can run: first call is initTheme() inside boot().)
    for (const b of world.blooms) b.edge = bloomEdge(b.hue);
    for (const s of world.sparkles) s.stroke = sparkleStroke(s.hue);
    buildBackdrop();
    start(); // the backdrop is cached, so the canvas needs a repaint
  }

  /* ------------------------------------------------------------------ */
  /* 2. canvas + sprite cache                                           */
  /* ------------------------------------------------------------------ */

  const canvas = document.getElementById("orfeo-canvas");
  const g = canvas ? canvas.getContext("2d", { alpha: false }) : null;

  const view = { w: 0, h: 0, dpr: 1 };
  let backdrop = null; // cached background gradient
  let vignette = null; // cached vignette gradient

  const SPRITE_SIZE = 160;
  const SPRITE_R = SPRITE_SIZE / 2;
  const HUE_BUCKETS = 24;
  const RING_BAND = 0.85; // where the ring sprite peaks, as a fraction of its radius

  const dotSprites = [];
  const ringSprites = [];
  // A desaturated set for atmosphere: mist reads as light in fog, whereas a
  // fully saturated sprite scaled this large reads as a coloured disc.
  const mistSprites = [];
  const spriteFor = (hue) => {
    const m = Math.round(hue / (360 / HUE_BUCKETS)) % HUE_BUCKETS;
    return m < 0 ? m + HUE_BUCKETS : m;
  };

  function makeCanvas() {
    const c = document.createElement("canvas");
    c.width = c.height = SPRITE_SIZE;
    return c;
  }

  /** A soft glowing dot: the workhorse used for motes, cores and orbiters. */
  function makeDotSprite(hue) {
    const c = makeCanvas();
    const x = c.getContext("2d");
    const grad = x.createRadialGradient(
      SPRITE_R,
      SPRITE_R,
      0,
      SPRITE_R,
      SPRITE_R,
      SPRITE_R
    );
    grad.addColorStop(0, `hsla(${hue}, 95%, 86%, 1)`);
    grad.addColorStop(0.16, `hsla(${hue}, 92%, 70%, 0.72)`);
    grad.addColorStop(0.42, `hsla(${hue}, 88%, 58%, 0.22)`);
    grad.addColorStop(0.72, `hsla(${hue}, 85%, 52%, 0.05)`);
    grad.addColorStop(1, `hsla(${hue}, 85%, 50%, 0)`);
    x.fillStyle = grad;
    x.fillRect(0, 0, SPRITE_SIZE, SPRITE_SIZE);
    return c;
  }

  function makeMistSprite(hue) {
    const c = makeCanvas();
    const x = c.getContext("2d");
    const grad = x.createRadialGradient(
      SPRITE_R,
      SPRITE_R,
      0,
      SPRITE_R,
      SPRITE_R,
      SPRITE_R
    );
    // A long, almost linear tail: scaled this large, a tight falloff reads as
    // the edge of a disc, while a slow one reads as haze.
    grad.addColorStop(0, `hsla(${hue}, 42%, 82%, 0.92)`);
    grad.addColorStop(0.22, `hsla(${hue}, 44%, 74%, 0.46)`);
    grad.addColorStop(0.5, `hsla(${hue}, 48%, 64%, 0.2)`);
    grad.addColorStop(0.75, `hsla(${hue}, 50%, 58%, 0.09)`);
    grad.addColorStop(0.92, `hsla(${hue}, 52%, 55%, 0.025)`);
    grad.addColorStop(1, `hsla(${hue}, 52%, 55%, 0)`);
    x.fillStyle = grad;
    x.fillRect(0, 0, SPRITE_SIZE, SPRITE_SIZE);
    return c;
  }

  /** A soft ring with a hollow centre, for the outline glow of a bloom. */
  function makeRingSprite(hue) {
    const c = makeCanvas();
    const x = c.getContext("2d");
    const grad = x.createRadialGradient(
      SPRITE_R,
      SPRITE_R,
      0,
      SPRITE_R,
      SPRITE_R,
      SPRITE_R
    );
    grad.addColorStop(0, `hsla(${hue}, 90%, 60%, 0)`);
    grad.addColorStop(0.66, `hsla(${hue}, 90%, 60%, 0)`);
    grad.addColorStop(0.78, `hsla(${hue}, 92%, 62%, 0.1)`);
    grad.addColorStop(RING_BAND, `hsla(${hue}, 95%, 76%, 0.62)`);
    grad.addColorStop(0.92, `hsla(${hue}, 92%, 62%, 0.14)`);
    grad.addColorStop(1, `hsla(${hue}, 90%, 60%, 0)`);
    x.fillStyle = grad;
    x.fillRect(0, 0, SPRITE_SIZE, SPRITE_SIZE);
    return c;
  }

  function buildSprites() {
    if (dotSprites.length) return;
    for (let i = 0; i < HUE_BUCKETS; i++) {
      const hue = (i * 360) / HUE_BUCKETS;
      dotSprites.push(makeDotSprite(hue));
      ringSprites.push(makeRingSprite(hue));
      mistSprites.push(makeMistSprite(hue));
    }
  }

  function drawSprite(sprite, x, y, radius, alpha) {
    if (alpha <= 0.004 || radius <= 0.1) return;
    g.globalAlpha = clamp(alpha, 0, 1);
    const d = radius * 2;
    g.drawImage(sprite, x - radius, y - radius, d, d);
  }

  /** Draw a soft glowing dot at (x, y) with the given radius. */
  const glow = (hue, x, y, radius, alpha) =>
    drawSprite(dotSprites[spriteFor(hue)], x, y, radius, alpha * theme.glow);

  /** The same, in the desaturated family, for atmosphere. */
  const mist = (hue, x, y, radius, alpha) =>
    drawSprite(mistSprites[spriteFor(hue)], x, y, radius, alpha * theme.glow);

  /**
   * Edge colours are built once per hue and cached on the bloom/sparkle.
   * Formatting `hsl()` strings and re-parsing them for hundreds of live
   * particles every frame was pure garbage-collector churn.
   */
  const sparkleStroke = (hue) =>
    `hsl(${hue}, 95%, ${theme.name === "dark" ? 76 : 58}%)`;
  const bloomEdge = (hue) =>
    `hsl(${hue}, 92%, ${theme.name === "dark" ? 80 : 42}%)`;

  function resize() {
    if (!canvas) return;
    view.dpr = Math.min(window.devicePixelRatio || 1, DPR_CAP);
    view.w = window.innerWidth;
    view.h = window.innerHeight;
    canvas.width = Math.round(view.w * view.dpr);
    canvas.height = Math.round(view.h * view.dpr);
    canvas.style.width = view.w + "px";
    canvas.style.height = view.h + "px";
    g.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
    g.imageSmoothingQuality = "high";
    buildBackdrop();
    seedWorld();
    start();
  }

  function buildBackdrop() {
    if (!g || !view.w || !view.h) return;
    const grad = g.createLinearGradient(0, 0, view.w * 0.25, view.h);
    grad.addColorStop(0, theme.bgTop);
    grad.addColorStop(1, theme.bgBottom);
    backdrop = grad;

    const v = g.createRadialGradient(
      view.w / 2,
      view.h / 2,
      Math.min(view.w, view.h) * 0.18,
      view.w / 2,
      view.h / 2,
      Math.max(view.w, view.h) * 0.78
    );
    v.addColorStop(0, "rgba(0,0,0,0)");
    v.addColorStop(1, theme.vignette);
    vignette = v;
  }

  /* ------------------------------------------------------------------ */
  /* 3. audio engine                                                    */
  /* ------------------------------------------------------------------ */

  /**
   * The whole piece sits in D minor pentatonic, so any two notes that
   * overlap are consonant no matter when or how often they are struck.
   */
  const MIDI = {
    D2: 38,
    A2: 45,
    Bb1: 34,
    F2: 41,
    C2: 36,
    G2: 43,
    C3: 48,
    D3: 50,
    E3: 52,
    F3: 53,
    G3: 55,
    A3: 57,
    Bb3: 58,
    C4: 60,
    D4: 62,
    E4: 64,
  };
  const midiToFreq = (m) => 440 * Math.pow(2, (m - 69) / 12);

  /** D3 → C6, pentatonic. Larger blooms take the lower, rounder notes. */
  const MELODY = [50, 53, 55, 57, 60, 62, 65, 67, 69, 72, 74, 77, 79, 81, 84].map(
    midiToFreq
  );

  /** Slow modal drift: Dm → Bb → F → C → Gm. */
  const CHORDS = [
    [MIDI.D2, MIDI.A2, MIDI.F3], // Dm
    [MIDI.Bb1, MIDI.F2, MIDI.D3], // Bb
    [MIDI.F2, MIDI.C3, MIDI.A3], // F
    [MIDI.C2, MIDI.G2, MIDI.E3], // C
    [MIDI.G2, MIDI.D3, MIDI.Bb3], // Gm
  ].map((chord) => chord.map(midiToFreq));

  /** Inharmonic partial series — these are what make bells sound like bells. */
  const PARTIALS = {
    bowl: [
      [1.0, 1.0],
      [2.0, 0.4],
      [2.76, 0.2],
      [4.07, 0.1],
      [5.43, 0.05],
    ],
    bell: [
      [1.0, 1.0],
      [2.76, 0.5],
      [5.4, 0.24],
      [8.93, 0.1],
      [13.34, 0.04],
    ],
    chime: [
      [1.0, 1.0],
      [2.01, 0.32],
      [3.01, 0.14],
      [4.2, 0.06],
    ],
    gong: [
      [1.0, 1.0],
      [1.41, 0.48],
      [1.93, 0.3],
      [2.33, 0.18],
      [3.17, 0.08],
    ],
  };

  const audio = {
    ctx: null,
    ready: false,
    on: false,
    running: false,
    master: null,
    reverbIn: null,
    analyser: null,
    freqData: null,
    noise: null,
    pads: [],
    activePad: 0,
  };

  /**
   * resume() is asynchronous, so a note asked for in the same tick as the
   * first gesture would otherwise be dropped. Anything that plays a note
   * checks this instead of trusting ctx.state directly.
   */
  function playing() {
    // Never coax the context awake for a hidden tab: background drones
    // are the surprise nobody wants.
    if (document.hidden) return false;
    if (!audio.ready || !audio.on || !audio.ctx) return false;
    if (audio.ctx.state === "running") return true;
    if (audio.ctx.state === "suspended") audio.ctx.resume();
    return false;
  }

  /** Level meters, smoothed, used to nudge the visuals. */
  const levels = { all: 0, low: 0, high: 0 };

  /**
   * A decaying noise burst makes a believable room. The one-pole filter
   * darkens the tail, which is what stops cheap reverb sounding metallic.
   */
  function makeImpulse(ctx, seconds, decay) {
    const rate = ctx.sampleRate;
    const length = Math.floor(rate * seconds);
    const buffer = ctx.createBuffer(2, length, rate);
    // One decay envelope shared by both channels: identical output for
    // half the Math.pow calls on the gesture-critical path.
    const env = new Float32Array(length);
    for (let i = 0; i < length; i++) env[i] = Math.pow(1 - i / length, decay);
    for (let ch = 0; ch < 2; ch++) {
      const data = buffer.getChannelData(ch);
      let last = 0;
      for (let i = 0; i < length; i++) {
        last += 0.3 * (Math.random() * 2 - 1 - last);
        data[i] = last * env[i];
      }
    }
    return buffer;
  }

  function makeNoiseBuffer(ctx) {
    const length = Math.floor(ctx.sampleRate * 0.5);
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
    return buffer;
  }

  const MASTER_LEVEL = 0.72;

  function buildAudioGraph() {
    const ctx = audio.ctx;

    const master = ctx.createGain();
    master.gain.value = 0.0001;

    // Gentle tone shaping: no rumble below 30 Hz, no fizz above 8 kHz.
    const rumble = ctx.createBiquadFilter();
    rumble.type = "highpass";
    rumble.frequency.value = 30;
    rumble.Q.value = 0.5;

    const air = ctx.createBiquadFilter();
    air.type = "highshelf";
    air.frequency.value = 7600;
    air.gain.value = -4;

    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -6;
    limiter.knee.value = 0;
    limiter.ratio.value = 20;
    limiter.attack.value = 0.004;
    limiter.release.value = 0.22;

    const analyser = ctx.createAnalyser();
    analyser.fftSize = 1024;
    analyser.smoothingTimeConstant = 0.86;

    master.connect(rumble);
    rumble.connect(air);
    air.connect(limiter);
    limiter.connect(analyser);
    analyser.connect(ctx.destination);

    // Shared reverb: one convolver for every voice, fed by a send bus.
    const reverbIn = ctx.createGain();
    reverbIn.gain.value = 1;
    const reverbTone = ctx.createBiquadFilter();
    reverbTone.type = "lowpass";
    reverbTone.frequency.value = 5200;
    const convolver = ctx.createConvolver();
    convolver.normalize = true;
    convolver.buffer = makeImpulse(ctx, 4.5, 2.4);
    const reverbOut = ctx.createGain();
    reverbOut.gain.value = 0.9;

    reverbIn.connect(reverbTone);
    reverbTone.connect(convolver);
    convolver.connect(reverbOut);
    reverbOut.connect(master);

    audio.master = master;
    audio.reverbIn = reverbIn;
    audio.analyser = analyser;
    audio.freqData = new Uint8Array(analyser.frequencyBinCount);
    audio.noise = makeNoiseBuffer(ctx);
  }

  /**
   * One struck note. Additive partials with per-partial decay, a short
   * noise transient on the harder profiles, and a dry/wet split into the
   * shared reverb.
   */
  function strike(freq, opts = {}) {
    if (!playing()) return;
    const ctx = audio.ctx;

    const partials = PARTIALS[opts.profile] || PARTIALS.bowl;
    const dur = opts.dur || 5;
    const amp = opts.gain == null ? 0.3 : opts.gain;
    const t0 = ctx.currentTime + 0.012;

    const sum = ctx.createGain();
    const panner = ctx.createStereoPanner();
    panner.pan.value = opts.pan == null ? rand(-0.45, 0.45) : opts.pan;

    const dry = ctx.createGain();
    dry.gain.value = opts.dry == null ? 0.72 : opts.dry;
    const wet = ctx.createGain();
    wet.gain.value = opts.wet == null ? 0.5 : opts.wet;

    sum.connect(panner);
    panner.connect(dry);
    dry.connect(audio.master);
    panner.connect(wet);
    wet.connect(audio.reverbIn);

    const voiceDetune = rand(-5, 5);
    let longest = 0;
    for (const [ratio, weight] of partials) {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.value = freq * ratio;
      osc.detune.value = voiceDetune + rand(-3, 3);

      const env = ctx.createGain();
      const peak = weight * amp;
      const attack = (opts.attack == null ? 0.006 : opts.attack) + ratio * 0.002;
      // Higher partials die away first, as they do on real metal.
      const decay = dur * Math.pow(ratio, -0.6);

      env.gain.setValueAtTime(0.0001, t0);
      env.gain.linearRampToValueAtTime(peak, t0 + attack);
      env.gain.exponentialRampToValueAtTime(0.0001, t0 + attack + decay);

      osc.connect(env);
      env.connect(sum);
      osc.start(t0);
      osc.stop(t0 + attack + decay + 0.05);
      longest = Math.max(longest, attack + decay);
    }

    // The oscillators stop themselves, but the gain scaffolding they hang
    // from stays wired to the master bus until released. Let go of the
    // whole voice once its tail has died so a long session cannot pile up
    // garbage nodes.
    setTimeout(() => {
      try {
        sum.disconnect();
        dry.disconnect();
        wet.disconnect();
        panner.disconnect();
      } catch (err) {
        /* already collected */
      }
    }, Math.max(0, (t0 - ctx.currentTime + longest + 0.3) * 1000 + 150));

    // The strike itself: a whisper of filtered noise at the onset.
    if (opts.profile === "bell" || opts.profile === "gong") {
      const src = ctx.createBufferSource();
      src.buffer = audio.noise;
      const band = ctx.createBiquadFilter();
      band.type = "bandpass";
      band.frequency.value = clamp(freq * 3, 200, 6000);
      band.Q.value = 1.2;
      const env = ctx.createGain();
      env.gain.setValueAtTime(0.0001, t0);
      env.gain.linearRampToValueAtTime(amp * 0.12, t0 + 0.004);
      env.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.16);
      src.connect(band);
      band.connect(env);
      env.connect(sum);
      src.start(t0, rand(0, 0.2), 0.25);
    }
  }

  /** A bowl note for a bloom: big circles ring low, small ones sparkle high. */
  function playBloom(size, x) {
    if (!playing()) return;
    const t = clamp((size - 30) / 320, 0, 1);
    const index = Math.round((1 - t) * (MELODY.length - 1));
    const freq = MELODY[clamp(index + randInt(-1, 1), 0, MELODY.length - 1)];
    const profile = size > 220 ? "bowl" : size > 110 ? "bell" : "chime";
    strike(freq, {
      profile,
      dur: lerp(3.2, 7.5, t),
      gain: lerp(0.18, 0.34, t),
      pan: clamp((x / view.w) * 1.4 - 0.7, -0.8, 0.8),
    });
  }

  /* --- the drone ---------------------------------------------------- */

  function makePadVoice() {
    const ctx = audio.ctx;
    const xf = ctx.createGain(); // crossfade level
    xf.gain.value = 0.0001;
    const breath = ctx.createGain(); // slow tremolo, never reaches zero
    breath.gain.value = 1;
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 420;
    filter.Q.value = 0.35;

    filter.connect(xf);
    xf.connect(breath);
    breath.connect(audio.master);
    const send = ctx.createGain();
    send.gain.value = 0.55;
    breath.connect(send);
    send.connect(audio.reverbIn);

    const oscs = [];
    for (let i = 0; i < 3; i++) {
      const osc = ctx.createOscillator();
      osc.type = i === 2 ? "sine" : "triangle";
      osc.frequency.value = 110;
      osc.detune.value = (i - 1) * 7 + rand(-3, 3);
      const pan = ctx.createStereoPanner();
      pan.pan.value = (i - 1) * 0.45;
      osc.connect(pan);
      pan.connect(filter);
      osc.start();
      oscs.push(osc);
    }

    // A sub an octave below the root gives the drone its weight.
    const sub = ctx.createOscillator();
    sub.type = "sine";
    sub.frequency.value = 55;
    const subGain = ctx.createGain();
    subGain.gain.value = 0.5;
    sub.connect(subGain);
    subGain.connect(filter);
    sub.start();

    // Two very slow modulators: one opens the filter, one breathes.
    const filterLfo = ctx.createOscillator();
    filterLfo.type = "sine";
    filterLfo.frequency.value = rand(0.03, 0.07);
    const filterDepth = ctx.createGain();
    filterDepth.gain.value = 200;
    filterLfo.connect(filterDepth);
    filterDepth.connect(filter.frequency);
    filterLfo.start();

    const breathLfo = ctx.createOscillator();
    breathLfo.type = "sine";
    breathLfo.frequency.value = rand(0.02, 0.05);
    const breathDepth = ctx.createGain();
    breathDepth.gain.value = 0.22;
    breathLfo.connect(breathDepth);
    breathDepth.connect(breath.gain);
    breathLfo.start();

    return { oscs, sub, filter, xf, send };
  }

  const PAD_LEVEL = 0.05;
  let padTimer = 0;
  let padIndex = 0;

  function setPadChord(voice, chord) {
    const now = audio.ctx.currentTime;
    voice.oscs.forEach((osc, i) => {
      osc.frequency.setTargetAtTime(chord[i], now, 2.5);
    });
    voice.sub.frequency.setTargetAtTime(chord[0] / 2, now, 3.5);
    voice.filter.frequency.setTargetAtTime(
      320 + chord[0] * 1.6,
      now,
      4
    );
  }

  function buildPads() {
    const a = makePadVoice();
    const b = makePadVoice();
    setPadChord(a, CHORDS[0]);
    setPadChord(b, CHORDS[1]);
    a.xf.gain.setTargetAtTime(PAD_LEVEL, audio.ctx.currentTime, 3);
    audio.pads = [a, b];
    audio.activePad = 0;
    padIndex = 1;
    padTimer = rand(26, 40);

    // Kick the whole engine up from silence.
    audio.master.gain.setTargetAtTime(MASTER_LEVEL, audio.ctx.currentTime, 1.6);
  }

  function advancePad(dt) {
    if (!audio.pads.length) return;
    padTimer -= dt;
    if (padTimer > 0) return;
    padTimer = rand(26, 42);

    padIndex = (padIndex + 1) % CHORDS.length;
    const now = audio.ctx.currentTime;
    const next = audio.pads[1 - audio.activePad];
    const current = audio.pads[audio.activePad];
    setPadChord(next, CHORDS[padIndex]);
    next.xf.gain.cancelScheduledValues(now);
    next.xf.gain.setValueAtTime(Math.max(next.xf.gain.value, 0.0001), now);
    next.xf.gain.linearRampToValueAtTime(PAD_LEVEL, now + 7);
    current.xf.gain.cancelScheduledValues(now);
    current.xf.gain.setValueAtTime(Math.max(current.xf.gain.value, 0.0001), now);
    current.xf.gain.linearRampToValueAtTime(0.0001, now + 7);
    audio.activePad = 1 - audio.activePad;
  }

  /* --- the drifting chimes ------------------------------------------ */

  let chimeTimer = 0;

  function scheduleChime() {
    // Recursive timeouts rather than an interval: the spacing stays irregular.
    chimeTimer = rand(2.6, 8.5);
  }

  function playDriftingChime() {
    const freq = MELODY[randInt(6, MELODY.length - 1)];
    strike(freq, {
      profile: Math.random() < 0.75 ? "chime" : "bell",
      dur: rand(4, 8),
      gain: 0.13,
      attack: 0.01,
    });
    // Occasionally answer it a fifth below, like a distant echo.
    if (Math.random() < 0.25) {
      setTimeout(() => {
        strike(freq / 1.5, {
          profile: "bowl",
          dur: rand(5, 9),
          gain: 0.11,
        });
      }, rand(900, 2600));
    }
  }

  function advanceChimes(dt) {
    chimeTimer -= dt;
    if (chimeTimer > 0) return;
    scheduleChime();
    if (playing()) playDriftingChime();
  }

  let levelTick = 0;
  function updateLevels() {
    if (!audio.analyser) return;
    // The analyser read plus a 512-bin average every frame is the hottest
    // non-drawing work in the loop. Levels move slowly, so ~20 Hz is
    // plenty and the smoothing below hides the steps.
    levelTick = (levelTick + 1) % 3;
    if (levelTick !== 0) return;
    const data = audio.freqData;
    audio.analyser.getByteFrequencyData(data);
    const n = data.length;
    const lowEnd = Math.max(1, Math.floor(n * 0.06));
    const highStart = Math.floor(n * 0.5);
    let all = 0;
    let low = 0;
    let high = 0;
    for (let i = 0; i < n; i++) all += data[i];
    for (let i = 0; i < lowEnd; i++) low += data[i];
    for (let i = highStart; i < n; i++) high += data[i];
    low /= lowEnd * 255;
    high /= (n - highStart) * 255;
    all /= n * 255;
    levels.all = lerp(levels.all, all, 0.14);
    levels.low = lerp(levels.low, low, 0.1);
    levels.high = lerp(levels.high, high, 0.2);
  }

  /* --- start / stop -------------------------------------------------- */

  function initAudio() {
    if (audio.ctx) {
      if (audio.ctx.state === "suspended") audio.ctx.resume();
      return true;
    }
    try {
      const Ctor = window.AudioContext || window.webkitAudioContext;
      if (!Ctor) return false;
      audio.ctx = new Ctor({ latencyHint: "interactive" });
      buildAudioGraph();
      buildPads();
      audio.ready = true;
      audio.on = true;
      audio.running = audio.ctx.state === "running";
      return true;
    } catch (err) {
      console.warn("Orfeo: audio unavailable —", err);
      return false;
    }
  }

  function setSound(on) {
    if (on) {
      if (initAudio()) {
        audio.on = true;
        audio.ctx.resume().then(() => {
          audio.running = true;
        });
        audio.master.gain.cancelScheduledValues(audio.ctx.currentTime);
        audio.master.gain.setTargetAtTime(
          MASTER_LEVEL,
          audio.ctx.currentTime,
          0.5
        );
      }
    } else if (audio.ctx) {
      audio.on = false;
      audio.running = false;
      audio.master.gain.cancelScheduledValues(audio.ctx.currentTime);
      audio.master.gain.setTargetAtTime(0.0001, audio.ctx.currentTime, 0.25);
      setTimeout(() => {
        if (!audio.on && audio.ctx && audio.ctx.state === "running") {
          audio.ctx.suspend();
        }
      }, 900);
    }
    syncSoundButton();
  }

  /* ------------------------------------------------------------------ */
  /* 4. visual world                                                    */
  /* ------------------------------------------------------------------ */

  /** Weighted warm temple palette, with a few cool counterpoints. */
  const PALETTE = [
    { hue: 44, weight: 3 }, // saffron
    { hue: 34, weight: 3 }, // gold
    { hue: 24, weight: 2 }, // amber
    { hue: 14, weight: 1.5 }, // terracotta
    { hue: 2, weight: 1 }, // ember
    { hue: 300, weight: 0.7 }, // mauve
    { hue: 272, weight: 0.7 }, // royal purple
    { hue: 238, weight: 0.8 }, // indigo
    { hue: 205, weight: 1 }, // deep water
    { hue: 178, weight: 0.8 }, // teal
    { hue: 150, weight: 0.7 }, // jade
  ];
  function pickHue() {
    let total = 0;
    for (let i = 0; i < PALETTE.length; i++) {
      total += PALETTE[i].weight * seasonWeight(i);
    }
    let r = Math.random() * total;
    for (let i = 0; i < PALETTE.length; i++) {
      r -= PALETTE[i].weight * seasonWeight(i);
      if (r <= 0) return PALETTE[i].hue + rand(-7, 7);
    }
    return PALETTE[0].hue;
  }

  /**
   * Seasons: a slow drift of the colour of the air itself. Each season
   * reweights the bloom palette, retints the aurora and shifts the whole
   * field by a few degrees of hue. A full cycle takes many minutes; the
   * shift eases over ~20 s so there is never a visible cut. Newborn
   * blooms and sparkles follow through their birth weights within seconds,
   * while the long-lived aurora and motes are shifted live at draw time.
   * `?season=autumn` locks one in place — handy for sharing a mood.
   */
  const SEASONS = [
    {
      name: "spring",
      shift: -16,
      weights: [2.2, 2.4, 1.6, 1.0, 0.7, 0.9, 0.8, 0.9, 1.2, 1.6, 2.2],
      aurora: [196, 205, 150, 232],
      anchor: 40,
    },
    {
      name: "summer",
      shift: 6,
      weights: [3.6, 3.4, 2.6, 1.6, 1.0, 0.6, 0.5, 0.7, 1.0, 0.8, 0.7],
      aurora: [212, 232, 196, 252],
      anchor: 44,
    },
    {
      name: "autumn",
      shift: 14,
      weights: [2.6, 3.0, 2.6, 2.6, 2.2, 1.2, 0.7, 0.6, 0.7, 0.6, 0.6],
      aurora: [232, 276, 300, 212],
      anchor: 32,
    },
    {
      name: "winter",
      shift: -28,
      weights: [1.6, 1.8, 1.4, 1.0, 0.8, 1.0, 1.6, 2.0, 1.6, 1.0, 0.8],
      aurora: [232, 252, 212, 276],
      anchor: 36,
    },
  ];
  const season = {
    cur: 1, // open in high summer
    next: 2,
    blend: 0, // 0 = fully cur, 1 = fully next
    timer: rand(90, 150),
    shift: 6,
    shiftTarget: 6,
    locked: false,
  };

  const seasonWeight = (i) =>
    lerp(
      SEASONS[season.cur].weights[i],
      SEASONS[season.next].weights[i],
      season.blend
    );

  function initSeason() {
    try {
      const param = (window.location && window.location.search) || "";
      const want = new URLSearchParams(param).get("season");
      const idx = SEASONS.findIndex((s) => s.name === want);
      if (idx >= 0) {
        season.cur = season.next = idx;
        season.blend = 0;
        season.shift = season.shiftTarget = SEASONS[idx].shift;
        season.locked = true;
      }
    } catch (err) {
      /* a locked season is a nicety, not a requirement */
    }
  }

  function advanceSeason(dt) {
    // The global shift always eases toward its target, so even a season
    // change lands as weather, not a cut.
    season.shift +=
      (season.shiftTarget - season.shift) * Math.min(1, dt * 0.05);
    if (season.locked || ENV.reduced) return;
    if (season.blend <= 0) {
      season.timer -= dt;
      if (season.timer <= 0) {
        season.blend = 0.0001;
        season.shiftTarget = SEASONS[season.next].shift;
      }
    } else {
      season.blend = Math.min(1, season.blend + dt / 30);
      if (season.blend >= 1) {
        season.cur = season.next;
        season.next = (season.next + 1) % SEASONS.length;
        season.blend = 0;
        season.timer = rand(90, 150);
      }
    }
  }

  const world = {
    blooms: [],
    sparkles: [],
    motes: [],
    aurora: [],
    spawnTimer: 0,
  };

  function spawnAurora() {
    world.aurora = [];
    const count = ENV.coarse ? 3 : 4;
    for (let i = 0; i < count; i++) {
      world.aurora.push({
        // The last blob is the warm one that anchors the palette.
        // Aurorae born mid-transition take after either season, weighted
        // by the blend, so a changeover never arrives all at once.
        hue: (() => {
          const s =
            Math.random() < season.blend
              ? SEASONS[season.next]
              : SEASONS[season.cur];
          return (
            (i === count - 1 ? s.anchor : pick(s.aurora)) + rand(-8, 8)
          );
        })(),
        // Most centres sit off-frame, so what lands on screen is the soft
        // shoulder of the gradient rather than a visible disc.
        x: rand(-0.25, 1.25),
        y: rand(-0.3, 1.3),
        r: rand(0.5, 0.95) * Math.max(view.w, view.h) * 1.35,
        drift: rand(0.05, 0.16) * Math.min(view.w, view.h),
        speed: rand(0.02, 0.06) * (Math.random() < 0.5 ? -1 : 1),
        phase: rand(0, TAU),
        alpha: rand(0.06, 0.12),
      });
    }
  }

  function spawnMotes() {
    world.motes = [];
    const area = view.w * view.h;
    const count = Math.round(clamp(area / 18000, 24, ENV.coarse ? 55 : 120));
    for (let i = 0; i < count; i++) {
      const depth = Math.random(); // 0 = far and soft, 1 = near and bright
      world.motes.push({
        x: rand(0, view.w),
        y: rand(0, view.h),
        depth,
        hue: pickHue(),
        r: lerp(28, 2.2, depth) * rand(0.7, 1.4),
        vx: rand(-6, 6) * (1 - depth * 0.7),
        vy: rand(-14, -3) * (1 - depth * 0.6),
        alpha: lerp(0.06, 0.6, depth) * rand(0.6, 1.3),
        twinkle: rand(0, TAU),
        twinkleSpeed: rand(0.3, 1.1),
      });
    }
  }

  function seedWorld() {
    spawnAurora();
    spawnMotes();
  }

  function spawnBloom(opts = {}) {
    if (!g) return;
    const size = opts.size == null ? rand(40, ENV.coarse ? 220 : 340) : opts.size;
    const maxR = size / 2;
    const rise = opts.rise == null ? lerp(0.7, 2.2, Math.random()) : opts.rise;
    const bloom = {
      x:
        opts.x == null
          ? rand(maxR * 0.4, Math.max(maxR * 0.4 + 1, view.w - maxR * 0.4))
          : opts.x,
      y:
        opts.y == null
          ? rand(maxR * 0.4, Math.max(maxR * 0.4 + 1, view.h - maxR * 0.4))
          : opts.y,
      // Short-lived light lands already tinted. (Motes and aurorae are
      // long-lived, so they are shifted live at draw time instead.)
      hue: opts.hue == null ? pickHue() + season.shift : opts.hue,
      maxR,
      r: 0,
      age: 0,
      rise,
      hold: rand(0.5, 1.8),
      fall: rand(1.6, 3.4),
      rot: rand(0, TAU),
      spin: rand(-0.25, 0.25) * MOTION,
      // A few blooms carry a mandala of ticks; most stay plain.
      ticks: Math.random() < 0.45 ? pick([6, 8, 12, 18, 24]) : 0,
      orbiters: randInt(0, 6),
      emissive: Math.random() < 0.6,
      emitted: 0,
      alpha: opts.alpha == null ? rand(0.55, 1) : opts.alpha,
      interaction: !!opts.interaction,
      edge: "",
    };
    bloom.edge = bloomEdge(bloom.hue);
    world.blooms.push(bloom);
    if (world.blooms.length > 40) world.blooms.shift();
    if (!opts.silent) playBloom(size, bloom.x);
    start();
    return bloom;
  }

  function pushSparkle(s) {
    s.stroke = sparkleStroke(s.hue);
    world.sparkles.push(s);
    if (world.sparkles.length > 900) world.sparkles.shift();
  }

  function emitSparkle(bloom) {
    const angle = rand(0, TAU);
    const speed = rand(8, 46) * MOTION * (0.5 + (bloom.r / Math.max(1, bloom.maxR)) * 0.8);
    pushSparkle({
      x: bloom.x + Math.cos(angle) * bloom.r * rand(0.85, 1.02),
      y: bloom.y + Math.sin(angle) * bloom.r * rand(0.85, 1.02),
      px: 0,
      py: 0,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - rand(4, 16) * MOTION,
      hue: bloom.hue + rand(-10, 10),
      r: rand(1.6, 5.5),
      life: 0,
      ttl: rand(1.2, 3.4),
      alpha: rand(0.4, 0.95),
    });
  }

  function emitSoundRipple(x, y) {
    // Two quiet rings trail a click. Silent, so each bloom answers once.
    for (let i = 0; i < 2; i++) {
      setTimeout(() => {
        spawnBloom({
          x,
          y,
          size: rand(90, 260),
          rise: 0.9,
          alpha: 0.45,
          interaction: true,
          silent: true,
        });
      }, i * 280);
    }
  }

  /* ------------------------------------------------------------------ */
  /* 5. main loop                                                       */
  /* ------------------------------------------------------------------ */

  let running = false;
  let rafId = 0;
  let lastT = 0;
  let time = 0;

  function update(dt) {
    const energy = Math.max(levels.all * 1.8, 0.08);

    for (const a of world.aurora) a.phase += dt * a.speed * MOTION;
    advanceSeason(dt);

    for (const m of world.motes) {
      m.x += m.vx * dt * MOTION * (1 + energy);
      m.y += m.vy * dt * MOTION * (1 + energy);
      m.twinkle += dt * m.twinkleSpeed;
      if (m.y < -60) {
        m.y = view.h + 40;
        m.x = rand(0, view.w);
      }
      if (m.x < -60) m.x = view.w + 40;
      if (m.x > view.w + 60) m.x = -40;
    }

    for (let i = world.blooms.length - 1; i >= 0; i--) {
      const b = world.blooms[i];
      b.age += dt;
      b.rot += b.spin * dt;
      const total = b.rise + b.hold + b.fall;
      if (b.age >= total) {
        world.blooms.splice(i, 1);
        continue;
      }
      const grow = b.age < b.rise ? easeOutCubic(b.age / b.rise) : 1;
      // After opening, the ring keeps creeping outward — never still.
      const creep = b.age < b.rise ? 0 : (b.age - b.rise) * 0.05 * MOTION;
      b.r = b.maxR * grow + creep * b.maxR;
      if (b.age < b.rise) b.alphaNow = b.age / b.rise;
      else if (b.age < b.rise + b.hold) b.alphaNow = 1;
      else b.alphaNow = 1 - (b.age - b.rise - b.hold) / b.fall;

      if (b.emissive && !ENV.reduced) {
        const want = Math.min(14, b.r / 9);
        while (b.emitted < want && world.sparkles.length < 900) {
          b.emitted += 1;
          emitSparkle(b);
        }
      }
    }

    // In-place compaction instead of splice: with a few hundred live
    // sparkles, splicing the dead out of the middle every frame is O(n^2)
    // memmoves. Order is preserved, which keeps the ink layer stable.
    let kept = 0;
    for (let i = 0; i < world.sparkles.length; i++) {
      const s = world.sparkles[i];
      s.px = s.x;
      s.py = s.y;
      s.life += dt;
      if (s.life < s.ttl) {
        s.vx *= 1 - 0.9 * dt;
        s.vy *= 1 - 0.9 * dt;
        s.vy -= 5 * dt * MOTION * (1 + energy);
        s.x += s.vx * dt * MOTION;
        s.y += s.vy * dt * MOTION;
        world.sparkles[kept++] = s;
      }
    }
    world.sparkles.length = kept;

    updateLevels();
    advancePad(dt);
    advanceChimes(dt);

    world.spawnTimer -= dt;
    if (world.spawnTimer <= 0) {
      world.spawnTimer = ENV.reduced ? rand(7, 12) : rand(0.6, 1.8);
      spawnBloom();
    }
  }

  function draw() {
    if (!g) return;

    g.globalCompositeOperation = "source-over";
    g.globalAlpha = 1;
    g.fillStyle = backdrop || theme.bg;
    g.fillRect(0, 0, view.w, view.h);
    g.globalCompositeOperation = theme.blend;

    const energy = Math.max(levels.all * 1.8, 0.08);
    const breath = 0.5 + 0.5 * Math.sin(time * 0.32);

    // Aurora — a handful of enormous soft blobs, drifting on sine paths.
    // One of them is warm, to keep the field from reading as pure cold.
    for (const a of world.aurora) {
      const x = view.w * a.x + Math.sin(a.phase) * a.drift;
      const y = view.h * a.y + Math.cos(a.phase * 0.7) * a.drift * 0.6;
      const alpha = a.alpha * (0.55 + breath * 0.25 + energy * 0.9);
      mist(a.hue + season.shift, x, y, a.r, alpha);
    }

    // Far motes first: large, faint, soft — the depth-of-field layer.
    for (const m of world.motes) {
      if (m.depth > 0.45) continue;
      mist(
        m.hue + season.shift,
        m.x,
        m.y,
        m.r,
        m.alpha * (0.6 + 0.4 * Math.sin(m.twinkle))
      );
    }
    // Near motes on top: small and bright, so the frame has depth.
    for (const m of world.motes) {
      if (m.depth <= 0.45) continue;
      glow(
        m.hue + season.shift,
        m.x,
        m.y,
        m.r,
        m.alpha * (0.65 + 0.35 * Math.sin(m.twinkle)) * (1 + energy * 0.4)
      );
    }

    // Blooms: soft ring glow, a crisp edge for definition, orbiters, ticks.
    for (const b of world.blooms) {
      const alpha = clamp(b.alphaNow, 0, 1) * b.alpha;
      if (alpha <= 0.01 || b.r < 1) continue;

      // Halo, ring, then core: three softness steps give the bloom body
      // instead of leaving it as a hairline circle.
      glow(b.hue, b.x, b.y, b.r * 1.7, alpha * 0.16 * (0.8 + energy));

      drawSprite(
        ringSprites[spriteFor(b.hue)],
        b.x,
        b.y,
        b.r / RING_BAND,
        alpha * 0.95 * (0.85 + energy * 0.5)
      );

      // Soft interior wash, brighter for the blooms made by a click.
      glow(b.hue, b.x, b.y, b.r * 0.95, alpha * (b.interaction ? 0.5 : 0.34));

      // On paper the drawing is ink: a darker, slightly heavier line, since
      // an additive glow has nothing to add to a bright background.
      g.globalAlpha = alpha * (theme.name === "dark" ? 0.72 : 0.8);
      g.strokeStyle = b.edge;
      g.lineWidth = Math.max(theme.name === "dark" ? 1 : 1.2, b.r * 0.009);
      g.beginPath();
      g.arc(b.x, b.y, b.r, 0, TAU);
      g.stroke();

      if (b.ticks) {
        const step = TAU / b.ticks;
        g.globalAlpha = alpha * (theme.name === "dark" ? 0.4 : 0.5);
        g.lineWidth = Math.max(theme.name === "dark" ? 1 : 1.3, b.r * 0.011);
        g.beginPath();
        for (let i = 0; i < b.ticks; i++) {
          const a0 = b.rot + i * step;
          const cos = Math.cos(a0);
          const sin = Math.sin(a0);
          g.moveTo(b.x + cos * b.r * 0.87, b.y + sin * b.r * 0.87);
          g.lineTo(b.x + cos * b.r, b.y + sin * b.r);
        }
        g.stroke();
      }

      for (let i = 0; i < b.orbiters; i++) {
        const ang = b.rot * 2 + (i / b.orbiters) * TAU;
        glow(
          b.hue,
          b.x + Math.cos(ang) * b.r,
          b.y + Math.sin(ang) * b.r,
          Math.max(2, b.r * 0.1),
          alpha * 0.85
        );
      }
    }

    // Sparkles, with a short streak behind each head for motion blur.
    g.lineCap = "round";
    for (const s of world.sparkles) {
      const fade = 1 - s.life / s.ttl;
      const a = s.alpha * fade * fade;
      g.globalAlpha = a * 0.6;
      g.strokeStyle = s.stroke || sparkleStroke(s.hue);
      g.lineWidth = Math.max(1, s.r * 0.7);
      g.beginPath();
      g.moveTo(s.px, s.py);
      g.lineTo(s.x, s.y);
      g.stroke();
      glow(s.hue, s.x, s.y, s.r * 2.4, a);
    }

    g.globalCompositeOperation = "source-over";
    g.globalAlpha = 1;
    if (vignette) {
      g.fillStyle = vignette;
      g.fillRect(0, 0, view.w, view.h);
    }
  }

  function loop(t) {
    rafId = 0;
    if (!running) return;
    const now = t / 1000;
    const dt = lastT ? clamp(now - lastT, 0, 0.05) : 0.016;
    lastT = now;
    time = now;
    update(dt);
    draw();
    // Under reduced motion the piece settles and stops asking for frames
    // whenever nothing is on screen, then wakes for the next slow bloom.
    if (ENV.reduced && !world.blooms.length && !world.sparkles.length) {
      running = false;
      setTimeout(() => {
        world.spawnTimer = 0;
        start();
      }, 9000);
      return;
    }
    rafId = requestAnimationFrame(loop);
  }

  function start() {
    if (running || document.hidden || !g) return;
    running = true;
    lastT = 0;
    rafId = requestAnimationFrame(loop);
  }

  function stop() {
    running = false;
    if (rafId) cancelAnimationFrame(rafId);
    rafId = 0;
  }

  /* ------------------------------------------------------------------ */
  /* 6. interaction + interface                                         */
  /* ------------------------------------------------------------------ */

  const banner = document.querySelector(".desktop-audio-banner");
  const soundToggle = document.querySelector(".sound-toggle");
  const themeToggle = document.querySelector(".theme-toggle");
  const hint = document.querySelector(".hint");

  function syncSoundButton() {
    if (!soundToggle) return;
    const on = audio.on;
    soundToggle.setAttribute("aria-pressed", on ? "true" : "false");
    soundToggle.setAttribute("aria-label", on ? "Mute sound" : "Unmute sound");
    soundToggle.classList.toggle("is-on", on);
  }

  function hideBanner() {
    if (banner) banner.classList.remove("show");
  }

  function showBanner() {
    if (banner && !audio.on) banner.classList.add("show");
  }

  /** The first gesture anywhere unlocks audio. The bloom is onPointerDown's. */
  function onFirstGesture(event) {
    if (event && event.target && event.target.closest(".controls")) return;
    // Tabbing past the page must not start the sound: only an activating
    // key or a printable character counts as an invitation.
    if (event && event.type === "keydown") {
      const k = event.key;
      if (k !== "Enter" && (!k || k.length !== 1)) return;
    }
    window.removeEventListener("pointerdown", onFirstGesture);
    window.removeEventListener("keydown", onFirstGesture);
    hideBanner();
    if (hint) hint.classList.add("fade");
    setSound(true);
  }

  function onPointerDown(event) {
    if (!event.target || !event.target.closest) return;
    if (event.target.closest(".controls") || event.target.closest("a")) return;
    const size = rand(70, ENV.coarse ? 200 : 320);
    spawnBloom({
      x: event.clientX,
      y: event.clientY,
      size,
      rise: lerp(0.6, 1.6, Math.random()),
      interaction: true,
    });
    // The bloom takes a beat to open, so answer the touch at once with a
    // brief handful of sparks at the pointer.
    if (!ENV.reduced && world.sparkles.length < 700) {
      const n = randInt(4, 8);
      for (let i = 0; i < n; i++) {
        const angle = rand(0, TAU);
        const speed = rand(30, 90);
        pushSparkle({
          x: event.clientX,
          y: event.clientY,
          px: event.clientX,
          py: event.clientY,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - rand(6, 20),
          hue: pickHue() + season.shift,
          r: rand(1.4, 3.4),
          life: 0,
          ttl: rand(0.5, 1.2),
          alpha: rand(0.4, 0.8),
        });
      }
    }
    if (!ENV.reduced) emitSoundRipple(event.clientX, event.clientY);
  }

  function onPointerMove(event) {
    if (ENV.coarse || ENV.reduced) return;
    if (world.sparkles.length > 700 || Math.random() > 0.25) return;
    pushSparkle({
      x: event.clientX,
      y: event.clientY,
      px: event.clientX,
      py: event.clientY,
      vx: rand(-16, 16),
      vy: rand(-22, -4),
      hue: pickHue() + season.shift,
      r: rand(1, 3),
      life: 0,
      ttl: rand(0.6, 1.6),
      alpha: rand(0.2, 0.6),
    });
  }

  /* --- theme ---------------------------------------------------------- */

  function toggleTheme() {
    const next = theme.name === "dark" ? "light" : "dark";
    try {
      localStorage.setItem("theme", next);
    } catch (err) {
      /* private mode — the preference simply will not persist */
    }
    applyTheme(next);
    syncThemeButton();
    start();
  }

  function syncThemeButton() {
    if (!themeToggle) return;
    themeToggle.querySelector(".sun-and-moon").style.transform =
      theme.name === "dark" ? "rotate(360deg)" : "rotate(0deg)";
  }

  function initTheme() {
    let saved = null;
    try {
      saved = localStorage.getItem("theme");
    } catch (err) {
      /* ignore */
    }
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)");
    const name = saved || (prefersDark.matches ? "dark" : "light");
    applyTheme(name);
    syncThemeButton();
    prefersDark.addEventListener("change", (e) => {
      let hasSaved = false;
      try {
        hasSaved = !!localStorage.getItem("theme");
      } catch (err) {
        /* ignore */
      }
      if (!hasSaved) {
        applyTheme(e.matches ? "dark" : "light");
        syncThemeButton();
      }
    });
  }

  /* --- boot ----------------------------------------------------------- */

  function boot() {
    buildSprites();
    initSeason();
    resize();
    initTheme();
    world.spawnTimer = 0.6;

    if (themeToggle) {
      themeToggle.addEventListener("click", (e) => {
        e.preventDefault();
        toggleTheme();
      });
    }

    if (soundToggle) {
      soundToggle.addEventListener("click", (e) => {
        e.preventDefault();
        setSound(!audio.on);
      });
    }

    // The banner is a real button for keyboard users, not just a label
    // the window gesture handler happens to overlap.
    if (banner) {
      banner.addEventListener("click", () => {
        hideBanner();
        setSound(true);
      });
      banner.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          hideBanner();
          setSound(true);
        }
      });
    }

    // Try to start silently; browsers will usually refuse until a gesture.
    if (initAudio() && audio.ctx.state === "running") {
      audio.on = true;
      audio.running = true;
      audio.master.gain.setTargetAtTime(
        MASTER_LEVEL,
        audio.ctx.currentTime,
        1.6
      );
      hideBanner();
    } else {
      // Autoplay was blocked: the piece plays silently until the listener
      // chooses to start the sound, and the visuals run either way.
      audio.on = false;
      audio.running = false;
      showBanner();
    }
    // The invitation fades on its own for anyone who never takes it up.
    if (hint) setTimeout(() => hint.classList.add("fade"), 14000);
    syncSoundButton();

    window.addEventListener("pointerdown", onFirstGesture, { passive: true });
    window.addEventListener("keydown", onFirstGesture);
    window.addEventListener("pointerdown", onPointerDown, { passive: true });
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    // Desktop drag-resize fires dozens of events a second; rebuilding
    // the world on each one would stutter and reseed the field mid-piece.
    let resizeTimer = 0;
    const onResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(resize, 150);
    };
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);

    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        stop();
        // Park the context while hidden so the drone never plays to an
        // empty room (and the laptop battery says thanks).
        if (audio.ctx && audio.ctx.state === "running") audio.ctx.suspend();
      } else {
        if (audio.on && audio.ctx && audio.ctx.state === "suspended") {
          audio.ctx.resume();
        }
        start();
      }
    });

    start();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
