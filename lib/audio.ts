/**
 * Procedural ambience. Nothing is loaded: wind and surf are filtered noise, birdsong is
 * swept oscillators, and the night is a slow chord with twinkling chimes.
 * Each world has its own bus so the soundscape cross-fades with the journey.
 */
type Scene = "valley" | "ocean";

const PENTATONIC = [523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.66, 1318.51];

class Ambience {
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private windBus!: GainNode;
  private seaBus!: GainNode;
  private nightBus!: GainNode;
  private fxBus!: GainNode;
  private gust!: GainNode;
  private gustFilter!: BiquadFilterNode;
  private noise!: AudioBuffer;
  private birdTimer: ReturnType<typeof setTimeout> | null = null;
  private twinkleTimer: ReturnType<typeof setTimeout> | null = null;
  private muted = false;
  private scene: Scene = "valley";
  private night = 0;

  start() {
    if (this.ctx) {
      void this.ctx.resume();
      return;
    }
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctor();
    this.ctx = ctx;

    this.master = ctx.createGain();
    this.master.gain.value = 0;
    this.master.connect(ctx.destination);
    this.master.gain.linearRampToValueAtTime(this.muted ? 0 : 1, ctx.currentTime + 3);

    const bus = (value: number) => {
      const g = ctx.createGain();
      g.gain.value = value;
      g.connect(this.master);
      return g;
    };
    this.windBus = bus(1);
    this.seaBus = bus(0);
    this.nightBus = bus(0);
    this.fxBus = bus(0.9);

    this.noise = this.brownNoise(ctx, 6);
    this.buildWind(ctx);
    this.buildSea(ctx);
    this.buildNight(ctx);
    this.scheduleBird();
    this.scheduleTwinkle();
  }

  setMuted(muted: boolean) {
    this.muted = muted;
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(t);
    this.master.gain.setTargetAtTime(muted ? 0 : 1, t, 0.25);
  }

  /** Cross-fades the world buses. `night` is 0..1 over the sea. */
  setScene(scene: Scene, night = 0) {
    this.scene = scene;
    this.night = night;
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.windBus.gain.setTargetAtTime(scene === "valley" ? 1 : 0, t, 0.8);
    this.seaBus.gain.setTargetAtTime(scene === "ocean" ? 1 - night * 0.45 : 0, t, 0.8);
    this.nightBus.gain.setTargetAtTime(scene === "ocean" ? night : 0, t, 1.2);
  }

  /** 0..1 intensity of a pointer-driven gust. */
  setGust(amount: number) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.gust.gain.setTargetAtTime(Math.min(amount, 1) * 1.1, t, 0.12);
    this.gustFilter.frequency.setTargetAtTime(600 + amount * 900, t, 0.2);
  }

  /** A hand slapping the water: a noise burst plus a falling "bloop". */
  splash() {
    const ctx = this.ctx;
    if (!ctx || ctx.state !== "running") return;
    const t = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.Q.value = 0.8;
    filter.frequency.setValueAtTime(2400, t);
    filter.frequency.exponentialRampToValueAtTime(500, t + 0.6);
    const env = ctx.createGain();
    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(1.6, t + 0.015);
    env.gain.exponentialRampToValueAtTime(0.001, t + 0.9);
    src.connect(filter).connect(env).connect(this.fxBus);
    src.start(t, Math.random() * 4);
    src.stop(t + 1);

    const osc = ctx.createOscillator();
    osc.frequency.setValueAtTime(260, t);
    osc.frequency.exponentialRampToValueAtTime(70, t + 0.25);
    const oenv = ctx.createGain();
    oenv.gain.setValueAtTime(0.25, t);
    oenv.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
    osc.connect(oenv).connect(this.fxBus);
    osc.start(t);
    osc.stop(t + 0.32);
  }

  /** A shimmering arpeggio for shockwaves in the galaxy. */
  chime() {
    const ctx = this.ctx;
    if (!ctx || ctx.state !== "running") return;
    const base = Math.floor(Math.random() * 3);
    for (let i = 0; i < 4; i++) {
      this.bell(PENTATONIC[base + i * 2] ?? PENTATONIC[PENTATONIC.length - 1], ctx.currentTime + i * 0.07, 0.07, 2.4, this.fxBus);
    }
  }

  private buildWind(ctx: AudioContext) {
    for (const [pan, freq, lfoRate] of [
      [-0.6, 380, 0.07],
      [0.6, 520, 0.11],
    ] as const) {
      const src = this.loopNoise(ctx, 0.9 + Math.random() * 0.2);
      const filter = ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.value = freq;
      filter.Q.value = 0.6;
      this.lfo(ctx, lfoRate, freq * 0.55, filter.frequency);

      const gain = ctx.createGain();
      gain.gain.value = 0.35;
      this.lfo(ctx, lfoRate * 0.7, 0.18, gain.gain);

      const panner = ctx.createStereoPanner();
      panner.pan.value = pan;
      src.connect(filter).connect(gain).connect(panner).connect(this.windBus);
    }

    // Gust layer, driven by how fast the visitor moves the pointer.
    const gustSrc = this.loopNoise(ctx, 1);
    this.gustFilter = ctx.createBiquadFilter();
    this.gustFilter.type = "bandpass";
    this.gustFilter.frequency.value = 700;
    this.gustFilter.Q.value = 0.9;
    this.gust = ctx.createGain();
    this.gust.gain.value = 0;
    gustSrc.connect(this.gustFilter).connect(this.gust).connect(this.windBus);
  }

  /** Surf: a deep rumble that swells like breaking waves, plus a hissing wash on each swell. */
  private buildSea(ctx: AudioContext) {
    for (const [pan, rate, phase] of [
      [-0.5, 0.11, 0],
      [0.5, 0.083, 2],
    ] as const) {
      const src = this.loopNoise(ctx, 0.8 + Math.random() * 0.2);
      const low = ctx.createBiquadFilter();
      low.type = "lowpass";
      low.frequency.value = 420;
      this.lfo(ctx, rate, 260, low.frequency, phase);
      const gain = ctx.createGain();
      gain.gain.value = 0.55;
      this.lfo(ctx, rate, 0.45, gain.gain, phase);
      const panner = ctx.createStereoPanner();
      panner.pan.value = pan;
      src.connect(low).connect(gain).connect(panner).connect(this.seaBus);

      const wash = this.loopNoise(ctx, 1.6);
      const high = ctx.createBiquadFilter();
      high.type = "bandpass";
      high.frequency.value = 1800;
      high.Q.value = 0.5;
      const washGain = ctx.createGain();
      washGain.gain.value = 0.06;
      this.lfo(ctx, rate, 0.06, washGain.gain, phase + 0.6);
      wash.connect(high).connect(washGain).connect(panner);
    }
  }

  /** A soft, slowly breathing A-minor add9 chord. */
  private buildNight(ctx: AudioContext) {
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 900;
    const pad = ctx.createGain();
    pad.gain.value = 0.05;
    this.lfo(ctx, 0.05, 0.02, pad.gain);
    filter.connect(pad).connect(this.nightBus);
    for (const f of [110, 164.81, 220, 246.94, 329.63]) {
      for (const detune of [-6, 6]) {
        const osc = ctx.createOscillator();
        osc.type = "triangle";
        osc.frequency.value = f;
        osc.detune.value = detune;
        osc.connect(filter);
        osc.start();
      }
    }
  }

  private bell(freq: number, when: number, volume: number, decay: number, out: AudioNode) {
    const ctx = this.ctx!;
    const env = ctx.createGain();
    env.gain.setValueAtTime(0, when);
    env.gain.linearRampToValueAtTime(volume, when + 0.01);
    env.gain.exponentialRampToValueAtTime(0.0001, when + decay);
    env.connect(out);
    for (const [ratio, level] of [
      [1, 1],
      [2.76, 0.3],
      [5.4, 0.12],
    ] as const) {
      const osc = ctx.createOscillator();
      osc.frequency.value = freq * ratio;
      const g = ctx.createGain();
      g.gain.value = level;
      osc.connect(g).connect(env);
      osc.start(when);
      osc.stop(when + decay + 0.05);
    }
  }

  private loopNoise(ctx: AudioContext, rate: number) {
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    src.loop = true;
    src.playbackRate.value = rate;
    src.start(ctx.currentTime + Math.random(), Math.random() * 5);
    return src;
  }

  private lfo(ctx: AudioContext, rate: number, depth: number, target: AudioParam, phase = 0) {
    const osc = ctx.createOscillator();
    osc.frequency.value = rate;
    const gain = ctx.createGain();
    gain.gain.value = depth;
    osc.connect(gain).connect(target);
    osc.start(ctx.currentTime + phase);
  }

  private brownNoise(ctx: AudioContext, seconds: number) {
    const length = ctx.sampleRate * seconds;
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1;
      last = (last + 0.02 * white) / 1.02;
      data[i] = last * 3.5;
    }
    // Cross-fade the loop seam.
    const fade = Math.floor(ctx.sampleRate * 0.25);
    for (let i = 0; i < fade; i++) {
      const k = i / fade;
      data[i] = data[i] * k + data[length - fade + i] * (1 - k);
    }
    return buffer;
  }

  private scheduleBird() {
    this.birdTimer = setTimeout(
      () => {
        if (this.scene === "valley") this.chirp();
        this.scheduleBird();
      },
      2500 + Math.random() * 6000,
    );
  }

  private scheduleTwinkle() {
    this.twinkleTimer = setTimeout(
      () => {
        const ctx = this.ctx;
        if (ctx?.state === "running" && this.scene === "ocean" && this.night > 0.5) {
          const f = PENTATONIC[Math.floor(Math.random() * PENTATONIC.length)];
          this.bell(f * 2, ctx.currentTime, 0.012 * this.night, 3, this.nightBus);
        }
        this.scheduleTwinkle();
      },
      900 + Math.random() * 2600,
    );
  }

  private chirp() {
    const ctx = this.ctx;
    if (!ctx || ctx.state !== "running") return;
    const panner = ctx.createStereoPanner();
    panner.pan.value = Math.random() * 1.6 - 0.8;
    panner.connect(this.windBus);

    const base = 2200 + Math.random() * 2200;
    const notes = 2 + Math.floor(Math.random() * 4);
    const volume = 0.025 + Math.random() * 0.03;
    let t = ctx.currentTime + 0.05;

    for (let i = 0; i < notes; i++) {
      const dur = 0.05 + Math.random() * 0.09;
      const osc = ctx.createOscillator();
      osc.type = "sine";
      const f = base * (0.85 + Math.random() * 0.4);
      osc.frequency.setValueAtTime(f, t);
      osc.frequency.exponentialRampToValueAtTime(f * (Math.random() > 0.5 ? 1.35 : 0.75), t + dur);

      const env = ctx.createGain();
      env.gain.setValueAtTime(0, t);
      env.gain.linearRampToValueAtTime(volume, t + 0.01);
      env.gain.exponentialRampToValueAtTime(0.0001, t + dur);

      osc.connect(env).connect(panner);
      osc.start(t);
      osc.stop(t + dur + 0.02);
      t += dur + 0.03 + Math.random() * 0.08;
    }
  }

  dispose() {
    if (this.birdTimer) clearTimeout(this.birdTimer);
    if (this.twinkleTimer) clearTimeout(this.twinkleTimer);
    void this.ctx?.close();
    this.ctx = null;
  }
}

export const ambience = new Ambience();
