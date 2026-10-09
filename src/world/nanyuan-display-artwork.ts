import * as T from 'three';

/** Reconstructed from the user's screen-posters.png (2026-10-10).
 * The banner follows the user-corrected welcome wording and intake year. Poster
 * titles below are original campus themes, not transcriptions or live notices. */
export const nanyuanWelcomeText='欢迎南京大学2026级新生';
export const nanyuanPosterThemes=[
 {title:'校园歌会',caption:'让歌声相遇',paper:'#ae304f',ink:'#fff1df',width:.72,height:.95,icon:'music'},
 {title:'艺术展览',caption:'看见身边的美',paper:'#f3e6db',ink:'#bd4354',width:.48,height:1,icon:'art'},
 {title:'读书分享',caption:'翻开新的篇章',paper:'#df8996',ink:'#562f50',width:.60,height:.87,icon:'book'},
 {title:'社团招新',caption:'找到你的热爱',paper:'#218faf',ink:'#f4f0da',width:.88,height:.98,icon:'stars'},
 {title:'学术讲座',caption:'从好奇开始',paper:'#eae0ba',ink:'#4c536d',width:.72,height:.91,icon:'planet'},
 {title:'志愿服务',caption:'温暖从身边出发',paper:'#efdfb6',ink:'#87613f',width:.65,height:.88,icon:'heart'},
 {title:'校园运动',caption:'一起向前',paper:'#24a0b2',ink:'#ecf0d5',width:1.02,height:1,icon:'ball'},
 {title:'戏剧工坊',caption:'在舞台上相遇',paper:'#4c9c77',ink:'#f3e0b0',width:.76,height:.96,icon:'art'},
 {title:'摄影漫步',caption:'记录校园日常',paper:'#ba363d',ink:'#f8e9c7',width:.49,height:.90,icon:'camera'},
 {title:'科技体验',caption:'探索新的可能',paper:'#253e3c',ink:'#e3c471',width:.65,height:.99,icon:'planet'},
 {title:'心理小站',caption:'听见你的心声',paper:'#eee2d1',ink:'#427b93',width:.53,height:.93,icon:'heart'},
 {title:'绿色校园',caption:'和自然做朋友',paper:'#326d8a',ink:'#e0eed3',width:.82,height:.86,icon:'leaf'},
 {title:'电影之夜',caption:'光影里的故事',paper:'#e9e4ed',ink:'#586381',width:.62,height:1,icon:'film'},
 {title:'校园导览',caption:'发现南园之美',paper:'#eac6d6',ink:'#497f9d',width:.94,height:.89,icon:'book'},
 {title:'音乐沙龙',caption:'留一段时间给音乐',paper:'#ded8b4',ink:'#ad624c',width:.78,height:.95,icon:'music'},
 {title:'手作市集',caption:'把灵感变成作品',paper:'#a83a4a',ink:'#eee7d9',width:.72,height:.91,icon:'stars'},
] as const;

const font='"PingFang SC","Microsoft YaHei",sans-serif';
type Context=CanvasRenderingContext2D;

function welcomeDeer(c:Context,x:number,y:number,scale:number,flip=false){
 c.save();c.translate(x,y);c.scale(flip?-scale:scale,scale);c.lineJoin='round';c.lineCap='round';
 const path=(points:number[][],colour:string,width=10)=>{c.beginPath();points.forEach(([px,py],i)=>i?c.lineTo(px,py):c.moveTo(px,py));c.strokeStyle=colour;c.lineWidth=width;c.stroke();};
 const oval=(px:number,py:number,rx:number,ry:number,fill:string,stroke='#56475e',line=5)=>{c.beginPath();c.ellipse(px,py,rx,ry,0,0,Math.PI*2);c.fillStyle=fill;c.fill();if(line){c.strokeStyle=stroke;c.lineWidth=line;c.stroke();}};
 // Purple antlers, rounded white head, blue trousers and a welcome booklet.
 for(const side of [-1,1]){
  path([[side*44,93],[side*72,62],[side*88,20]],'#6c4585',13);
  path([[side*71,63],[side*105,58],[side*117,42]],'#6c4585',11);
  path([[side*63,74],[side*99,86]],'#6c4585',10);
 }
 c.beginPath();c.moveTo(-50,218);c.quadraticCurveTo(-78,225,-78,272);c.lineTo(-72,345);c.lineTo(-13,345);c.lineTo(0,324);c.lineTo(13,345);c.lineTo(72,345);c.lineTo(78,269);c.quadraticCurveTo(77,225,50,218);c.closePath();c.fillStyle='#f9fcf9';c.fill();c.strokeStyle='#56475e';c.lineWidth=5;c.stroke();
 c.beginPath();c.moveTo(-75,297);c.lineTo(-72,335);c.quadraticCurveTo(-60,350,-17,344);c.lineTo(-7,327);c.lineTo(7,327);c.lineTo(17,344);c.quadraticCurveTo(60,350,72,335);c.lineTo(75,297);c.closePath();c.fillStyle='#3389b4';c.fill();c.strokeStyle='#56475e';c.lineWidth=5;c.stroke();
 oval(0,155,89,82,'#fcfff9');oval(-40,151,9,17,'#353744',undefined,0);oval(40,151,9,17,'#353744',undefined,0);
 oval(-42,145,3,5,'#fff',undefined,0);oval(38,145,3,5,'#fff',undefined,0);
 oval(-59,181,14,7,'#eaa8b4',undefined,0);oval(59,181,14,7,'#eaa8b4',undefined,0);oval(0,181,14,10,'#655363',undefined,0);
 path([[0,192],[0,209]],'#655363',4);c.beginPath();c.moveTo(-12,208);c.quadraticCurveTo(0,226,12,208);c.strokeStyle='#655363';c.lineWidth=4;c.stroke();
 oval(-86,246,24,15,'#fbfff9');c.save();c.translate(91,246);c.rotate(.22);c.fillStyle='#f0bd66';c.fillRect(-23,-40,46,75);c.strokeStyle='#a36775';c.lineWidth=4;c.strokeRect(-23,-40,46,75);path([[-13,-20],[13,-20]],'#fff6cf',4);path([[-13,-4],[8,-4]],'#fff6cf',4);c.restore();oval(82,267,15,23,'#fbfff9');
 c.restore();
}

function posterIcon(c:Context,kind:string,x:number,y:number,size:number,ink:string){
 c.save();c.translate(x,y);c.scale(size/100,size/100);c.strokeStyle=ink;c.fillStyle=ink;c.lineWidth=4;c.lineCap='round';c.lineJoin='round';
 const line=(points:number[][])=>{c.beginPath();points.forEach(([px,py],i)=>i?c.lineTo(px,py):c.moveTo(px,py));c.stroke();};
 const circle=(px:number,py:number,r:number)=>{c.beginPath();c.arc(px,py,r,0,Math.PI*2);c.stroke();};
 if(kind==='music'){
  for(let i=0;i<4;i++){c.globalAlpha=.35;line([[-42,5+i*12],[42,5+i*12]]);}c.globalAlpha=1;
  line([[-17,23],[-17,-33],[28,-42],[28,13]]);line([[-17,-20],[28,-29]]);
  for(const [px,py]of[[-26,27],[19,17]]){c.beginPath();c.ellipse(px,py,12,8,-.3,0,Math.PI*2);c.fill();}
 }else if(kind==='book'){
  line([[-44,-31],[-8,-24],[0,-14],[8,-24],[44,-31],[44,32],[7,39],[0,46],[-7,39],[-44,32],[-44,-31]]);line([[0,-14],[0,46]]);
  for(let i=0;i<3;i++){line([[-34,-10+i*13],[-12,-5+i*13]]);line([[12,-5+i*13],[34,-10+i*13]]);}
 }else if(kind==='planet'){
  circle(0,0,31);c.beginPath();c.ellipse(0,0,53,15,-.45,0,Math.PI*2);c.stroke();circle(-35,-34,4);circle(37,35,3);
 }else if(kind==='camera'||kind==='film'){
  c.strokeRect(-44,-27,88,60);if(kind==='camera'){line([[-29,-27],[-20,-39],[11,-39],[21,-27]]);circle(2,3,21);circle(2,3,12);}
  else{for(const py of[-20,26])for(let px=-35;px<40;px+=18)c.fillRect(px,py,8,4);line([[-8,-13],[17,3],[-8,19],[-8,-13]]);}
 }else if(kind==='ball'){
  circle(0,0,42);line([[-42,0],[42,0]]);line([[0,-42],[0,42]]);c.beginPath();c.moveTo(-29,-30);c.bezierCurveTo(6,-19,6,19,-29,30);c.moveTo(29,-30);c.bezierCurveTo(-6,-19,-6,19,29,30);c.stroke();
 }else if(kind==='heart'){
  c.beginPath();c.moveTo(0,40);c.bezierCurveTo(-78,-6,-34,-57,0,-22);c.bezierCurveTo(34,-57,78,-6,0,40);c.closePath();c.stroke();
 }else if(kind==='leaf'){
  c.beginPath();c.moveTo(-35,39);c.bezierCurveTo(-61,-17,4,-40,39,-41);c.bezierCurveTo(40,11,11,56,-35,39);c.stroke();line([[-44,49],[22,-24]]);line([[-16,18],[-27,-9]]);line([[-1,1],[24,6]]);
 }else if(kind==='art'){
  c.strokeRect(-33,-38,66,69);line([[-44,47],[-22,31]]);line([[44,47],[22,31]]);circle(12,-17,9);line([[-24,18],[-7,-6],[9,13],[24,0]]);
 }else{
  for(const [px,py,r]of[[-18,5,29],[28,-26,14],[32,32,10]]){const pts=Array.from({length:11},(_,i)=>{const a=i*Math.PI/5-Math.PI/2,d=i%2?r*.43:r;return[px+Math.cos(a)*d,py+Math.sin(a)*d];});line(pts);}
 }
 c.restore();
}

export function createNanyuanDisplayArtwork(kind:'screen'|'posters'){
 const canvas=document.createElement('canvas');canvas.width=4096;canvas.height=kind==='screen'?472:384;
 const c=canvas.getContext('2d')!,w=canvas.width,h=canvas.height;
 c.fillStyle=kind==='screen'?'#fbfaff':'#babbb6';c.fillRect(0,0,w,h);
 if(kind==='screen'){
  const wash=c.createLinearGradient(0,0,w,h);wash.addColorStop(0,'#f6e9f7');wash.addColorStop(.48,'#fffffc');wash.addColorStop(1,'#edf4fa');c.fillStyle=wash;c.fillRect(0,0,w,h);
  // Faint linework suggests the photographed campus graphic behind the type.
  c.strokeStyle='#bed9ec';c.lineWidth=3;c.globalAlpha=.50;
  for(const [x,y,width,height]of[[1030,83,170,80],[2380,70,150,88],[2570,50,85,115]]){c.strokeRect(x,y,width,height);for(let a=x+18;a<x+width;a+=23)c.strokeRect(a,y+16,10,height-30);}
  c.globalAlpha=1;welcomeDeer(c,185,58,.94,true);welcomeDeer(c,w-194,57,.96);
  const ink=c.createLinearGradient(390,0,w-390,0);ink.addColorStop(0,'#9154b2');ink.addColorStop(.20,'#1366ac');ink.addColorStop(.6,'#007bb2');ink.addColorStop(1,'#3192b6');
  c.font=`900 208px ${font}`;c.textBaseline='middle';c.textAlign='center';c.fillStyle='#d8d5e7';c.fillText(nanyuanWelcomeText,w/2+5,238,w-800);c.fillStyle=ink;c.fillText(nanyuanWelcomeText,w/2,229,w-800);
  c.fillStyle='#87539c';c.font=`600 43px ${font}`;c.textAlign='right';c.fillText('共青团南京大学委员会',w-433,377,930);
 }else{
  const total=nanyuanPosterThemes.reduce((sum,p)=>sum+p.width,0);let start=5;
  for(const [i,p]of nanyuanPosterThemes.entries()){
   const slot=(w-10)*p.width/total,pw=slot-7,ph=(h-10)*p.height,py=h-5-ph;
   c.save();c.translate(start,py);c.beginPath();c.rect(0,0,pw,ph);c.clip();c.fillStyle='#7c7e7c';c.fillRect(3,3,pw,ph);c.fillStyle=p.paper;c.fillRect(0,0,pw-2,ph-2);
   c.fillStyle=p.ink;c.globalAlpha=.12;
   if(i%3===0){c.beginPath();c.moveTo(pw,ph*.26);c.lineTo(pw,ph);c.lineTo(0,ph*.83);c.closePath();c.fill();}
   else if(i%3===1){c.beginPath();c.arc(pw*.84,ph*.73,pw*.7,0,Math.PI*2);c.fill();}
   else c.fillRect(0,ph*.40,pw,ph*.37);
   c.globalAlpha=1;c.textAlign='center';c.textBaseline='middle';
   const titleSize=Math.min(47,pw*.23);c.font=`800 ${titleSize}px ${font}`;
   c.fillText(p.title.slice(0,2),pw/2,ph*.18,pw*.86);c.fillText(p.title.slice(2),pw/2,ph*.18+titleSize*1.17,pw*.86);
   posterIcon(c,p.icon,pw/2,ph*.62,Math.min(pw*.64,ph*.30),p.ink);
   c.font=`600 ${Math.min(22,pw*.09)}px ${font}`;c.fillStyle=p.ink;c.fillText(p.caption,pw/2,ph*.86,pw*.90);
   c.globalAlpha=.45;c.fillRect(pw*.22,ph*.945,pw*.56,2);c.restore();start+=slot;
  }
 }
 const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;texture.anisotropy=4;
 return kind==='screen'?new T.MeshBasicMaterial({name:'electronic-display-welcome-2026',map:texture,toneMapped:false}):new T.MeshStandardMaterial({name:'electronic-display-campus-posters',map:texture,roughness:.92});
}
