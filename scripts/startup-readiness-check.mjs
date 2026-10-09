// Exercise the real Game.init with controlled asset/GPU boundaries, not a browser.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';
const {build}=createRequire(import.meta.resolve('vite'))('esbuild');
const source={
  three:'export * from "real-three"; export class PMREMGenerator {fromEquirectangular(){return {texture:{}}} dispose(){}}',
  'RGBELoader.js':'export class RGBELoader {async loadAsync(){return {}}}',
  'CSM.js':'export class CSM {}',
  '@dimforge/rapier3d-compat':'export default {init:async()=>{}}',
  'materials.ts':'export async function loadMaterials(){return {}}',
  'world.ts':'export const spawn={}; export async function createWorld(){return globalThis.__startupFixture.world}',
  'controller.ts':'export class Player {constructor(){return globalThis.__startupFixture.player}}',
  'avatar.ts':'export async function createAvatar(){return {}}',
  'camera.ts':'export class WalkCamera {}',
  'street-traffic.ts':'export class StreetTraffic {}',
  'football.ts':'export class Football {}',
  'basketball.ts':'export class Basketball {}',
  'music.ts':'export class Music {}',
  'ambience.ts':'export class Ambience {}',
  'atmosphere.ts':'export class Atmosphere {constructor(){return globalThis.__startupFixture.atmosphere}}',
};
const result=await build({entryPoints:[resolve('src/game/game.ts')],bundle:true,write:false,format:'esm',platform:'node',define:{'import.meta.env.BASE_URL':'"/"','import.meta.env.DEV':'true'},plugins:[{name:'controlled-assets',setup(b){
  b.onResolve({filter:/.*/},args=>{if(args.path==='real-three')return {path:import.meta.resolve('three'),external:true};const key=Object.keys(source).find(k=>args.path===k||args.path.endsWith('/'+k));if(key)return {path:key,namespace:'fixture'};});
  b.onLoad({filter:/.*/,namespace:'fixture'},args=>({contents:source[args.path],loader:'js'}));
}}]});
const {Game}=await import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString('base64')}`);
const flush=()=>new Promise(resolve=>setImmediate(resolve));
function deferred(){let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b});return {promise,resolve,reject};}
function setup({renderError=false}={}){
  const expansion=deferred(),rain=deferred(),shaders=deferred(),frames=[],events=[],progress=[];
  globalThis.requestAnimationFrame=callback=>{frames.push(callback);return frames.length;};
  const world={solids:[],fixedMeshes:['core'],lampPositions:[],cameraSolids:[],pitch:{},expand:async callback=>{await expansion.promise;world.fixedMeshes.push('expanded roof');callback();callback();return ['expanded collider'];}};
  const player={avatar:{setOutfit(){}},addSolids(s){events.push(['solids',s])},addMeshes(s){events.push(['meshes',s])},groundHeightAt(){return 0}};
  const atmosphere={setQuality(){},setLamps(){},buildRainHeights:()=>rain.promise};
  globalThis.__startupFixture={world,player,atmosphere};
  const game={mode:'loading',loadingTimings:[],music:{load(){}},scene:{add(){}},renderer:{compileAsync(){events.push('compile');return shaders.promise},setAnimationLoop(){events.push('loop')}},
    cameraRig:{prepareObstacles(){events.push('camera bounds')},update(){}},frameSample:{start(){events.push('sample')}},createContactShadow(){return {}},setupShadowMaterials(){events.push('shadows')},tick(){events.push('render');if(renderError)throw new Error('render failed')},onNotice(){}};
  const done=Game.prototype.init.call(game,(p)=>progress.push(p));
  // Attach rejection immediately so deliberately rejected prerequisites stay handled.
  const result=done.then(()=>({ok:true}),error=>({ok:false,error}));
  const notReady=()=>{assert.equal(game.mode,'loading');assert.ok(!progress.includes(1));assert.ok(!events.includes('loop'));};
  return {expansion,rain,shaders,frames,events,progress,game,result,notReady};
}
const successful=setup();await flush();successful.notReady();
successful.expansion.resolve();await flush();successful.notReady();
assert.deepEqual(successful.events.slice(0,2),[['solids',['expanded collider']],['meshes',['expanded roof']]]);
successful.rain.resolve();await flush();successful.notReady();assert.ok(successful.events.includes('compile'));
successful.shaders.resolve();await flush();successful.notReady();assert.equal(successful.frames.length,1);
successful.frames.shift()(100);await flush();successful.notReady();assert.ok(successful.events.includes('render'));
successful.frames.shift()(117);assert.equal((await successful.result).ok,true);assert.equal(successful.game.mode,'ready');assert.equal(successful.progress.at(-1),1);
assert.ok(successful.progress.every((v,i,a)=>!i||v>=a[i-1]));assert.equal(successful.events.filter(e=>e==='loop').length,1);
for(const stage of ['expansion','rain','shaders','render']){
  const f=setup({renderError:stage==='render'});await flush();
  for(const name of ['expansion','rain','shaders']){if(name===stage){f[name].reject(new Error(`${stage} failed`));break;}f[name].resolve();await flush();}
  if(stage==='render'){f.frames.shift()(100);await flush();}
  const result=await f.result;assert.equal(result.ok,false);assert.equal(result.error.message,`${stage} failed`);f.notReady();
}
console.log('PASS: real init waits for expansion/colliders, rain, shaders and rendered frame; monotonic progress; four failure paths never enable entry or loop. GPU/assets mocked; browser checks required.');
