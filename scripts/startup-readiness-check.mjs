// Exercise the real Game.init with controlled asset/GPU boundaries, not a browser.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
const {build}=createRequire(import.meta.resolve('vite'))('esbuild');
const atmosphereSource=ts.createSourceFile('atmosphere.ts',readFileSync('src/world/atmosphere.ts','utf8'),ts.ScriptTarget.Latest,true);
const atmosphereClass=atmosphereSource.statements.find(n=>ts.isClassDeclaration(n)&&n.name.text==='Atmosphere');
const warmSource=atmosphereClass.members.find(n=>ts.isMethodDeclaration(n)&&n.name.getText(atmosphereSource)==='warmLightingVariants').getText(atmosphereSource);
const warmExports={};
new Function('exports',ts.transpileModule(`export class Lighting {${warmSource}}`,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText)(warmExports);
const warmLightingVariants=warmExports.Lighting.prototype.warmLightingVariants;
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
  const expansion=deferred(),rain=deferred(),shaders=deferred(),nightShaders=deferred(),frames=[],events=[],progress=[];
  globalThis.requestAnimationFrame=callback=>{frames.push(callback);return frames.length;};
  const world={solids:[],fixedMeshes:['core'],lampPositions:[],cameraSolids:[],pitch:{},expand:async callback=>{await expansion.promise;world.fixedMeshes.push('expanded roof');callback();callback();return ['expanded collider'];}};
  const player={avatar:{setOutfit(){}},addSolids(s){events.push(['solids',s])},addMeshes(s){events.push(['meshes',s])},groundHeightAt(){return 0}};
  const initialVisibility=[true,true,true,true,false,false];
  const atmosphere={setQuality(){},setLamps(){},buildRainHeights:()=>rain.promise,warmLightingVariants,pointCount:4,pointLights:initialVisibility.map(visible=>({visible,intensity:0}))};
  globalThis.__startupFixture={world,player,atmosphere};
  let compileCount=0;
  const game={mode:'loading',loadingTimings:[],music:{load(){}},scene:{add(){}},renderer:{compileAsync(){events.push(['compile',atmosphere.pointLights.filter(l=>l.visible).length]);return ++compileCount===1?shaders.promise:nightShaders.promise},setAnimationLoop(){events.push('loop')}},
    cameraRig:{prepareObstacles(){events.push('camera bounds')},update(){}},frameSample:{start(){events.push('sample')}},createContactShadow(){return {}},setupShadowMaterials(){events.push('shadows')},tick(){events.push('render');if(renderError)throw new Error('render failed')},onNotice(){}};
  const done=Game.prototype.init.call(game,(p)=>progress.push(p));
  // Attach rejection immediately so deliberately rejected prerequisites stay handled.
  const result=done.then(()=>({ok:true}),error=>({ok:false,error}));
  const notReady=()=>{assert.equal(game.mode,'loading');assert.ok(!progress.includes(1));assert.ok(!events.includes('loop'));};
  const restored=()=>assert.deepEqual(atmosphere.pointLights.map(l=>l.visible),initialVisibility);
  return {expansion,rain,shaders,nightShaders,frames,events,progress,game,result,notReady,restored};
}
const successful=setup();await flush();successful.notReady();
successful.expansion.resolve();await flush();successful.notReady();
assert.deepEqual(successful.events.slice(0,2),[['solids',['expanded collider']],['meshes',['expanded roof']]]);
successful.rain.resolve();await flush();successful.notReady();assert.deepEqual(successful.events.filter(e=>Array.isArray(e)&&e[0]==='compile'),[['compile',0]]);
successful.shaders.resolve();await flush();successful.notReady();assert.equal(successful.frames.length,0);
assert.deepEqual(successful.events.filter(e=>Array.isArray(e)&&e[0]==='compile'),[['compile',0],['compile',4]]);
successful.nightShaders.resolve();await flush();successful.notReady();successful.restored();assert.equal(successful.frames.length,1);
successful.frames.shift()(100);await flush();successful.notReady();assert.ok(successful.events.includes('render'));
successful.frames.shift()(117);assert.equal((await successful.result).ok,true);assert.equal(successful.game.mode,'ready');assert.equal(successful.progress.at(-1),1);
assert.ok(successful.progress.every((v,i,a)=>!i||v>=a[i-1]));assert.equal(successful.events.filter(e=>e==='loop').length,1);
for(const stage of ['expansion','rain','shaders','nightShaders','render']){
  const f=setup({renderError:stage==='render'});await flush();
  for(const name of ['expansion','rain','shaders','nightShaders']){if(name===stage){f[name].reject(new Error(`${stage} failed`));break;}f[name].resolve();await flush();}
  if(stage==='render'){f.frames.shift()(100);await flush();}
  const result=await f.result;assert.equal(result.ok,false);assert.equal(result.error.message,`${stage} failed`);f.notReady();f.restored();
}
let warmCases=0;
for(const pointCount of [2,4,6])for(const mask of [[false,false,false,false,false,false],[true,false,true,true,false,true]])for(const failAt of [-1,0,1]){
  const pointLights=mask.map((visible,i)=>({visible,intensity:i%2?19:0,position:{x:i,y:4,z:-i},distance:14,decay:2})),original=structuredClone(pointLights),seen=[],error=new Error('compile failed');
  const result=warmLightingVariants.call({pointCount,pointLights},async()=>{
    const step=seen.length;seen.push(pointLights.filter(l=>l.visible).length);
    assert.deepEqual(pointLights.map(({visible,...rest})=>rest),original.map(({visible,...rest})=>rest),'prewarm never changes intensity, position or attenuation');
    if(step===failAt)throw error;
  });
  if(failAt<0)await result;else await assert.rejects(result,e=>e===error);
  assert.deepEqual(seen,failAt===0?[0]:[0,pointCount]);assert.deepEqual(pointLights,original);warmCases++;
}
console.log(`PASS: real init awaits expansion/colliders, rain, zero-light and current-quality night-light shaders, then rendered frame; monotonic progress; five failure paths preserve loading and restore lights. ${warmCases} actual warm-method success/failure/quality cases. GPU/assets mocked; browser checks required.`);
