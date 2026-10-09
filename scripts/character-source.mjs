import {readFile} from 'node:fs/promises';

/** Read only CC0 graphical data. MakeHuman application code is not imported.
 * Apply a macro target in the OBJ's original coordinate system, then derive
 * both surface and joint markers from that same transformed vertex array.
 */
export async function loadCharacterSource(gender, {target=true}={}) {
  if(!['male','female'].includes(gender))throw new Error('Unknown character source variant');
  const folder='assets/source-models/character';
  const raw=[],uvs=[],groups={};let group='body';
  for(const line of (await readFile(`${folder}/makehuman-base.obj`,'utf8')).split('\n')){
    const p=line.trim().split(/\s+/);
    if(p[0]==='v')raw.push(p.slice(1,4).map(Number));
    else if(p[0]==='vt')uvs.push(p.slice(1,3).map(Number));
    else if(p[0]==='g'){group=p[1];groups[group]??=[];}
    else if(p[0]==='f')groups[group].push(p.slice(1).map(c=>c.split('/').slice(0,2).map(n=>Number(n)-1)));
  }
  if(target){
    for(const line of (await readFile(`${folder}/asian-${gender}-young.target`,'utf8')).split('\n')){
      const trimmed=line.trim();if(!trimmed||trimmed.startsWith('#'))continue;
      const [index,...delta]=trimmed.split(/\s+/).map(Number);
      if(!Number.isInteger(index)||!raw[index]||delta.length!==3||!delta.every(Number.isFinite))throw new Error('Invalid CC0 shape target entry');
      for(let axis=0;axis<3;axis++)raw[index][axis]+=delta[axis];
    }
  }
  const bodyIds=new Set(groups.body.flatMap(face=>face.map(([i])=>i)));
  const low=Math.min(...[...bodyIds].map(i=>raw[i][1])),high=Math.max(...[...bodyIds].map(i=>raw[i][1])),scale=1.75/(high-low);
  const vertices=raw.map(([x,y,z])=>[x*scale,(y-low)*scale,z*scale]);
  if(!vertices.every(p=>p.every(Number.isFinite)))throw new Error('Invalid character source coordinates');
  const joints={};
  for(const [name,faces]of Object.entries(groups))if(name.startsWith('joint-')){
    const ids=[...new Set(faces.flatMap(face=>face.map(([i])=>i)))];
    joints[name.slice(6)]=[0,1,2].map(axis=>ids.reduce((sum,i)=>sum+vertices[i][axis],0)/ids.length);
  }
  return {vertices,uvs,groups:Object.fromEntries(['body','helper-tights','helper-hair'].map(name=>[name,groups[name]])),joints,source:target?`MakeHuman CC0 base + asian-${gender}-young.target`:'MakeHuman CC0 base',normalization:{low,scale}};
}
