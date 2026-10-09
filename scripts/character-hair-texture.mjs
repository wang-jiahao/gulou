import sharp from 'sharp';
export async function bakeStudentHairFlow(){
const size=512;
let state=0x69c012;const random=()=>{state|=0;state=state+0x6D2B79F5|0;let t=Math.imul(state^state>>>15,1|state);t=t+Math.imul(t^t>>>7,61|t)^t;return ((t^t>>>14)>>>0)/4294967296;};
const strands=Array.from({length:168},()=>({u:random(),width:.0011+random()*.0018,strength:.30+random()*.56,phase:random()*Math.PI*2,rate:1.3+random()*2.2,bend:(random()-.5)*.009}));
const height=new Float32Array(size*size),color=new Uint8Array(size*size*3),normal=new Uint8Array(size*size*3),roughness=new Uint8Array(size*size*3);
const smooth=(a,b,x)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);};
for(let y=0;y<size;y++){
 const v=y/(size-1),fade=smooth(.025,.075,v),paths=strands.map(s=>({...s,at:(s.u+s.bend*Math.sin(v*Math.PI)*Math.sin(s.phase+v*s.rate)+1)%1}));
 for(let x=0;x<size;x++){
  const u=x/size;let flow=0;
  for(const strand of paths){const delta=Math.abs(u-strand.at),d=Math.min(delta,1-delta);if(d>strand.width*3)continue;flow+=strand.strength*Math.exp(-((d/strand.width)**2));}
  const h=.35+fade*(flow*.42+.022*Math.sin(v*19+u*Math.PI*12));height[y*size+x]=h;
  const noise=.5*Math.sin(v*31+u*Math.PI*14)*Math.sin(v*13-u*Math.PI*22),value=Math.max(174,Math.min(248,191+h*39+noise));
  color.set([Math.round(value),Math.round(value),Math.round(value)],(y*size+x)*3);
  const gloss=Math.max(194,Math.min(242,233-flow*18+noise));roughness.set([255,Math.round(gloss),0],(y*size+x)*3);
 }
}
for(let y=0;y<size;y++)for(let x=0;x<size;x++){
 const dx=(height[y*size+(x+1)%size]-height[y*size+(x+size-1)%size])*2.2,dy=(height[Math.min(size-1,y+1)*size+x]-height[Math.max(0,y-1)*size+x])*2.2,l=Math.hypot(dx,dy,1);
 normal.set([Math.round(127.5-127.5*dx/l),Math.round(127.5-127.5*dy/l),Math.round(127.5+127.5/l)],(y*size+x)*3);
}
const textures={};
for(const [name,data]of [['albedo',color],['normal',normal],['roughness',roughness]])textures[name]=await sharp(Buffer.from(data),{raw:{width:size,height:size,channels:3}}).png(name==='normal'?{}:{palette:true,colours:256,dither:0}).toBuffer();
return textures;
}

export async function attachStudentHairFlow(doc){
 const material=doc.getRoot().listMaterials().find(m=>m.getName()==='student-sculpted-hair');
 if(!material)throw Error('Sculpted hair material is missing');
 const images=await bakeStudentHairFlow();
 const texture=name=>doc.createTexture(`original fine hair ${name}`).setImage(images[name]).setMimeType('image/png');
 material.setBaseColorTexture(texture('albedo'));
 material.setNormalTexture(texture('normal')).setNormalScale(.32);
 material.setMetallicRoughnessTexture(texture('roughness')).setRoughnessFactor(1).setMetallicFactor(0);
 for(const info of [material.getBaseColorTextureInfo(),material.getNormalTextureInfo(),material.getMetallicRoughnessTextureInfo()])info.setWrapS(10497).setWrapT(33071);
}
