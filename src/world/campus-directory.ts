import * as T from 'three';
import {Builder} from './geometry.ts';
import type {CampusMap} from './campus-map.ts';
import type {Materials} from './materials.ts';
import {appendNanyuanFrontage} from './north-gate-frontage.ts';
import {collegePortraitOrder,collegeStories,type CollegeId} from './college-stories.ts';
import {createCollegePortraitMaterial} from './college-portrait-panel.ts';

// User 2026-10-09 north-gate video + official VR gl-1-02 all four faces.
// These are fitted coordinates, not surveyed lengths. The obscured north joins
// stay open; the west junction, plan85 entrance and Songlin path stay clear.
const westX=(z:number)=>-96.6+(z-392)*.037;
const eastX=(z:number)=>-77.8+(z-392)*.048;
export const nanyuanNoticeboardRuns=[
 {id:'west-north',side:'west',a:[westX(392),392],b:[westX(414.5),414.5]},
 {id:'west-south',side:'west',a:[westX(421),421],b:[westX(424.8),424.8]},
 {id:'east-north',side:'east',a:[eastX(392),392],b:[eastX(419.4),419.4]},
 {id:'east-south',side:'east',a:[eastX(422.2),422.2],b:[eastX(436.6),436.6]},
] as const;
const boards=nanyuanNoticeboardRuns.map(run=>{
 const dx=run.b[0]-run.a[0],dz=run.b[1]-run.a[1],width=Math.hypot(dx,dz),sign=run.side==='west'?1:-1;
 return{...run,name:'南园导览栏',x:(run.a[0]+run.b[0])/2,z:(run.a[1]+run.b[1])/2,angle:Math.atan2(sign*dz,-sign*dx),width};
});
const board=boards[0];

export function createCampusDirectory(_map: CampusMap,mats: Materials){
  const b=new Builder();
  const masonry=new T.MeshStandardMaterial({name:'directory-brick',color:0x82877d,map:mats.textures.get('historic-brick.webp'),roughness:.95});
  const frame=new T.MeshStandardMaterial({name:'directory-frame',color:0x8e9b94,metalness:.42,roughness:.5});
  const surround=new T.MeshStandardMaterial({name:'directory-stone-surround',color:0xb7bcac,roughness:.88});
  const roof=new T.MeshStandardMaterial({name:'directory-canopy',color:0xc1c5b5,roughness:.82});
  const glass=new T.MeshStandardMaterial({name:'directory-glass',color:0xc3d7d0,transparent:true,opacity:.075,depthWrite:false,roughness:.2,metalness:.2});
  // Reuse seven canvases and keep their aspect inside each differently sized
  // window, rather than allocating a separate large texture for every bay.
  const artworkAspect=3.4;
  const portraits=new Map(collegePortraitOrder.map(id=>[id,createCollegePortraitMaterial(id,{aspect:artworkAspect})]));
  const paper=new T.MeshStandardMaterial({name:'college-panel-paper',color:0xf5f1e8,roughness:.94});
  const panels:{board:string;bay:number;collegeId:CollegeId;person:string;portraitStatus:string;width:number;height:number;angle:number}[]=[];
  const paving=mats.path.clone();paving.name='directory-sidewalk';paving.polygonOffset=true;paving.polygonOffsetFactor=-2;paving.polygonOffsetUnits=-2;
  const turf=mats.grass.clone();turf.name='directory-east-grass-strip';
  let panelCount=0;
  for(const current of boards){
    const cos=Math.cos(current.angle),sin=Math.sin(current.angle);
    const point=(u:number,v:number)=>({x:current.x+u*cos+v*sin,z:current.z-u*sin+v*cos});
    const box=(w:number,h:number,d:number,u:number,y:number,v:number,mat:T.Material,solid=false)=>{const p=point(u,v);b.box(w,h,d,p.x,y,p.z,mat,solid,current.angle);};
    const width=current.width,bays=Math.max(1,Math.round(width/3.5)),bay=width/bays;
    box(width,.70,.62,0,.35,0,masonry);box(width+.10,.10,.71,0,.745,0,surround);
    box(width,1.30,.16,0,1.39,-.22,masonry);
    box(width,.20,.62,0,1.99,0,surround);box(width+.20,.14,.91,0,2.17,.10,roof,true);
    box(width+.18,.045,.065,0,2.10,.59,frame);
    // Continuous wall collision corresponds to the masonry/glazed display,
    // rather than leaving walk-through spaces between decorative window frames.
    const base=point(0,0);b.solids.push({x:base.x,y:1.045,z:base.z,w:width,h:2.09,d:.62,angle:current.angle});
    for(let i=0;i<=bays;i++)box(.20,1.31,.61,-width/2+i*bay,1.37,0,surround);
    for(let i=0;i<bays;i++){
      const u=-width/2+(i+.5)*bay,w=bay-.35;
      box(w+.10,.065,.095,u,.86,.323,frame);box(w+.10,.065,.095,u,1.87,.323,frame);
      for(const side of[-1,1])box(.055,1.075,.095,u+side*(w+.045)/2,1.365,.323,frame);
      const id=collegePortraitOrder[panelCount%collegePortraitOrder.length],art=portraits.get(id)!;
      const artHeight=Math.min(.96,w/artworkAspect),artWidth=artHeight*artworkAspect;
      for(const [material,offset,planeWidth,planeHeight]of [[paper,.329,w,.96],[art,.331,artWidth,artHeight],[glass,.353,w,.96]] as const){const p=point(u,offset);b.add(new T.PlaneGeometry(planeWidth,planeHeight),material,p.x,1.365,p.z,new T.Euler(0,current.angle,0));}
      // The short display divider occupies only the portrait/text gutter;
      // both the shared heading and the full image credit remain unobstructed.
      const layout=art.userData.layout,divider=u+artWidth*((layout.portrait.x+layout.portrait.width+layout.text.x)/2/layout.width-.5);
      const dividerHeight=artHeight*layout.portrait.height/layout.height,dividerY=1.365+artHeight*(.5-(layout.portrait.y+layout.portrait.height/2)/layout.height);
      box(.032,dividerHeight,.055,divider,dividerY,.366,frame);box(.055,.045,.032,divider,dividerY-dividerHeight/2+.045,.386,frame);
      panels.push({board:current.id,bay:i,collegeId:id,person:collegeStories[id].person,portraitStatus:art.userData.portraitStatus,width:artWidth,height:artHeight,angle:current.angle});panelCount++;
    }
    // Both edge routes remain walkable; eastern footage additionally shows
    // a narrow path separated from the carriageway by grass and a low curb.
    const pathWidth=current.side==='east'?1.72:1.30,pathV=current.side==='east'?1.30:1.03;
    box(width,.036,pathWidth,0,.018,pathV,paving,true);
    if(current.side==='east'){
      box(width,.055,1.15,0,.0275,2.78,turf);
      box(width,.12,.12,0,.06,3.43,surround,true);
      box(width,.075,.10,0,.0375,2.20,surround,true);
    }
  }
  const frontage=appendNanyuanFrontage(b,{masonry,surround,roof});
  const group=b.finish('Nanyuan campus directory');
  group.userData.frontage=frontage;
  group.userData.board={...board};group.userData.boards=boards;group.userData.panelCount=panelCount;
  group.userData.source='User 2026-10-09 north-gate video and official VR gl-1-02 four faces; fitted grey masonry/glazed walls; seven college names and biographies from NJU Freshman College';
  group.userData.panels=panels;
  group.userData.approximateArrangement={panelCount:'fitted window count; not surveyed',sequence:'official college-list order repeated through fitted bays; physical sequence unknown',layout:'each individual panel: portrait left, same-person biography right'};
  group.userData.openings={northJoin:'unverified; left open',westEntrance:[414.5,421],songlinPath:[419.4,422.2],westJunction:'wall ends at z424.8 before junction z430',fountain:'east wall follows lawn verge to property frontage; fountain ring road stays open',propertyEntrance:'east facade remains accessible'};
  const nearby=(position:{x:number;y:number;z:number})=>{
    if(position.y>=.8||position.y<=-.2)return null;
    for(const current of boards){
      const dx=position.x-current.x,dz=position.z-current.z,cos=Math.cos(current.angle),sin=Math.sin(current.angle),u=dx*cos-dz*sin,front=dx*sin+dz*cos;
      if(Math.abs(u)<current.width/2-.15&&front>.4&&front<3.6)return current;
    }
    return null;
  };
  return {group,solids:b.solids,board,nearby,arrival:{name:board.name,x:board.x+Math.sin(board.angle)*1.7,z:board.z+Math.cos(board.angle)*1.7,yaw:board.angle}};
}
