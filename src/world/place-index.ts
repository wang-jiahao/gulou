import { insidePolygon, type CampusMap, type MapFeature } from './campus-map.ts';

export const extraPlaces = [
  {name:'大纛坪',x:-239,z:111,yaw:Math.PI/2,description:'西南楼北侧的国旗广场。旗杆、基座与步行铺地参考官方全景和校园漫游视频。'},
  {name:'校史博物馆',x:24,z:294,yaw:Math.PI/2,description:'原金陵大学图书馆的历史馆舍，与西侧现代图书馆相连。'},
];
export const isKnownPlace = (name: string) => !/^[南北]园建筑 \d+/.test(name);
export function featureCenter(f: MapFeature): [number,number] {
  if(f.id==='plan-66')return [-51,286]; // Label the modern west wing separately from the museum.
  return [(Math.min(...f.points.map(p=>p[0]))+Math.max(...f.points.map(p=>p[0])))/2,(Math.min(...f.points.map(p=>p[1]))+Math.max(...f.points.map(p=>p[1])))/2];
}
export function distanceToFeature(x:number,z:number,f:MapFeature) {
  if(insidePolygon(x,z,f))return 0;
  let nearest=Infinity;
  for(const ring of[f.points,...(f.holes??[])])for(let i=0;i<ring.length;i++){
    const a=ring[i],b=ring[(i+1)%ring.length],dx=b[0]-a[0],dz=b[1]-a[1],t=Math.max(0,Math.min(1,((x-a[0])*dx+(z-a[1])*dz)/(dx*dx+dz*dz||1)));
    nearest=Math.min(nearest,Math.hypot(x-a[0]-t*dx,z-a[1]-t*dz));
  }
  return nearest;
}
/** Resolve against the actual footprint, not a single point or a broad zone
 * that labels everything west of the courtyard as one landmark. */
export function locationName(map:CampusMap,x:number,z:number,flying=false) {
  let name='';
  if(x>-258&&x<-220&&z>91&&z<129)name='大纛坪';
  else if(x>-20&&x<27&&z>280&&z<314)name='校史博物馆';
  else if(Math.abs(x)<4&&z>18&&z<86)name=z>81?'金大路 · 北大楼南台阶':'金大路';
  else if(Math.abs(x+87)<7&&z>179&&z<341)name='中大路';
  else if(x>-153&&x<-16&&Math.abs(z-148)<6)name='两江路';
  else {
    let distance=16;
    for(const f of map.features){const d=distanceToFeature(x,z,f);if(d<distance){distance=d;name=isKnownPlace(f.tags.name)?f.tags.name:`未核名建筑（${f.tags.plan_id??f.id}）`;}}
    if(name&&distance>1)name+='附近';
  }
  name ||= z>365?'南园道路':z>343?'汉口路':'北园道路';
  return name+(flying?'上空':'');
}
