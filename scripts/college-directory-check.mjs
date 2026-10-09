import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';

const {build}=createRequire(import.meta.resolve('vite'))('esbuild');
const {createCanvas,loadImage,GlobalFonts}=await import(process.env.COLLEGE_CANVAS_MODULE||'@napi-rs/canvas');
if(process.env.COLLEGE_QA_FONT)GlobalFonts.registerFromPath(process.env.COLLEGE_QA_FONT,'PingFang SC');
globalThis.document={createElement(tag){assert.equal(tag,'canvas');return createCanvas(1,1);}};
const source=await readFile('src/world/world.ts','utf8');
// Execute the actual initialization statements with the real directory and
// painter. Only full-campus construction, image transport and the renderer are
// omitted; importantly, the preload catch cannot swallow a Canvas exception.
const start=source.indexOf('  let collegePortraitLoadError:'),end=source.indexOf('  const fountain=',start);
assert.ok(start>0&&end>start);
const initialization=source.slice(start,end);
const built=await build({stdin:{contents:`import * as T from 'three';export{T};import{createCampusDirectory}from'./campus-directory.ts';import{preloadCollegePortraitImages as preload}from'./college-portrait-panel.ts';export{collegeStories,collegePortraitOrder}from'./college-stories.ts';export async function fixture(map,mats,loader){const preloadCollegePortraitImages=base=>preload(base,loader),root=new T.Group(),solids=[],cameraSolids=[];${initialization}return{directory,root,solids,cameraSolids};}`,resolveDir:resolve('src/world'),loader:'ts'},bundle:true,write:false,platform:'node',format:'esm',define:{'import.meta.env.BASE_URL':JSON.stringify('/gulou/')}});
const {T,fixture,collegeStories,collegePortraitOrder}=await import(`data:text/javascript;base64,${Buffer.from(built.outputFiles[0].text).toString('base64')}`);
const map=JSON.parse(await readFile('public/data/campus-layout.json','utf8')),mats={textures:new Map(['historic-brick.webp','stone-grain.webp','nju-emblem.png'].map(n=>[n,new T.Texture()]))};for(const n of ['stone','grass','path','brick','wood','metal','bark'])mats[n]=new T.MeshStandardMaterial({name:n});
const loader=url=>loadImage(resolve('public',url.slice('/gulou/'.length))),warnings=[],warn=console.warn;
console.warn=(...args)=>warnings.push(args);
let fallback;
try{fallback=await fixture(map,mats,url=>url.endsWith('yuxiu.webp')?Promise.reject(new Error('fixture image failure')):loader(url));}
finally{console.warn=warn;}
assert.equal(fallback.directory.group.userData.portraitLoad.status,'failed');
assert.match(fallback.directory.group.userData.portraitLoad.error,/fixture image failure/);
assert.equal(warnings.length,1,'failed transport is observable');
const fallbackMaterials=fallback.directory.group.children.filter(m=>m.material.name.startsWith('college-portrait-panel-')).map(m=>m.material);
assert.equal(fallbackMaterials.length,7);
for(const material of fallbackMaterials){assert.equal(material.userData.portraitStatus,'missing');assert.deepEqual(material.userData.layout.text.lines.map(p=>p.join('')),collegeStories[material.userData.collegeId].paragraphs,'load failure preserves complete accurate biography');}
const document=globalThis.document;
globalThis.document={createElement:()=>({getContext:()=>null})};
try{await assert.rejects(fixture(map,mats,loader),/requires a 2D canvas/,'drawing failure remains fatal');}
finally{globalThis.document=document;}
const data=await fixture(map,mats,loader),{group}=data.directory,panels=group.userData.panels;
assert.equal(group.userData.portraitLoad.status,'loaded');assert.equal(group.userData.portraitLoad.error,null);
assert.equal(panels.length,19);assert.match(group.userData.approximateArrangement.sequence,/physical sequence unknown/);
assert.equal(data.cameraSolids.length,group.children.length);assert.ok(data.cameraSolids.every(m=>m.isMesh&&m.parent===group));
for(const side of ['west','east'])assert.deepEqual(new Set(panels.filter(p=>p.board.startsWith(side)).map(p=>p.collegeId)),new Set(collegePortraitOrder),`all seven accurate subjects occur on ${side} wall`);
const artworkMeshes=group.children.filter(m=>m.material.name.startsWith('college-portrait-panel-'));
assert.equal(artworkMeshes.length,7,'seven shared canvases, rather than nineteen');
let planes=0;
for(const mesh of artworkMeshes){
 const material=mesh.material,id=material.userData.collegeId,expected=panels.filter(p=>p.collegeId===id),g=mesh.geometry,p=g.getAttribute('position'),normal=g.getAttribute('normal');
 assert.equal(material.userData.person,collegeStories[id].person);assert.equal(material.userData.college,collegeStories[id].college);
 assert.equal(material.userData.portraitStatus,id==='anbang'?'missing':'available');
 assert.equal(p.count,expected.length*4);planes+=expected.length;
 for(let i=0;i<expected.length;i++){
  const a=new T.Vector3().fromBufferAttribute(p,i*4),b=new T.Vector3().fromBufferAttribute(p,i*4+1),c=new T.Vector3().fromBufferAttribute(p,i*4+2);
  assert.ok(Math.abs(a.distanceTo(b)/a.distanceTo(c)-3.4)<.001,'world plane keeps portrait aspect');
  assert.ok(Math.abs(normal.getX(i*4)-Math.sin(expected[i].angle))<1e-6&&Math.abs(normal.getZ(i*4)-Math.cos(expected[i].angle))<1e-6,'same-person panel faces its road');
 }
}
assert.equal(planes,19);
// Optional saved baseline proves this task did not alter any physical wall,
// footpath, curb, screen or fountain-facing obstruction.
const baselinePath=process.env.COLLEGE_DIRECTORY_BASELINE;
if(baselinePath){
 const baseline=await build({stdin:{contents:await readFile(baselinePath,'utf8'),resolveDir:resolve('src/world'),loader:'ts'},bundle:true,write:false,platform:'node',format:'esm'});
 const {createCampusDirectory}=await import(`data:text/javascript;base64,${Buffer.from(baseline.outputFiles[0].text).toString('base64')}`);
 assert.deepEqual(data.directory.solids,createCampusDirectory(map,mats).solids,'all physical colliders unchanged');
}
const out=process.env.COLLEGE_QA_OUT||`docs/validation/life-facilities/college-directory-${Date.now()}`;await mkdir(out,{recursive:true});
for(const id of ['bingwen','anbang']){const canvas=createCanvas(800,236),ctx=canvas.getContext('2d');ctx.drawImage(artworkMeshes.find(m=>m.material.userData.collegeId===id).material.map.image,0,0,800,236);await writeFile(`${out}/${id}-800.png`,canvas.toBuffer('image/png'));}
const report={passed:true,panels:panels.length,sharedCanvases:artworkMeshes.length,knownMissingPortrait:'戴安邦',imageFailure:'warning + complete text fallback',canvasFailure:'propagates out of world initialization',collidersUnchanged:Boolean(baselinePath),arrangement:group.userData.approximateArrangement,scope:'Real native Canvas plus production world directory initialization and transformed panel geometry. No real browser rendering or full-campus performance measurement.'};
await writeFile(`${out}/integration.json`,JSON.stringify(report,null,2));console.log(JSON.stringify(report));
