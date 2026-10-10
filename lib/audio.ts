/**
 * Procedural ambience: wind made from filtered noise and birdsong made from
 * swept oscillators. No audio files are loaded.
 */
class Ambience {
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private gust!: GainNode;
  private gustFilter!: BiquadFilterNode;
  private birdTimer: ReturnType<typeof setTimeout> | null = null;
  private muted = false;

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

    const noise = this.brownNoise(ctx, 6);

    // Two slow, panned wind layers.
    for (const [pan, freq, lfoRate] of [
      [-0.6, 380, 0.07],
      [0.6, 520, 0.11],
    ] as const) {
      const src = ctx.createBufferSource();
      src.buffer = noise;
      src.loop = true;
      src.playbackRate.value = 0.9 + Math.random() * 0.2;

      const filter = ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.value = freq;
      filter.Q.value = 0.6;

      const lfo = ctx.createOscillator();
      lfo.frequency.value = lfoRate;
      const lfoDepth = ctx.createGain();
      lfoDepth.gain.value = freq * 0.55;
      lfo.connect(lfoDepth).connect(filter.frequency);

      const gain = ctx.createGain();
      gain.gain.value = 0.35;
      const ampLfo = ctx.createOscillator();
      ampLfo.frequency.value = lfoRate * 0.7;
      const ampDepth = ctx.createGain();
      ampDepth.gain.value = 0.18;
      ampLfo.connect(ampDepth).connect(gain.gain);

      const panner = ctx.createStereoPanner();
      panner.pan.value = pan;

      src.connect(filter).connect(gain).connect(panner).connect(this.master);
      src.start(ctx.currentTime + Math.random());
      lfo.start();
      ampLfo.start();
    }

    // Gust layer, driven by how fast the visitor moves the pointer.
    const gustSrc = ctx.createBufferSource();
    gustSrc.buffer = noise;
    gustSrc.loop = true;
    this.gustFilter = ctx.createBiquadFilter();
    this.gustFilter.type = "bandpass";
    this.gustFilter.frequency.value = 700;
    this.gustFilter.Q.value = 0.9;
    this.gust = ctx.createGain();
    this.gust.gain.value = 0;
    gustSrc.connect(this.gustFilter).connect(this.gust).connect(this.master);
    gustSrc.start();

    this.scheduleBird();
  }

  setMuted(muted: boolean) {
    this.muted = muted;
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(t);
    this.master.gain.setTargetAtTime(muted ? 0 : 1, t, 0.25);
  }

  /** 0..1 intensity of a pointer-driven gust. */
  setGust(amount: number) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.gust.gain.setTargetAtTime(Math.min(amount, 1) * 1.1, t, 0.12);
    this.gustFilter.frequency.setTargetAtTime(600 + amount * 900, t, 0.2);
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
    const delay = 2500 + Math.random() * 6000;
    this.birdTimer = setTimeout(() => {
      this.chirp();
      this.scheduleBird();
    }, delay);
  }

  private chirp() {
    const ctx = this.ctx;
    if (!ctx || ctx.state !== "running") return;
    const panner = ctx.createStereoPanner();
    panner.pan.value = Math.random() * 1.6 - 0.8;
    panner.connect(this.master);

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
    void this.ctx?.close();
    this.ctx = null;
  }
}

export const ambience = new Ambience();
