import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import * as T from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
const {build}=createRequire(import.meta.resolve('vite'))('esbuild');
const context=new Proxy({measureText:()=>({width:50})},{get:(o,p)=>p in o?o[p]:()=>{}});
globalThis.document={createElement:()=>({getContext:()=>context})};
async function moduleFrom(contents){
 const result=await build({stdin:{contents,resolveDir:resolve('src/world'),loader:'ts'},bundle:true,write:false,platform:'node',format:'esm'});
 return import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString('base64')}`);
}
const {fixture}=await moduleFrom(`import {Builder} from './geometry.ts';import {buildNjuMemory} from './nju-memory.ts';import {createCampusBoundaries} from './campus-boundaries.ts';export function fixture(f,m){const b=new Builder(),meshes=[],camera=[],doors=[];const record=buildNjuMemory(f,b,meshes,camera,doors);return {record,meshes,doors,boundary:createCampusBoundaries(m),group:b.finish('memory')};}`);
const map=JSON.parse(await readFile('public/data/campus-layout.json','utf8')),f=map.features.find(f=>f.id==='plan-76');
const data=fixture(f,{textures:new Map([['stone-grain.webp',new T.Texture()],['nju-emblem.png',new T.Texture()]])});
const baselineRef='ed19121';
const baseline=await moduleFrom(execFileSync('git',['show',`${baselineRef}:src/world/south-boundary-layout.ts`],{encoding:'utf8'}));
await RAPIER.init();
function worldOf(panels,meshes=[]){const world=new RAPIER.World({x:0,y:0,z:0});for(const s of panels)world.createCollider(RAPIER.ColliderDesc.cuboid(s.w/2,s.h/2,s.d/2).setTranslation(s.x,s.y,s.z).setRotation({x:0,y:Math.sin((s.angle||0)/2),z:0,w:Math.cos((s.angle||0)/2)}));for(const m of meshes)world.createCollider(RAPIER.ColliderDesc.trimesh(m.vertices,m.indices));world.step();return world;}
const oldPanels=baseline.southBoundaryRuns.flatMap(r=>r.points.slice(1).map(([bx,bz],i)=>{const[ax,az]=r.points[i];return{x:(ax+bx)/2,y:1.575,z:(az+bz)/2,w:Math.hypot(bx-ax,bz-az)+.34,h:3.15,d:.48,angle:Math.atan2(az-bz,bx-ax)};}));
const before=worldOf(oldPanels),after=worldOf(data.boundary.solids,data.meshes),routes=[];
function cast(world,a,b,shape,yaw=0){return world.castShape(a,{x:0,y:Math.sin(yaw/2),z:0,w:Math.cos(yaw/2)}, {x:b.x-a.x,y:0,z:b.z-a.z},shape,0,1,true);}
const door=data.doors[0],front=data.record.frontage;
assert.ok(front[3]<-.99,'store faces public Hankou Road');
for(const mode of ['walk','bicycle-envelope']){
 const shape=mode==='walk'?new RAPIER.Capsule(.5,.32):new RAPIER.Cuboid(.42,.7,1.1);
 for(const u of[-.8,0,.8]){
  const point=v=>({x:door.x+front[3]*u+front[2]*v,y:1.1,z:door.z-front[2]*u+front[3]*v});
  const a=point(13),b=point(1.35);
  assert.ok(cast(before,a,b,shape),'baseline railings blocked the shop approach');
  assert.equal(cast(after,a,b,shape),null,`${mode}:approach:${u}`);
  assert.equal(cast(after,b,a,shape),null,`${mode}:exit:${u}`);routes.push(`${mode}:${u}:both`);
 }
}
const walk=new RAPIER.Capsule(.5,.32);let blockedSamples=0;
// Independently sweep the entire changed interval, including both building
// corners and railing joins. A clear result would expose an unintended entry.
for(let x=-151;x<=-98;x+=.16){assert.ok(cast(after,{x,y:1.1,z:369},{x,y:1.1,z:403},walk),`campus boundary leak at ${x}`);blockedSamples++;}
for(const direction of[-1,1])assert.equal(cast(after,{x:-119+direction*11,y:1.1,z:375},{x:-119-direction*11,y:1.1,z:375},walk),null,'public pavement stays traversable');
const report={version:'0.85.0',baselineRef,passed:true,routes,blockedSamples,record:data.record,scope:'CPU shop shell and boundary colliders; capsule and bicycle envelope, not full player dynamics; lettering requires UI review'};
await mkdir('docs/validation/v0.85',{recursive:true});await writeFile(`docs/validation/v0.85/layout-${Date.now()}.json`,JSON.stringify(report,null,2),{flag:'wx'});
before.free();after.free();console.log(JSON.stringify({passed:true,approachAndExitRoutes:routes.length*2,blockedSamples}));
