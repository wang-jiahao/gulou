/** Recorded VSCO/tonejs piano notes; attribution is shipped beside the samples. */
export const pianoPitches = Array.from({ length: 16 }, (_, i) => 36 + i * 3);
export type PianoSamples = ReadonlyMap<number, AudioBuffer>;
export type MusicVoices = Set<AudioScheduledSourceNode>;
const downloads = new Map<number, Promise<ArrayBuffer>>();
const decoded = new WeakMap<BaseAudioContext, Promise<PianoSamples>>();

function download(pitch: number) {
  let pending = downloads.get(pitch);
  if (!pending) {
    const index = (pitch - 36) / 3;
    const name = ['C', 'Ds', 'Fs', 'A'][index % 4] + (2 + Math.floor(index / 4));
    pending = (async () => {
      const abort = new AbortController(), timeout = setTimeout(() => abort.abort(), 8000);
      try {
        const response = await fetch(`${import.meta.env.BASE_URL}assets/audio/piano/${name}.mp3`, { signal: abort.signal });
        if (!response.ok) throw new Error(`Piano sample ${name}: ${response.status}`);
        return await response.arrayBuffer();
      } finally { clearTimeout(timeout); }
    })().catch(error => { downloads.delete(pitch); throw error; });
    downloads.set(pitch, pending);
  }
  return pending;
}

/** Warm the browser cache while the campus loads, without opening an audio device. */
export async function preloadPianoSamples() {
  await Promise.allSettled(pianoPitches.map(download));
}

export function loadPianoSamples(ctx: BaseAudioContext): Promise<PianoSamples> {
  let pending = decoded.get(ctx);
  if (!pending) {
    pending = (async () => {
      const rows = await Promise.allSettled(pianoPitches.map(async pitch => {
        const bytes = await download(pitch);
        return [pitch, await ctx.decodeAudioData(bytes.slice(0))] as const;
      }));
      const samples = new Map<number, AudioBuffer>();
      for (const row of rows) if (row.status === 'fulfilled') samples.set(...row.value);
      // Failed requests may be retried on a subsequent explicit play.
      if (samples.size < pianoPitches.length) decoded.delete(ctx);
      return samples;
    })();
    decoded.set(ctx, pending);
  }
  return pending;
}

export function playPianoNote(ctx: BaseAudioContext, output: AudioNode, samples: PianoSamples, midi: number, when: number, duration: number, level: number, voices?: MusicVoices) {
  let root = -1, distance = Infinity;
  for (const pitch of samples.keys()) if (Math.abs(pitch - midi) < distance) { root = pitch; distance = Math.abs(pitch - midi); }
  if (distance > 3) return false;
  const source = ctx.createBufferSource(), gain = ctx.createGain(), filter = ctx.createBiquadFilter(), pan = ctx.createStereoPanner();
  source.buffer = samples.get(root)!;
  source.playbackRate.value = 2 ** ((midi - root) / 12);
  const velocity = Math.min(.95, .22 + level * 3.2);
  filter.type = 'lowpass'; filter.frequency.value = 2400 + velocity * 6500; filter.Q.value = .45;
  pan.pan.value = Math.max(-.25, Math.min(.25, (midi - 63) / 65));
  const amplitude = level * 2.1;
  const naturalEnd = when + source.buffer.duration / source.playbackRate.value;
  const release = Math.max(when + .025, Math.min(when + duration, naturalEnd - .05));
  gain.gain.setValueAtTime(0, when);
  gain.gain.linearRampToValueAtTime(amplitude, when + .006);
  gain.gain.setValueAtTime(amplitude, release);
  gain.gain.exponentialRampToValueAtTime(.00001, release + .45);
  source.connect(filter); filter.connect(gain); gain.connect(pan); pan.connect(output);
  voices?.add(source);
  source.onended = () => { source.disconnect(); filter.disconnect(); gain.disconnect(); pan.disconnect(); voices?.delete(source); };
  source.start(when); source.stop(Math.min(naturalEnd, release + .5));
  return true;
}
