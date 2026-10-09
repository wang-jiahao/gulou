export type FrameStages = { simulation: number; camera: number; environment: number; renderSubmission: number };
const durationMs = 10000, maxFrames = 2000, maxGpuQueries = 64;
const validMs = (value: number) => Number.isFinite(value) && value >= 0;
const percentile = (sorted: number[], fraction: number) => sorted[Math.max(0, Math.ceil(sorted.length * fraction) - 1)] ?? null;
const format = (value: number | null) => value === null ? 'n/a' : value.toFixed(1);

/** Bounded development measurement. GPU results belong to the query's sampling session. */
export class FrameSample {
  private until: number | null = null;
  private frames: number[] = [];
  private cpu: number[] = [];
  private stages: FrameStages = { simulation: 0, camera: 0, environment: 0, renderSubmission: 0 };
  private stageFrames = 0;
  private gpu: number[] = [];
  private pendingGpu = new Set<object>();
  private done = false;
  start(now: number) {
    if (!Number.isFinite(now)) throw new RangeError('A finite sample start time is required.');
    this.until = now + durationMs; this.frames = []; this.cpu = []; this.done = false;
    this.stages = { simulation: 0, camera: 0, environment: 0, renderSubmission: 0 }; this.stageFrames = 0;
    this.gpu = []; this.pendingGpu.clear();
  }
  stop() { if (this.until !== null) this.done = true; this.pendingGpu.clear(); }
  isSampling(now: number) {
    if (this.until === null || this.done || !Number.isFinite(now)) return false;
    if (now < this.until - durationMs) return false;
    if (now >= this.until) { this.stop(); return false; }
    return true;
  }
  add(now: number, frameMs: number, cpuMs: number, stages?: FrameStages) {
    if (!this.isSampling(now) || !validMs(frameMs) || !validMs(cpuMs)) return;
    this.frames.push(frameMs); this.cpu.push(cpuMs);
    if (stages && validMs(stages.simulation) && validMs(stages.camera) && validMs(stages.environment) && validMs(stages.renderSubmission)) {
      for (const key of Object.keys(this.stages) as (keyof FrameStages)[]) this.stages[key] += stages[key];
      this.stageFrames++;
    }
    if (this.frames.length >= maxFrames) this.stop();
  }
  beginGpuQuery(now: number, query: object) {
    if (this.isSampling(now) && this.gpu.length + this.pendingGpu.size < maxGpuQueries) this.pendingGpu.add(query);
  }
  completeGpuQuery(now: number, query: object, gpuMs: number | null) {
    const owned = this.pendingGpu.delete(query);
    if (owned && this.isSampling(now) && gpuMs !== null && validMs(gpuMs)) this.gpu.push(gpuMs);
  }
  invalidateGpuQueries() { this.pendingGpu.clear(); }
  snapshot() {
    const values = [...this.frames].sort((a,b)=>a-b), gpu = [...this.gpu].sort((a,b)=>a-b);
    const stageMeanMs = this.stageFrames ? {
      simulation: this.stages.simulation / this.stageFrames, camera: this.stages.camera / this.stageFrames,
      environment: this.stages.environment / this.stageFrames, renderSubmission: this.stages.renderSubmission / this.stageFrames,
    } : null;
    return {
      status: this.until === null ? 'idle' : this.done ? 'done' : 'sampling', frames: values.length,
      p50Ms: percentile(values, .5), p95Ms: percentile(values, .95), maxMs: percentile(values, 1),
      over33: values.filter(v=>v>33.4).length, over50: values.filter(v=>v>50).length,
      cpuMeanMs: this.cpu.length ? this.cpu.reduce((a,b)=>a+b,0) / this.cpu.length : null,
      stageFrames: this.stageFrames, stageMeanMs,
      gpuQueries: gpu.length, gpuP50Ms: percentile(gpu, .5), gpuP95Ms: percentile(gpu, .95),
    };
  }
  summary() {
    const s = this.snapshot();
    if (s.status === 'idle') return 'not sampled';
    const stages = s.stageMeanMs;
    return `${s.status} ${s.frames} frames\np50 / p95 / max ${format(s.p50Ms)} / ${format(s.p95Ms)} / ${format(s.maxMs)} ms\n>33 / >50 ms    ${s.over33} / ${s.over50}\nCPU mean        ${format(s.cpuMeanMs)} ms\nCPU stages mean (${s.stageFrames} frames)\nsimulation / camera ${format(stages?.simulation ?? null)} / ${format(stages?.camera ?? null)} ms\nenvironment / render submission ${format(stages?.environment ?? null)} / ${format(stages?.renderSubmission ?? null)} ms\nGPU completed queries ${s.gpuQueries}\nGPU p50 / p95   ${format(s.gpuP50Ms)} / ${format(s.gpuP95Ms)} ms\nGPU is actual device time; do not add to CPU time.`;
  }
}
