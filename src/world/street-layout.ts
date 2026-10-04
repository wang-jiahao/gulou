/** Public-road alignment. Hankou centreline is traced from the 2024 NJU plan
 * through its registered projection; widths remain visual estimates, not a survey.
 * Guangzhou retains the existing approximation pending equivalent source review. */
export interface PublicStreet {name:string;x:number;z:number;width:number;sidewalk:number;length:number;angle:number;profile?:number[][]}
export const publicStreets:PublicStreet[]=[
 {name:'汉口路',x:-91,z:370.44,width:10.4,sidewalk:1.8,length:710,angle:.025,profile:[[-213.185,366.770],[-183.626,367.861],[-154.162,369.391],[-124.575,370.078],[-94.915,370.505],[-65.021,370.045],[-34.945,368.691],[-4.837,367.046],[25.168,365.844],[55.235,364.029],[85.223,362.522]]},
 {name:'广州路',x:-35,z:739,width:20,sidewalk:3.2,length:710,angle:.025}
];
function segment(road:PublicStreet,x:number){
 const ps=road.profile!;let i=1;while(i<ps.length-1&&x>ps[i][0])i++;return i;
}
function normal(a:number[],b:number[]){const dx=b[0]-a[0],dz=b[1]-a[1],d=Math.hypot(dx,dz);return{x:-dz/d,z:dx/d};}
function offsetAt(ps:number[][],i:number,v:number){
 const a=normal(ps[Math.max(0,i-1)],ps[Math.max(1,i)]),b=normal(ps[Math.min(ps.length-2,i)],ps[Math.min(ps.length-1,i+1)]);
 // Miter joins keep both pavement edges and the cars' offset paths continuous.
 const scale=v/(1+a.x*b.x+a.z*b.z);return{x:ps[i][0]+(a.x+b.x)*scale,z:ps[i][1]+(a.z+b.z)*scale};
}
export function streetPoint(road:PublicStreet,u:number,v=0){
 if(!road.profile)return{x:road.x+u*Math.cos(road.angle)+v*Math.sin(road.angle),z:road.z-u*Math.sin(road.angle)+v*Math.cos(road.angle),angle:road.angle};
 const ps=road.profile,x=road.x+u,i=segment(road,x),t=(x-ps[i-1][0])/(ps[i][0]-ps[i-1][0]);
 const a=offsetAt(ps,i-1,v),b=offsetAt(ps,i,v);
 return{x:a.x+(b.x-a.x)*t,z:a.z+(b.z-a.z)*t,angle:Math.atan2(a.z-b.z,b.x-a.x)};
}
export function streetLocation(road:PublicStreet,x:number,z:number){
 if(!road.profile){const dx=x-road.x,dz=z-road.z;return{u:dx*Math.cos(road.angle)-dz*Math.sin(road.angle),lateral:dx*Math.sin(road.angle)+dz*Math.cos(road.angle)};}
 const ps=road.profile;let nearest={u:0,lateral:0,distance:Infinity};
 for(let i=1;i<ps.length;i++){
  const a=ps[i-1],b=ps[i],dx=b[0]-a[0],dz=b[1]-a[1],length=Math.hypot(dx,dz);
  const t=Math.max(i===1?-Infinity:0,Math.min(i===ps.length-1?Infinity:1,((x-a[0])*dx+(z-a[1])*dz)/(length*length)));
  const cx=a[0]+t*dx,cz=a[1]+t*dz,distance=Math.hypot(x-cx,z-cz);
  if(distance<nearest.distance)nearest={u:cx-road.x,lateral:((z-cz)*dx-(x-cx)*dz)/length,distance};
 }
 return{u:nearest.u,lateral:nearest.lateral};
}
