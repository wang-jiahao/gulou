import * as T from 'three';
import sharp from 'sharp';

// Original campus casual color blocking. The primary cloth stays tintable by
// the game's existing outfit presets; contrast cloth never receives that tint.
export function createStudentClothing({female,neckY}) {
  const primary=new T.Color(female?0x81978a:0x293f53),contrast=new T.Color(female?0xe5dfd0:0xe3dbc7);
  const contrastMaterial=new T.MeshStandardMaterial({name:'student-cotton-contrast',color:contrast,roughness:.92});
  const ribMaterial=new T.MeshStandardMaterial({name:'student-rib-knit',color:0xffffff,roughness:.94});
  const field=([x,y])=>female
    ?y-(neckY-.176+.056*Math.min(Math.abs(x)/.22,1)**2)
    :Math.abs(x)-T.MathUtils.lerp(.064,.233,T.MathUtils.smoothstep(neckY-y,0,.205));
  return {primary,contrastMaterial,ribMaterial,field};
}

// Clip material regions through existing triangles without changing the shell.
// Both sides receive identical interpolated boundary coordinates, UVs/normals;
// the caller then assigns its unchanged continuous skin-weight field.
export function splitStudentClothing(geometry,field) {
  const attributes=Object.entries(geometry.attributes),position=geometry.getAttribute('position'),count=geometry.index?.count??position.count;
  const outputs=[Object.fromEntries(attributes.map(([name])=>[name,[]])),Object.fromEntries(attributes.map(([name])=>[name,[]]))];
  const vertex=index=>Object.fromEntries(attributes.map(([name,a])=>[name,Array.from({length:a.itemSize},(_,k)=>a.array[index*a.itemSize+k])]));
  const blend=(a,b,t)=>{const result=Object.fromEntries(attributes.map(([name])=>[name,a[name].map((n,i)=>T.MathUtils.lerp(n,b[name][i],t))]));if(result.normal){const n=new T.Vector3(...result.normal).normalize();result.normal=n.toArray();}return result;};
  let crossed=0;
  for(let i=0;i<count;i+=3){
    const triangle=[0,1,2].map(j=>vertex(geometry.index?geometry.index.getX(i+j):i+j)),distances=triangle.map(v=>field(v.position));
    if(!distances.every(Number.isFinite))throw Error('Nonfinite clothing region');
    if(Math.min(...distances)<0&&Math.max(...distances)>0)crossed++;
    for(const region of [0,1]){
      const sign=region?1:-1,polygon=[];
      for(let j=0;j<3;j++){
        const a=triangle[j],b=triangle[(j+1)%3],da=distances[j],db=distances[(j+1)%3],inA=sign*da>=0,inB=sign*db>=0;
        if(inA)polygon.push(a);
        if(inA!==inB)polygon.push(blend(a,b,da/(da-db)));
      }
      for(let j=1;j+1<polygon.length;j++){
        const vertices=[polygon[0],polygon[j],polygon[j+1]],[a,b,c]=vertices.map(v=>new T.Vector3(...v.position));
        if(b.sub(a).cross(c.sub(a)).lengthSq()<1e-20)continue;
        for(const v of vertices)for(const [name]of attributes)outputs[region][name].push(...v[name]);
      }
    }
  }
  const parts=outputs.map((output,region)=>{const g=new T.BufferGeometry();for(const [name,a]of attributes)g.setAttribute(name,new T.BufferAttribute(new a.array.constructor(output[name]),a.itemSize,a.normalized));g.userData={...geometry.userData,clothingRegion:region?'fixed cream contrast':'outfit-tintable primary'};return g;});
  return {primary:parts[0],contrast:parts[1],report:{originalTriangles:count/3,primaryTriangles:parts[0].getAttribute('position').count/3,contrastTriangles:parts[1].getAttribute('position').count/3,splitTriangles:crossed}};
}

// Original fine rib-knit texture, including two restrained varsity stripes.
// It applies only to the fixed coordinating rib material, never to primary tint.
export async function attachStudentClothing(doc,{female}) {
  const material=doc.getRoot().listMaterials().find(m=>m.getName()==='student-rib-knit');
  if(!material)throw Error('Fashion rib material is missing');
  const width=512,height=128,color=new Uint8Array(width*height*3),normal=new Uint8Array(width*height*3);
  const base=new T.Color(female?0x697e73:0x243b4b),cream=new T.Color(0xe5dfcf);
  const band=(v,center,half)=>1-T.MathUtils.smoothstep(Math.abs(v-center),half-.007,half+.007);
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    const u=x/width,v=y/(height-1),stripe=female?Math.max(band(v,.75,.033),T.MathUtils.smoothstep(v,.93,.95)):Math.max(band(v,.25,.035),band(v,.72,.035));
    const weave=Math.sin(u*Math.PI*128)*.018+Math.sin(v*Math.PI*64+u*Math.PI*128)*.004,c=base.clone().lerp(cream,stripe).multiplyScalar(1+weave).convertLinearToSRGB();
    color.set(c.toArray().map(n=>Math.round(T.MathUtils.clamp(n,0,1)*255)),(y*width+x)*3);
    const nx=-Math.cos(u*Math.PI*128)*.25,ny=Math.cos(v*Math.PI*64+u*Math.PI*128)*.04,l=Math.hypot(nx,ny,1);normal.set([Math.round(127.5+127.5*nx/l),Math.round(127.5+127.5*ny/l),Math.round(127.5+127.5/l)],(y*width+x)*3);
  }
  const encode=data=>sharp(Buffer.from(data),{raw:{width,height,channels:3}}).png().toBuffer();
  material.setBaseColorTexture(doc.createTexture('original campus rib colors').setImage(await encode(color)).setMimeType('image/png'));
  material.setNormalTexture(doc.createTexture('original campus knit relief').setImage(await encode(normal)).setMimeType('image/png')).setNormalScale(.16);
  for(const info of [material.getBaseColorTextureInfo(),material.getNormalTextureInfo()])info.setWrapS(10497).setWrapT(10497);
}
