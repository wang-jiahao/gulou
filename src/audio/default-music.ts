/** Original, quiet eight-bar motif. Generated in Web Audio; no audio download. */
const beat = 60 / 68;
const pianoWaves = new WeakMap<BaseAudioContext, PeriodicWave>();
const chords = [[60, 64, 71], [57, 60, 67], [53, 57, 64], [55, 59, 62]];
const melody = [[72, 76, 79], [76, 72, 69], [69, 72, 77], [74, 71, 67], [76, 79, 81], [79, 76, 72], [77, 76, 72], [74, 71, 72]];

export function scheduleMusicBar(ctx: BaseAudioContext, output: AudioNode, time: number, bar: number, voices?: Set<OscillatorNode>) {
  const note = (midi: number, start: number, duration: number, level: number, type: OscillatorType = 'sine') => {
    const osc = ctx.createOscillator(), gain = ctx.createGain();
    if (type === 'custom') {
      let wave = pianoWaves.get(ctx);
      if (!wave) { wave = ctx.createPeriodicWave(new Float32Array(7), new Float32Array([0, 1, .3, .08, .025, .014, .008])); pianoWaves.set(ctx, wave); }
      osc.setPeriodicWave(wave);
    } else osc.type = type;
    osc.frequency.value = 440 * 2 ** ((midi - 69) / 12);
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(level, start + .015);
    gain.gain.exponentialRampToValueAtTime(level * .35, start + .32);
    gain.gain.exponentialRampToValueAtTime(.0001, start + duration);
    osc.connect(gain); gain.connect(output); voices?.add(osc);
    osc.onended = () => { osc.disconnect(); gain.disconnect(); voices?.delete(osc); };
    osc.start(start); osc.stop(start + duration + .03);
  };
  const chord = chords[bar % chords.length];
  chord.forEach((pitch, i) => note(pitch, time + i * .08, beat * 3.8, .026, 'custom'));
  note(chord[0] - 12, time, beat * 3.6, .038);
  melody[bar % melody.length].forEach((pitch, i) => note(pitch, time + [.5, 2, 3.25][i] * beat, beat * 2.2, .12, 'custom'));
}

export function createMusicOutput(ctx: BaseAudioContext, volume: number) {
  const master = ctx.createGain(); master.gain.value = volume;
  const filter = ctx.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = 2200;
  master.connect(filter); filter.connect(ctx.destination);
  // A small generated impulse softens the piano; no recorded samples or network request.
  const reverb = ctx.createConvolver(), wet = ctx.createGain();
  const impulse = ctx.createBuffer(2, Math.ceil(ctx.sampleRate * 1.8), ctx.sampleRate);
  let seed = 1337;
  for (let channel = 0; channel < 2; channel++) {
    const data = impulse.getChannelData(channel);
    for (let i = 0; i < data.length; i++) {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      const t = i / ctx.sampleRate;
      data[i] = t < .025 ? 0 : (seed / 2147483648 - 1) * Math.exp(-t * 4.2);
    }
  }
  reverb.buffer = impulse; wet.gain.value = .16;
  filter.connect(reverb); reverb.connect(wet); wet.connect(ctx.destination);
  return master;
}

export class DefaultMusic {
  private context?: AudioContext;
  private master?: GainNode;
  private timer?: ReturnType<typeof setInterval>;
  private voices = new Set<OscillatorNode>();
  private nextAt = 0;
  private bar = 0;
  private playing = false;
  private volume = .28;
  get paused() { return !this.playing || this.context?.state !== 'running'; }
  get currentTime() { return this.context?.currentTime ?? 0; }

  async play() {
    if (!this.context) {
      this.context = new AudioContext({ latencyHint: 'playback' });
      this.master = createMusicOutput(this.context, this.volume);
    }
    this.playing = true;
    await this.context.resume();
    if (!this.playing || this.timer !== undefined) return;
    const schedule = () => {
      const ctx = this.context!;
      if (ctx.state !== 'running') return;
      // Background-tab timer throttling must not accumulate a backlog of notes.
      if (this.nextAt < ctx.currentTime) this.nextAt = ctx.currentTime + .04;
      while (this.nextAt < ctx.currentTime + .3) {
        scheduleMusicBar(ctx, this.master!, this.nextAt, this.bar++, this.voices);
        this.nextAt += beat * 4;
      }
    };
    schedule(); this.timer = setInterval(schedule, 150);
  }
  pause(reset = false) {
    this.playing = false; clearInterval(this.timer); this.timer = undefined;
    if (reset) {
      this.voices.forEach(osc => { try { osc.stop(); } catch { /* Already ended. */ } });
      this.voices.clear(); this.nextAt = 0; this.bar = 0;
    }
    if (this.context) void this.context.suspend().catch(() => {});
  }
  setVolume(value: number) {
    this.volume = value;
    if (this.context && this.master) this.master.gain.setTargetAtTime(value, this.context.currentTime, .05);
  }
}
