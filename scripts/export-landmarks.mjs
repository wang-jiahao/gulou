import {writeFile} from 'node:fs/promises';
import {GLTFExporter} from 'three/addons/exporters/GLTFExporter.js';
import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {dedup,weld,prune,meshopt} from '@gltf-transform/functions';
import {MeshoptEncoder} from 'meshoptimizer';
import {buildWing,buildAuditorium} from '../src/world/landmarks.ts';
globalThis.FileReader=class{async readAsArrayBuffer(b){this.result=await b.arrayBuffer();this.onloadend?.();}async readAsDataURL(b){this.result=`data:${b.type};base64,${Buffer.from(await b.arrayBuffer()).toString('base64')}`;this.onloadend?.();}};
await MeshoptEncoder.ready;const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.encoder':MeshoptEncoder});
const colliders=[];
for(const [name,asset] of [['east',buildWing('east')],['west',buildWing('west')],['auditorium',buildAuditorium()]]){
 const bytes=await new GLTFExporter().parseAsync(asset.group,{binary:true});const path=`public/assets/buildings/${name}.glb`;await writeFile(path,Buffer.from(bytes));
 const doc=await io.read(path);await doc.transform(dedup(),weld(),prune({keepAttributes:true}),meshopt({encoder:MeshoptEncoder,level:'medium'}));await io.write(path,doc);colliders.push(...asset.solids);console.log(name,'exported');
}
await writeFile('public/data/landmarks-collision.json',JSON.stringify(colliders));
