import * as T from 'three';
import {Builder} from './geometry.ts';
import {addBuildingLettering} from './building-lettering.ts';
import type {MapFeature} from './campus-map.ts';
import type {CollisionMesh} from './collision-mesh.ts';
import type {DoorRecord} from './building-entrances.ts';
import {facilityFaces,facilityFront,facilityMaterial,facilityShell} from './life-facility-geometry.ts';

/** User photograph education-store.png (2026-10-07), plan 109 east street.
 * Two storeys, dark blue fascia, two entrances and a central display are visible.
 * Footprint retained; scale and unphotographed faces approximate. Main fascia
 * letter contours follow the user photo, preserving its slant and spacing. */
export function buildEducationStore(f:MapFeature,b:Builder,meshes:CollisionMesh[],camera:T.Object3D[],doors:DoorRecord[]){
 const wall=facilityMaterial('education-store-pale-wall',0xc8c9bd),blue=facilityMaterial('education-store-blue-fascia',0x1a2b50),trim=facilityMaterial('education-store-window-trim',0xdddcd0),frame=facilityMaterial('education-store-dark-frames',0x50564e),glass=facilityMaterial('education-store-glazing',0x69857c),dark=facilityMaterial('education-store-recess',0x23312f),paving=facilityMaterial('education-store-entry-stone',0xa1a59d),shelf=facilityMaterial('education-store-display-goods',0xb59b69);
 glass.roughness=.22;glass.metalness=.18;
 const faces=facilityFaces(f),front=faces.filter(e=>e.nx>.9).sort((a,c)=>c.len-a.len)[0],height=7.8;
 facilityShell(f,height,b,meshes,camera,wall,frame);let windows=0;
 for(const e of faces){
  const {box}=facilityFront(b,e,meshes,camera);box(0,7.7,.10,e.len,.22,.28,trim);box(0,.22,.05,e.len,.44,.15,paving);
  const bays=Math.max(1,Math.floor(e.len/2.7));
  for(let i=0;i<bays;i++)for(const y of e===front?[6.02]:[2.0,6.02]){
   const u=(i-(bays-1)/2)*e.len/bays,w=1.28,h=2.0;
   box(u,y,.07,w+.18,h+.18,.13,trim);box(u,y,.15,w,h,.06,glass);
   box(u,y-.24,.21,.06,1.48,.06,trim);box(u,y+.51,.21,w,.065,.06,trim);
   if(i%3===0)for(let j=0;j<5;j++)box(u+(j-2)*.22,y+.67,.22,.03,.60,.06,frame);
   windows++;
  }
  // The photo shows a simple exposed roof-edge railing, without a pitched roof.
  box(0,8.13,.02,e.len,.05,.05,frame);for(let u=-e.len/2+.25;u<e.len/2;u+=.6)box(u,7.97,.02,.035,.32,.035,frame);
 }
 const {box,sign,point}=facilityFront(b,front,meshes,camera),w=front.len-.45;
 box(0,3.98,.22,w,1.65,.48,blue);box(0,3.11,.32,w,.08,.60,frame);
 const letteringMat=facilityMaterial('education-store-photo-lettering',0xf7f5e9),titlePoint=point(0,.478);
 const lettering=addBuildingLettering(b,'educationStore',titlePoint.x,3.38,titlePoint.z,5.0,front.yaw,letteringMat);
 sign('鼓楼店',4.22,3.62,.478,2.45,.62,'#f7f5e9');
 sign('南大後勤  商贸中心',-8.8,4.0,.478,6.3,.61,'#e6e9df');
 sign('NJU LOGISTICS',-10.45,3.72,.478,2.7,.16,'#e6e9df');
 const entryY=.32,doorWidth=3.4;
 for(const u of[-6.4,6.4]){
  box(u,1.65,.09,4.05,2.77,.12,dark);box(u,1.7,.2,3.7,2.64,.07,glass,true);
  for(const du of[-1.87,-.84,.84,1.87])box(u+du,1.7,.26,.06,2.70,.09,frame);
  for(const dy of[.37,2.65,3.05])box(u,dy,.26,3.83,.07,.09,frame);
  for(const side of[-1,1])box(u+side*.75,1.52,.32,.035,.5,.05,trim);
  sign(u<0?'入  口':'出  口',u,2.84,.325,1.7,.22,'#f4f3df');
  const p=point(u,.33);doors.push({name:f.tags.name,x:p.x,y:entryY,z:p.z,yaw:front.yaw,width:doorWidth});
 }
 for(const u of[-11.4,11.4]){
  box(u,1.7,.1,4.0,2.72,.12,dark);box(u,1.7,.18,3.86,2.6,.055,glass);
  for(const du of[-1.94,0,1.94])box(u+du,1.7,.25,.07,2.65,.1,frame);
  for(const y of[.46,1.1,1.78,2.43]){box(u,y,.26,3.72,.065,.1,trim);for(let j=0;j<8;j++)box(u-1.58+j*.45,y+.17,.25,.22,.30,.045,j%3?shelf:trim);}
 }
 box(0,1.95,.22,5.1,2.33,.2,frame);
 // The display stays unlettered; the invented lower advertisement was removed.
 box(0,2.12,.327,4.84,1.9,.012,dark);
 for(let step=1;step<=2;step++){const h=step*.16;box(0,h/2,1.35-(step-1)*.42,w+.2,h,.84,paving,true);}
 box(0,.16,.46,w+.2,.32,.88,paving,true);
 return{id:f.id,name:f.tags.name,source:'User education-store.png 2026-10-07 and campus map plan109; east shopfront, scale/hidden faces approximate',height:8.16,storeys:2,windows,roof:'flat coping and low rooftop railing',dormitory:false,frontage:[front.x,front.z,front.nx,front.nz],educationStore:{lettering,doors:2,entryY,steps:2,fascia:'dark blue 教育超市 / 鼓楼店',centralScreen:true}};
}
