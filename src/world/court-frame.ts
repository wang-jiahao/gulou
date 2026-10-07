import * as T from 'three';
export function courtFrame(points:number[][]){
  const x=points.reduce((s,p)=>s+p[0],0)/points.length,z=points.reduce((s,p)=>s+p[1],0)/points.length;
  const width=(Math.hypot(points[1][0]-points[0][0],points[1][1]-points[0][1])+Math.hypot(points[2][0]-points[3][0],points[2][1]-points[3][1]))/2;
  const length=(Math.hypot(points[3][0]-points[0][0],points[3][1]-points[0][1])+Math.hypot(points[2][0]-points[1][0],points[2][1]-points[1][1]))/2;
  const angle=Math.atan2(points[3][0]+points[2][0]-points[0][0]-points[1][0],points[3][1]+points[2][1]-points[0][1]-points[1][1]);
  return{x,z,width,length,angle,point:(u:number,y:number,v:number)=>new T.Vector3(x+u*Math.cos(angle)+v*Math.sin(angle),y,z-u*Math.sin(angle)+v*Math.cos(angle))};
}

