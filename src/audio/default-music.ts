import { loadPianoSamples, pianoPitches, playPianoNote, preloadPianoSamples, type MusicVoices, type PianoSamples } from './piano.ts';

/** Original piano miniature: introduction, two themes, reprise and a quiet coda. */
export const musicBarSeconds = 4 * 60 / 66;
export const musicBars = 32;
const tempos = [64, 65, 64, 60, 65, 66, 67, 63, 65, 66, 64, 59, 66, 68, 67, 63, 66, 65, 64, 58, 64, 65, 66, 62, 64, 63, 61, 57, 60, 57, 54, 54];
export const musicBarDuration = (bar: number) => 240 / tempos[bar % musicBars];
export const musicDuration = tempos.reduce((seconds, tempo) => seconds + 240 / tempo, 0);
const pianoWaves = new WeakMap<BaseAudioContext, [PeriodicWave, PeriodicWave]>();
const voicings = [[53, 60, 64, 69], [50, 57, 60, 65], [58, 62, 65, 69], [48, 55, 62, 67], [57, 60, 64, 67], [55, 58, 62, 65]];
const harmony = [0, 0, 1, 3, 0, 4, 1, 2, 5, 0, 2, 3, 1, 4, 2, 0, 5, 1, 2, 3, 0, 4, 1, 2, 5, 0, 2, 3, 1, 2, 0, 0];
// Each pair is [beat, MIDI pitch]; unequal phrase lengths leave room for the piano tails.
const phrases: [number, number][][] = [
  [[2.5, 69]], [[1, 72], [3, 67]], [[.5, 65], [2.75, 69]], [],
  [[.5, 72], [1.75, 69], [3.25, 76]], [[1, 74], [2.5, 72]],
  [[.25, 69], [1.5, 65], [2.75, 67]], [[.75, 70], [2.5, 69]],
  [[.5, 67], [1.25, 65], [3, 62]], [[1, 64], [2.75, 69]],
  [[.25, 65], [1.5, 70], [3.25, 72]], [[1, 67]],
  [[.5, 77], [1.75, 76], [3, 72]], [[.75, 76], [2.25, 79]],
  [[.25, 77], [1.5, 74], [3.25, 70]], [[1, 72], [2.5, 69]],
  [[.5, 74], [1.75, 77]], [[.25, 76], [1.5, 72], [3, 69]],
  [[.75, 70], [2, 74], [3.25, 72]], [[1, 67]],
  [[.5, 72], [1.75, 69], [3.25, 76]], [[1, 74], [2.5, 72]],
  [[.25, 69], [1.5, 65], [3, 72]], [[.75, 70], [2.5, 77]],
  [[.5, 74], [1.5, 70], [3, 67]], [[1, 69], [2.75, 64]],
  [[.25, 65], [1.75, 62], [3, 70]], [[1, 67], [2.5, 64]],
  [[.75, 65], [2.5, 69]], [[1.5, 70]], [[.5, 69], [2, 65]], [],
];

export function scheduleMusicBar(ctx: BaseAudioContext, output: AudioNode, time: number, bar: number, voices?: MusicVoices, samples?: PianoSamples) {
  const section = bar % musicBars;
  const beat = musicBarDuration(bar) / 4;
  let noteIndex = 0;
  const note = (midi: number, offset: number, duration: number, level: number) => {
    const variation = Math.sin((section * 13 + noteIndex++ * 7 + midi) * 1.37);
    const start = time + Math.max(0, offset * beat + variation * .009);
    level *= 1 + variation * .035;
    if (samples && playPianoNote(ctx, output, samples, midi, start, duration * beat, level, voices)) return;
    let waves = pianoWaves.get(ctx);
    if (!waves) {
      waves = [
        ctx.createPeriodicWave(new Float32Array(7), new Float32Array([0, 1, .24, .07, .035, .016, .006])),
        ctx.createPeriodicWave(new Float32Array(7), new Float32Array([0, 0, 1, .52, .28, .13, .06])),
      ];
      pianoWaves.set(ctx, waves);
    }
    const end = start + duration * beat;
    const pan = ctx.createStereoPanner(); pan.pan.value = Math.max(-.3, Math.min(.3, (midi - 65) / 65)); pan.connect(output);
    let remaining = 2;
    // The brighter hammer/string component decays before the warm sustained tone.
    waves.forEach((wave, component) => {
      const osc = ctx.createOscillator(), gain = ctx.createGain(); osc.setPeriodicWave(wave);
      osc.frequency.value = 440 * 2 ** ((midi - 69) / 12);
      osc.detune.value = component ? 1.4 : -.7;
      const velocity = level * (component ? .24 : 1);
      gain.gain.setValueAtTime(0, start); gain.gain.linearRampToValueAtTime(velocity, start + .008);
      gain.gain.exponentialRampToValueAtTime(velocity * (component ? .06 : .48), start + .42);
      gain.gain.exponentialRampToValueAtTime(.00001, component ? start + .85 : end);
      osc.connect(gain); gain.connect(pan); voices?.add(osc);
      osc.onended = () => { osc.disconnect(); gain.disconnect(); voices?.delete(osc); if (!--remaining) pan.disconnect(); };
      osc.start(start); osc.stop((component ? start + .9 : end) + .03);
    });
  };
  const chord = voicings[harmony[section]], intro = section < 4, coda = section >= 28;
  const dynamics = intro ? .7 : coda ? .72 - (section - 28) * .12 : section >= 12 && section < 20 ? 1 : .86;
  if (section === 31) return;
  note(chord[0] - 12, 0, coda ? 4.3 : 3.85, .058 * dynamics);
  note(chord[1], .07, intro || coda ? 3.5 : 2.7, .032 * dynamics);
  note(chord[2], intro || coda ? 1.4 : .8, 2.8, .03 * dynamics);
  if (!coda) note(chord[3], 2.15, 1.9, .028 * dynamics);
  if (!intro && !coda && section % 4 !== 3) note(chord[1] + 12, 3.1, 1.3, .019 * dynamics);
  // Hold the melody into the next touch, then let the damper release its tail.
  phrases[section].forEach(([offset, pitch], i, line) => {
    const next = line[i + 1]?.[0] ?? 4.2;
    note(pitch, offset + (i % 2 ? .025 : 0), Math.min(3.2, next - offset + .18), .15 * dynamics * (1 - i * .045));
  });
}

export function createMusicOutput(ctx: BaseAudioContext, volume: number) {
  const input = ctx.createGain(), master = ctx.createGain(); master.gain.value = volume;
  const filter = ctx.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = 6800;
  const room = ctx.createGain(), highpass = ctx.createBiquadFilter(), compressor = ctx.createDynamicsCompressor();
  highpass.type = 'highpass'; highpass.frequency.value = 45;
  compressor.threshold.value = -16; compressor.knee.value = 12; compressor.ratio.value = 1.5;
  compressor.attack.value = .03; compressor.release.value = .35;
  input.connect(filter); filter.connect(room); room.connect(highpass); highpass.connect(compressor); compressor.connect(master); master.connect(ctx.destination);
  const reverb = ctx.createConvolver(), wet = ctx.createGain();
  const impulse = ctx.createBuffer(2, Math.ceil(ctx.sampleRate * 3.2), ctx.sampleRate);
  let seed = 1337;
  for (let channel = 0; channel < 2; channel++) {
    const data = impulse.getChannelData(channel);
    for (let i = 0; i < data.length; i++) {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      const t = i / ctx.sampleRate;
      data[i] = t < .032 ? 0 : (seed / 2147483648 - 1) * Math.exp(-t * 2.3);
    }
  }
  reverb.buffer = impulse; wet.gain.value = .2;
  filter.connect(reverb); reverb.connect(wet); wet.connect(room);
  return { input, master };
}

export class DefaultMusic {
  private context?: AudioContext;
  private master?: GainNode;
  private input?: GainNode;
  private timer?: ReturnType<typeof setInterval>;
  private voices: MusicVoices = new Set();
  private samples: PianoSamples = new Map();
  private generation = 0;
  private nextAt = 0;
  private bar = 0;
  private playing = false;
  private volume = .28;
  get paused() { return !this.playing || this.context?.state !== 'running'; }
  get currentTime() { return this.context?.currentTime ?? 0; }
  get source() { return this.samples.size === pianoPitches.length ? 'sampled' : this.samples.size ? 'hybrid' : 'generated'; }
  prepare() { return preloadPianoSamples(); }

  async play() {
    if (!this.context) {
      this.context = new AudioContext({ latencyHint: 'playback' });
      const output = createMusicOutput(this.context, this.volume);
      this.master = output.master; this.input = output.input;
    }
    this.playing = true;
    const generation = this.generation;
    await this.context.resume();
    if (this.samples.size < pianoPitches.length) {
      const loading = loadPianoSamples(this.context).then(samples => { this.samples = samples; });
      let timer: ReturnType<typeof setTimeout> | undefined;
      await Promise.race([loading, new Promise<void>(resolve => { timer = setTimeout(resolve, 2500); })]);
      clearTimeout(timer);
    }
    if (!this.playing || generation !== this.generation || this.timer !== undefined) return;
    const schedule = () => {
      const ctx = this.context!;
      if (ctx.state !== 'running') return;
      // Background-tab timer throttling must not accumulate a backlog of notes.
      if (this.nextAt < ctx.currentTime) this.nextAt = ctx.currentTime + .04;
      while (this.nextAt < ctx.currentTime + .3) {
        scheduleMusicBar(ctx, this.input!, this.nextAt, this.bar, this.voices, this.samples);
        this.nextAt += musicBarDuration(this.bar++);
      }
    };
    schedule(); this.timer = setInterval(schedule, 150);
  }
  pause(reset = false) {
    this.generation++;
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
