import sharp from 'sharp';

/** Neutral, original strand relief: the material supplies the hair colour.
 * Fine filaments sit inside broad irregular locks, with restrained gloss so
 * the new sculpted volume is not flattened by bright parallel stripes. */
export async function bakeStudentHairFlow({size=512}={}){
  if(![256,512,1024].includes(size))throw new Error('Hair texture size must be 256, 512 or 1024');
  let state=0x69c112;
  const random=()=>{state|=0;state=state+0x6D2B79F5|0;let t=Math.imul(state^state>>>15,1|state);t=t+Math.imul(t^t>>>7,61|t)^t;return ((t^t>>>14)>>>0)/4294967296;};
  const strands=Array.from({length:190},()=>({u:random(),width:.00075+random()*.0017,strength:.22+random()*.60,phase:random()*Math.PI*2,rate:1.1+random()*2.4,bend:(random()-.5)*.014}));
  const bundles=Array.from({length:17},()=>({u:random(),width:.009+random()*.020,strength:.12+random()*.20,phase:random()*Math.PI*2}));
  const height=new Float32Array(size*size),color=new Uint8Array(size*size*3),normal=new Uint8Array(size*size*3),roughness=new Uint8Array(size*size*3);
  const smooth=(a,b,x)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);};
  for(let y=0;y<size;y++){
    const v=y/(size-1),fade=smooth(.018,.068,v),paths=strands.map(s=>({...s,at:(s.u+s.bend*Math.sin(v*Math.PI)*Math.sin(s.phase+v*s.rate)+1)%1}));
    for(let x=0;x<size;x++){
      const u=x/size;let fine=0,broad=0;
      for(const strand of paths){const delta=Math.abs(u-strand.at),d=Math.min(delta,1-delta);if(d<strand.width*3)fine+=strand.strength*Math.exp(-((d/strand.width)**2));}
      for(const bundle of bundles){const at=(bundle.u+.009*Math.sin(v*2.8+bundle.phase)+1)%1,delta=Math.abs(u-at),d=Math.min(delta,1-delta);broad+=bundle.strength*Math.exp(-((d/bundle.width)**2));}
      const relief=fade*(fine*.24+broad*.11),h=.30+relief;height[y*size+x]=h;
      const variation=1.8*Math.sin(v*17+u*Math.PI*10)*Math.sin(v*9-u*Math.PI*18),value=Math.max(190,Math.min(244,216+fine*10+broad*12+variation));
      color.set([Math.round(value),Math.round(value),Math.round(value)],(y*size+x)*3);
      const gloss=Math.max(177,Math.min(214,204-fine*14-broad*10+variation));roughness.set([255,Math.round(gloss),0],(y*size+x)*3);
    }
  }
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const dx=(height[y*size+(x+1)%size]-height[y*size+(x+size-1)%size])*1.8,dy=(height[Math.min(size-1,y+1)*size+x]-height[Math.max(0,y-1)*size+x])*1.8,l=Math.hypot(dx,dy,1);
    normal.set([Math.round(127.5-127.5*dx/l),Math.round(127.5-127.5*dy/l),Math.round(127.5+127.5/l)],(y*size+x)*3);
  }
  const textures={};
  for(const[name,data]of[['albedo',color],['normal',normal],['roughness',roughness]])textures[name]=await sharp(Buffer.from(data),{raw:{width:size,height:size,channels:3}}).png(name==='normal'?{}:{palette:true,colours:256,dither:0}).toBuffer();
  return textures;
}

export async function attachStudentHairFlow(doc,options={}){
  const material=doc.getRoot().listMaterials().find(m=>m.getName()==='student-sculpted-hair');
  if(!material)throw Error('Sculpted hair material is missing');
  const images=await bakeStudentHairFlow(options);
  const texture=name=>doc.createTexture(`original fine hair ${name}`).setImage(images[name]).setMimeType('image/png');
  material.setBaseColorTexture(texture('albedo'));
  material.setNormalTexture(texture('normal')).setNormalScale(.25);
  material.setMetallicRoughnessTexture(texture('roughness')).setRoughnessFactor(1).setMetallicFactor(0);
  for(const info of[material.getBaseColorTextureInfo(),material.getNormalTextureInfo(),material.getMetallicRoughnessTextureInfo()])info.setWrapS(10497).setWrapT(33071);
}
