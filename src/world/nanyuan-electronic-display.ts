import * as T from 'three';
import {Builder} from './geometry.ts';

/** Asset study from the user's south-electronic-display-user.png, 2023 welcome
 * screen. No campus position is inferred from the tightly cropped photograph.
 * Dimensions, obscured ends and poster composition remain approximate.
 * Deliberately not registered in world.ts until its street frontage is located. */
export const electronicDisplayStudy = {
  width: 14.4,
  height: 3.55,
  depth: .48,
  screenWidth: 14.06,
  screenHeight: 1.62,
  screenY: 2.19,
  posterY: .78,
  posterHeight: 1.02,
  location: 'unverified',
  welcomeText: '热烈欢迎南京大学2023级新生',
} as const;

// Observed portrait sheets alternate light, red, cyan, dark and blue layouts.
// These colours/layouts are approximations, NOT invented event advertisements.
// No event names, dates, organisations, contact details or QR codes are generated.
const posterPalette = [
  ['#dd8293','#f3e6dd'],['#f0e5d4','#c64149'],['#d35762','#f1ded9'],
  ['#319fc4','#edeeee'],['#eee1b8','#64758c'],['#ecdab4','#7c6056'],
  ['#31a3bf','#e8dbad'],['#48a976','#dfd588'],['#a63032','#eed6b4'],
  ['#244138','#dcbb63'],['#eadfca','#527a90'],['#386d8c','#e6e6d7'],
  ['#e9e4df','#888898'],['#ebced4','#4b8eb7'],['#ded7b7','#ac5f44'],
  ['#af3f48','#e8e0d5'],
] as const;

function artwork(kind:'screen'|'posters') {
  const canvas=document.createElement('canvas');
  canvas.width=4096;canvas.height=kind==='screen'?512:384;
  const ctx=canvas.getContext('2d')!;
  if(kind==='screen'){
    const gradient=ctx.createLinearGradient(0,0,canvas.width,canvas.height);
    gradient.addColorStop(0,'#efdeef');gradient.addColorStop(.48,'#f3f6f2');gradient.addColorStop(1,'#e0eaf6');
    ctx.fillStyle=gradient;ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.fillStyle='#18759d';ctx.font='bold 218px "PingFang SC","Microsoft YaHei",sans-serif';
    ctx.textBaseline='middle';ctx.textAlign='center';
    ctx.fillText(electronicDisplayStudy.welcomeText,canvas.width/2,canvas.height*.52,canvas.width*.91);
  }else{
    ctx.fillStyle='#bcbab3';ctx.fillRect(0,0,canvas.width,canvas.height);
    const slot=canvas.width/posterPalette.length;
    posterPalette.forEach(([paper,ink],index)=>{
      const x=index*slot+8,w=slot-16;
      ctx.fillStyle=paper;ctx.fillRect(x,7,w,370);
      ctx.fillStyle=ink;
      // Large non-text graphic fields retain the mixed portrait compositions.
      // Small low-contrast blocks indicate unreadable print, never fake glyphs.
      if(index%4===0){
        ctx.beginPath();ctx.moveTo(x+w,15);ctx.lineTo(x+w,236);ctx.lineTo(x+w*.12,315);ctx.lineTo(x+w*.42,190);ctx.closePath();ctx.fill();
      }else if(index%4===1){
        ctx.fillRect(x+w*.15,60,w*.68,32);ctx.fillRect(x+w*.27,124,w*.46,176);
      }else if(index%4===2){
        ctx.fillRect(x+w*.12,30,w*.76,67);ctx.beginPath();ctx.arc(x+w*.5,230,w*.34,0,Math.PI*2);ctx.fill();
      }else{
        ctx.fillRect(x+w*.12,116,w*.76,203);ctx.clearRect(x+w*.25,164,w*.5,82);
        ctx.fillStyle=paper;ctx.fillRect(x+w*.25,164,w*.5,82);
      }
      ctx.globalAlpha=.38;
      ctx.fillStyle=ink;ctx.fillRect(x+w*.14,335,w*.58,6);ctx.fillRect(x+w*.14,349,w*.72,5);
      ctx.globalAlpha=1;
    });
  }
  const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;
  texture.anisotropy=4;
  return kind==='screen'
    ?new T.MeshBasicMaterial({name:'electronic-display-welcome-2023',map:texture,toneMapped:false})
    :new T.MeshStandardMaterial({name:'electronic-display-poster-colour-study',map:texture,roughness:.92});
}

export function createNanyuanElectronicDisplay(){
  const b=new Builder(),p=electronicDisplayStudy;
  const metal=new T.MeshStandardMaterial({name:'electronic-display-dark-frame',color:0x3a4143,roughness:.64,metalness:.34});
  const trim=new T.MeshStandardMaterial({name:'electronic-display-silver-trim',color:0x8a9292,roughness:.47,metalness:.58});
  const backing=new T.MeshStandardMaterial({name:'electronic-display-backing',color:0x797d7b,roughness:.91});
  const recess=new T.MeshStandardMaterial({name:'electronic-display-upper-recess',color:0x252c2e,roughness:.94});
  b.box(p.width,3.27,p.depth,0,1.635,0,backing,true);
  b.box(p.width+.24,.14,.8,0,3.48,0,metal,true);
  b.box(p.width+.12,.10,.63,0,.05,0,metal);
  b.box(p.width,.36,.05,0,3.22,.265,recess);
  for(const y of[3.05,3.37])b.box(p.width,.055,.065,0,y,.305,trim);
  for(let i=0;i<=12;i++)b.box(.05,.34,.065,-p.width/2+i*p.width/12,3.22,.305,trim);
  for(const side of[-1,1])b.box(.12,2.93,.10,side*(p.width/2-.06),1.535,.28,metal);
  b.box(p.width,.095,.10,0,1.30,.28,metal);
  b.box(p.width,.06,.09,0,.22,.28,trim);
  b.add(new T.PlaneGeometry(p.screenWidth,p.screenHeight),artwork('screen'),0,p.screenY,.296);
  b.add(new T.PlaneGeometry(p.screenWidth,p.posterHeight),artwork('posters'),0,p.posterY,.297);
  const group=b.finish('Nanyuan electronic display — unplaced reference study');
  group.userData={
    source:'User south-electronic-display-user.png; image kept local',
    placement:'unverified; not in the campus world',dimensions:'approximate',
    posterCount:posterPalette.length,posterContent:'colour/layout study; unreadable text omitted',
    screenText:electronicDisplayStudy.welcomeText,referenceYear:2023,
  };
  return{group,solids:b.solids,cameraSolids:group.children,layout:p};
}
