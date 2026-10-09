import * as T from 'three';

/** Cut clothing triangles at exact hem/collar heights. Selecting whole faces
 * by their centres leaves saw-tooth edges; clipping interpolates the UV and
 * smooth normal at every newly created boundary vertex instead.
 */
export function clipGarmentHeight(source, minY, maxY) {
  if(!(minY<maxY))throw new Error('Invalid garment height interval');
  const position=source.getAttribute('position'),normal=source.getAttribute('normal'),uv=source.getAttribute('uv');
  if(!normal||!uv)throw new Error('Garment needs smooth normals and texture coordinates');
  const positions=[],normals=[],uvs=[];
  const vertex=i=>({p:new T.Vector3().fromBufferAttribute(position,i),n:new T.Vector3().fromBufferAttribute(normal,i),uv:new T.Vector2().fromBufferAttribute(uv,i)});
  function clip(polygon,height,keepAbove){
    const out=[],inside=p=>keepAbove?p.p.y>=height:p.p.y<=height;
    for(let i=0;i<polygon.length;i++){
      const a=polygon[i],b=polygon[(i+1)%polygon.length],ia=inside(a),ib=inside(b);
      if(ia)out.push(a);
      if(ia!==ib){
        const t=(height-a.p.y)/(b.p.y-a.p.y);
        const p=a.p.clone().lerp(b.p,t);p.y=height;
        out.push({p,n:a.n.clone().lerp(b.n,t).normalize(),uv:a.uv.clone().lerp(b.uv,t)});
      }
    }
    return out;
  }
  const count=source.index?.count??position.count,index=i=>source.index?source.index.getX(i):i;
  for(let i=0;i<count;i+=3){
    let polygon=[vertex(index(i)),vertex(index(i+1)),vertex(index(i+2))];
    polygon=clip(clip(polygon,minY,true),maxY,false);
    for(let j=1;j<polygon.length-1;j++){
      const tri=[polygon[0],polygon[j],polygon[j+1]];
      const cross=tri[1].p.clone().sub(tri[0].p).cross(tri[2].p.clone().sub(tri[0].p));
      if(cross.lengthSq()<1e-20)continue;
      for(const v of tri){positions.push(...v.p.toArray());normals.push(...v.n.toArray());uvs.push(...v.uv.toArray());}
    }
  }
  const result=new T.BufferGeometry();
  result.setAttribute('position',new T.Float32BufferAttribute(positions,3));
  result.setAttribute('normal',new T.Float32BufferAttribute(normals,3));
  result.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));
  return result;
}

/** Continuous ribbing follows the cut loop, including an asymmetric collar.
 * Coplanar triangle edges inside the surface cancel after position welding.
 */
export function garmentBoundaryBand(geometry,height,extension,inset=.003,thickness=.002,region=()=>true) {
  if(!Number.isFinite(extension)||extension===0||!Number.isFinite(inset)||!Number.isFinite(thickness)||thickness<=0)throw new Error('Invalid ribbing dimensions');
  const p=geometry.getAttribute('position'),edges=new Map();
  const key=v=>v.toArray().map(x=>Math.round(x*1e7)).join(',');
  const count=geometry.index?.count??p.count,index=i=>geometry.index?geometry.index.getX(i):i;
  for(let i=0;i<count;i+=3){
    const triangle=[0,1,2].map(j=>new T.Vector3().fromBufferAttribute(p,index(i+j)));
    for(let j=0;j<3;j++){
      const a=triangle[j],b=triangle[(j+1)%3];
      if(Math.abs(a.y-height)>1e-6||Math.abs(b.y-height)>1e-6||a.distanceToSquared(b)<1e-16)continue;
      const ka=key(a),kb=key(b),id=ka<kb?`${ka}/${kb}`:`${kb}/${ka}`;
      const edge=edges.get(id);if(edge)edge.count++;else edges.set(id,{a,b,count:1});
    }
  }
  const boundary=[...edges.values()].filter(e=>e.count===1&&region(e.a)&&region(e.b));
  const degree=new Map();
  for(const {a,b}of boundary)for(const v of [a,b])degree.set(key(v),(degree.get(key(v))??0)+1);
  if([...degree.values()].some(n=>n!==2))throw new Error('Garment band region must select complete boundary loops');
  if(!boundary.length)throw new Error('Garment cut has no boundary for ribbing');
  const points=[...new Map(boundary.flatMap(({a,b})=>[[key(a),a],[key(b),b]])).values()];
  const centre=points.reduce((sum,p)=>sum.add(p),new T.Vector3()).divideScalar(points.length);
  const positions=[],normals=[],uvs=[];
  for(const {a,b}of boundary){
    const na=new T.Vector3(a.x-centre.x,0,a.z-centre.z).normalize(),nb=new T.Vector3(b.x-centre.x,0,b.z-centre.z).normalize();
    const a0=a.clone().addScaledVector(na,.001),b0=b.clone().addScaledVector(nb,.001);
    const a1=a.clone().addScaledVector(na,-inset),b1=b.clone().addScaledVector(nb,-inset);a1.y+=extension;b1.y+=extension;
    const ai0=a0.clone().addScaledVector(na,-thickness),bi0=b0.clone().addScaledVector(nb,-thickness);
    const ai1=a1.clone().addScaledVector(na,-thickness),bi1=b1.clone().addScaledVector(nb,-thickness);
    const up=new T.Vector3(0,Math.sign(extension),0),down=up.clone().negate();
    // Both the inside wall and the top return are real geometry: the collar
    // remains opaque when the camera looks down into the neck opening.
    for(const [corners,direction] of [
      [[a0,b0,b1,a1],1],[[bi0,ai0,ai1,bi1],-1],
      [[a1,b1,bi1,ai1],up],[[b0,a0,ai0,bi0],down],
    ]){
      const vs=[corners[0],corners[1],corners[2],corners[0],corners[2],corners[3]];
      const radial=v=>new T.Vector3(v.x-centre.x,0,v.z-centre.z).normalize();
      for(let i=0;i<vs.length;i+=3){
        const face=vs[i+1].clone().sub(vs[i]).cross(vs[i+2].clone().sub(vs[i]));
        const desired=typeof direction==='number'?radial(vs[i]).multiplyScalar(direction):direction;
        if(face.dot(desired)<0)[vs[i+1],vs[i+2]]=[vs[i+2],vs[i+1]];
      }
      for(const v of vs){
        const n=typeof direction==='number'?radial(v).multiplyScalar(direction):direction;
        positions.push(...v.toArray());normals.push(...n.toArray());
        const r=radial(v);uvs.push(Math.atan2(r.z,r.x)/(Math.PI*2)+.5,(v.y-height)/Math.abs(extension));
      }
    }
  }
  const band=new T.BufferGeometry();band.setAttribute('position',new T.Float32BufferAttribute(positions,3));band.setAttribute('normal',new T.Float32BufferAttribute(normals,3));band.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));
  band.userData.boundarySegments=boundary.length;
  return band;
}
