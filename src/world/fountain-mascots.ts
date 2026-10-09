import * as T from 'three';
import {Builder} from './geometry.ts';
import type {Materials} from './materials.ts';

// Hand-drawn interpretation of the user's fountain photograph. The source
// pixels are not bundled. Positions and obscured edges remain approximate.
const scale=.0047,foot=704;
const dolphinStar='M 112 243 L 128 219 L 125 199 L 147 205 L 165 185 L 163 212 L 184 227 L 159 232 L 152 254 L 139 239 Z';
const outlines=[
  'M 144 704 L 141 606 Q 132 550 147 494 Q 123 474 132 450 L 108 430 L 125 414 L 96 399 L 123 382 Q 101 318 129 256 L 105 244 L 130 225 L 119 199 L 156 205 L 162 174 L 182 195 L 203 178 L 213 207 Q 253 193 285 213 L 305 192 L 315 221 L 345 216 L 340 240 L 365 249 L 346 269 Q 387 333 367 396 L 389 417 L 367 431 L 385 449 L 362 460 Q 369 524 350 559 L 357 704 L 306 704 L 293 652 L 212 652 L 199 704 Z',
  'M 124 704 L 83 679 Q 115 641 91 617 Q 58 638 56 591 L 50 550 Q 79 548 105 580 L 122 532 Q 73 475 91 374 Q 104 277 199 244 Q 306 213 361 300 Q 381 320 391 350 Q 416 319 435 269 L 415 254 Q 406 219 429 201 Q 472 187 485 230 Q 486 259 461 270 Q 458 357 383 405 Q 381 533 290 617 L 272 650 Q 326 652 322 682 L 353 684 L 350 704 Z',
  'M 151 704 L 151 527 Q 117 487 84 440 L 55 402 Q 25 360 61 343 Q 78 329 107 345 L 153 392 Q 147 323 176 280 L 144 267 L 128 241 Q 80 244 77 215 Q 104 198 140 212 L 110 183 Q 87 184 87 158 Q 92 137 111 144 L 139 178 L 169 197 L 214 211 Q 239 229 214 254 L 201 277 Q 252 259 301 278 L 285 253 Q 268 232 293 214 L 333 203 L 363 179 L 385 145 Q 407 130 418 150 Q 421 171 400 185 L 377 211 Q 411 201 437 214 Q 443 244 398 245 L 378 268 L 340 282 Q 374 313 375 399 Q 404 440 402 504 L 369 525 L 369 704 L 294 704 L 279 657 L 239 657 L 225 704 Z',
  'M 129 704 L 151 625 Q 128 594 151 544 L 149 493 Q 113 505 82 470 L 49 431 Q 34 405 58 394 L 131 423 L 142 394 L 116 380 L 149 369 Q 125 320 154 277 Q 125 255 132 205 Q 137 169 162 171 Q 206 169 221 198 Q 252 190 280 202 Q 318 170 355 192 Q 387 211 371 264 Q 371 285 350 301 L 366 350 L 392 360 L 365 377 L 391 395 L 361 407 L 379 430 L 353 438 Q 375 480 359 541 Q 372 564 402 539 Q 445 510 464 541 Q 482 569 452 585 L 375 617 L 390 704 L 311 704 L 289 657 L 224 657 L 210 704 Z',
];

/** The same curve commands paint the atlas and define the physical silhouette. */
function trace(path:string,ctx?:CanvasRenderingContext2D){
  const tokens=path.match(/[MLQCZ]|-?\d+(?:\.\d+)?/g)!,shape=new T.Shape();let i=0;
  const n=()=>Number(tokens[i++]),x=(v:number)=>(v-256)*scale,y=(v:number)=>(foot-v)*scale;
  ctx?.beginPath();
  while(i<tokens.length){
    const op=tokens[i++];
    if(op==='Z'){shape.closePath();ctx?.closePath();continue;}
    const a=n(),b=n();
    if(op==='M'){shape.moveTo(x(a),y(b));ctx?.moveTo(a,b);}
    if(op==='L'){shape.lineTo(x(a),y(b));ctx?.lineTo(a,b);}
    if(op==='Q'){const c=n(),d=n();shape.quadraticCurveTo(x(a),y(b),x(c),y(d));ctx?.quadraticCurveTo(a,b,c,d);}
    if(op==='C'){const c=n(),d=n(),e=n(),f=n();shape.bezierCurveTo(x(a),y(b),x(c),y(d),x(e),y(f));ctx?.bezierCurveTo(a,b,c,d,e,f);}
  }
  return shape;
}

function mascotAtlas(){
  const canvas=document.createElement('canvas');canvas.width=2048;canvas.height=768;
  const c=canvas.getContext('2d')!,ink='#202c32';
  const path=(d:string,color:string,stroke=ink,width=6)=>{trace(d,c);c.fillStyle=color;c.fill();if(width){c.strokeStyle=stroke;c.lineWidth=width;c.stroke();}};
  const oval=(x:number,y:number,rx:number,ry:number,color:string,stroke=ink,width=5)=>{c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fillStyle=color;c.fill();if(width){c.strokeStyle=stroke;c.lineWidth=width;c.stroke();}};
  const line=(d:string,color=ink,width=6)=>{trace(d,c);c.strokeStyle=color;c.lineWidth=width;c.stroke();};
  const eye=(x:number,y:number,r=13)=>{oval(x,y,r,r*1.22,ink,'#f6f3ed',3);oval(x-3,y-5,r*.3,r*.38,'#fff',ink,0);};
  const badge=(x:number,y:number,r=19)=>{oval(x,y,r,r,'#e8dfec','#745284',3);c.strokeStyle='#745284';c.lineWidth=2;c.strokeRect(x-r*.5,y-r*.5,r,r);line(`M ${x-r*.55} ${y} L ${x+r*.55} ${y} M ${x} ${y-r*.5} L ${x} ${y+r*.5}`,'#745284',2);};
  for(let index=0;index<4;index++){
    c.save();c.translate(index*512,0);c.lineJoin='round';c.lineCap='round';
    path(outlines[index],['#ac9474','#26aadb','#e5eeed','#e7deb4'][index],ink,9);
    if(index===0){
      path('M 127 257 L 132 225 L 122 201 L 157 207 L 162 178 L 184 199 L 204 183 L 215 220 L 283 237 Q 236 230 194 248 L 165 271 Z','#202e33');
      path('M 304 223 L 314 199 L 324 234 L 348 230 L 340 253 L 363 263 L 345 270 Z','#222e32');
      path('M 168 376 Q 171 343 206 351 Q 226 313 255 340 Q 290 315 307 347 Q 348 340 354 379 Q 382 430 341 458 Q 277 502 195 474 Q 124 455 155 403 Z','#e6e3da');
      eye(206,314,10);eye(294,310,10);oval(231,354,4,5,ink,ink,0);oval(284,351,4,5,ink,ink,0);
      line('M 222 442 Q 264 472 294 436',ink,6);
      path('M 161 482 Q 257 518 355 469 L 342 498 L 268 533 L 231 509 L 177 515 Z','#1877a1');
      path('M 259 522 L 284 578 L 247 594 L 237 541 Z','#2693c5');
      path('M 192 530 Q 211 561 220 606 Q 269 643 315 597 L 315 535 Q 338 561 324 636 Q 288 668 199 637 Z','#d0b695');
      badge(250,584,20);line('M 173 547 L 179 623 M 340 530 L 326 581');
    }else if(index===1){
      path('M 149 474 Q 173 426 237 413 Q 301 405 334 443 Q 338 524 276 594 Q 232 644 154 642 Q 186 589 158 551 Z','#edf1e8');
      path('M 135 452 Q 106 475 113 548 Q 133 566 154 532 L 163 475 Z','#1689ba');
      eye(172,366,20);eye(272,335,19);oval(207,390,12,8,'#dc8c8d',ink,0);oval(300,361,13,8,'#dc8c8d',ink,0);
      line('M 218 371 Q 221 389 237 379 Q 246 376 243 363 M 227 382 Q 215 405 207 389',ink,6);
      oval(447,231,39,42,'#e1d4e7','#604574',6);badge(447,231,29);badge(307,453,18);
      path('M 121 698 Q 109 665 140 652 Q 164 639 177 662 Q 184 628 208 626 Q 252 625 252 667 Q 278 636 298 657 Q 313 670 297 686 Q 331 669 340 699 Z','#d9e8e9');
      line('M 133 685 Q 151 666 162 683 M 196 688 Q 231 686 229 657 Q 219 639 203 652 M 271 687 Q 284 669 292 684','#498fa7',5);
      path(dolphinStar,'#cfaa52');
    }else if(index===2){
      path('M 166 279 L 145 265 L 129 238 Q 87 243 80 218 Q 107 203 146 220 L 112 180 Q 91 186 91 158 Q 99 142 111 150 L 139 180 L 173 202 L 214 216 Q 234 232 208 255 L 197 280 Z','#65509a');
      path('M 302 280 L 289 253 Q 273 234 296 219 L 335 208 L 368 178 L 387 148 Q 406 137 414 153 Q 416 174 397 185 L 371 216 Q 411 203 434 217 Q 436 241 395 241 L 376 264 L 340 286 Z','#65509a');
      eye(193,350,18);eye(300,355,18);oval(170,381,12,8,'#d78d9e',ink,0);oval(322,387,12,8,'#d78d9e',ink,0);
      oval(246,387,20,15,'#435153');line('M 246 402 L 246 423 M 230 414 Q 246 435 262 415');
      path('M 237 430 L 255 430 Q 254 470 245 468 Q 237 463 237 430 Z','#d994a5');
      oval(358,502,42,46,'#c9bf62',ink,6);
      path('M 339 463 L 354 481 L 351 503 L 330 512 L 324 494 Z','#244d82');
      path('M 371 469 L 386 491 L 379 510 L 384 529 L 367 543 L 359 521 L 365 501 L 352 486 Z','#285e9d');
      line('M 323 500 Q 358 519 398 493 M 349 457 Q 377 498 352 544','#66755d',3);
      path('M 375 513 Q 402 497 400 516 Q 398 544 376 544 Z','#e5eeed');badge(307,463,17);
      line('M 185 636 Q 225 645 241 634 M 279 639 Q 315 650 350 638','#c1cdd1',4);
    }else{
      oval(162,226,17,35,'#cfaab2',ink,3);oval(350,230,17,35,'#cfaab2',ink,3);
      path('M 157 536 Q 198 550 195 508 Q 216 488 234 510 L 280 513 Q 310 499 330 521 Q 338 584 292 619 Q 260 636 219 616 Q 176 592 157 536 Z','#efeedc');
      eye(204,308,18);eye(299,316,19);oval(252,348,18,12,ink,ink,0);
      line('M 252 360 Q 259 389 228 382 M 253 368 Q 274 391 285 373',ink,6);
      path('M 149 336 L 181 352 L 151 358 L 179 376 L 151 382 L 185 402 L 156 406 L 146 388 Z',ink);
      path('M 350 349 L 320 367 L 350 372 L 323 391 L 361 397 L 327 414 L 352 424 L 371 398 Z',ink);
      line('M 237 233 L 261 243 L 278 233 M 239 251 L 276 252 M 256 219 L 255 273',ink,4);
      path('M 163 270 L 184 285 L 176 300 Z',ink);path('M 317 279 L 340 275 L 325 301 Z',ink);
      for(const d of ['M 66 407 L 76 438 L 84 422','M 94 422 L 105 460 L 116 436','M 159 456 L 186 470 L 168 483','M 327 462 L 310 494 L 335 481','M 158 565 L 183 576 L 166 592','M 339 577 L 313 598 L 346 601','M 158 656 L 184 669 L 155 677','M 325 657 L 354 670 L 340 688','M 397 548 L 406 576 L 416 547','M 432 534 L 440 562 L 451 543'])path(d,ink);
      badge(188,480,17);
    }
    c.restore();
  }
  const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;texture.anisotropy=4;
  return texture;
}

export function createFountainMascots(mats:Materials,x:number,z:number){
  const b=new Builder(),front=new T.MeshStandardMaterial({name:'fountain-mascot-art',map:mascotAtlas(),roughness:.8});
  const edge=new T.MeshStandardMaterial({name:'fountain-mascot-cut-edge',color:0xe1e1d6,roughness:.75});
  const silver=new T.MeshStandardMaterial({name:'fountain-mascot-bases',color:0xc2c7c7,metalness:.38,roughness:.55});
  const purple=new T.MeshStandardMaterial({name:'fountain-anniversary-frame',color:0x633176,roughness:.65});
  for(const [i,dx]of [-4.35,-1.45,1.45,4.35].entries()){
    // The floating star sits outside the dolphin's main cutout.
    for(const outline of i===1?[outlines[i],dolphinStar]:[outlines[i]]){
      const shape=trace(outline);
      b.add(new T.ExtrudeGeometry(shape,{depth:.075,bevelEnabled:false,curveSegments:10}),edge,x+dx,.63,z-3.84);
      const face=new T.ShapeGeometry(shape,10),p=face.getAttribute('position'),uv=face.getAttribute('uv');
      for(let j=0;j<p.count;j++)uv.setXY(j,(i*512+p.getX(j)/scale+256)/2048,1-(foot-p.getY(j)/scale)/768);
      b.add(face,front,x+dx,.63,z-3.762);
    }
    b.cylinder(new T.Vector3(x+dx,.06,z-3.8),new T.Vector3(x+dx,.63,z-3.8),.9,.75,silver,32);
    b.solids.push({x:x+dx,y:.345,z:z-3.8,w:1.6,h:.57,d:1.6},{x:x+dx,y:1.49,z:z-3.8,w:.8,h:1.72,d:.1});
    // A small purple anniversary motif, without inventing the unreadable caption.
    const ring=new T.TorusGeometry(.125,.016,6,24);b.add(ring,purple,x+dx,.34,z-2.934);
    b.box(.12,.015,.012,x+dx,.34,z-2.916,purple);b.box(.016,.18,.012,x+dx,.34,z-2.916,purple);
  }
  for(const dx of [-2.87,2.87]){
    b.box(.28,3.51,.21,x+dx,1.865,z-4.1,purple,true);
    b.box(.76,.10,.78,x+dx,.10,z-4.1,purple);
  }
  for(const y of [.38,3.58])b.box(6.02,.20,.21,x,y,z-4.1,purple);
  const arrow=new T.Shape();arrow.moveTo(-3.17,3.63);arrow.lineTo(3.25,3.63);arrow.lineTo(3.25,3.32);arrow.lineTo(4.02,3.91);arrow.lineTo(3.25,4.48);arrow.lineTo(3.25,4.11);arrow.lineTo(-3.17,3.86);arrow.closePath();
  b.add(new T.ExtrudeGeometry(arrow,{depth:.07,bevelEnabled:false}),edge,x,0,z-4.05);
  b.box(6.0,.12,.03,x,3.75,z-3.97,purple);
  const group=b.finish('Fountain anniversary mascot cutouts'),cameraSolids=[...group.children];
  const titleCanvas=document.createElement('canvas');titleCanvas.width=1536;titleCanvas.height=256;
  const ctx=titleCanvas.getContext('2d')!;ctx.fillStyle='#f2f1e9';ctx.font='900 196px "Songti SC", serif';ctx.textAlign='center';ctx.fillText('青春奋进',768,209);
  const titleTexture=new T.CanvasTexture(titleCanvas);titleTexture.colorSpace=T.SRGBColorSpace;
  const title=new T.Mesh(new T.PlaneGeometry(5.52,.92),new T.MeshStandardMaterial({name:'fountain-anniversary-title',map:titleTexture,transparent:true,alphaTest:.4,roughness:.8,side:T.DoubleSide}));
  title.position.set(x-.02,4.29,z-4.005);group.add(title);
  const emblem=mats.textures.get('nju-emblem.png');
  if(emblem){
    const badge=new T.Mesh(new T.CircleGeometry(.38,40),purple);badge.position.set(x-2.97,3.58,z-3.94);group.add(badge);cameraSolids.push(badge);
    const seal=new T.Mesh(new T.PlaneGeometry(.57,.57),new T.MeshStandardMaterial({map:emblem,transparent:true,alphaTest:.3,roughness:.8}));seal.position.set(x-2.97,3.58,z-3.928);group.add(seal);
  }
  // The display faces north toward Hankou Gate. Rotate the complete installation
  // around its existing row, preserving the reference's left-to-right order,
  // rather than mirroring the artwork or moving the fountain/planting.
  const pivotZ=z-3.8;
  const turn=new T.Matrix4().makeTranslation(x,0,pivotZ)
    .multiply(new T.Matrix4().makeRotationY(Math.PI))
    .multiply(new T.Matrix4().makeTranslation(-x,0,-pivotZ));
  // Fountain construction flattens this group: bake the turn into each child.
  for(const child of group.children)child.applyMatrix4(turn);
  for(const solid of b.solids){solid.x=2*x-solid.x;solid.z=2*pivotZ-solid.z;}
  group.updateMatrixWorld(true);
  return{group,solids:b.solids,cameraSolids};
}
