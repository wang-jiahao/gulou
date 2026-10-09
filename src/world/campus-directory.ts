import * as T from 'three';
import {Builder} from './geometry.ts';
import type {CampusMap,MapPolygon} from './campus-map.ts';
import type {Materials} from './materials.ts';

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

function poster(map: CampusMap, panel: number) {
  const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=512;
  const ctx=canvas.getContext('2d')!;ctx.fillStyle='#eeeee3';ctx.fillRect(0,0,1024,512);
  ctx.fillStyle='#294b45';ctx.fillRect(0,0,1024,80);ctx.fillStyle='#f1f1e7';ctx.font='bold 44px system-ui';
  ctx.fillText(['南园导览','从南园走向北园','南园常用地点'][panel],40,56);
  ctx.textBaseline='middle';
  if(panel===0){
    const x0=45,y0=110,w=405,h=340,scale=Math.min(w/310,h/370);
    const point=(x:number,z:number)=>[x0+(w-310*scale)/2+(x+155)*scale,y0+(z-375)*scale];
    const polygon=(p:MapPolygon,color:string)=>{ctx.fillStyle=color;ctx.beginPath();for(const ring of[p.points,...p.holes??[]]){ring.forEach(([x,z],i)=>{const[a,b]=point(x,z);if(i)ctx.lineTo(a,b);else ctx.moveTo(a,b);});ctx.closePath();}ctx.fill('evenodd');};
    ctx.save();ctx.beginPath();ctx.rect(x0,y0,w,h);ctx.clip();ctx.fillStyle='#dcdcca';ctx.fillRect(x0,y0,w,h);
    map.roads.forEach(p=>polygon(p,'#f7f6ef'));map.lawns.forEach(p=>polygon(p,'#b6c79c'));map.features.filter(f=>f.tags.building).forEach(p=>polygon(p,'#6e8881'));
    const[x,y]=point(-88.39,383.62);ctx.fillStyle='#b24f35';ctx.beginPath();ctx.arc(x,y,8,0,Math.PI*2);ctx.fill();ctx.font='bold 25px system-ui';ctx.fillText('北门入口',x+14,y);ctx.restore();
    ctx.fillStyle='#294b45';ctx.font='bold 28px system-ui';ctx.fillText('北 ↑',55,101);
    ctx.font='bold 38px system-ui';ctx.fillText('向北',520,140);ctx.font='32px system-ui';ctx.fillText('汉口路校门',520,195);ctx.fillText('北园建筑与运动场',520,239);
    ctx.font='bold 38px system-ui';ctx.fillText('向南',520,325);ctx.font='32px system-ui';ctx.fillText('宿舍区 · 学生活动中心',520,380);ctx.fillText('广州路校门',520,424);
  }else if(panel===1){
    const stops=[['南园北门',170,170],['汉口路校门',510,170],['中大路',850,170],['教学楼',850,340],['大礼堂',510,340],['北大楼',170,340]] as const;
    ctx.strokeStyle='#93a598';ctx.lineWidth=7;ctx.beginPath();stops.forEach(([,x,y],i)=>{if(i)ctx.lineTo(x,y);else ctx.moveTo(x,y);});ctx.stroke();
    ctx.font='32px system-ui';ctx.textAlign='center';stops.forEach(([name,x,y],i)=>{ctx.fillStyle=i===0?'#b56c4c':'#35564e';ctx.beginPath();ctx.arc(x,y,12,0,Math.PI*2);ctx.fill();ctx.fillText(name,x,y+(i<3?-43:43));});
    ctx.font='28px system-ui';ctx.fillStyle='#51645b';ctx.fillText('沿校园道路，可依次经过这些地点',512,467);
  }else{
    const entries=[['南园宿舍','各栋宿舍入口'],['学生活动中心','南园南侧'],['汉口路校门','连接南园与北园'],['广州路校门','南园南端']];
    entries.forEach(([title,detail],i)=>{const x=i%2?550:55,y=i<2?159:322;ctx.fillStyle='#36564c';ctx.fillRect(x,y-18,7,73);ctx.font='bold 37px system-ui';ctx.fillText(title,x+22,y);ctx.font='29px system-ui';ctx.fillStyle='#68766b';ctx.fillText(detail,x+22,y+49);});
    ctx.font='28px system-ui';ctx.fillText('查看校园地图，选择想去的地方',55,470);
  }
  const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;texture.anisotropy=4;
  return new T.MeshStandardMaterial({name:`directory-poster-${panel}`,map:texture,roughness:.85});
}

export function createCampusDirectory(map: CampusMap,mats: Materials){
  const b=new Builder();
  const masonry=new T.MeshStandardMaterial({name:'directory-brick',color:0x82877d,map:mats.textures.get('historic-brick.webp'),roughness:.95});
  const frame=new T.MeshStandardMaterial({name:'directory-frame',color:0x8e9b94,metalness:.42,roughness:.5});
  const surround=new T.MeshStandardMaterial({name:'directory-stone-surround',color:0xb7bcac,roughness:.88});
  const roof=new T.MeshStandardMaterial({name:'directory-canopy',color:0xc1c5b5,roughness:.82});
  const glass=new T.MeshStandardMaterial({name:'directory-glass',color:0xc3d7d0,transparent:true,opacity:.075,depthWrite:false,roughness:.2,metalness:.2});
  const guides=[0,1,2].map(panel=>poster(map,panel));
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
      for(const [material,offset]of [[guides[i%3],.331],[glass,.353]] as const){const p=point(u,offset);b.add(new T.PlaneGeometry(w,.96),material,p.x,1.365,p.z,new T.Euler(0,current.angle,0));}
      // Paired glazed leaves with a small latch; original readable guide art.
      box(.032,.96,.055,u,1.365,.366,frame);box(.10,.045,.032,u+.12,.98,.386,frame);panelCount++;
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
  const group=b.finish('Nanyuan campus directory');
  group.userData.board={...board};group.userData.boards=boards;group.userData.panelCount=panelCount;
  group.userData.source='User 2026-10-09 north-gate video and official VR gl-1-02 four faces; grey masonry, pale coping and glazed display walls; fitted approximate lengths; original guide content';
  group.userData.openings={northJoin:'unverified; left open',westEntrance:[414.5,421],songlinPath:[419.4,422.2],westJunction:'wall ends at z424.8 before junction z430',fountain:'east wall ends at z436.6 before outer ring z440.543'};
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
