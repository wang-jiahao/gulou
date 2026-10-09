import * as T from 'three';
import {recomputeCharacterNormals} from './character-surface.mjs';

// Original short side part / shoulder-length layered bob. Both silhouettes are
// closed volumes fitted to the supplied head, without ribbons or alpha cards.
export function buildStudentHair({female,skinGeometry,makeSkinned,hair}) {
  const surface=new T.Mesh(skinGeometry,new T.MeshBasicMaterial({side:T.DoubleSide})),surfaceRay=new T.Raycaster();
  surface.updateMatrixWorld(true);
  const positions=skinGeometry.getAttribute('position');let top=-Infinity;
  for(let i=0;i<positions.count;i++)if(Math.abs(positions.getX(i))<.14)top=Math.max(top,positions.getY(i));
  let back=Infinity,front=-Infinity;
  for(let i=0;i<positions.count;i++)if(positions.getY(i)>top-.095&&Math.abs(positions.getX(i))<.12){back=Math.min(back,positions.getZ(i));front=Math.max(front,positions.getZ(i));}
  const centre=new T.Vector3(0,top-.108,(back+front)/2),rows=female?40:30,cols=female?112:96;
  const p=[],uv=[],colors=[],indices=[],outer=[],inner=[];
  const smooth=T.MathUtils.smoothstep;
  const angleDelta=(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));
  const gauss=(x,width)=>Math.exp(-((x/width)**2));
  function sample(t,phi){
    const cosine=Math.cos(phi),sine=Math.sin(phi),forehead=smooth(sine,.22,.82),rear=smooth(-sine,.05,.9),nape=smooth(-sine,.35,.94);
    const curtain=female?1-smooth(sine,.35,.79):0;
    // The male front sits higher on the real forehead: lowering the complete
    // hair shell would merely bury it in the source skull and expose skin.
    const end=female?1.68-.46*forehead+.09*cosine*forehead:1.57-.49*forehead+.30*rear+.54*nape+.055*cosine*forehead-.030*gauss(angleDelta(phi,1.90),.22)*forehead+.026*nape*Math.sin(phi*5+.45);
    const theta=t*end,d=new T.Vector3(.093*Math.sin(theta)*cosine,.108*Math.cos(theta),.117*Math.sin(theta)*sine).normalize();
    surfaceRay.set(centre.clone().addScaledVector(d,.38),d.clone().negate());
    const hit=surfaceRay.intersectObject(surface,false).find(h=>h.point.y>top-.225);
    if(!hit)throw new Error(`Hair scalp fit missed the supplied head at ${t.toFixed(3)}/${phi.toFixed(3)}`);
    const scalp=hit.point.clone(),q=scalp.clone();
    const crown=Math.sin(Math.PI*t),part=gauss(angleDelta(phi,1.84+.13*crown),.115)*crown;
    // Broad asymmetric volumes supply the sweep; no periodic corrugated ridges.
    const sweep=(.55+.45*smooth(-cosine,-.7,.65))*forehead*crown;
    // Short back hair hugs the nape. The extra length begins behind the ears,
    // and the gently unequal neckline tapers to 1.5mm rather than a thick rim.
    const volume=.003+(female?.010:.005)*crown+(female?.004:.004)*sweep-.0015*part-(female?0:.0015*nape*smooth(t,.82,1));
    q.addScaledVector(d,volume);
    let flow=0;
    if(female){
      flow=smooth(t,.46,1)*curtain;
      // Unequal broad locks are sculpted into the same volume. Their bends
      // and end heights differ, rather than repeating parallel corrugations.
      const locks=[[.10,.29,.006,-.006,.18],[-.49,.34,-.003,.006,-.12],[-1.17,.42,.005,.013,.09],[-1.95,.30,-.002,.001,-.16],[-2.66,.36,.004,.009,.14],[2.78,.32,.006,-.004,-.13]];
      let body=0,hemLift=0;
      for(const [at,width,bulge,lift,bend]of locks){const influence=gauss(angleDelta(phi,at+bend*Math.sin(flow*Math.PI)),width);body+=bulge*influence;hemLift+=lift*gauss(angleDelta(phi,at),width);}
      // The widest section is at cheek/jaw height. Ends curl inward and the
      // lateral hem rises gently, avoiding the earlier flared A silhouette.
      const hem=new T.Vector3(cosine*.102,top-.301+.015*cosine*cosine+.008*forehead+hemLift*.55+.010*rear,centre.z+.110*sine+.035*cosine*cosine+.024*rear);
      q.lerp(hem,flow);
      // Rounded cheek-side body and turned-in ends keep a broad visible mass
      // beside the face, instead of two straight pointed strips in front view.
      q.x+=cosine*.035*Math.sin(flow*Math.PI);
      q.z+=.017*cosine*cosine*Math.sin(flow*Math.PI);
      // Preserve front-view width while giving the rear a soft occipital bow
      // that rolls forward into the nape at the shoulder-length lower edge.
      q.z-=.025*rear*Math.sin(flow*Math.PI);
      const layerNormal=new T.Vector3(cosine,0,sine).normalize();q.addScaledVector(layerNormal,body*smooth(flow,.08,.70));
    }else{
      q.y+=.002*sweep;
      q.x+=.003*forehead*crown;
    }
    const normal=d.clone().lerp(new T.Vector3(q.x,0,q.z-centre.z).normalize(),flow).normalize();
    const thickness=T.MathUtils.lerp(volume+.004,.017,flow),inside=q.clone().addScaledVector(normal,-thickness);
    if(female)inside.y+=.003*flow;
    const shade=.94+.016*Math.sin(phi*3+.7*t)+.010*Math.sin(phi*7-t*2)-.025*part;
    return{q,inside,shade,flow,scalp,d,curtain};
  }
  const vertex=(point,u,v,shade)=>{const index=p.length/3;p.push(...point.toArray());uv.push(u,v);colors.push(shade,shade,shade);return index;};
  const pole=sample(0,0);outer.push([vertex(pole.q,.5,0,.96)]);inner.push([vertex(pole.inside,.5,0,.82)]);
  for(let r=1;r<=rows;r++){
    const out=[],ins=[];
    for(let c=0;c<=cols;c++){
      const phi=(c===cols?0:c/cols*Math.PI*2),s=sample(r/rows,phi),t=r/rows;
      const flowU=c/cols+(female?.040:-.078)*Math.sin(t*Math.PI)*(.35+.65*smooth(Math.sin(phi),.22,.82));
      out.push(vertex(s.q,flowU,t,s.shade));ins.push(vertex(s.inside,flowU,t,s.shade*.87));
    }
    outer.push(out);inner.push(ins);
  }
  function sheet(rings,reverse){
    const triangle=(a,b,c)=>indices.push(...(reverse?[a,c,b]:[a,b,c]));
    for(let c=0;c<cols;c++)triangle(rings[0][0],rings[1][c+1],rings[1][c]);
    for(let r=1;r<rows;r++)for(let c=0;c<cols;c++){
      const next=c+1,a=rings[r][c],b=rings[r][next],d=rings[r+1][c],e=rings[r+1][next];triangle(a,b,d);triangle(b,e,d);
    }
  }
  sheet(outer,false);sheet(inner,true);
  // Three intervening rows make a rounded lower rim at the female bob ends;
  // the forehead return remains embedded in skin. No loose cards are added.
  const rim=[outer[rows]],rimSteps=female?4:1;
  for(let step=1;step<rimSteps;step++){
    const ring=[],alpha=step/rimSteps*Math.PI;
    for(let c=0;c<=cols;c++){
      const phi=c===cols?0:c/cols*Math.PI*2,s=sample(1,phi),across=s.q.clone().sub(s.inside),middle=s.q.clone().add(s.inside).multiplyScalar(.5),normal=across.clone().normalize();
      const down=new T.Vector3(0,-1,0);down.addScaledVector(normal,-down.dot(normal)).normalize();
      const point=middle.addScaledVector(across,.5*Math.cos(alpha)).addScaledVector(down,.5*across.length()*Math.sin(alpha)*s.curtain);
      ring.push(vertex(point,c/cols,1,s.shade*(1-.13*step/rimSteps)));
    }
    rim.push(ring);
  }
  rim.push(inner[rows]);
  for(let r=0;r<rim.length-1;r++)for(let c=0;c<cols;c++){
    const next=c+1,a=rim[r][c],b=rim[r+1][c],d=rim[r][next],e=rim[r+1][next];indices.push(a,d,b,d,e,b);
  }
  const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(p,3));geometry.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geometry.setAttribute('color',new T.Float32BufferAttribute(colors,3));geometry.setIndex(indices);recomputeCharacterNormals(geometry);
  geometry.userData.hairDesign={variant:female?'shoulder-length layered bob':'short natural side part',rows,cols,rimSteps,closedVolume:true,uv:'U follows asymmetric swept flow, repeats across duplicated seam; V crown=0 to hem=1; top 0.055V texture fade',centre:centre.toArray()};
  const material=hair.clone();material.name='student-sculpted-hair';material.vertexColors=true;material.roughness=.82;
  material.userData.originalHairTextures={albedo:'student-hair-flow-albedo.png',normal:'student-hair-flow-normal.png',metallicRoughness:'student-hair-flow-roughness.png',uvWrapS:'REPEAT',uvWrapT:'CLAMP_TO_EDGE',normalScale:.32,roughnessFactor:1};
  makeSkinned(geometry,material,female?'continuous layered shoulder hair':'continuous short side-part hair','Head');
  return {surface,surfaceRay};
}
