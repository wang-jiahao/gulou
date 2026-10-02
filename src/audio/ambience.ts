/** Generated footsteps/birds/wind plus a public-domain field recording of rain (ezwa/PDSounds). */
export class Ambience {
  private context?: AudioContext;
  private master?: GainNode;
  private lastStep = 0;
  private nextBird = 3;
  private time = 0;
  volume = .3;
  private rain = 0;
  private night = 0;
  private flying = false;
  private rainGain?: GainNode;
  private windGain?: GainNode;
  private fallbackGain?: GainNode;
  private rainLoading = false;
  private rainSource: 'not-started' | 'loading' | 'field-recording' | 'soft-fallback' = 'not-started';

  async start() {
    if (this.context) { await this.context.resume(); if (this.rainSource === 'soft-fallback') void this.loadRain(); return; }
    const ctx = new AudioContext(); this.context = ctx; this.master = ctx.createGain(); this.master.gain.value = this.volume * .25; this.master.connect(ctx.destination);
    const buffer = ctx.createBuffer(1, ctx.sampleRate * 4, ctx.sampleRate), samples = buffer.getChannelData(0);
    let smooth = 0; for (let i = 0; i < samples.length; i++) { smooth = .985 * smooth + .015 * (Math.random() * 2 - 1); samples[i] = smooth; }
    const wind = ctx.createBufferSource(); wind.buffer = buffer; wind.loop = true;
    const windFilter = ctx.createBiquadFilter(); windFilter.type = 'lowpass'; windFilter.frequency.value = 900;
    this.windGain = ctx.createGain(); wind.connect(windFilter); windFilter.connect(this.windGain); this.windGain.connect(this.master); wind.start();
    this.rainGain = ctx.createGain(); this.rainGain.gain.value = this.rain * .45; this.rainGain.connect(this.master);
    // Quiet coloured fallback avoids harsh static while an optional recording is loading.
    const fallback = ctx.createBufferSource(); fallback.buffer = buffer; fallback.loop = true;
    const fallbackFilter = ctx.createBiquadFilter(); fallbackFilter.type = 'bandpass'; fallbackFilter.frequency.value = 1100; fallbackFilter.Q.value = .45;
    this.fallbackGain = ctx.createGain(); this.fallbackGain.gain.value = .22;
    fallback.connect(fallbackFilter); fallbackFilter.connect(this.fallbackGain); this.fallbackGain.connect(this.rainGain); fallback.start();
    await ctx.resume(); void this.loadRain();
  }
  private async loadRain() {
    if (!this.context || !this.rainGain || this.rainLoading || this.rainSource === 'field-recording') return;
    this.rainLoading = true; this.rainSource = 'loading';
    try {
      const response = await fetch(`${import.meta.env.BASE_URL}assets/audio/rain-field.wav`);
      if (!response.ok) throw new Error('Rain recording unavailable');
      const buffer = await this.context.decodeAudioData(await response.arrayBuffer());
      const source = this.context.createBufferSource(); source.buffer = buffer; source.loop = true;
      const highpass = this.context.createBiquadFilter(); highpass.type = 'highpass'; highpass.frequency.value = 100;
      const lowpass = this.context.createBiquadFilter(); lowpass.type = 'lowpass'; lowpass.frequency.value = 6800;
      source.connect(highpass); highpass.connect(lowpass); lowpass.connect(this.rainGain); source.start();
      this.fallbackGain?.gain.setTargetAtTime(0, this.context.currentTime, .35); this.rainSource = 'field-recording';
    } catch { this.rainSource = 'soft-fallback'; }
    finally { this.rainLoading = false; }
  }
  setEnvironment(rain: number, night: number, flying: boolean) {
    this.rain = rain; this.night = night; this.flying = flying;
    if (this.context) {
      this.rainGain?.gain.setTargetAtTime(rain * .45, this.context.currentTime, .45);
      this.windGain?.gain.setTargetAtTime(flying ? 0 : 1 - rain * .85, this.context.currentTime, .4);
    }
  }
  setVolume(n: number) { this.volume = Math.max(0, Math.min(1, n)); if (this.master && this.context) this.master.gain.setTargetAtTime(this.volume * .25, this.context.currentTime, .15); }
  get snapshot() { return { rainSource: this.rainSource, volume: this.volume, context: this.context?.state ?? 'not-started' }; }
  update(dt: number, speed: number, active: boolean) {
    this.time += dt; if (!this.context || !this.master || !active) return;
    const ctx = this.context;
    if (!this.flying && speed > .25 && this.time - this.lastStep > (speed > 2.5 ? .25 : .43)) {
      this.lastStep = this.time;
      const osc = ctx.createOscillator(), gain = ctx.createGain(); osc.type = 'triangle'; osc.frequency.setValueAtTime(115, ctx.currentTime); osc.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + .07); gain.gain.setValueAtTime(.16, ctx.currentTime); gain.gain.exponentialRampToValueAtTime(.001, ctx.currentTime + .09); osc.connect(gain); gain.connect(this.master); osc.start(); osc.stop(ctx.currentTime + .1);
      osc.onended = () => { osc.disconnect(); gain.disconnect(); };
    }
    if (this.time > this.nextBird && this.night < .5 && this.rain < .4) {
      this.nextBird = this.time + 9 + Math.random() * 13;
      for (let i = 0; i < 3; i++) {
        const t = ctx.currentTime + i * .17, osc = ctx.createOscillator(), gain = ctx.createGain(); osc.frequency.setValueAtTime(2300 + Math.random() * 900, t); osc.frequency.exponentialRampToValueAtTime(3600, t + .08); gain.gain.setValueAtTime(.001, t); gain.gain.linearRampToValueAtTime(.06, t + .03); gain.gain.exponentialRampToValueAtTime(.001, t + .12); osc.connect(gain); gain.connect(this.master); osc.start(t); osc.stop(t + .14);
        osc.onended = () => { osc.disconnect(); gain.disconnect(); };
      }
    }
  }
}
