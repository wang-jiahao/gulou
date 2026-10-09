import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';

const compile = source => ts.transpileModule(source, {compilerOptions: {target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS}}).outputText;
const sampleExports = {};
new Function('exports', compile(readFileSync(new URL('../src/game/frame-sample.ts', import.meta.url), 'utf8')))(sampleExports);
const {FrameSample} = sampleExports;
const stages = {simulation: 1, camera: 2, environment: 3, renderSubmission: 4};
let checks = 0;
const check = (name, run) => { run(); checks++; console.log(`PASS ${name}`); };

check('empty, finite samples, nearest-rank quantiles and original CPU mean', () => {
  const sample = new FrameSample();
  assert.equal(sample.summary(), 'not sampled');
  sample.add(0, 1, 1, stages);
  assert.equal(sample.snapshot().frames, 0);
  sample.start(0);
  assert.equal(sample.snapshot().gpuP50Ms, null);
  assert.equal(sample.snapshot().cpuMeanMs, null);
  for (const [i, gap] of [50, 10, 33.4, 80].entries()) sample.add(i + 1, gap, (i + 1) * 2, stages);
  const s = sample.snapshot();
  assert.deepEqual([s.p50Ms, s.p95Ms, s.maxMs, s.over33, s.over50, s.cpuMeanMs], [33.4, 80, 80, 2, 1, 5]);
  assert.deepEqual(s.stageMeanMs, stages);
  assert.match(sample.summary(), /CPU mean\s+5\.0 ms/);
  assert.match(sample.summary(), /GPU completed queries 0\nGPU p50 \/ p95\s+n\/a \/ n\/a ms/);
  for (const value of [NaN, Infinity, -1]) {
    sample.add(5, value, 1, stages); sample.add(5, 1, value, stages);
  }
  sample.add(NaN, 1, 1, stages);
  assert.equal(sample.snapshot().frames, 4);
  sample.add(6, 1, 1, {...stages, camera: Infinity});
  assert.equal(sample.snapshot().frames, 5);
  assert.equal(sample.snapshot().stageFrames, 4);
  assert.throws(() => sample.start(NaN), RangeError);
});

check('deadline, explicit stop, restart and per-frame bound', () => {
  const sample = new FrameSample(); sample.start(100);
  sample.add(99, 90, 80, stages);
  assert.equal(sample.snapshot().frames, 0);
  sample.add(10099, 20, 10, stages);
  assert.equal(sample.isSampling(10100), false);
  sample.add(10100, 99, 99, stages);
  assert.equal(sample.snapshot().frames, 1);
  sample.start(20000); sample.add(20001, 12, 7, stages); sample.stop();
  sample.add(20002, 90, 80, stages);
  assert.equal(sample.snapshot().frames, 1);
  sample.start(30000);
  assert.deepEqual([sample.snapshot().frames, sample.snapshot().stageFrames, sample.snapshot().gpuQueries], [0, 0, 0]);
  for (let i = 0; i < 2200; i++) sample.add(30001 + i, 1, 1, stages);
  assert.equal(sample.snapshot().frames, 2000);
  assert.equal(sample.snapshot().status, 'done');
});

check('GPU completion ownership, invalid results, restart, deadline and query bound', () => {
  const sample = new FrameSample(); sample.start(0);
  const a = {}, b = {}, c = {};
  sample.beginGpuQuery(1, a); sample.beginGpuQuery(2, b); sample.beginGpuQuery(3, c);
  sample.completeGpuQuery(4, a, 18); sample.completeGpuQuery(5, a, 18);
  sample.completeGpuQuery(6, {}, 999); sample.completeGpuQuery(7, b, null);
  sample.completeGpuQuery(8, c, 4);
  assert.deepEqual([sample.snapshot().gpuQueries, sample.snapshot().gpuP50Ms, sample.snapshot().gpuP95Ms], [2, 4, 18]);
  for (const value of [NaN, Infinity, -1]) { const q = {}; sample.beginGpuQuery(10, q); sample.completeGpuQuery(11, q, value); }
  const stale = {}; sample.beginGpuQuery(12, stale); sample.start(20); sample.completeGpuQuery(21, stale, 99);
  assert.equal(sample.snapshot().gpuQueries, 0);
  const invalidated = {}; sample.beginGpuQuery(22, invalidated); sample.invalidateGpuQueries(); sample.completeGpuQuery(23, invalidated, 99);
  const late = {}; sample.beginGpuQuery(24, late); sample.completeGpuQuery(10020, late, 99);
  assert.equal(sample.snapshot().gpuQueries, 0);
  sample.start(20000);
  const queries = Array.from({length: 90}, () => ({}));
  queries.forEach(q => sample.beginGpuQuery(20001, q));
  queries.forEach(q => sample.completeGpuQuery(20002, q, 5));
  const extra = {}; sample.beginGpuQuery(20003, extra); sample.completeGpuQuery(20004, extra, 5);
  assert.equal(sample.snapshot().gpuQueries, 64);
  assert.match(sample.summary(), /do not add to CPU time/);
});

// Execute the actual Game.tick method with deterministic, cheap collaborators.
// No renderer, assets, browser or physics world is initialized.
const gameSource = ts.createSourceFile('game.ts', readFileSync(new URL('../src/game/game.ts', import.meta.url), 'utf8'), ts.ScriptTarget.Latest, true);
const gameClass = gameSource.statements.find(node => ts.isClassDeclaration(node) && node.name.text === 'Game');
const tickSource = gameClass.members.find(node => ts.isMethodDeclaration(node) && node.name.getText(gameSource) === 'tick').getText(gameSource);
function harness(dev = true, gpu = false) {
  let clock = 0, clockCalls = 0;
  const advance = amount => () => { clock += amount; };
  const exports = {};
  new Function('exports', 'T', 'performance', 'localStorage', compile(`export class TickHarness { ${tickSource.replaceAll('import.meta.env.DEV', String(dev))} }`))(
    exports, {MathUtils: {lerp: (a,b,t) => a + (b-a)*t}}, {now: () => { clockCalls++; return clock; }}, {setItem() {}},
  );
  const g = new exports.TickHarness(), position = {y: 0, toArray: () => [0,0,0]};
  Object.assign(g, {
    last: 0, elapsed: 0, frameMs: 16, cpuMs: 0, gpuMs: null, saveAt: Infinity, updateStatsAt: Infinity,
    mode: 'playing', quality: 'medium', photoSaving: false, frameSample: new FrameSample(), gpuQueries: [],
    football: {prepare() {}, update: advance(2)}, basketball: {prepare() {}, update: advance(1)},
    traffic: {prepare: advance(1), sync: advance(1)},
    player: {update: advance(3), position, avatar: {height: 1.8, root: {visible: true}}, speed: 0},
    cameraRig: {yaw: 0, update: advance(5)},
    camera: {position, fov: 64, updateMatrixWorld: advance(1)}, shadowFov: 64,
    atmosphere: {update: advance(2), state: {rain: 0}, daylight: 1, night: 0, sunDirection: {}, sunIntensity: 4, lightColor: {}},
    world: {cameraSolids: [], updateVegetation: advance(7), access: {update: advance(1)}, dadaoping: {update: advance(1)}},
    csm: {lightDirection: {copy() { return this; }, negate() {}}, lights: [], update: advance(2)},
    shadow: {position: {y: 0, copy() {}}}, audio: {setEnvironment: advance(.5), update: advance(.5)},
    renderer: {render: advance(11)}, onTick() {},
    timerExtension: gpu ? {TIME_ELAPSED_EXT: 'elapsed', GPU_DISJOINT_EXT: 'disjoint'} : null,
  });
  const state = {disjoint: false, ready: true, result: 12e6, created: 0};
  g.gl = {
    QUERY_RESULT_AVAILABLE: 'ready', QUERY_RESULT: 'result',
    getQueryParameter: (_q, kind) => kind === 'ready' ? state.ready : state.result,
    getParameter: () => state.disjoint, deleteQuery() {},
    createQuery: () => ({id: ++state.created}), beginQuery: advance(2), endQuery: advance(3),
  };
  return {g, state, calls: () => clockCalls};
}

check('actual tick stages, unchanged CPU total, zero extra clocks outside sample/production', () => {
  const {g, calls} = harness(); g.frameSample.start(0); g.tick(16);
  assert.deepEqual(g.frameSample.snapshot().stageMeanMs, {simulation: 8, camera: 5, environment: 15, renderSubmission: 11});
  assert.equal(g.frameSample.snapshot().cpuMeanMs, 39);
  assert.equal(calls(), 7);
  let previous = calls(); g.tick(10000);
  assert.equal(calls() - previous, 2); // The two pre-existing total-CPU clocks remain.
  assert.equal(g.frameSample.snapshot().frames, 1);
  g.frameSample.start(11000); previous = calls(); g.tick(11016);
  assert.equal(calls() - previous, 7);
  assert.equal(g.frameSample.snapshot().frames, 1);
  const production = harness(false); production.g.frameSample.start(0); production.g.tick(16);
  assert.equal(production.calls(), 2);
  assert.equal(production.g.frameSample.snapshot().frames, 0);
});

check('actual tick collects each fresh GPU result once, excludes old/disjoint queries', () => {
  const {g, state} = harness(true, true); g.frameSample.start(0);
  g.gpuMs = 80; g.gpuQueries.push({old: true}); g.tick(16);
  assert.equal(g.frameSample.snapshot().gpuQueries, 0);
  g.updateStatsAt = 0; g.tick(32);
  assert.equal(state.created, 1);
  assert.equal(g.frameSample.snapshot().stageMeanMs.renderSubmission, 11);
  g.tick(48); assert.equal(g.frameSample.snapshot().gpuQueries, 1);
  for (let time = 64; time <= 160; time += 16) g.tick(time);
  assert.equal(g.frameSample.snapshot().gpuQueries, 1);
  assert.equal(g.frameSample.snapshot().gpuP50Ms, 12);
  g.updateStatsAt = 0; g.tick(176); state.disjoint = true; g.tick(192); state.disjoint = false;
  assert.equal(g.frameSample.snapshot().gpuQueries, 1);
  g.updateStatsAt = 0; g.tick(208); g.frameSample.start(210); g.tick(224);
  assert.equal(g.frameSample.snapshot().gpuQueries, 0);
  g.updateStatsAt = 0; g.tick(240); state.result = NaN; g.tick(256);
  assert.equal(g.frameSample.snapshot().gpuQueries, 0);
  assert.equal(g.gpuMs, 12);
  state.result = 12e6; state.disjoint = true; g.updateStatsAt = 0; g.tick(272);
  state.disjoint = false; g.tick(288);
  assert.equal(g.frameSample.snapshot().gpuQueries, 0);
});

check('actual tick bounds pending GPU queries while results are unavailable', () => {
  const {g, state} = harness(true, true); g.frameSample.start(0); state.ready = false;
  for (let time = 16; time <= 160; time += 16) { g.updateStatsAt = 0; g.tick(time); }
  assert.equal(state.created, 4);
  assert.equal(g.gpuQueries.length, 4);
  assert.equal(g.frameSample.snapshot().gpuQueries, 0);
  g.frameSample.stop(); state.ready = true; g.updateStatsAt = Infinity;
  for (let time = 176; time <= 224; time += 16) g.tick(time);
  assert.equal(g.gpuQueries.length, 0);
  assert.equal(g.frameSample.snapshot().gpuQueries, 0);
});

console.log(`Frame diagnostics: ${checks} bounded checks passed; no scene/GPU benchmark performed.`);
