import * as T from 'three';
import {Builder} from './geometry.ts';

/** Paired vertical banners visible at 00:55 in BV1iL411h7G2.
 * Text is original campus wayfinding, not a reproduction of dated event ads. */
export function createLampBanners(spots:number[][],metal:T.Material){
  const b=new Builder();
  const materials=['南京大学','鼓楼校园'].map((text,index)=>{
    const canvas=document.createElement('canvas');canvas.width=256;canvas.height=640;
    const c=canvas.getContext('2d')!;c.fillStyle=index?'#854058':'#a83a3b';c.fillRect(0,0,256,640);
    c.strokeStyle='#d2b986';c.lineWidth=3;c.strokeRect(17,18,222,604);
    c.fillStyle='#f1e5bf';c.textAlign='center';c.textBaseline='middle';c.font='58px "Kaiti SC",serif';
    [...text].forEach((letter,i)=>c.fillText(letter,128,126+i*105));
    c.font='18px system-ui';c.fillText('GULOU · NJU',128,580);
    const map=new T.CanvasTexture(canvas);map.colorSpace=T.SRGBColorSpace;map.anisotropy=4;
    return new T.MeshStandardMaterial({name:'campus-lamp-banner',map,roughness:.96,side:T.FrontSide});
  });
  for(const[x,z]of spots)for(const side of[-1,1]){
    const bx=x+side*.38;
    for(const y of[2.15,3.4])b.cylinder(new T.Vector3(x,y,z),new T.Vector3(x+side*.70,y,z),.013,.013,metal,6);
    // Separate front/back faces keep the lettering readable on both approaches.
    const geometry=new T.PlaneGeometry(.54,1.22,3,8),p=geometry.getAttribute('position');
    for(let i=0;i<p.count;i++)p.setZ(i,Math.sin((p.getY(i)+.61)*Math.PI/1.22)*.025);
    geometry.computeVertexNormals();
    for(const face of[-1,1])b.add(geometry.clone(),materials[side<0?0:1],bx,2.775,z+face*.012,new T.Euler(0,face<0?Math.PI:0,0));
  }
  const group=b.finish('paired campus lamp banners');group.userData={poles:spots.length,source:'BV1iL411h7G2 00:55; original wayfinding text; approximate placement'};
  return group;
}
