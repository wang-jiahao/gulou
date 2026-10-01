import * as T from 'three';
import { Builder, rng } from './geometry.ts';

export function architecturalPalette() {
  const mat = (name: string, color: number, roughness = .9, metalness = 0) => {
    const m = new T.MeshStandardMaterial({ name, color, roughness, metalness }); return m;
  };
  const palette = {
    brick: mat('historic-brick', 0x77776e), stone: mat('limestone', 0x93958c),
    roof: mat('roof', 0x333a3d), ribs: mat('roof-ribs', 0x41474a),
    wood: mat('window-wood', 0x322a22, .78), redwood: mat('redwood', 0x4e2921, .77),
    glass: mat('window-glass', 0x4f6468, .16, .72), glassWarm: mat('window-glass-warm',0x4f6468,.16,.72), glassCool: mat('window-glass-cool',0x4f6468,.16,.72), recess: mat('recess', 0x161b19),
    pipe: mat('drainpipe', 0x3e443d, .7, .25), brass: mat('brass', 0x847142, .45, .55),
    curtain: mat('curtain', 0x9c9c89), curtainDark: mat('curtain-dark', 0x515a52),
  };
  palette.glassWarm.color.set(0x50676a); palette.glassCool.color.set(0x4b606b);
  for(const glass of [palette.glass,palette.glassWarm,palette.glassCool]){glass.transparent=true;glass.opacity=.8;glass.depthWrite=false;}
  return palette;
}
export type ArchitecturalPalette = ReturnType<typeof architecturalPalette>;

/** A thick masonry facade with actual open window bays. Coordinates are local to the face. */
export function masonryFace(b: Builder, origin: T.Vector3, angle: number, width: number, bottom: number, top: number, centers: number[], rows: { y: number; h: number; w: number; centers?: number[] }[], mat: T.Material) {
  const put = (x: number, y: number, w: number, h: number) => b.box(w, h, .55, origin.x + x*Math.cos(angle) - .275*Math.sin(angle), y, origin.z - x*Math.sin(angle) - .275*Math.cos(angle), mat, false, angle, 2.4);
  const cuts = [...new Set([bottom, top, ...rows.flatMap(r => [r.y-r.h/2, r.y+r.h/2])])].filter(y => y>=bottom && y<=top).sort((a,c)=>a-c);
  for (let i=1;i<cuts.length;i++) {
    const low=cuts[i-1], high=cuts[i], mid=(low+high)/2;
    const row=rows.find(r=>mid>r.y-r.h/2 && mid<r.y+r.h/2);
    if (!row) { put(0,mid,width,high-low); continue; }
    let left=-width/2;
    for (const center of [...(row.centers ?? centers)].sort((a,c)=>a-c)) {
      const edge=Math.max(-width/2,center-row.w/2);
      if (edge>left) put((edge+left)/2,mid,edge-left,high-low);
      left=Math.min(width/2,center+row.w/2);
    }
    if(left<width/2) put((left+width/2)/2,mid,width/2-left,high-low);
  }
}

export function detailedWindow(b: Builder, p: ArchitecturalPalette, x: number, y: number, z: number, w = 1.65, h = 2.55, angle = 0, red = false, seed = 1) {
  const wood = red ? p.redwood : p.wood, random=rng(seed);
  const box = (lx:number,ly:number,lz:number,bw:number,bh:number,bd:number,m:T.Material) => b.box(bw,bh,bd,x+lx*Math.cos(angle)+lz*Math.sin(angle),y+ly,z-lx*Math.sin(angle)+lz*Math.cos(angle),m,false,angle);
  box(0,0,-.43,w,h,.04,p.recess);
  // Deep curtains and a transom make the room read as depth behind reflective glazing.
  if(random()>.28) for(const side of [-1,1]) box(side*w*.29,0,-.39,w*.21,h*.94,.025,random()>.45?p.curtain:p.curtainDark);
  const windowChoice=random();box(0,0,-.21,w-.16,h-.14,.025,windowChoice<.28?p.glass:windowChoice<.82?p.glassWarm:p.glassCool);
  for (const side of [-1,1]) {
    box(side*(w/2+.085),0,-.02,.17,h+.3,.4,p.stone);
    box(side*(w/2-.055),0,-.12,.09,h,.2,wood);
    box(0,side*(h/2-.05),-.12,w,.1,.2,wood);
  }
  box(0,-h/2-.16,.09,w+.44,.17,.54,p.stone);
  box(0,-h/2-.27,-.01,w+.22,.09,.36,p.stone);
  box(0,h/2+.15,.035,w+.32,.23,.4,p.stone);
  box(0,0,-.09,.075,h-.12,.16,wood);
  for(const f of [-.28,.15,.36]) box(0,h*f,-.09,w-.15,.065,.16,wood);
  for(const dx of [-.25,.25]) box(w*dx,0,-.105,.033,h-.12,.11,wood);
  for(const dx of [-.09,.09]) box(dx,-.14,.005,.028,.12,.035,p.brass);
}

export function panelDoor(b: Builder, p: ArchitecturalPalette, x:number, y:number, z:number, w:number, h:number, angle=0) {
  const box=(lx:number,ly:number,lz:number,bw:number,bh:number,bd:number,m:T.Material)=>b.box(bw,bh,bd,x+lx*Math.cos(angle)+lz*Math.sin(angle),y+ly,z-lx*Math.sin(angle)+lz*Math.cos(angle),m,false,angle);
  box(0,0,-.19,w,h,.18,p.recess);
  for(const side of [-1,1]) {
    box(side*w*.25,0,-.08,w*.47,h,.15,p.redwood);
    for(const f of [-.3,.02,.31]) {
      box(side*w*.25,h*f,.016,w*.35,h*.22,.025,p.wood);
      box(side*w*.25,h*f,.035,w*.30,h*.18,.027,p.redwood);
    }
    box(side*.11,-.02,.1,.035,.24,.045,p.brass);
  }
}
