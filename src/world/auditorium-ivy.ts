import * as T from 'three';
import {rng} from './geometry.ts';
import type {Materials} from './materials.ts';

/** Side-wall ivy from the auditorium angle photographs; keep the doorway and
 * carved front gables clear. Coverage is a photographic approximation. */
export function createAuditoriumIvy(mats:Materials,quality='medium'){
  const rand=rng(19201011),obj=new T.Object3D(),matrices:T.Matrix4[]=[],colors:T.Color[]=[];
  const spacing=quality==='low'?.23:.15;
  for(const side of [-1,1])for(let z=14.9;z<19.2;z+=spacing)for(let y=1.0;y<8.7;y+=spacing){
    const growth=.5+.3*Math.sin(z*1.4+y*.3)+.2*Math.cos(y*1.9-z*.65);
    if(rand()>.78+growth*.16||y>8.1+growth*.6)continue;
    obj.position.set(side*(9.96+.03+growth*.11),y+(rand()-.5)*spacing,z+(rand()-.5)*spacing);
    obj.rotation.set((rand()-.5)*.6,side*Math.PI/2+(rand()-.5)*.55,(rand()-.5)*2.2);
    const size=.19+rand()*.09;obj.scale.set(size,size,size);obj.updateMatrix();matrices.push(obj.matrix.clone());
    const light=.70+rand()*.27;colors.push(new T.Color(light*.94,light,light*.84));
  }
  const leaves=new T.InstancedMesh(new T.PlaneGeometry(1,1),mats.ivy,matrices.length);
  matrices.forEach((m,i)=>{leaves.setMatrixAt(i,m);leaves.setColorAt(i,colors[i]);});leaves.name='auditorium side ivy';leaves.castShadow=leaves.receiveShadow=true;leaves.computeBoundingSphere();
  const group=new T.Group();group.add(leaves);group.position.set(-52.4,0,98.9);group.rotation.y=Math.PI/2;return group;
}
