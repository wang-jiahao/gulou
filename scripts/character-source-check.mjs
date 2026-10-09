import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {loadCharacterSource} from './character-source.mjs';
const base=await loadCharacterSource('male',{target:false});
const old=JSON.parse(await readFile('assets/source-models/character/human-data.json','utf8'));
assert.equal(base.vertices.length,old.vertices.length,'same source vertex indexing');
assert.deepEqual(base.uvs,old.uvs,'same source UV atlas');
assert.deepEqual(base.groups,old.groups,'same facial/garment topology');
for(let i=0;i<base.vertices.length;i++)for(let a=0;a<3;a++)assert.ok(Math.abs(base.vertices[i][a]-old.vertices[i][a])<.000001,'original source normalization reproduced');
const variants={};
for(const gender of ['male','female']){
  const data=await loadCharacterSource(gender);
  assert.deepEqual(data.groups,base.groups,'targets preserve topology and UV assignments');
  assert.deepEqual(Object.keys(data.joints),Object.keys(base.joints),'all joint markers retained');
  assert.ok(Object.values(data.joints).every(p=>p.every(Number.isFinite)),'finite regenerated joints');
  assert.ok(data.joints.neck[1]>data.joints.pelvis[1]&&data.joints['l-eye'][1]>data.joints.neck[1],'upright skeleton');
  assert.ok(data.joints['l-eye'][0]>0&&data.joints['r-eye'][0]<0,'eye markers retain sides');
  let headDelta=0;
  for(let i=0;i<data.vertices.length;i++)if(base.vertices[i][1]>base.joints.neck[1])headDelta=Math.max(headDelta,Math.hypot(...data.vertices[i].map((v,j)=>v-base.vertices[i][j])));
  assert.ok(headDelta>.005&&headDelta<.20,'head is meaningfully reshaped without extreme deformation');
  variants[gender]={source:data.source,joints:Object.keys(data.joints).length,maxHeadDisplacement:headDelta,eyes:[data.joints['l-eye'],data.joints['r-eye']]};
}
assert.notDeepEqual(variants.male.eyes,variants.female.eyes,'independent source shapes, not a width-only copy');
await writeFile('docs/validation/v0.110/source-check.json',JSON.stringify({passed:true,variants,scope:'source data/marker integrity, not visual or animation acceptance'},null,2)+'\n');
console.log('PASS: original topology/UV reproduced; independent male/female shapes and joint markers derived consistently.');
