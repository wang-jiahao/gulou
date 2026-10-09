import * as T from 'three';
import {recomputeCharacterNormals} from './character-surface.mjs';

// A fitted scalp foundation and closed, shallow hair ribbons. Broad roots
// overlap inside the cap; a lock's width, not a round tube, carries its volume.
export function buildStudentHair({female,skinGeometry,makeSkinned,hair,options={}}) {
  const surface=new T.Mesh(skinGeometry,new T.MeshBasicMaterial({side:T.DoubleSide})),surfaceRay=new T.Raycaster();
  surface.updateMatrixWorld(true);
  const positions=skinGeometry.getAttribute('position');let top=-Infinity;
  for(let i=0;i<positions.count;i++)if(Math.abs(positions.getX(i))<.14)top=Math.max(top,positions.getY(i));
  let back=Infinity,front=-Infinity;
  for(let i=0;i<positions.count;i++)if(positions.getY(i)>top-.095&&Math.abs(positions.getX(i))<.12){back=Math.min(back,positions.getZ(i));front=Math.max(front,positions.getZ(i));}
  const centre=new T.Vector3(0,top-.108,(back+front)/2),rows=20,cols=80;
  const longLength=options.longLength??.50,frontChestZ=options.frontChestZ??.180,backChestZ=options.backChestZ??-.150,volumeScale=options.volumeScale??1;
  if(![longLength,frontChestZ,backChestZ,volumeScale].every(Number.isFinite)||longLength<.38||longLength>.62||volumeScale<.5||volumeScale>1.5)throw new Error('Invalid student hair fit options');
  const p=[],uv=[],colors=[],indices=[],outer=[],inner=[],lockInfo=[];
  const smooth=T.MathUtils.smoothstep,gauss=(x,width)=>Math.exp(-((x/width)**2));
  const angleDelta=(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));
  const vertex=(point,u,v,shade)=>{const index=p.length/3;p.push(...point.toArray());uv.push(u,v);colors.push(shade,shade,shade);return index;};
  const scalpCache=new Map();
  function scalp(theta,phi,lift=0){
    const key=`${theta}:${phi}`;let sample=scalpCache.get(key);
    if(!sample){
      const d=new T.Vector3(.093*Math.sin(theta)*Math.cos(phi),.108*Math.cos(theta),.117*Math.sin(theta)*Math.sin(phi)).normalize();
      surfaceRay.set(centre.clone().addScaledVector(d,.38),d.clone().negate());
      const hit=surfaceRay.intersectObject(surface,false).find(h=>h.point.y>top-.225);
      if(!hit)throw new Error(`Hair scalp fit missed the supplied head at ${theta.toFixed(3)}/${phi.toFixed(3)}`);
      sample={point:hit.point.clone(),normal:d};scalpCache.set(key,sample);
    }
    return sample.point.clone().addScaledVector(sample.normal,lift*volumeScale);
  }
  function sample(t,phi){
    const sine=Math.sin(phi),cosine=Math.cos(phi),forehead=smooth(sine,.25,.84),rear=smooth(-sine,.05,.92);
    const centrePart=gauss(angleDelta(phi,Math.PI/2),.25)*forehead;
    const brokenEdge=(.020*Math.sin(phi*13+.4)+.013*Math.sin(phi*23))*forehead;
    const end=female?1.73-.62*forehead+.28*rear+brokenEdge:1.65-.36*forehead+.52*rear-.18*centrePart+brokenEdge;
    const theta=t*end,base=scalp(theta,phi),d=base.clone().sub(centre).normalize(),crown=Math.sin(t*Math.PI);
    const part=gauss(angleDelta(phi,female?1.65:Math.PI/2),female?.11:.13)*forehead*crown;
    const lift=(.003+(female?.009:.012)*crown+(female?.003:.006)*(1-t)-.003*part)*volumeScale;
    const q=base.clone().addScaledVector(d,lift),inside=base.clone().addScaledVector(d,-.0015);
    const shade=.93+.024*Math.sin(phi*3+.7*t)-.055*part;
    return{q,inside,shade};
  }
  const pole=sample(0,0);outer.push([vertex(pole.q,.5,0,.96)]);inner.push([vertex(pole.inside,.5,0,.82)]);
  for(let r=1;r<=rows;r++){
    const out=[],ins=[],t=r/rows;
    for(let c=0;c<=cols;c++){
      const phi=c===cols?0:c/cols*Math.PI*2,s=sample(t,phi),flow=c/cols+(female?.024:.05*Math.sign(Math.cos(phi)))*Math.sin(t*Math.PI);
      out.push(vertex(s.q,flow,t,s.shade));ins.push(vertex(s.inside,flow,t,s.shade*.86));
    }
    outer.push(out);inner.push(ins);
  }
  function sheet(rings,reverse){
    const tri=(a,b,c)=>indices.push(...(reverse?[a,c,b]:[a,b,c]));
    for(let c=0;c<cols;c++)tri(rings[0][0],rings[1][c+1],rings[1][c]);
    for(let r=1;r<rows;r++)for(let c=0;c<cols;c++){
      const a=rings[r][c],b=rings[r][c+1],d=rings[r+1][c],e=rings[r+1][c+1];tri(a,b,d);tri(b,e,d);
    }
  }
  sheet(outer,false);sheet(inner,true);
  for(let c=0;c<cols;c++){const a=outer[rows][c],b=inner[rows][c],d=outer[rows][c+1],e=inner[rows][c+1];indices.push(a,d,b,d,e,b);}

  function lock(name,points,{width=.020,depth=.004,rings=24,sides=8,shade=.97,phase=0,normal,tipStart=.72}={}){
    const curve=new T.CatmullRomCurve3(points,false,'centripetal'),grid=[];
    for(let r=0;r<=rings;r++){
      const t=r/rings,c=curve.getPoint(t),tangent=curve.getTangent(t).normalize();
      const radial=normal?new T.Vector3(...normal):new T.Vector3(c.x,Math.max(0,c.y-centre.y)*.45,c.z-centre.z).normalize();
      const across=radial.clone().cross(tangent).normalize();
      if(across.lengthSq()<.01)across.set(1,0,0);
      const outward=tangent.clone().cross(across).normalize();
      // A broad buried root cannot read as a knot along the part. Flatten the
      // lens section and let its silhouette taper through the last bend.
      const taper=(.74+.26*smooth(t,0,.18))*(.90+.10*Math.sin(Math.PI*t))*(1-.44*smooth(t,tipStart,.94)-.47*smooth(t,.94,1)),ring=[];
      for(let s=0;s<=sides;s++){
        const angle=(s===sides?0:s/sides*Math.PI*2),ridge=1+.025*Math.cos(angle*3+phase+t*.7),sine=Math.sin(angle);
        const lens=Math.sign(sine)*Math.pow(Math.abs(sine),.66);
        const q=c.clone().addScaledVector(across,Math.cos(angle)*width*taper*ridge).addScaledVector(outward,lens*depth*taper);
        ring.push(vertex(q,s/sides+phase,t,shade*(.97+.025*Math.cos(angle-.6))));
      }
      grid.push(ring);
    }
    for(let r=0;r<rings;r++)for(let s=0;s<sides;s++){
      const a=grid[r][s],b=grid[r+1][s],d=grid[r][s+1],e=grid[r+1][s+1];indices.push(a,d,b,d,e,b);
    }
    const first=vertex(curve.getPoint(0),phase,0,shade*.92),last=vertex(curve.getPoint(1),phase,1,shade);
    for(let s=0;s<sides;s++){indices.push(first,grid[0][s+1],grid[0][s]);indices.push(last,grid[rings][s],grid[rings][s+1]);}
    lockInfo.push({name,root:points[0].toArray(),tip:points.at(-1).toArray(),width,depth,rings,sides,tipStart});
  }
  if(!female){
    // The exposed bank follows the forehead diagonally. Its roots start under
    // the cap, offset from the central seam rather than stacked into a braid.
    for(const sign of[-1,1]){
      for(let j=0;j<4;j++){
        const f=Math.PI/2,asym=sign<0?.025:0;
        const tip=scalp(1.31+j*.060+asym,f-sign*(1.02-j*.095),.007);tip.x+=sign*(.003+.0015*j);tip.y+=.003*Math.sin(j*1.9+sign);
        lock(`centre-part ${sign}:${j}`, [
          scalp(.17+j*.18,f-sign*(.25+j*.025),-.003),
          scalp(.37+j*.145,f-sign*(.45+j*.016),.016+asym*.08),
          scalp(.65+j*.13,f-sign*(.65-j*.035),.023-j*.001),
          scalp(1.04+j*.075,f-sign*(.88-j*.070),.016),tip,
        ], {width:.022-j*.001,depth:.0038,rings:22,shade:.985-j*.016,phase:j*.137+(sign<0?.2:0),tipStart:.69+j*.025});
      }
      for(let j=0;j<2;j++){
        const f=Math.PI/2,tip=scalp(1.56+j*.070+(sign<0?.025:0),f-sign*(.52+j*.20),.007);tip.y+=j?.005:-.005;
        lock(`soft curtain ${sign}:${j}`, [scalp(.69+j*.10,f-sign*(.16+j*.12),-.002),scalp(.92+j*.08,f-sign*(.28+j*.12),.019),scalp(1.21+j*.08,f-sign*(.39+j*.15),.016),tip], {width:.017-j*.004,depth:.0028,rings:22,phase:.37+j*.17,shade:1.01,tipStart:.61+j*.09});
      }
      for(let j=0;j<2;j++){
        const phi=sign>0?-.12-j*.30:Math.PI+.12+j*.30;
        lock(`temple layer ${sign}:${j}`,[scalp(.56,phi,-.002),scalp(.93,phi+sign*.12,.013),scalp(1.30,phi+sign*.08,.014),scalp(1.67+.06*j,phi-sign*.08,.004)],{width:.019-j*.001,depth:.0028,rings:17,phase:.63+j*.22,shade:.97,tipStart:.77});
      }
    }
    for(let j=0;j<5;j++){
      const phi=Math.PI+.30+j*.64;
      lock(`short back layer ${j}`,[scalp(.62,phi,-.002),scalp(1.15,phi+.10,.014),scalp(1.62,phi+.15,.012),scalp(1.94+.07*Math.sin(j),phi+.10,.003)],{width:.024,depth:.0035,rings:18,shade:.93,phase:j*.11});
    }
  }else{
    // Offset wide waves in depth as well as sideways. Their uneven last bend
    // breaks up the nape-to-shoulder sheet while retaining continuous coverage.
    for(let j=0;j<7;j++){
      const phi=Math.PI+.25+j*(Math.PI-.50)/6,side=Math.cos(phi),root=scalp(.62+.10*(j%3),phi,-.003);
      const end=longLength+.022*Math.sin(j*1.71),x=(j-3)*.037,phase=j*1.31;
      lock(`long back wave ${j}`,[root,scalp(1.45,phi+.05*Math.sin(j),.012),
        new T.Vector3(side*.112,top-.239,centre.z-.098-.030*(-Math.sin(phi))),
        new T.Vector3(x+.024*Math.sin(phase),top-.318,backChestZ-.012+.013*Math.cos(phase)),
        new T.Vector3(x-.020*Math.sin(phase+.4),top-.407,backChestZ-.023-.017*Math.cos(phase)),
        new T.Vector3(x+.019*Math.sin(phase+.9),top-end,backChestZ+.009+.017*Math.cos(phase+.7)),
      ],{width:.027+.003*Math.sin(j*.8)**2,depth:.0045,rings:28,sides:8,phase:j*.173,shade:.94+.05*Math.sin(j*.8),normal:[0,0,-1],tipStart:.70+.02*(j%3)});
    }
    // Two broad, offset S-waves each side, rather than three cylinders sharing
    // one path. Only their lower curls overlap over the chest.
    for(const sign of[-1,1])for(let j=0;j<2;j++){
      const phi=sign>0?.36:Math.PI-.36,offset=j*.022,asym=sign<0?-.021:.008;
      lock(`front long curl ${sign}:${j}`,[
        scalp(.69+j*.14,phi-sign*.13*j,-.002),scalp(1.40,phi-sign*.12*j,.013),
        new T.Vector3(sign*(.101+offset),top-.219,centre.z+.081-.018*j),
        new T.Vector3(sign*(.128+offset),top-.289-.025*j,frontChestZ-.033-.024*j),
        new T.Vector3(sign*(.101+offset),top-.375-.018*j,frontChestZ+.015-.016*j),
        new T.Vector3(sign*(.139+offset),top-.438+asym-.021*j,frontChestZ-.004-.020*j),
        new T.Vector3(sign*(.115+offset),top-longLength+asym+.032*j,frontChestZ+.022-.014*j),
      ],{width:j?.019:.024,depth:j?.0035:.0045,rings:32,sides:8,phase:j*.293+(sign<0?.41:0),shade:j?.98:1.025,normal:[0,0,1],tipStart:j?.66:.76});
    }
    // Irregular shallow bangs separate into small unequal fans. Roots follow
    // their own scalp longitude, avoiding a row of raised tubes at one point.
    const fringe=[[-.052,.100,.0048],[-.037,.107,.0042],[-.022,.098,.0045],[-.006,.104,.0038],[.010,.094,.0042],[.026,.102,.0048],[.045,.106,.0043]];
    for(const [j,[x,length,width]] of fringe.entries()){
      const side=Math.sign(x)||1,phi=Math.PI/2-Math.asin(T.MathUtils.clamp(x/.12,-.8,.8));
      const tip=scalp(1.46,phi,.007);tip.x=x+side*.003;tip.y=top-length;tip.z=Math.max(tip.z,front+.008);
      const rootPhi=phi+side*.06,turn=phi-side*.025;
      lock(`wispy fringe ${j}`,[scalp(.58+.035*(j%3),rootPhi,-.002),scalp(.86,rootPhi,.012),scalp(1.16,turn,.011),tip],{width,depth:.0015,rings:20,sides:8,phase:j*.157,shade:.99+.018*Math.sin(j),normal:[0,0,1],tipStart:.55+.03*(j%3)});
    }
  }
  const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(p,3));geometry.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geometry.setAttribute('color',new T.Float32BufferAttribute(colors,3));geometry.setIndex(indices);recomputeCharacterNormals(geometry);geometry.computeBoundingBox();
  geometry.userData.hairDesign={variant:female?'long loose waves with airy separated bangs':'fluffy centre part with outward curtains',rows,cols,closedVolume:true,lockCount:lockInfo.length,locks:lockInfo,headBound:true,reference:'user two-person reference, October 2026',fit:{top,centre:centre.toArray(),longLength,frontChestZ,backChestZ,volumeScale},bounds:{min:geometry.boundingBox.min.toArray(),max:geometry.boundingBox.max.toArray()},uv:'each lock U wraps across its solid section; V follows root-to-tip; scalp U follows parted crown flow'};
  const material=hair.clone();material.name='student-sculpted-hair';material.vertexColors=true;material.roughness=.74;
  material.userData.originalHairTextures={albedo:'student-hair-flow-albedo.png',normal:'student-hair-flow-normal.png',metallicRoughness:'student-hair-flow-roughness.png',uvWrapS:'REPEAT',uvWrapT:'CLAMP_TO_EDGE',normalScale:.25,roughnessFactor:1};
  makeSkinned(geometry,material,female?'long separated wavy hair and thin bangs':'fluffy centre-part short hair','Head');
  return {surface,surfaceRay};
}
