import assert from 'node:assert/strict';
export function compareLowerGeometry(after,before){
 for(const key of ['instances','access','boundaries','doors','street','forecourt'])assert.deepEqual(after[key],before[key],key+' preserved');
 assert.deepEqual(after.buildings.filter(b=>b.id!=='plan-113'),before.buildings.filter(b=>b.id!=='plan-113'),'other buildings preserved');
 const removed=before.solids.filter(s=>!after.solids.some(a=>JSON.stringify(a)===JSON.stringify(s)));
 assert.equal(removed.length,2,'only two foundation tiles replaced');
 assert.ok(removed.every(s=>s.x===-32&&[544,608].includes(s.z)&&s.w===64&&s.d===64&&s.h===.4),'removed tiles contain the entrances');
 assert.equal(after.solids.length,before.solids.length-2,'no unrelated solids added');
 const change={removed:before.fixed.filter(h=>!after.fixed.includes(h)).length,added:after.fixed.filter(h=>!before.fixed.includes(h)).length};
 // The landing and road support may change; all other fixed meshes remain.
 assert.ok(change.removed>=1&&change.removed<=3,JSON.stringify(change));
 return change;
}
export async function checkDiningLowerEntry(page){
 const result=await page.evaluate(()=>{
  const g=window.__GULOU__.game,p=g.player,d=g.world.root.getObjectByName('plan-based campus buildings with VR facade profiles').userData.buildings.find(b=>b.id==='plan-113').dining.eastGallery.lowerEntries;
  const {frame,centers,mouth,back,steps,run,rise,street,floor,foot}=d;
  const at=(s,y,t)=>({x:frame.x+s*frame.nz+t*frame.nx,y,z:frame.z-s*frame.nx+t*frame.nz});
  const cast=(a,b,objects)=>{const len=Math.hypot(b.x-a.x,b.y-a.y,b.z-a.z),dir={x:(b.x-a.x)/len,y:(b.y-a.y)/len,z:(b.z-a.z)/len};
   const hit=p.physics.castRay({origin:a,dir},len,true,undefined,undefined,p.collider,p.body),ray=g.cameraRig.ray;
   ray.set(g.camera.position.clone().set(a.x,a.y,a.z),g.camera.position.clone().set(dir.x,dir.y,dir.z));ray.near=0;ray.far=len;
   const visual=ray.intersectObjects(objects,false)[0];return{physics:hit?.timeOfImpact??null,camera:visual?.distance??null};};
  p.reset();const ground=[],rays=[];
  for(const s of centers){
   for(const offset of[-1.5,0,1.5])for(let i=0;i<steps+2;i++){
    const t=i<steps?mouth-(i+.5)*run:i===steps?foot-.3:back+.4,expected=i<steps?street-(i+1)*rise:floor;
    const a=at(s+offset,.9,t),b=at(s+offset,-2,t),hit=cast(a,b,g.world.cameraSolids);
    // Inspect rendered surfaces below the canopy/upper deck independently.
    const visible=g.cameraRig.ray.intersectObject(g.world.root,true).find(h=>h.object.isMesh&&h.object.visible&&!h.object.userData?.debug)?.distance??null;
    ground.push({s:s+offset,t,expected,physics:hit.physics===null?null:.9-hit.physics,camera:hit.camera===null?null:.9-hit.camera,visible:visible===null?null:.9-visible});
   }
   for(const[name,a,b,blocked]of[
    ['open lower approach',at(s,.8,mouth+.5),at(s,.8,back+.4),false],
    ['closed lower door',at(s,.1,back+1),at(s,.1,back-.5),true],
    ['blue canopy fascia',at(s,2.45,mouth+.5),at(s,2.45,mouth-.5),true],
    ['left retaining wall',at(s,-.5,foot-.3),at(s-3,-.5,foot-.3),true],
    ['right retaining wall',at(s,-.5,foot-.3),at(s+3,-.5,foot-.3),true]
   ])rays.push({s,name,blocked,...cast(a,b,g.world.cameraSolids)});
  }
  const routes=[],transfers=[],bike=g.world.bicycles[1],saved={home:bike.home.clone(),position:bike.group.position.clone(),angle:bike.angle};
  const move=(s,t,target,ride)=>{
   const start=p.position.clone(),dest=at(s,0,target),dx=dest.x-start.x,dz=dest.z-start.z,len=Math.hypot(dx,dz),yaw=Math.atan2(-dx,-dz);
   if(ride){p.rideYaw=yaw;p.rideViewYaw=yaw;p.rideSpeed=0;p.collider.setRotationWrtParent({x:0,y:Math.sin(yaw/2),z:0,w:Math.cos(yaw/2)});}
   p.clearInput();p.keys.add('KeyW');let progress=0,minY=p.position.y;
   for(let i=0;i<900;i++){p.update(1/60,yaw,true);minY=Math.min(minY,p.position.y);progress=((p.position.x-start.x)*dx+(p.position.z-start.z)*dz)/len;if(progress>=len-.05)break;}
   p.clearInput();for(let i=0;i<18;i++)p.update(1/60,yaw,true);
   return{s,t,target,ride,len,progress,minY,y:p.position.y,lateral:((p.position.x-start.x)*dz-(p.position.z-start.z)*dx)/len};
  };
  for(const ride of[false,true])for(const center of centers)for(const offset of ride?[0]:[-1.5,0,1.5]){
   p.reset();if(ride){p.teleport(bike.group.position.x-Math.sin(bike.angle)*1.8,bike.group.position.y+.05,bike.group.position.z-Math.cos(bike.angle)*1.8);if(!p.mount(bike))throw Error('lower fixture mount failed');}
   const s=center+offset,start=at(s,.09,mouth+1.5);p.teleport(start.x,start.y,start.z);p.physics.step();
   routes.push(move(s,mouth+1.5,-.55,ride));
   if(ride){
    const before=p.position.clone(),dismounted=p.dismount(),after=p.position.clone();
    // The bicycle remains parked on the lower landing. Remount must retain it.
    const mounted=p.mount(bike);transfers.push({center,dismounted,mounted,beforeY:before.y,afterY:after.y,mountY:p.position.y});
   }
   routes.push(move(s,-.55,mouth+1.5,ride));
   if(ride){p.teleport(saved.position.x,saved.position.y,saved.position.z);p.rideYaw=saved.angle;p.parkBicycle();bike.home.copy(saved.home);bike.group.position.copy(saved.position);}
  }
  p.reset();return{ground,rays,routes,transfers,floor};
 });
 for(const r of result.ground)for(const key of['physics','camera','visible'])assert.ok(r[key]!==null&&Math.abs(r[key]-r.expected)<.014,`${key} lower ground ${JSON.stringify(r)}`);
 for(const r of result.rays)for(const key of['physics','camera'])assert.equal(r[key]!==null,r.blocked,`${key} ${r.name}`);
 for(const r of result.routes){assert.ok(r.progress>=r.len-.12&&Math.abs(r.lateral)<.25,JSON.stringify(r));assert.ok(Math.abs(r.y-(r.target<0?result.floor:.035))<.14,JSON.stringify(r));}
 for(const r of result.transfers){assert.ok(r.dismounted&&r.mounted,JSON.stringify(r));assert.ok(Math.abs(r.beforeY-r.afterY)<.1&&Math.abs(r.mountY-result.floor)<.14,JSON.stringify(r));}
 return result;
}
