import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import sharp from 'sharp';
import {insidePolygon} from '../src/world/campus-map.ts';

const out='docs/validation/phase13';await mkdir(out,{recursive:true});
const baseline=process.env.BASELINE_URL,current=process.env.TEST_URL??'http://localhost:4173/';
const browser=await chromium.launch({channel:'chrome'}),page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[],missing=[],snapshots=[];
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});page.on('response',r=>{if(r.status()>=400)missing.push(r.url());});
try{
 for(const url of[...(baseline?[baseline]:[]),current]){
  await page.goto(url+'?debug=1');await page.waitForFunction(()=>window.__GULOU__&&!document.querySelector('#enter').disabled);await page.click('#enter');await page.waitForFunction(()=>window.__GULOU__.stats().sectors===3&&window.__GULOU__.stats().environment.heightReady);
  snapshots.push(await page.evaluate(()=>{
   const g=window.__GULOU__.game,roots=[],records={},paintMaterials=new Set();let paintedInstances=0;
   g.scene.traverse(o=>{if(o.name.startsWith('broadleaf trees '))roots.push(o);});
   roots.forEach((root,ri)=>root.children.forEach((cell,ci)=>cell.children.forEach((level,li)=>{
    for(const mesh of level.children){if(!mesh.isInstancedMesh||!mesh.material.name.includes('trunk'))continue;
     const name=mesh.material.name.replace(/-whitewash$/,''),key=[root.name,ri,ci,li,name].join('/');
     const p=mesh.geometry.attributes.position.array,bytes=new Uint8Array(p.buffer,p.byteOffset,p.byteLength);let hash=2166136261;for(const byte of bytes)hash=Math.imul(hash^byte,16777619)>>>0;
     const r=records[key]??{vertices:mesh.geometry.attributes.position.count,hash,matrices:[]};
     for(let i=0;i<mesh.count;i++)r.matrices.push(Array.from(mesh.instanceMatrix.array.slice(i*16,i*16+16)));records[key]=r;
     if(mesh.material.name.endsWith('-whitewash')){paintedInstances+=mesh.count;paintMaterials.add(mesh.material.uuid);}
    }
   })));
   for(const r of Object.values(records))r.matrices.sort((a,b)=>a[12]-b[12]||a[14]-b[14]);
   const ground=g.scene.getObjectByName('Nanyuan roadside tree ground planting');
   return{records,colliders:g.player.physics.colliders.len(),paintedInstances,paintMaterials:paintMaterials.size,trees:ground?.userData.trees,centers:ground?.userData.centers,grassInstances:ground?.count};
  }));
 }
 const final=snapshots.at(-1);
 if(baseline){assert.deepEqual(snapshots[0].records,final.records,'tree geometry and every original instance transform remain unchanged');assert.equal(snapshots[0].colliders,final.colliders,'no new collision obstacles');}
 assert.equal(final.trees.length,4);assert.equal(final.paintedInstances,8,'four trunks in both far/distant levels');assert.equal(final.paintMaterials,1,'one shared painted material across cells and LODs');
 const map=JSON.parse(await readFile('public/data/campus-layout.json','utf8'));
 for(const t of final.trees){assert.ok(t.whitewash&&t.z>400&&t.z<670);assert.ok(map.lawns.some(l=>insidePolygon(t.x,t.z,l)),'selected trunks already stand in lawns');}
 for(const[x,z]of final.centers)assert.ok(map.lawns.some(l=>insidePolygon(x,z,l))&&!map.roads.some(r=>insidePolygon(x,z,r)),'ground planting stays off roads');
 const lod=[];
 for(const quality of['low','medium','high'])for(const [x,y,z,flying]of[[-80,.03,407,false],[-80,95,407,true],[-80,180,407,true],[-350,2,150,false],[-80,.03,407,false]]){
  lod.push(await page.evaluate(({quality,x,y,z,flying})=>{const g=window.__GULOU__.game;g.setQuality(quality);g.player.position.set(x,y,z);g.world.updateVegetation(g.player.position,quality,flying);const geometries=new Set(),materials=new Set();let invalid=0,visible=0;g.scene.traverse(o=>{if(!o.name.startsWith('broadleaf trees '))return;o.traverse(m=>{if(m.geometry)geometries.add(m.geometry.uuid);if(m.material?.name.endsWith('-whitewash'))materials.add(m.material.uuid);});for(const cell of o.children)if(cell.visible){visible++;if(cell.children.filter(level=>level.visible).length!==1)invalid++;}});return{quality,visible,invalid,geometries:[...geometries].sort(),materials:[...materials].sort()};},{quality,x,y,z,flying}));
 }
 assert.ok(lod.every(s=>s.invalid===0&&s.visible>0));for(const s of lod){assert.deepEqual(s.geometries,lod[0].geometries);assert.deepEqual(s.materials,lod[0].materials);}
 await page.evaluate(()=>{const g=window.__GULOU__.game;g.setQuality('medium');g.player.travelTo(-85.4,406.9);g.cameraRig.firstPerson=true;g.cameraRig.yaw=-Math.PI/2;g.cameraRig.pitch=.08;g.setTime(14);g.atmosphere.state.autoTime=false;});
 const start=await page.evaluate(()=>window.__GULOU__.game.player.position.toArray());await page.keyboard.down('KeyW');await page.keyboard.down('ShiftLeft');await page.waitForTimeout(1800);await page.keyboard.up('KeyW');await page.keyboard.up('ShiftLeft');
 const stop=await page.evaluate(()=>window.__GULOU__.game.player.position.toArray()),tree=final.trees.find(t=>Math.abs(t.x+80.1586)<.01);
 assert.ok(stop[0]<tree.x-.6&&stop[0]>start[0]+3,'existing trunk collision still blocks approach');assert.ok(stop[1]<.4,'tree approach remains on ground');
 let alphaComparison;
 if(baseline){
  const response=await fetch(new URL('assets/textures/grass-tuft.png',baseline));assert.ok(response.ok);
  const old=await sharp(Buffer.from(await response.arrayBuffer())).ensureAlpha().raw().toBuffer(),next=await sharp('public/assets/textures/grass-tuft.png').ensureAlpha().raw().toBuffer();assert.equal(old.length,next.length);let visible=0,transparent=0;
  for(let i=0;i<old.length;i+=4){assert.equal(old[i+3],next[i+3],'grass coverage unchanged');if(old[i+3]){assert.deepEqual(next.subarray(i,i+3),old.subarray(i,i+3),'visible blade RGB unchanged');visible++;}else transparent++;}
  alphaComparison={visiblePixelsUnchanged:visible,alphaUnchanged:true,transparentPixels:transparent};
 }
 assert.deepEqual(errors,[]);assert.deepEqual(missing,[]);
 await writeFile(`${out}/street-trees.json`,JSON.stringify({time:new Date().toISOString(),baseline,current,snapshots,lod,start,stop,alphaComparison,errors,missing},null,2));
 console.log(JSON.stringify({paintedTrees:final.trees.length,paintedMaterials:final.paintMaterials,grassInstances:final.grassInstances,colliders:final.colliders,lodChecks:lod.length,transformsMatch:baseline?true:undefined,alphaComparison,errors,missing}));
}catch(e){await page.screenshot({path:`${out}/tree-failure.png`});throw e;}finally{await browser.close();}
