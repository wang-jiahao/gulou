import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';

const out='docs/validation/phase15';await mkdir(out,{recursive:true});
const baseline=process.env.BASELINE_URL,current=process.env.TEST_URL??'http://localhost:4173/';
const browser=await chromium.launch({channel:'chrome'}),page=await browser.newPage({viewport:{width:1440,height:900}}),snapshots=[],errors=[],missing=[];
page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)missing.push(r.url());});
try{
 for(const url of[...(baseline?[baseline]:[]),current]){
  await page.goto(url+'?debug=1');await page.waitForFunction(()=>window.__GULOU__&&!document.querySelector('#enter').disabled);await page.click('#enter');await page.waitForFunction(()=>window.__GULOU__.stats().sectors===3&&window.__GULOU__.stats().environment.heightReady);
  snapshots.push(await page.evaluate(async()=>{
   const g=window.__GULOU__.game,root=g.scene.getObjectByName('plan-based campus buildings with VR facade profiles'),upper=[],glazing=[];
   root.traverse(mesh=>{if(!mesh.isMesh)return;const p=mesh.geometry.attributes.position,n=mesh.geometry.attributes.normal,uv=mesh.geometry.attributes.uv,mat=mesh.material,key=mat.name+':'+mat.color.getHexString();
    for(let i=0;i<p.count;i++){
     const x=p.getX(i),y=p.getY(i),z=p.getZ(i);
     if(x> -61.8&&x< -43.7&&z>405.8&&z<417.7&&y>3.45)upper.push([key,x,y,z,n?.getX(i),n?.getY(i),n?.getZ(i),uv?.getX(i),uv?.getY(i)].join(','));
     if(mat.name==='songlin-garden-glazing')glazing.push([x,y,z]);
    }
   });
   upper.sort();const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(upper.join(';')));
   return{records:root.userData.buildings,upperVertices:upper.length,upperHash:[...new Uint8Array(hash)].map(x=>x.toString(16).padStart(2,'0')).join(''),glazing,colliders:g.player.physics.colliders.len(),destinations:[...document.querySelectorAll('#travel-place option')].map(o=>o.textContent)};
  }));
 }
 const final=snapshots.at(-1),songlin=final.records.find(r=>r.id==='plan-86');
 if(baseline){
  const before=snapshots[0],old=before.records.find(r=>r.id==='plan-86');
  assert.deepEqual(before.records.filter(r=>r.id!=='plan-86'),final.records.filter(r=>r.id!=='plan-86'),'all other building records unchanged');
  assert.equal(old.height,songlin.height);assert.deepEqual(old.frontage,songlin.frontage);assert.equal(before.colliders,final.colliders);
  assert.equal(before.upperVertices,final.upperVertices);assert.equal(before.upperHash,final.upperHash,'upper-storey positions, normals, UVs and material colors remain exact');
  assert.deepEqual(final.destinations.slice(0,before.destinations.length),before.destinations,'preserve existing map destination indices');
 }
 assert.ok(final.destinations.includes('松林楼'));assert.ok(final.glazing.length>0&&final.glazing.every(([x,y,z])=>x> -61.8&&x< -43.7&&z>405.8&&z<417.7&&y>=.87&&y<=3.1),'new glazing is confined to the ground floor');
 await page.keyboard.press('KeyM');const value=await page.locator('#travel-place option').evaluateAll(options=>options.find(o=>o.textContent==='松林楼')?.value);await page.selectOption('#travel-place',value);await page.click('#travel-place-go');
 const arrival=await page.evaluate(()=>window.__GULOU__.stats().position);assert.ok(arrival[1]<.2);await page.waitForFunction(()=>document.querySelector('#location-name').textContent==='松林楼');
 await page.keyboard.press('KeyE');assert.ok(await page.locator('#info').isVisible());assert.equal(await page.locator('#info-title').innerText(),'松林楼');await page.click('#info .close');await page.click('#resume');
 const approaches=[];
 for(const[x,z,nx,nz,name]of[[-61.2705,412.3375,-.99997,-.00739,'west glazing'],[-52.791,416.5585,.06825,.99767,'south glazing'],[...songlin.frontage,'north entry']]){
  const start=await page.evaluate(([x,z,nx,nz])=>{const g=window.__GULOU__.game;g.cameraRig.yaw=Math.atan2(nx,nz);return g.player.travelTo(x+nx*4,z+nz*4);},[x,z,nx,nz]);assert.ok(start&&start.y<.2);
  await page.keyboard.down('KeyW');await page.keyboard.down('ShiftLeft');await page.waitForTimeout(1000);await page.keyboard.up('KeyW');await page.keyboard.up('ShiftLeft');
  const end=await page.evaluate(()=>window.__GULOU__.stats().position),remaining=(end[0]-x)*nx+(end[2]-z)*nz;
  assert.ok(remaining>.25&&remaining<1.2,`${name} preserves physical wall`);assert.ok(Math.hypot(end[0]-start.x,end[2]-start.z)>2.5,`${name} approach is clear`);assert.ok(end[1]<.2);approaches.push({name,start,end,remaining});
 }
 assert.deepEqual(errors,[]);assert.deepEqual(missing,[]);await writeFile(`${out}/songlin.json`,JSON.stringify({time:new Date().toISOString(),baseline,current,snapshots,arrival,approaches,errors,missing},null,2));
 console.log(JSON.stringify({height:songlin.height,upperVertices:final.upperVertices,upperHash:final.upperHash,glazingVertices:final.glazing.length,colliders:final.colliders,arrival,approaches:approaches.length,errors,missing}));
}catch(e){await page.screenshot({path:`${out}/failure.png`});throw e;}finally{await browser.close();}
