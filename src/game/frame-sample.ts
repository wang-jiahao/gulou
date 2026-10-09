/** Bounded development measurement; records real frame gaps without smoothing. */
export class FrameSample {
  private until = 0;
  private frames: number[] = [];
  private cpu: number[] = [];
  private done = false;
  start(now: number) { this.until = now + 10000; this.frames = []; this.cpu = []; this.done = false; }
  add(now: number, frameMs: number, cpuMs: number) {
    if (!this.until || this.done) return;
    this.frames.push(frameMs); this.cpu.push(cpuMs);
    if (now >= this.until || this.frames.length >= 2000) this.done = true;
  }
  summary() {
    if (!this.until) return 'not sampled';
    const values = [...this.frames].sort((a,b)=>a-b);
    const percentile = (fraction: number) => (values[Math.max(0, Math.ceil(values.length*fraction)-1)] ?? 0).toFixed(1);
    const meanCpu = this.cpu.reduce((a,b)=>a+b,0)/Math.max(1,this.cpu.length);
    return `${this.done?'done':'sampling'} ${values.length} frames\np50 / p95 / max ${percentile(.5)} / ${percentile(.95)} / ${percentile(1)} ms\n>33 / >50 ms    ${values.filter(v=>v>33.4).length} / ${values.filter(v=>v>50).length}\nCPU mean        ${meanCpu.toFixed(1)} ms`;
  }
}
