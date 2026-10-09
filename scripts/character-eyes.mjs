import * as T from 'three';

// The original helper sphere is larger than the old fixed 11.8mm eye. Keep its
// centre aligned to the source socket and lay iris/pupil on the same surface.
export function buildStudentEyes({female,centre,side,makeSkinned}){
 const radius=female?.0160:.01669,irisRadius=female?.0070:.0068;
 const material=(name,color,roughness)=>new T.MeshStandardMaterial({name,color,roughness});
 makeSkinned(new T.SphereGeometry(radius,32,24).translate(...centre.toArray()),material('eye-sclera',0xd7d1c7,.30),side+' sclera','Head');
 function patch(r,offset,mat,name,colored=false){
  const p=[],n=[],uv=[],index=[],colors=[],rings=colored?12:4,steps=48;
  for(let j=0;j<=rings;j++)for(let i=0;i<=steps;i++){
   const t=j/rings,a=i/steps*Math.PI*2,x=Math.cos(a)*r*t,y=Math.sin(a)*r*t-(female?.0005:.0010),z=Math.sqrt(radius*radius-x*x-y*y);
   p.push(centre.x+x,centre.y+y,centre.z+z+offset);n.push(x/radius,y/radius,z/radius);uv.push(.5+x/(2*r),.5+y/(2*r));
   if(colored){const edge=T.MathUtils.smoothstep(t,.82,1),radial=.5+.25*Math.sin(a*37+t*10)+.12*Math.sin(a*71-t*13);const c=new T.Color(female?0x695244:0x645040).multiplyScalar(.84+radial*.27);c.lerp(new T.Color(0x302b28),edge*.85);colors.push(...c.toArray());}
   if(j<rings&&i<steps){const k=j*(steps+1)+i;if(j>0)index.push(k,k+steps+1,k+1);index.push(k+1,k+steps+1,k+steps+2);}
  }
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setAttribute('normal',new T.Float32BufferAttribute(n,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(index);if(colored){g.setAttribute('color',new T.Float32BufferAttribute(colors,3));mat.vertexColors=true;}
  makeSkinned(g,mat,side+' '+name,'Head');
 }
 patch(irisRadius,.00012,material('eye-iris',0xffffff,.38),'curved iris',true);
 patch(.0028,.00020,material('eye-pupil',0x131516,.22),'curved pupil');
 const glint=new T.SphereGeometry(.00070,10,8);glint.translate(centre.x-.0018,centre.y+.0024,centre.z+radius+.00018);makeSkinned(glint,material('eye-catchlight',0xe7ded0,.08),side+' catchlight','Head');
 return {radius,irisRadius};
}
