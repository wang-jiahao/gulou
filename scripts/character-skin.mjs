import * as T from 'three';
import sharp from 'sharp';

/** Original painted skin field, sampled in model space across all UV islands.
 * Pigment and roughness only: shadows remain the renderer's responsibility.
 */
export function sampleStudentSkin(x,y,z,gender) {
  const female=gender==='female',front=T.MathUtils.smoothstep(z,.045,.10);
  const gaussian=(v,c,s)=>Math.exp(-(((v-c)/s)**2));
  const color=new T.Color(female?0xebc5b6:0xe2baa7);
  const mouthY=female?1.5605:1.5555,halfWidth=female?.023:.025;
  const across=Math.abs(x)/halfWidth,tip=T.MathUtils.smoothstep(across,.68,1.04);
  const seam=mouthY+.003*across*across;
  const cupid=.0018*gaussian(Math.abs(x),.008,.005)-.0010*gaussian(x,0,.004);
  const upperExtent=T.MathUtils.lerp(female?.0071:.0065,.002,tip)+cupid;
  const lowerExtent=T.MathUtils.lerp(female?.0068:.0060,.002,tip);
  const insideWidth=1-T.MathUtils.smoothstep(across,.82,1.07);
  const upper=T.MathUtils.smoothstep(y,seam-.001,seam+.001)*(1-T.MathUtils.smoothstep(y,seam+upperExtent-.004,seam+upperExtent));
  const lower=(1-T.MathUtils.smoothstep(y,seam-.001,seam+.001))*T.MathUtils.smoothstep(y,seam-lowerExtent,seam-lowerExtent+.004);
  const lip=(upper*.92+lower*.82)*insideWidth*front;
  color.lerp(new T.Color(female?0xc78985:0xb8877a),lip*.44);
  // The source has an actual mouth opening. Its recessed mucosa is not skin.
  const cavity=gaussian(y,seam,.0015)*insideWidth*T.MathUtils.smoothstep(z,.025,.065)*(1-T.MathUtils.smoothstep(z,.100,.118));
  color.lerp(new T.Color(0x704342),cavity);
  const cheeks=gaussian(Math.abs(x),.048,.026)*gaussian(y,1.600,.018)*front;
  color.lerp(new T.Color(female?0xc67f78:0xb87f6c),cheeks*(female?.16:.10));
  const nose=gaussian(x,0,.020)*gaussian(y,1.598,.018)*front;
  color.lerp(new T.Color(female?0xc18578:0xad7664),nose*.12);
  const underEyes=gaussian(Math.abs(x),.032,.018)*gaussian(y,1.625,.006)*front;
  color.lerp(new T.Color(0xc49c90),underEyes*.035);
  const ears=gaussian(Math.abs(x),.081,.014)*gaussian(y,1.616,.042);
  color.lerp(new T.Color(0xbe8070),ears*.18);
  const tzone=Math.max(nose,gaussian(x,0,.036)*gaussian(y,1.67,.025)*front);
  const pigment=Math.sin(x*195+y*137+z*181)*Math.sin(y*221-x*119)*.010+Math.sin(x*843+y*617)*Math.sin(z*721+y*543)*.004;
  color.multiplyScalar(1+pigment);
  const roughness=T.MathUtils.clamp(.61-.025*lip-.055*tzone+.014*Math.sin(x*420+y*650+z*370),.49,.68);
  return {color:color.convertLinearToSRGB().toArray(),roughness};
}

/** Bake an arbitrary smooth surface field into its real face-varying UV atlas.
 * glTF image rows follow UV v from top to bottom. A padded coverage mask protects island borders from bilinear filtering.
 */
export function rasterizeCharacterAtlas(geometry,sample,{size=1024,padding=6}={}) {
  if(!Number.isInteger(size)||size<16||!Number.isInteger(padding)||padding<0)throw new Error('Invalid atlas dimensions');
  const position=geometry.getAttribute('position'),uv=geometry.getAttribute('uv');
  if(!position||!uv||position.count!==uv.count)throw new Error('Atlas requires matching position and UV attributes');
  const color=new Uint8Array(size*size*3),surface=new Uint8Array(size*size*3),coverage=new Uint8Array(size*size);
  const index=i=>geometry.index?geometry.index.getX(i):i,count=geometry.index?.count??position.count;
  const edge=(a,b,p)=>(p[0]-a[0])*(b[1]-a[1])-(p[1]-a[1])*(b[0]-a[0]);
  for(let i=0;i<count;i+=3){
    const ids=[index(i),index(i+1),index(i+2)],tex=ids.map(k=>[uv.getX(k)*size,uv.getY(k)*size]);
    const area=edge(tex[0],tex[1],tex[2]);if(Math.abs(area)<1e-10)continue;
    const lowX=Math.max(0,Math.floor(Math.min(...tex.map(t=>t[0])))),highX=Math.min(size-1,Math.ceil(Math.max(...tex.map(t=>t[0]))));
    const lowY=Math.max(0,Math.floor(Math.min(...tex.map(t=>t[1])))),highY=Math.min(size-1,Math.ceil(Math.max(...tex.map(t=>t[1]))));
    for(let y=lowY;y<=highY;y++)for(let x=lowX;x<=highX;x++){
      const pixel=[x+.5,y+.5],bary=[edge(tex[1],tex[2],pixel)/area,edge(tex[2],tex[0],pixel)/area,edge(tex[0],tex[1],pixel)/area];
      if(bary.some(t=>t< -1e-6))continue;
      const p=[0,0,0];for(let c=0;c<3;c++)for(let v=0;v<3;v++)p[c]+=bary[v]*position.array[ids[v]*3+c];
      const result=sample(...p),k=y*size+x;
      if(![...result.color,result.roughness].every(Number.isFinite))throw new Error('Non-finite skin sample');
      for(let c=0;c<3;c++)color[k*3+c]=Math.round(T.MathUtils.clamp(result.color[c],0,1)*255);
      surface.set([255,Math.round(T.MathUtils.clamp(result.roughness,0,1)*255),0],k*3);coverage[k]=1;
    }
  }
  const covered=coverage.reduce((sum,v)=>sum+v,0);
  for(let step=0;step<padding;step++){
    const pending=[];
    for(let y=0;y<size;y++)for(let x=0;x<size;x++){
      const k=y*size+x;if(coverage[k])continue;
      const from=[x>0?k-1:-1,x<size-1?k+1:-1,y>0?k-size:-1,y<size-1?k+size:-1].find(n=>n>=0&&coverage[n]);
      if(from!==undefined)pending.push([k,from]);
    }
    for(const [to,from]of pending){color.set(color.subarray(from*3,from*3+3),to*3);surface.set(surface.subarray(from*3,from*3+3),to*3);coverage[to]=1;}
  }
  // Neutral unused atlas space does not introduce black mips at distant LOD.
  for(let k=0;k<coverage.length;k++)if(!coverage[k]){color.set([196,153,131],k*3);surface.set([255,164,0],k*3);}
  return {color,surface,coverage,covered,size};
}

export async function bakeStudentSkin(geometry,gender,options={}) {
  const atlas=rasterizeCharacterAtlas(geometry,(x,y,z)=>sampleStudentSkin(x,y,z,gender),options);
  const encode=data=>sharp(Buffer.from(data),{raw:{width:atlas.size,height:atlas.size,channels:3}}).png().toBuffer();
  return {albedo:await encode(atlas.color),roughness:await encode(atlas.surface),coverage:atlas.covered,size:atlas.size};
}
