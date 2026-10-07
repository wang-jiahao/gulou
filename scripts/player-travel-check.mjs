import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';

// Exercise the production Player and Rapier, including the actual Fei meshes.
// Only global world construction and avatar rendering are omitted.
const directory='docs/validation/v0.98';
await mkdir(directory,{recursive:true});
const reportPath=`${directory}/player-travel-${Date.now()}.json`;
const report={passed:false,checks:[]};
const players=[];
try {
 const ctx=new Proxy({measureText:()=>({width:50})},{get:(o,p)=>p in o?o[p]:()=>{}});
 globalThis.document={createElement:()=>({getContext:()=>ctx})};
 const {build}=createRequire(import.meta.resolve('vite'))('esbuild');
 const bundle=await build({stdin:{contents:`
import * as T from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import {Player} from './player/controller.ts';
import {terrainHeight} from './world/courtyard-terrain.ts';
import {Builder} from './world/geometry.ts';
import {buildFeiYimin} from './world/fei-yimin.ts';
import {entranceMaterials} from './world/building-entrances.ts';
export {T,RAPIER,Player,terrainHeight};
export function fei(f){const b=new Builder(),meshes=[];
const record=buildFeiYimin(f,{textures:new Map()},b,meshes,[],[],entranceMaterials());return {record,meshes};}
`,resolveDir:resolve('src'),loader:'ts'},bundle:true,write:false,platform:'node',format:'esm',plugins:[{
 name:'world-fixture',setup(b){
  b.onResolve({filter:/\/world\/world\.ts$/},()=>({path:'world',namespace:'fixture'}));
  b.onLoad({filter:/.*/,namespace:'fixture'},()=>({contents:`import {Vector3} from 'three';export const bounds={minX:-1000,maxX:1000,minZ:-1000,maxZ:1000};export const spawn=new Vector3(300,0,300);export const maxFlightAltitude=150;`,resolveDir:resolve('src')}));
 }}]});
 const {T,RAPIER,Player,terrainHeight,fei}=await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);
 await RAPIER.init();
 const solid=(x,z,w,d,top,h=.2)=>({x,y:top-h/2,z,w,h,d});
 function player(solids,meshes=[]){const p=new Player(new T.Scene(),solids,{root:new T.Group(),setGroundSampler(){},update(){}},meshes);players.push(p);return p;}
 function check(name,p,x,z,mode,expected){
  const result=p.travelTo(x,z,mode);assert.ok(result,`${name}: no destination`);
  expected(result);
  assert.ok(Math.abs(p.position.y-result.y)<1e-5,`${name}: returned height differs from actual position`);
  assert.ok(Math.abs(p.body.translation().y-result.y-.86)<1e-4,`${name}: capsule position`);
  report.checks.push({name,...result});return result;
 }
 const base=solid(-200,-200,100,100,0);
 const canopy=player([base,solid(-200,-200,16,16,7.7,.2)]);
 check('named entrance below canopy',canopy,-200,-200,'ground',r=>assert.ok(Math.abs(r.y-.06)<.001));
 check('map default still lands on canopy',canopy,-200,-200,undefined,r=>assert.ok(Math.abs(r.y-7.76)<.001));
 const elevation=terrainHeight(0,40);
 const terrace=player([solid(0,40,20,20,elevation),solid(0,40,10,10,elevation+8)]);
 check('raised terrace below canopy',terrace,0,40,'ground',r=>assert.ok(Math.abs(r.y-elevation-.06)<.001));
 const lower=player([solid(0,40,20,20,elevation-.24)]);
 check('landing below terrain estimate',lower,0,40,'ground',r=>assert.ok(Math.abs(r.y-elevation+.18)<.001));
 const blocked=player([base,solid(-200,-200,3,3,4.2,4.2)]);
 check('blocked entrance searches nearby',blocked,-200,-200,'ground',r=>{assert.equal(r.adjusted,true);assert.ok(Math.hypot(r.x+200,r.z+200)>1.7);assert.ok(r.y<.1);});
 const empty=player([]),before=empty.position.clone();
 assert.equal(empty.travelTo(-200,-200,'ground'),null);assert.ok(empty.position.equals(before));report.checks.push({name:'no supporting surface leaves player unchanged'});
 for(const[x,z]of[[NaN,0],[0,Infinity],[-Infinity,0]])assert.equal(canopy.travelTo(x,z,'ground'),null);
 report.checks.push({name:'nonfinite coordinates rejected'});
 const map=JSON.parse(await readFile('public/data/campus-layout.json','utf8'));
 const data=fei(map.features.find(f=>f.id==='plan-4'));
 const {origin,angle}=data.record.localFrame;
 const point=(u,v)=>[origin[0]+u*Math.cos(angle)-v*Math.sin(angle),origin[1]+u*Math.sin(angle)+v*Math.cos(angle)];
 const actual=player([solid(0,0,2000,2000,0)],data.meshes);
 check('actual software waypoint below glass canopy',actual,...point(12.7,45),'ground',r=>{assert.equal(r.adjusted,false);assert.ok(r.y<.1);});
 check('actual software map point on glass canopy',actual,...point(12.7,45),undefined,r=>assert.ok(r.y>7.7));
 check('actual recessed entry landing',actual,...point(12.7,36),'ground',r=>assert.ok(Math.abs(r.y-.24)<.005));
 report.passed=true;
}catch(error){report.error=error.stack;throw new Error(error.message);}
finally{for(const p of players)p.physics.free();await writeFile(reportPath,JSON.stringify(report,null,2),{flag:'wx'});console.log(JSON.stringify({passed:report.passed,checks:report.checks.length,reportPath}));}
