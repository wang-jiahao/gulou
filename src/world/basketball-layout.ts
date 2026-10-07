import {courtFrame} from './court-frame.ts';
import {sportsCourts} from './sports-layout.ts';

export const BALL_RADIUS=.12, RIM_RADIUS=.225, RIM_TUBE=.025;

/** Shared with the visible courts so collision and scoring cannot drift. */
export function basketballCourtLayout(court:typeof sportsCourts[number]){
  const f=courtFrame(court.points),half=court.kind==='half';
  const w=half?f.length-1.1:Math.min(15,f.width-1.1),l=half?(f.width-1.2)*2:Math.min(28,f.length-1.4);
  const cp=(u:number,y:number,v:number)=>half?f.point(v,y,-u):f.point(u,y,v);
  const angle=f.angle+(half?Math.PI/2:0);
  const hoops=(half?[1]:[-1,1]).map(side=>{
    const end=side*(half?l/4:l/2),free=end-side*Math.min(5.8,(half?l/2:l)*.35),basket=end-side*1.2;
    return {id:`${court.name}:${side}`,court:court.name,side,end,free,basket,angle,
      center:cp(0,3.05,basket),board:cp(0,3.45,basket+side*.32),start:cp(0,BALL_RADIUS+.08,free)};
  });
  return {...f,name:court.name,half,w,l,cp,angle,hoops};
}
export const basketballCourts=sportsCourts.filter(c=>c.kind!=='tennis').map(basketballCourtLayout);
export const basketballHoops=basketballCourts.flatMap(c=>c.hoops);
export type BasketballHoop=typeof basketballHoops[number];
