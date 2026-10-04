import assert from 'node:assert/strict';
import * as T from 'three';
import {splitBuildingRoof} from '../src/world/building-roof.ts';
const polygon=points=>new T.Shape(points.map(([x,y])=>new T.Vector2(x,y)));
const courtyard=polygon([[0,0],[10,0],[10,10],[0,10]]);
courtyard.holes.push(new T.Path([[3,3],[3,7],[7,7],[7,3]].map(([x,y])=>new T.Vector2(x,y))));
const concave=polygon([[0,0],[10,0],[10,4],[4,4],[4,10],[0,10]]);
const material=new T.MeshBasicMaterial({side:T.DoubleSide});
let triangles=0;
for(const [name,shape,area,empty] of [['courtyard',courtyard,84,[5,5]],['concave',concave,64,[7,7]]]){
 const height=12,source=new T.ExtrudeGeometry(shape,{depth:height,bevelEnabled:false}).rotateX(-Math.PI/2);
 const uv=source.attributes.uv;for(let i=0;i<uv.count;i++)uv.setXY(i,uv.getX(i)/2.4,uv.getY(i)/2.4);
 const copy=source.attributes.position.array.slice(),parts=splitBuildingRoof(source);
 assert.deepEqual(source.attributes.position.array,copy,'collision source remains intact');
 const roof=new T.Mesh(parts.roof,material),walls=new T.Mesh(parts.walls,material);
 let roofArea=0,volume=0;
 for(const geometry of Object.values(parts)){
  const p=geometry.attributes.position;triangles+=p.count/3;
  for(let i=0;i<p.count;i+=3){
   const a=new T.Vector3().fromBufferAttribute(p,i),b=new T.Vector3().fromBufferAttribute(p,i+1),c=new T.Vector3().fromBufferAttribute(p,i+2);
   volume+=a.dot(b.clone().cross(c))/6;
   if(geometry===parts.roof)roofArea+=b.sub(a).cross(c.sub(a)).length()/2;
  }
 }
 assert.ok(Math.abs(roofArea-area)<1e-5,`${name} roof follows footprint`);
 assert.ok(Math.abs(Math.abs(volume)-area*height)<1e-5,`${name} shell volume preserved`);
 const ray=(x,y)=>new T.Raycaster(new T.Vector3(x,30,-y),new T.Vector3(0,-1,0),0,31).intersectObjects([roof,walls]);
 assert.equal(ray(...empty).length,0,`${name} opening has no covering surface`);
 const hits=ray(1.37,2.29);assert.equal(hits.length,2,`${name} has one roof and one floor`);
 assert.ok(Math.abs(hits[0].point.y-height)<1e-5);assert.ok(Math.abs(hits[1].point.y)<1e-5);
 const wallHit=new T.Raycaster(new T.Vector3(-2,6,-2.29),new T.Vector3(1,0,0),0,3).intersectObject(walls);
 assert.equal(wallHit.length,1,`${name} wall stays closed`);
 for(let i=0;i<parts.roof.attributes.position.count;i++){
  const p=parts.roof.attributes.position,u=parts.roof.attributes.uv,n=parts.roof.attributes.normal;
  assert.ok(n.getY(i)>.999,'roof faces upward');
  assert.ok(Math.abs(u.getX(i)-p.getX(i)/2.4)<1e-6&&Math.abs(u.getY(i)+p.getZ(i)/2.4)<1e-6,'roof texture scale preserved');
 }
 for(const part of Object.values(parts))part.dispose();source.dispose();
}
material.dispose();console.log(JSON.stringify({status:'passed',fixtures:2,triangles,checks:'area, volume, courtyard, concavity, single roof layer, closed walls, upward normals, UVs, unchanged collision source'}));
