import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {Builder, type Solid} from './geometry.ts';

export type CampusBicycle = ReturnType<typeof createBicycle> & { id:string; solid:Solid; home:T.Vector3; angle:number; };
export const bicycleFit={seat:.91,seatZ:.25,barY:1.20,barZ:-.12,barHalfWidth:.24,crankY:.32,crankZ:.12,crankRadius:.17};
// User photo: magenta low-step frame, pale rims, open black basket and rear lock.
// Dimensions, hidden parts and small marks are approximate, not manufacturer CAD.
const swatch=(color:number)=>new T.MeshStandardMaterial({color});
const purple=swatch(0xa42a8b),pale=swatch(0xd6a0d1),black=swatch(0x222525),silver=swatch(0xa6afaf),yellow=swatch(0xe6c526),white=swatch(0xe0e2de);
const surface=new T.MeshStandardMaterial({name:'shared bicycle vertex colours',vertexColors:true,roughness:.66,metalness:.12});
const v=(y:number,z:number,x=0)=>new T.Vector3(x,y,z);
let template:T.Group|undefined;

/** One draw per rigid part. Colours stay in vertices, shared by every clone. */
function finish(b:Builder,name:string){
  const original=b.finish(name),parts:T.BufferGeometry[]=[];
  original.traverse(o=>{if(o instanceof T.Mesh){const geometry=o.geometry,color=(o.material as T.MeshStandardMaterial).color,count=geometry.attributes.position.count,colors=new Float32Array(count*3);for(let i=0;i<count;i++)color.toArray(colors,i*3);geometry.setAttribute('color',new T.BufferAttribute(colors,3));parts.push(geometry);}});
  const geometry=mergeGeometries(parts)!;for(const g of parts)g.dispose();geometry.computeBoundingBox();geometry.computeBoundingSphere();
  const group=new T.Group();group.name=name;const mesh=new T.Mesh(geometry,surface);mesh.castShadow=mesh.receiveShadow=true;group.add(mesh);return group;
}
function mudguard(b:Builder,z:number){
  // An open semicircular strip over the tyre, not a solid wheel cover.
  const positions:number[]=[],indices:number[]=[];
  for(let i=0;i<=18;i++){const angle=-.24+i/18*(Math.PI+.48);for(const x of[-.046,.046])positions.push(x,.34+Math.sin(angle)*.354,z+Math.cos(angle)*.354);}
  for(let i=0;i<18;i++){const a=i*2;indices.push(a,a+2,a+1,a+1,a+2,a+3,a+1,a+2,a,a+3,a+2,a+1);}
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setIndex(indices);g.computeVertexNormals();b.add(g,black);
}
function buildTemplate(){
  const b=new Builder(),crank=v(.32,.12);
  b.line([v(.87,-.39),v(.58,-.31),v(.37,-.16),crank],.042,purple,8);
  b.cylinder(crank,v(.79,.25),.04,.03,purple,8);b.cylinder(v(.75,.25),v(.90,.25),.014,.014,silver,6);
  for(const side of[-1,1]){
    b.cylinder(v(.34,.58,side*.07),v(.32,.12,side*.065),.016,.021,purple,6);
    b.cylinder(v(.34,.58,side*.07),v(.76,.25,side*.035),.013,.015,purple,6);
  }
  const saddle=new T.Shape();saddle.moveTo(-.035,-.15);saddle.quadraticCurveTo(0,-.19,.035,-.15);saddle.lineTo(.065,-.035);saddle.quadraticCurveTo(.18,.08,.145,.13);saddle.quadraticCurveTo(0,.20,-.145,.13);saddle.quadraticCurveTo(-.18,.08,-.065,-.035);saddle.closePath();
  for(const[height,depth,mat]of[[.916,.018,pale],[.946,.032,black]] as const)b.add(new T.ExtrudeGeometry(saddle,{depth,bevelEnabled:true,bevelSegments:1,steps:1,bevelSize:.008,bevelThickness:.008,curveSegments:4}).rotateX(Math.PI/2),mat,0,height,.25);
  // A rounded open wheel lock wraps the mudguard; the status mark is not a QR code.
  const lock=new T.Shape();lock.moveTo(-.12,.50);lock.lineTo(-.12,.65);lock.quadraticCurveTo(-.12,.72,-.055,.72);lock.lineTo(.055,.72);lock.quadraticCurveTo(.12,.72,.12,.65);lock.lineTo(.12,.50);lock.lineTo(.071,.50);lock.lineTo(.071,.63);lock.quadraticCurveTo(.071,.655,.04,.655);lock.lineTo(-.04,.655);lock.quadraticCurveTo(-.071,.655,-.071,.63);lock.lineTo(-.071,.50);lock.closePath();
  b.add(new T.ExtrudeGeometry(lock,{depth:.09,bevelEnabled:true,bevelSegments:2,steps:1,bevelSize:.008,bevelThickness:.008,curveSegments:4}),black,0,0,.45);
  b.box(.06,.025,.006,0,.686,.441,yellow);
  // Simplified enclosed chain run on the drive side; its hidden shape is approximate.
  const chain=new T.Shape();chain.moveTo(.12,.22);chain.lineTo(.58,.295);chain.quadraticCurveTo(.65,.34,.58,.385);chain.lineTo(.12,.42);chain.quadraticCurveTo(-.015,.42,-.015,.32);chain.quadraticCurveTo(-.015,.22,.12,.22);chain.closePath();
  b.add(new T.ExtrudeGeometry(chain,{depth:.022,bevelEnabled:false,steps:1,curveSegments:6}).rotateY(-Math.PI/2),black,-.075);
  b.cylinder(v(.32,.12,-.103),v(.32,.12,-.11),.041,.041,silver,12);
  const group=finish(b,'rideable campus bicycle');
  group.userData.reference='user purple campus bicycle; proportions and lettering approximate';
  const rear=new Builder();mudguard(rear,.58);group.add(finish(rear,'rear mudguard'));
  const steering=new T.Group();steering.name='steered fork and swept-back handlebars';steering.position.z=-.39;group.add(steering);
  const front=new Builder();
  for(const side of[-1,1])front.line([v(.81,0,side*.04),v(.55,-.055,side*.06),v(.34,-.19,side*.07)],.021,purple,6);
  front.cylinder(v(.80,0),v(1.15,-.015),.022,.017,black,8);
  for(const side of[-1,1])front.line([v(.95,0,side*.035),v(.90,-.06,side*.07),v(.836,-.10,side*.11),v(.836,-.28,side*.11)],.012,black,5);
  front.line([v(1.20,.27,-.24),v(1.17,.04,-.20),v(1.15,-.015),v(1.17,.04,.20),v(1.20,.27,.24)],.017,black,6);
  for(const side of[-1,1]){
    front.cylinder(v(1.20,.27,side*.17),v(1.20,.27,side*.32),.024,.024,black,8);
    front.cylinder(v(1.17,.16,side*.18),v(1.165,.24,side*.28),.009,.009,silver,5);
    front.line([v(1.17,.13,side*.18),v(.99,.18,side*.16),v(.87,.02,side*.10),v(.5,-.12,side*.06)],.004,black,4);
  }
  mudguard(front,-.19);steering.add(finish(front,'fork handlebar and front mudguard'));
  const basket=new Builder();
  // Tapered rails and ribs leave real rectangular holes and an open top.
  for(const[y,w,d]of[[.85,.33,.26],[.96,.375,.30],[1.075,.42,.34]]){
    const z=-.21;
    for(const side of[-1,1]){basket.box(w,.023,.018,0,y,z+side*d/2,black);basket.box(.018,.023,d,side*w/2,y,z,black);}
  }
  for(const side of[-1,1])for(const t of[-1,-.5,0,.5,1])basket.cylinder(v(.85,-.21+side*.13,t*.165),v(1.075,-.21+side*.17,t*.21),.009,.009,black,4);
  for(const side of[-1,1])for(const t of[-.5,0,.5])basket.cylinder(v(.85,-.21+t*.13,side*.165),v(1.075,-.21+t*.17,side*.21),.009,.009,black,4);
  for(const x of[-.125,-.06,0,.06,.125])basket.box(.018,.015,.26,x,.843,-.21,black);
  basket.box(.048,.063,.006,0,1.02,-.044,yellow);basket.box(.045,.012,.006,0,1.042,-.041,black);
  steering.add(finish(basket,'front basket'));
  const wheel=new Builder();
  wheel.add(new T.TorusGeometry(.31,.025,6,32).rotateY(Math.PI/2),black);
  wheel.add(new T.TorusGeometry(.281,.025,4,32).rotateY(Math.PI/2),pale);
  for(let i=0;i<20;i++){const a=i*Math.PI/10;wheel.cylinder(v(Math.sin(a)*.035,Math.cos(a)*.035,i%2?.019:-.019),v(Math.sin(a+.24)*.263,Math.cos(a+.24)*.263),.0018,.0018,silver,3);}
  wheel.cylinder(v(0,0,-.075),v(0,0,.075),.028,.028,silver,8);wheel.box(.015,.025,.065,0,0,.18,white);
  const wheelTemplate=finish(wheel,'wheel');
  for(const isFront of[true,false]){const w=wheelTemplate.clone(true);w.name=isFront?'front wheel':'rear wheel';w.position.set(0,.34,isFront?-.19:.58);(isFront?steering:group).add(w);}
  const pedalBuilder=new Builder();
  pedalBuilder.cylinder(v(0,0,-.18),v(0,0,.18),.025,.025,silver,6);
  for(const side of[-1,1])pedalBuilder.cylinder(v(0,0,side*.18),v(0,side*.17,side*.18),.013,.013,black,6);
  const pedals=finish(pedalBuilder,'crank');pedals.position.copy(crank);group.add(pedals);
  const platformBuilder=new Builder();platformBuilder.box(.14,.035,.09,0,0,0,black);for(const side of[-1,1])platformBuilder.box(.085,.015,.003,0,0,side*.047,yellow);
  const platform=finish(platformBuilder,'pedal platform');
  for(const side of[-1,1]){const p=platform.clone(true);p.position.set(side*.22,0,side*.17);pedals.add(p);}
  const canvas=document.createElement('canvas');canvas.width=128;canvas.height=512;const ctx=canvas.getContext('2d')!;ctx.fillStyle='#f4f0f1';ctx.font='bold 94px KaiTi, STKaiti, serif';ctx.textAlign='center';ctx.textBaseline='middle';
  for(const[ i,char]of[...'南京大学'].entries())ctx.fillText(char,64,140+i*98,112);
  // Small emblem silhouette only; the source does not resolve its fine print.
  ctx.strokeStyle='#f4f0f1';ctx.lineWidth=5;ctx.strokeRect(28,8,72,68);ctx.beginPath();ctx.arc(64,40,22,0,Math.PI*2);ctx.stroke();ctx.fillRect(57,25,14,35);
  const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;texture.anisotropy=4;
  const lettering=new T.MeshStandardMaterial({name:'bicycle Nanjing University lettering',map:texture,alphaTest:.35,roughness:.72});
  for(const side of[-1,1]){const decal=new T.Mesh(new T.PlaneGeometry(.056,.29).rotateY(side*Math.PI/2).rotateX(-.32),lettering);decal.name='frame lettering';decal.position.set(side*.043,.662,-.33);group.add(decal);}
  return group;
}
export function createBicycle(color=0){
  template??=buildTemplate();
  // Object transforms are unique. Geometry, materials and label texture are shared.
  const group=template.clone(true);group.userData.parkingVariant=color;
  const wheels=[group.getObjectByName('front wheel')!,group.getObjectByName('rear wheel')!];
  const steering=group.getObjectByName('steered fork and swept-back handlebars')!;
  const pedals=group.getObjectByName('crank')!,platforms=pedals.children.filter(o=>o.name==='pedal platform');
  const update=(distance:number,phase:number,turn=0)=>{wheels.forEach(w=>w.rotation.x-=distance/.31);pedals.rotation.x=phase;platforms.forEach(p=>p.rotation.x=-phase);steering.rotation.y=turn;};
  return{group,wheels,steering,update};
}
