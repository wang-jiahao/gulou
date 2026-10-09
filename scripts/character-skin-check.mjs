import assert from 'node:assert/strict';
import * as T from 'three';
import {writeFile} from 'node:fs/promises';
import {rasterizeCharacterAtlas,sampleStudentSkin,bakeStudentSkin} from './character-skin.mjs';
import {loadCharacterSource} from './character-source.mjs';
import {subdivideCharacterSurface} from './character-surface.mjs';
import sharp from 'sharp';

const patch=new T.BufferGeometry();
patch.setAttribute('position',new T.Float32BufferAttribute([0,0,0,1,0,0,1,1,0,0,1,0],3));
patch.setAttribute('uv',new T.Float32BufferAttribute([0,0,1,0,1,1,0,1],2));patch.setIndex([0,1,2,0,2,3]);
const sample=(x,y)=>({color:[x,y,.25],roughness:.25+.5*y});
const atlas=rasterizeCharacterAtlas(patch,sample,{size:32,padding:0}),pixel=8*32+16;
assert.equal(atlas.covered,1024,'every texel in a full UV quad is rasterized');
assert.equal(atlas.color[pixel*3],Math.round(16.5/32*255),'barycentric position controls red');
assert.equal(atlas.color[pixel*3+1],Math.round(8.5/32*255),'glTF image rows follow UV v, without vertical inversion');
assert.equal(atlas.surface[pixel*3+1],Math.round((.25+.5*8.5/32)*255),'roughness is in the green channel');
assert.equal(atlas.surface[pixel*3+2],0,'skin is non-metallic');
// Disconnected UV islands of the exact same surface must paint alike.
const islands=new T.BufferGeometry();
islands.setAttribute('position',new T.Float32BufferAttribute([0,0,0,1,0,0,1,1,0,0,1,0,0,0,0,1,0,0,1,1,0,0,1,0],3));
islands.setAttribute('uv',new T.Float32BufferAttribute([.0625,.25,.4375,.25,.4375,.75,.0625,.75,.5625,.25,.9375,.25,.9375,.75,.5625,.75],2));
islands.setIndex([0,1,2,0,2,3,4,5,6,4,6,7]);
const mapped=rasterizeCharacterAtlas(islands,sample,{size:32,padding:2});
for(let y=8;y<24;y++)for(let x=2;x<14;x++)assert.deepEqual([...mapped.color.subarray((y*32+x)*3,(y*32+x)*3+3)],[...mapped.color.subarray((y*32+x+16)*3,(y*32+x+16)*3+3)],'disconnected islands share the same painted field');
assert.equal(mapped.coverage[15*32+1],1,'padding grows beyond island boundary');
const report={passed:true,scope:'UV raster orientation, island consistency, padding, pigment and roughness; not visual acceptance',variants:{}};
for(const gender of ['male','female']){
  const data=await loadCharacterSource(gender),head=subdivideCharacterSurface(data.vertices.map(p=>new T.Vector3(...p)),data.uvs,data.groups.body,p=>p.y>data.joints.neck[1]-.004);
  const texture=await bakeStudentSkin(head,gender,{size:256,padding:3});
  const image=await sharp(texture.albedo).metadata();assert.equal(image.width,256);assert.equal(image.channels,3);assert.ok(texture.coverage>1000);
  const lip=sampleStudentSkin(0,gender==='female'?1.554:1.549,.156,gender),cheek=sampleStudentSkin(.055,1.599,.133,gender);
  assert.ok(lip.roughness<cheek.roughness,'lip is less rough than cheek');
  assert.ok(lip.color[1]/lip.color[0]<cheek.color[1]/cheek.color[0],'lip has a warmer pigment ratio');
  report.variants[gender]={coveredPixels:texture.coverage,albedoBytes:texture.albedo.length,roughnessBytes:texture.roughness.length};
}
await writeFile('docs/validation/v0.110/skin-check.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
