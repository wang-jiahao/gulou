import * as T from 'three';
import {recomputeCharacterNormals} from './character-surface.mjs';

// Original unbranded campus canvas trainers, authored in the shared bind pose.
// The same two materials are reused by both feet; small color changes are
// vertex colors, rather than extra materials or texture/draw-call additions.
export function buildStudentShoes({female,positions,makeSkinned,shoe,sole}) {
  const textile=shoe.clone(),rubber=sole.clone();
  textile.name='student-shoe-canvas';textile.color.set(0xffffff);textile.vertexColors=true;textile.roughness=.92;
  rubber.name='student-shoe-rubber';rubber.color.set(0xffffff);rubber.vertexColors=true;rubber.roughness=.87;
  const palette={canvas:0xdeddd3,tongue:0xbfc3bc,panel:0xb8beb8,lace:0xf0eee4,midsole:0xe1e1d8,outsole:0xa1aaa5,eye:0x727e79};
  const segments=40,meshes=[],diagnostics={design:'original low canvas trainer',gender:female?'female':'male',feet:{}};
  const smooth=T.MathUtils.smoothstep,lerp=T.MathUtils.lerp;
  const colorArray=(hex,count)=>{const c=new T.Color(hex);return Array.from({length:count},()=>[c.r,c.g,c.b]).flat();};
  function finish(p,uv,idx){const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(idx);recomputeCharacterNormals(g);return g;}
  function ringSolid(rings,{bottom=true,top=true}={}) {
    const p=[],uv=[],idx=[],cols=rings[0].length-1;
    for(let r=0;r<rings.length;r++)for(let i=0;i<=cols;i++){p.push(...rings[r][i].toArray());uv.push(i/cols,r/(rings.length-1));}
    for(let r=0;r<rings.length-1;r++)for(let i=0;i<cols;i++){const a=r*(cols+1)+i,b=a+1,c=a+cols+1,d=c+1;idx.push(a,b,c,b,d,c);}
    for(const [r,enabled,reverse]of [[0,bottom,true],[rings.length-1,top,false]])if(enabled){const centre=rings[r].slice(0,cols).reduce((a,b)=>a.add(b),new T.Vector3()).multiplyScalar(1/cols),k=p.length/3;p.push(...centre.toArray());uv.push(.5,.5);for(let i=0;i<cols;i++){const a=r*(cols+1)+i,b=a+1;idx.push(...(reverse?[k,b,a]:[k,a,b]));}}
    return finish(p,uv,idx);
  }
  // A shallow closed overlay whose upper face follows a sampled cloth surface.
  // sample's u/v tangents have the opposite orientation to its outer normal.
  function patch(nu,nv,sample,offset=.0012,thickness=.0015) {
    const p=[],uv=[],idx=[],k=(i,j)=>2*(j*(nu+1)+i);
    for(let j=0;j<=nv;j++)for(let i=0;i<=nu;i++){const s=sample(i/nu,j/nv);for(const distance of [offset,offset-thickness]){p.push(...s.point.clone().addScaledVector(s.normal,distance).toArray());uv.push(i/nu,j/nv);}}
    for(let j=0;j<nv;j++)for(let i=0;i<nu;i++){const a=k(i,j),b=k(i+1,j),c=k(i,j+1),d=k(i+1,j+1);idx.push(a,c,b,b,c,d,a+1,b+1,c+1,b+1,d+1,c+1);}
    const boundary=[];for(let i=nu;i>=0;i--)boundary.push(k(i,0));for(let j=1;j<=nv;j++)boundary.push(k(0,j));for(let i=1;i<=nu;i++)boundary.push(k(i,nv));for(let j=nv-1;j>0;j--)boundary.push(k(nu,j));
    for(let i=0;i<boundary.length;i++){const a=boundary[i],b=boundary[(i+1)%boundary.length];idx.push(a,a+1,b,b,a+1,b+1);}
    return finish(p,uv,idx);
  }
  function cord(points,radius=.00125,steps=8) {
    const curve=new T.CatmullRomCurve3(points),g=new T.TubeGeometry(curve,steps,radius,5,false),p=Array.from(g.getAttribute('position').array),uv=Array.from(g.getAttribute('uv').array),idx=Array.from(g.index.array);
    for(const [r,t,sign]of [[0,0,-1],[steps,1,1]]){const point=curve.getPoint(t),normal=curve.getTangent(t).multiplyScalar(sign),k=p.length/3;p.push(...point.toArray());uv.push(.5,t);for(let i=0;i<5;i++){const a=r*6+i,b=a+1,pa=new T.Vector3().fromArray(p,a*3),pb=new T.Vector3().fromArray(p,b*3),dot=pa.sub(point).cross(pb.sub(point)).dot(normal);idx.push(...(dot>0?[k,a,b]:[k,b,a]));}}
    g.dispose();return finish(p,uv,idx);
  }
  function washer(point,normal){
    const rings=[],q=new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),normal);
    for(const [radius,y]of [[.0027,-.0002],[.0027,.0005],[.00125,.0005],[.00125,-.0002]])rings.push(Array.from({length:11},(_,i)=>{const a=(i===10?0:i/10*Math.PI*2);return new T.Vector3(Math.sin(a)*radius,y,Math.cos(a)*radius).applyQuaternion(q).add(point);}));
    const g=ringSolid(rings,{bottom:false,top:false}),idx=Array.from(g.index.array);for(let i=0;i<10;i++){const a=3*11+i,b=a+1,c=i,d=i+1;idx.push(a,b,c,b,d,c);}g.setIndex(idx);recomputeCharacterNormals(g);return g;
  }
  for(const side of ['Left','Right']){
    const ankle=positions[side+'Foot'];if(!ankle||![ankle.x,ankle.y,ankle.z].every(Number.isFinite))throw new Error(`Missing ${side} ankle`);
    const handed=side==='Left'?1:-1,widthScale=female?.96:1;
    const emit=(g,material,part,color)=>{g.setAttribute('color',new T.Float32BufferAttribute(colorArray(color,g.getAttribute('position').count),3));g.translate(ankle.x,0,ankle.z);g.userData.shoeDesign={part,side,closed:true};const mesh=makeSkinned(g,material,`${side} ${part}`,side+'Foot');meshes.push(mesh);return g;};
    const outline=phi=>{
      const sine=Math.sin(phi),cosine=Math.cos(phi),waist=.0028*smooth(-handed*sine,.25,.85)*Math.exp(-(((cosine+.28)/.34)**2));
      return new T.Vector3(sine*(.050+.010*smooth(cosine,-.3,.6)-waist)*widthScale,0,.065+.140*cosine);
    };
    const rocker=phi=>.005*smooth(Math.cos(phi),.58,1)+.0015*smooth(-Math.cos(phi),.78,1);
    const ring=fn=>Array.from({length:segments+1},(_,i)=>fn(i===segments?0:i/segments*Math.PI*2));
    const soleLayer=(spec)=>ringSolid(spec.map(([y,scale])=>ring(phi=>{const p=outline(phi);p.x*=scale;p.z=.065+(p.z-.065)*scale;p.y=y+rocker(phi);return p;})));
    emit(soleLayer([[.006,.94],[.009,.994],[.017,1],[.019,.99]]),rubber,'rounded traction outsole',palette.outsole);
    emit(soleLayer([[.017,.987],[.021,1],[.033,.994],[.037,.959]]),rubber,'contoured layered midsole',palette.midsole);

    function upper(t,phi){
      const edge=outline(phi),sin=Math.sin(phi),cos=Math.cos(phi),front=smooth(cos,.1,.85);
      const collar=new T.Vector3(sin*.040*widthScale,.115+.014*front,-.006+.049*cos);
      const p=new T.Vector3(lerp(edge.x*.945,collar.x,t),lerp(.035+rocker(phi),collar.y,t**1.38),lerp(.065+(edge.z-.065)*.957,collar.z,t));
      p.x+=.0025*sin*Math.sin(t*Math.PI)*widthScale;p.z-=.0025*smooth(-cos,.2,.9)*Math.sin(t*Math.PI);p.y+=.007*Math.sin(t*Math.PI)*front;
      // A flatter instep deck lets the laces rest across a tongue, rather than
      // arching high from the sides of a round egg-shaped cross-section.
      const centreT=T.MathUtils.clamp((.19898-p.z)/.15598,0,1),centreY=lerp(.040,.129,centreT**1.38)+.007*Math.sin(centreT*Math.PI);
      const deck=smooth(p.z,.025,.065)*(1-smooth(p.z,.14,.18))*(1-smooth(Math.abs(p.x),.024,.045))*smooth(t,.06,.25)*(1-smooth(t,.88,1));
      p.y=lerp(p.y,Math.max(p.y,centreY-.003*(p.x/.030)**2),deck*.9);
      return p;
    }
    function upperSample(t,phi){const point=upper(t,phi),dt=upper(Math.min(1,t+.0001),phi).sub(upper(Math.max(0,t-.0001),phi)),dp=upper(t,phi+.0001).sub(upper(t,phi-.0001));return{point,normal:dp.cross(dt).normalize()};}
    const upperRings=Array.from({length:9},(_,r)=>ring(phi=>upper(r/8,phi)));
    // Rounded padded collar lip, then a hidden inward wall and cavity floor.
    for(const [inset,down]of [[.002,.0005],[.005,.003],[.006,.015],[.006,.040]])upperRings.push(ring(phi=>{const p=upper(1,phi);p.x-=Math.sin(phi)*inset;p.z-=Math.cos(phi)*inset;p.y-=down;return p;}));
    const upperGeometry=ringSolid(upperRings),upperSurface=new T.Mesh(upperGeometry,new T.MeshBasicMaterial({side:T.DoubleSide}));upperSurface.updateMatrixWorld(true);
    const upRay=new T.Raycaster();
    function topSurface(x,z){upRay.set(new T.Vector3(x,.24,z),new T.Vector3(0,-1,0));const hit=upRay.intersectObject(upperSurface,false)[0];if(!hit||hit.point.y<.04)throw new Error('Shoe overlay missed inclined upper');const normal=hit.face.normal.clone();if(normal.y<0)normal.negate();return{point:hit.point.clone(),normal};}
    // Keep the local ray fixture separate: emit translates the owned geometry.
    const bodyForEmission=upperGeometry.clone();emit(bodyForEmission,textile,'closed canvas upper and collar',palette.canvas);
    emit(patch(3,8,(u,v)=>topSurface(lerp(-1,1,u)*lerp(.019,.016,v)*widthScale,lerp(.049,.137,v)),.0022,.0018),textile,'inclined padded tongue',palette.tongue);
    for(const sign of [-1,1])emit(patch(1,8,(u,v)=>topSurface((sign<0?lerp(-.029,-.020,u):lerp(.020,.029,u))*widthScale,lerp(.058,.132,v)),.0015,.0016),textile,`${sign<0?'medial':'lateral'} lace facing`,palette.canvas);
    // These overlays follow the shoe last, rather than intersecting ellipsoids.
    emit(patch(3,12,(u,v)=>upperSample(lerp(.025,.25,u),lerp(-.88,.88,v)),.0011,.0016),rubber,'rounded low toe guard',palette.midsole);
    emit(patch(4,12,(u,v)=>upperSample(lerp(.08,.81,u),lerp(2.18,4.10,v)),.0011,.0016),textile,'soft grey heel counter',palette.panel);
    const eyelets=[];
    for(let row=0;row<5;row++)for(const sign of [-1,1]){
      const z=.063+row*.014,x=sign*.024*widthScale,s=topSurface(x,z),point=s.point.clone().addScaledVector(s.normal,.003);
      emit(washer(point,s.normal),rubber,`reinforced eyelet ${row} ${sign}`,palette.eye);eyelets.push({row,sign,x,z,y:point.y});
    }
    const laceSamples=[];
    const lace=(x0,z0,x1,z1,over,name)=>{
      const points=Array.from({length:7},(_,i)=>{const t=i/6,x=lerp(x0,x1,t),z=lerp(z0,z1,t),s=topSurface(x,z),clearance=.0030+(.0034+over*.0032)*Math.sin(t*Math.PI),p=s.point.clone().addScaledVector(s.normal,clearance);laceSamples.push({x:p.x,y:p.y,z:p.z,clearance});return p;});
      emit(cord(points),textile,name,palette.lace);
    };
    for(let row=0;row<4;row++)for(const sign of [-1,1])lace(sign*.024*widthScale,.063+row*.014,-sign*.024*widthScale,.063+(row+1)*.014,sign>0?1:0,`surface crossing lace ${row} ${sign}`);
    lace(-.024*widthScale,.119,.024*widthScale,.119,0,'lowest straight lace');
    upperGeometry.dispose();upperSurface.material.dispose();
    diagnostics.feet[side]={ankle:ankle.toArray(),length:.280,soleGround:.006,widthScale,eyelets,laceSamples,bindings:[side+'Foot']};
  }
  return {meshes,diagnostics};
}
