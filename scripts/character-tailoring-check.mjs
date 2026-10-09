import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import * as T from 'three';
import {loadCharacterSource} from './character-source.mjs';
import {subdivideCharacterSurface} from './character-surface.mjs';
import {clipGarmentHeight,garmentBoundaryBand} from './character-tailoring.mjs';

const triangle=new T.BufferGeometry();
triangle.setAttribute('position',new T.Float32BufferAttribute([0,0,0,1,2,0,-1,2,0],3));
triangle.setAttribute('uv',new T.Float32BufferAttribute([0,0,1,1,0,1],2));triangle.computeVertexNormals();
const cut=clipGarmentHeight(triangle,1,3),p=cut.getAttribute('position'),uv=cut.getAttribute('uv');
assert.equal(p.count,6,'one cut vertex produces a quad');
for(let i=0;i<p.count;i++)if(p.getY(i)===1){
  assert.equal(uv.getY(i),.5,'UV interpolated at exact cut');
  assert.equal(uv.getX(i),p.getX(i)>0?.5:0,'both cut edge coordinates retained');
}
const report={passed:true,variants:{},scope:'garment clip/UV/closed shell/winding/waist selection only, not visual acceptance'};
for(const gender of ['male','female']){
  const data=await loadCharacterSource(gender),min=data.joints.pelvis[1]-.03,max=data.joints.neck[1]-.015;
  const raw=subdivideCharacterSurface(data.vertices.map(p=>new T.Vector3(...p)),data.uvs,data.groups['helper-tights'],()=>true);
  const garment=clipGarmentHeight(raw,min,max),position=garment.getAttribute('position');
  for(let i=0;i<position.count;i++)assert.ok(position.getY(i)>=min-1e-6&&position.getY(i)<=max+1e-6,'no saw-tooth face beyond cut height');
  const bands=[];
  for(const [height,extension]of [[min,-.025],[max,.018]]){
    const band=garmentBoundaryBand(garment,height,extension,.003,.002,v=>Math.abs(v.x)<.28),bp=band.getAttribute('position'),bn=band.getAttribute('normal');
    assert.ok([...band.getAttribute('position').array].every(Number.isFinite),'finite shell');
    for(let i=0;i<bp.count;i++)assert.ok(Math.abs(bp.getX(i))<.28,'waist band excludes the sleeve openings');
    assert.ok(band.userData.boundarySegments>12,'complete cut loop produces detailed ribbing');
    for(let i=0;i<bp.count;i+=3){
      const a=new T.Vector3().fromBufferAttribute(bp,i),b=new T.Vector3().fromBufferAttribute(bp,i+1),c=new T.Vector3().fromBufferAttribute(bp,i+2);
      const normal=new T.Vector3().fromBufferAttribute(bn,i);
      assert.ok(b.clone().sub(a).cross(c.clone().sub(a)).dot(normal)>0,'band outward winding agrees with normal');
    }
    for(let i=0;i<bp.count;i++)assert.ok(Math.abs(bp.getY(i)-height)<1e-6||Math.abs(bp.getY(i)-(height+extension))<1e-6,'ribbing follows two precise boundary heights');
    const edgeUses=new Map(),vertexKey=i=>[bp.getX(i),bp.getY(i),bp.getZ(i)].map(x=>Math.round(x*1e7)).join(',');
    for(let i=0;i<bp.count;i+=3)for(let j=0;j<3;j++){
      const a=vertexKey(i+j),b=vertexKey(i+(j+1)%3),key=a<b?a+'/'+b:b+'/'+a;
      edgeUses.set(key,(edgeUses.get(key)??0)+1);
    }
    assert.ok([...edgeUses.values()].every(n=>n===2),'collar has closed outer, inner and return surfaces');
    bands.push(band.userData.boundarySegments);
  }
  assert.throws(()=>garmentBoundaryBand(garment,max,.018,.003,.002,v=>v.x>0),/complete boundary loops/,'reject partial neck loop');
  report.variants[gender]={triangles:position.count/3,hemSegments:bands[0],collarSegments:bands[1]};
}
await writeFile('docs/validation/v0.110/tailoring-check.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
