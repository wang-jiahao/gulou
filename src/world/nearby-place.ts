export type NearbyPlace = {name:string;x:number;z:number;y?:number;description?:string};
type Position = {x:number;y:number;z:number};

function nearest(position:Position,places:readonly NearbyPlace[],radius:number){
 let result:NearbyPlace|undefined,distance=radius*radius,height=Infinity;
 for(const place of places){
  const d=(place.x-position.x)**2+(place.z-position.z)**2;
  // Doors carry a floor height. Map points without one retain their existing
  // horizontal-only reach; do not assume every campus point is at ground zero.
  const h=place.y===undefined?0:Math.abs(place.y-position.y);
  if(!(d<radius*radius)||!(h<4))continue;
  if(!result||d<distance||d===distance&&(h<height||h===height&&place.name<result.name)){
   result=place;distance=d;height=h;
  }
 }
 return result;
}

/** Share the place target between the E action, E label and I introduction.
 * Doors take precedence over map points; I keeps its wider discovery radius.
 * Reach here means the existing distance/floor limits, not a pathfinding test. */
export function findNearbyPlace(position:Position,doors:readonly NearbyPlace[],places:readonly NearbyPlace[],mode:'interact'|'about'){
 if(mode==='about'&&Math.hypot(position.x+246,position.z-112)<12&&position.y<5){
  return{name:'大纛坪',x:-246,z:112,description:''};
 }
 return nearest(position,doors,mode==='about'?7:4)??nearest(position,places,mode==='about'?9:5.5);
}
