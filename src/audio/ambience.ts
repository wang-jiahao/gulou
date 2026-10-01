/** Quiet procedural ambience; no audio files or third-party recordings are distributed. */
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
  async start() {
    if (this.context) { await this.context.resume(); return; }
    const ctx = new AudioContext(); this.context = ctx; this.master = ctx.createGain(); this.master.gain.value = this.volume * .25; this.master.connect(ctx.destination);
    const buffer = ctx.createBuffer(1, ctx.sampleRate * 3, ctx.sampleRate), samples = buffer.getChannelData(0);
    let smooth = 0; for (let i = 0; i < samples.length; i++) { smooth = .985 * smooth + .015 * (Math.random() * 2 - 1); samples[i] = smooth; }
    const wind = ctx.createBufferSource(); wind.buffer = buffer; wind.loop = true; const filter = ctx.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = 1200;this.windGain=ctx.createGain();wind.connect(filter);filter.connect(this.windGain);this.windGain.connect(this.master);wind.start();
    const rainBuffer=ctx.createBuffer(1,ctx.sampleRate*2,ctx.sampleRate),data=rainBuffer.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=(Math.random()*2-1)*.32;
    const rain=ctx.createBufferSource();rain.buffer=rainBuffer;rain.loop=true;const rainFilter=ctx.createBiquadFilter();rainFilter.type='lowpass';rainFilter.frequency.value=3800;this.rainGain=ctx.createGain();this.rainGain.gain.value=this.rain;rain.connect(rainFilter);rainFilter.connect(this.rainGain);this.rainGain.connect(this.master);rain.start();await ctx.resume();
  }
  setEnvironment(rain:number,night:number,flying:boolean){this.rain=rain;this.night=night;this.flying=flying;if(this.context){this.rainGain?.gain.setTargetAtTime(rain*.65,this.context.currentTime,.3);this.windGain?.gain.setTargetAtTime(flying ? 0 : 1 + rain * .8,this.context.currentTime,.4);}}
  setVolume(n: number) { this.volume = n; if (this.master && this.context) this.master.gain.setTargetAtTime(n * .25, this.context.currentTime, .15); }
  update(dt: number, speed: number, active: boolean) {
    this.time += dt; if (!this.context || !this.master || !active) return;
    const ctx = this.context;
    if (!this.flying&&speed > .25 && this.time - this.lastStep > (speed > 2.5 ? .25 : .43)) {
      this.lastStep = this.time;
      const osc = ctx.createOscillator(), gain = ctx.createGain(); osc.type = 'triangle'; osc.frequency.setValueAtTime(115, ctx.currentTime); osc.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + .07); gain.gain.setValueAtTime(.16, ctx.currentTime); gain.gain.exponentialRampToValueAtTime(.001, ctx.currentTime + .09); osc.connect(gain); gain.connect(this.master); osc.start(); osc.stop(ctx.currentTime + .1);
    }
    if (this.time > this.nextBird&&this.night<.5&&this.rain<.4) {
      this.nextBird = this.time + 9 + Math.random() * 13;
      for (let i = 0; i < 3; i++) {
        const t = ctx.currentTime + i * .17, osc = ctx.createOscillator(), gain = ctx.createGain(); osc.frequency.setValueAtTime(2300 + Math.random() * 900, t); osc.frequency.exponentialRampToValueAtTime(3600, t + .08); gain.gain.setValueAtTime(.001, t); gain.gain.linearRampToValueAtTime(.06, t + .03); gain.gain.exponentialRampToValueAtTime(.001, t + .12); osc.connect(gain); gain.connect(this.master); osc.start(t); osc.stop(t + .14);
      }
    }
  }
}
