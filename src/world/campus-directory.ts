import * as T from 'three';
import {Builder} from './geometry.ts';
import type {CampusMap,MapPolygon} from './campus-map.ts';
import type {Materials} from './materials.ts';

// The gl-1-02 noticeboards inform the form. This short section is fitted beside
// the existing south wall, clear of the model's east-facing college entrance.
const board = {name:'南园导览栏',x:-106,z:426.2,angle:0,width:9};

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
    const[x,y]=point(board.x,board.z);ctx.fillStyle='#b24f35';ctx.beginPath();ctx.arc(x,y,8,0,Math.PI*2);ctx.fill();ctx.font='bold 25px system-ui';ctx.fillText('当前位置',x+14,y);ctx.restore();
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
  const b=new Builder(),panels:T.Mesh[]=[],cos=Math.cos(board.angle),sin=Math.sin(board.angle);
  const point=(u:number,v:number)=>({x:board.x+u*cos+v*sin,z:board.z-u*sin+v*cos});
  const masonry=new T.MeshStandardMaterial({name:'directory-brick',color:0x82877d,map:mats.textures.get('historic-brick.webp'),roughness:.95});
  const frame=new T.MeshStandardMaterial({name:'directory-frame',color:0xa1aca4,metalness:.42,roughness:.5});
  const roof=new T.MeshStandardMaterial({name:'directory-canopy',color:0xb8bcae,roughness:.82});
  const glass=new T.MeshStandardMaterial({name:'directory-glass',color:0xc3d7d0,transparent:true,opacity:.07,depthWrite:false,roughness:.2,metalness:.2});
  const box=(w:number,h:number,d:number,u:number,y:number,v:number,mat:T.Material,solid=false)=>{const p=point(u,v);b.box(w,h,d,p.x,y,p.z,mat,solid,board.angle);};
  box(9,.70,.48,0,.35,0,masonry);box(9.1,.09,.56,0,.745,0,mats.stone);
  box(9,.05,.06,0,.94,.28,frame);box(9,.05,.06,0,2.06,.28,frame);
  for(const u of[-4.5,-1.5,1.5,4.5])box(.10,1.34,.42,u,1.42,0,frame);
  box(9.45,.12,.98,0,2.22,.14,roof,true);box(9.43,.11,.055,0,2.19,.63,frame);
  box(9,1.18,.06,0,1.5,-.15,masonry);
  const base=point(0,0);b.solids.push({x:base.x,y:1.06,z:base.z,w:9,h:2.12,d:.48,angle:board.angle});
  for(let i=0;i<3;i++){
    const u=(i-1)*3;
    for(const[material,offset]of[[poster(map,i),.252],[glass,.27]] as const){const p=point(u,offset),mesh=new T.Mesh(new T.PlaneGeometry(2.78,1.10),material);mesh.position.set(p.x,1.50,p.z);mesh.rotation.y=board.angle;mesh.receiveShadow=true;panels.push(mesh);}
    box(.12,.04,.025,u+1.16,1.02,.30,frame);
  }
  const group=b.finish('Nanyuan campus directory');group.add(...panels);group.userData.board={...board};group.userData.source='official VR gl-1-02 form; approximate short section by plan-85 south wall; original guide content';
  const nearby=(position:{x:number;y:number;z:number})=>{
    const dx=position.x-board.x,dz=position.z-board.z,u=dx*cos-dz*sin,front=dx*sin+dz*cos;
    return position.y<.8&&position.y>-.2&&Math.abs(u)<board.width/2+.2&&front>.4&&front<3.6?board:null;
  };
  return {group,solids:b.solids,board,nearby,arrival:{name:board.name,x:board.x+sin*2.8,z:board.z+cos*2.8,yaw:board.angle}};
}
