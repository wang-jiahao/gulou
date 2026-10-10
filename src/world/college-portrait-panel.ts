import * as T from 'three';
import {collegePortraitOrder,collegeStories,type CollegeId} from './college-stories.ts';

const portraits=new Map<CollegeId,CanvasImageSource>();
const fontFamily='"PingFang SC","Microsoft YaHei",sans-serif';
const loadImage=(url:string)=>new Promise<HTMLImageElement>((resolve,reject)=>{
 const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>reject(new Error(`Could not load college portrait: ${url}`));image.src=url;
});

/** The caller explicitly awaits this during world loading. Material creation
 * stays synchronous; no background request or late texture replacement. */
export async function preloadCollegePortraitImages(baseUrl:string,loader:(url:string)=>Promise<CanvasImageSource>=loadImage){
 const prefix=baseUrl.endsWith('/')?baseUrl:`${baseUrl}/`;
 const entries=await Promise.all(collegePortraitOrder.flatMap(id=>{
  const portrait=collegeStories[id].portrait;
  return portrait?[loader(`${prefix}${portrait.asset}`).then(image=>[id,image] as const)]:[];
 }));
 for(const [id,image]of entries)portraits.set(id,image);
 return portraits as ReadonlyMap<CollegeId,CanvasImageSource>;
}
export const getPreloadedCollegePortraitImage=(id:CollegeId)=>portraits.get(id);

function wrapText(ctx:CanvasRenderingContext2D,text:string,width:number){
 const lines:string[]=[];let line='';
 for(const character of text){
  if(line&&ctx.measureText(line+character).width>width){
   if(/^[，。；：！？、”’）》】]$/.test(character)&&line.length>1){lines.push(line.slice(0,-1));line=line.slice(-1)+character;}
   else{lines.push(line);line=character;}
  }
  else line+=character;
 }
 if(line)lines.push(line);
 // Keep closing punctuation with a preceding character, and avoid a final
 // line consisting of only a punctuation mark or a tiny word fragment.
 if(lines.length>1&&lines.at(-1)!.length<4){
  const last=lines.length-1,previous=lines[last-1],count=4-lines[last].length;
  if(previous.length>count){lines[last-1]=previous.slice(0,-count);lines[last]=previous.slice(-count)+lines[last];}
 }
 return lines;
}

/** Every panel contains ONE person's portrait at left and that person's
 * biography at right. This is reusable artwork, not a reconstruction of the
 * original wall's panel sequence, count, print design or exact typography. */
export function paintCollegePortraitPanel(canvas:HTMLCanvasElement,id:CollegeId,image:CanvasImageSource|undefined,aspect=3.4){
 if(!Number.isFinite(aspect)||aspect<2.5||aspect>4)throw new Error('College portrait panel aspect must be between 2.5 and 4');
 const story=collegeStories[id],hasPortrait=Boolean(story.portrait&&image);
 canvas.width=1536;canvas.height=Math.round(canvas.width/aspect);
 const ctx=canvas.getContext('2d');if(!ctx)throw new Error('College portrait panel requires a 2D canvas');
 const w=canvas.width,h=canvas.height,u=h/460;
 ctx.fillStyle='#f5f1e8';ctx.fillRect(0,0,w,h);
 ctx.strokeStyle='#bcb2a0';ctx.lineWidth=2*u;ctx.strokeRect(11*u,11*u,w-22*u,h-22*u);
 ctx.fillStyle='#584267';ctx.fillRect(0,0,7*u,h);
 ctx.textBaseline='alphabetic';ctx.font=`${20*u}px ${fontFamily}`;
 ctx.fillText('南京大学新生学院 · 七书院冠名人物',29*u,40*u);
 const portrait={x:29*u,y:69*u,width:258*u,height:344*u};
 ctx.fillStyle='#e4dfd3';ctx.fillRect(portrait.x-3*u,portrait.y-3*u,portrait.width+6*u,portrait.height+6*u);
 if(story.portrait&&image)ctx.drawImage(image,portrait.x,portrait.y,portrait.width,portrait.height);
 else{
  // Preserve the person's complete panel when permission or loading is
  // missing. The neutral field has no invented or borrowed face.
  ctx.fillStyle='#e9e4da';ctx.fillRect(portrait.x,portrait.y,portrait.width,portrait.height);
  ctx.fillStyle='#746a60';ctx.textAlign='center';ctx.font=`${25*u}px ${fontFamily}`;
  ctx.fillText(story.person,portrait.x+portrait.width/2,portrait.y+portrait.height/2-12*u);
  ctx.font=`${19*u}px ${fontFamily}`;ctx.fillText('肖像待补',portrait.x+portrait.width/2,portrait.y+portrait.height/2+25*u);
  ctx.textAlign='left';
 }
 const textX=330*u,textWidth=w-textX-34*u;
 ctx.fillStyle='#3c2949';ctx.font=`bold ${49*u}px ${fontFamily}`;ctx.fillText(story.person,textX,106*u);
 const nameWidth=ctx.measureText(story.person).width;
 ctx.font=`${26*u}px ${fontFamily}`;ctx.fillText(story.college,textX+nameWidth+35*u,104*u);
 ctx.fillStyle='#63594f';ctx.font=`${24*u}px ${fontFamily}`;ctx.fillText(story.role,textX,145*u);
 ctx.strokeStyle='#c9c0b2';ctx.lineWidth=u;ctx.beginPath();ctx.moveTo(textX,160*u);ctx.lineTo(w-34*u,160*u);ctx.stroke();
 let fontSize=27*u,lines:string[][]=[],lineHeight=0,bodyBottom=Infinity;
 while(fontSize>=19*u){
  ctx.font=`${fontSize}px ${fontFamily}`;lineHeight=fontSize*1.48;
  lines=story.paragraphs.map(text=>wrapText(ctx,text,textWidth));
  bodyBottom=194*u+(lines[0].length+lines[1].length-1)*lineHeight+17*u;
  if(bodyBottom<=h-53*u)break; fontSize-=u;
 }
 if(bodyBottom>h-53*u)throw new Error(`College biography does not fit: ${id}`);
 ctx.fillStyle='#323337';let y=194*u;
 for(const paragraph of lines){for(const line of paragraph){ctx.fillText(line,textX,y);y+=lineHeight;}y+=17*u;}
 ctx.fillStyle='#716b62';ctx.font=`${14*u}px ${fontFamily}`;
 const credit=!hasPortrait?'图像：肖像待补':id==='anbang'?'图像：用户提供 · 保留原图及水印 · 公开使用许可未确认':id==='jianxiong'?'图像：AIP Emilio Segrè Visual Archives, Segrè Collection · CC BY 4.0 · 裁切/灰度':'图像：历史照片 · 公共领域（PD-China）· 裁切/灰度';
 ctx.fillText(`生平与冠名依据：南京大学新生学院 | ${credit}`,29*u,h-18*u);
 return{width:w,height:h,aspect:w/h,portrait,hasPortrait,text:{x:textX,width:textWidth,fontSize,lineHeight,bodyBottom,lines},footerY:h-18*u};
}

export function createCollegePortraitMaterial(id:CollegeId,options:{aspect?:number;image?:CanvasImageSource}={}){
 const story=collegeStories[id],image=options.image??getPreloadedCollegePortraitImage(id);
 const canvas=document.createElement('canvas'),layout=paintCollegePortraitPanel(canvas,id,image,options.aspect);
 const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;texture.anisotropy=4;
 const material=new T.MeshStandardMaterial({name:`college-portrait-panel-${id}`,map:texture,roughness:.94});
 material.userData={collegeId:id,person:story.person,college:story.college,source:story.source,portrait:story.portrait,portraitStatus:layout.hasPortrait?'available':'missing',layout,face:'+Z',approximateArtwork:true};
 return material;
}
