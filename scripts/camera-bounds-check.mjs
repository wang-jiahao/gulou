import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';

const channel=process.env.BROWSER_CHANNEL??'chrome',out='docs/validation/phase34';
await mkdir(out,{recursive:true});
const browser=await chromium.launch(process.env.EDGE_EXECUTABLE?{executablePath:process.env.EDGE_EXECUTABLE}:{channel});
const report={channel,errors:[]};
try{
 const page=await browser.newPage({viewport:{width:1440,height:900},deviceScaleFactor:2});
 page.on('pageerror',e=>report.errors.push(e.message));
 await page.goto('http://localhost:4173/?debug=1');
 await page.waitForFunction(()=>window.__GULOU__&&!document.querySelector('#enter').disabled,{},{timeout:60000});
 await page.click('#enter');await page.waitForFunction(()=>window.__GULOU__.stats().sectors===3&&window.__GULOU__.stats().environment.heightReady);
 report.comparison=await page.evaluate(()=>{
  const g=window.__GULOU__.game;g.renderer.setAnimationLoop(null);g.scene.updateMatrixWorld(true);
  const objects=g.world.cameraSolids,rig=g.cameraRig;rig.prepareObstacles(objects);
  const geometries=[...new Set(objects.filter(o=>o.geometry&&!o.isSkinnedMesh).map(o=>o.geometry))];
  const bounds=geometries.map(geometry=>geometry.boundingBox),rays=[];
  const vector=()=>g.player.position.clone().set(0,0,0);
  for(const [i,o] of objects.entries()){
   if(i%3||!o.geometry?.boundingBox)continue;
   const box=o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld),center=box.getCenter(vector()),size=box.getSize(vector());
   for(const axis of ['x','z']){
    const origin=center.clone();origin[axis]+=size[axis]/2+2;
    const direction=vector();direction[axis]=-1;
    rays.push({origin,direction,far:Math.min(11.6,size[axis]+4)});
   }
  }
  for(const x of [-310,-245,-110,0,70])for(const z of [-10,82,175,328,395])for(const y of [2,40,140]){
   rays.push({origin:vector().set(x,y,z),direction:vector().set(.3,-.2,1).normalize(),far:11.6});
  }
  const cast=()=>rays.map(({origin,direction,far})=>{
   rig.ray.set(origin,direction);rig.ray.far=far;
   return rig.ray.intersectObjects(objects,false).map(h=>({object:h.object.id,face:h.faceIndex,distance:h.distance,point:h.point.toArray()}));
  });
  geometries.forEach(geometry=>geometry.boundingBox=null);const original=cast();
  geometries.forEach((geometry,i)=>geometry.boundingBox=bounds[i]);const optimized=cast();
  const mismatches=original.flatMap((hits,i)=>JSON.stringify(hits)===JSON.stringify(optimized[i])?[]:[i]);
  let projectionUpdates=0;const project=g.camera.updateProjectionMatrix.bind(g.camera);
  g.camera.updateProjectionMatrix=()=>{projectionUpdates++;project();};
  rig.firstPerson=true;rig.update(g.player.position,1/60,objects,false);
  const firstProjection=g.camera.projectionMatrix.toArray();projectionUpdates=0;
  for(let i=0;i<120;i++)rig.update(g.player.position,1/60,objects,false);
  return {meshes:objects.length,boundedGeometries:geometries.length,rays:rays.length,positiveRays:original.filter(h=>h.length).length,mismatches,stationaryProjectionUpdates:projectionUpdates,stationaryProjectionUnchanged:JSON.stringify(firstProjection)===JSON.stringify(g.camera.projectionMatrix.toArray())};
 });
 assert.ok(report.comparison.positiveRays>30,'exercise real surface hits');
 assert.deepEqual(report.comparison.mismatches,[],'every hit, face, point and distance must remain identical');
 assert.equal(report.comparison.stationaryProjectionUpdates,0);
 assert.equal(report.comparison.stationaryProjectionUnchanged,true);
 assert.deepEqual(report.errors,[]);report.status='passed';
}catch(error){report.status='failed';report.failure=String(error);process.exitCode=1;}
finally{await writeFile(`${out}/camera-${channel}.json`,JSON.stringify(report,null,2));await browser.close();}
console.log(JSON.stringify(report));
