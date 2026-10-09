// Original continuous character skinning field. Distances are in authoring metres.
// This helper assigns weights only; it does not alter geometry or joint poses.
export function createStudentWeights({positions,indices,definitions,hipY,neckY}){
  const clamp=x=>Math.max(0,Math.min(1,x));
  const smooth=(x,a,b)=>{const t=clamp((x-a)/(b-a));return t*t*(3-2*t);};
  const xyz=p=>Array.isArray(p)?p:[p.x,p.y,p.z];
  const points=Object.fromEntries(Object.entries(positions).map(([name,p])=>[name,xyz(p)]));
  const subtract=(a,b)=>a.map((v,i)=>v-b[i]);
  const dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0);
  const direction=(a,b)=>{const d=subtract(b,a),l=Math.hypot(...d);return d.map(v=>v/l);};
  const segment=(a,b)=>({a,b,d:subtract(b,a),length2:dot(subtract(b,a),subtract(b,a))});
  const distance=(p,s)=>{const t=clamp(dot(subtract(p,s.a),s.d)/s.length2);return Math.hypot(...p.map((v,i)=>v-s.a[i]-s.d[i]*t));};
  const add=(weights,name,weight)=>{if(weight>0)weights.set(indices[name],(weights.get(indices[name])??0)+weight);};
  const mix=(target,source,amount)=>{for(const [id,w]of source)target.set(id,(target.get(id)??0)+w*amount);};
  const single=name=>new Map([[indices[name],1]]);
  const known=new Set(definitions.map(d=>d[0]));
  for(const name of ['Hips','Spine','Spine1','Spine2','Neck','Head'])if(!known.has(name)||!points[name])throw Error(`Missing weight joint ${name}`);

  function compact(weights){
    const entries=[...weights].filter(([id,w])=>Number.isInteger(id)&&Number.isFinite(w)&&w>1e-12).sort((a,b)=>b[1]-a[1]||a[0]-b[0]);
    // Subtract the fifth influence before dropping it. A joint crosses the
    // four-slot boundary with zero weight instead of a finite nearest-bone jump.
    const cutoff=entries[4]?.[1]??0;
    let selected=entries.slice(0,4).map(([id,w])=>[id,Math.max(0,w-cutoff)]).filter(([,w])=>w>1e-12);
    if(!selected.length)selected=entries.slice(0,4);
    const sum=selected.reduce((s,[,w])=>s+w,0);
    if(!(sum>0))throw Error('Continuous skin field has no valid influence');
    return selected.map(([id,w])=>[id,w/sum]);
  }

  function torso(p){
    const names=['Hips','Spine','Spine1','Spine2'],result=new Map();
    const y=p[1];
    if(y<=points.Hips[1])return single('Hips');
    let assigned=false;
    for(let i=0;i<names.length-1;i++)if(y<points[names[i+1]][1]){
      const t=smooth(y,points[names[i]][1],points[names[i+1]][1]);
      add(result,names[i],1-t);add(result,names[i+1],t);assigned=true;break;
    }
    if(!assigned)add(result,'Spine2',1);
    const neck=smooth(y,neckY-.105,neckY-.005),head=smooth(y,neckY-.005,neckY+.035),upper=new Map();
    mix(upper,result,1-neck);add(upper,'Neck',neck*(1-head));add(upper,'Head',neck*head);
    return upper;
  }

  const sides=Object.fromEntries(['Left','Right'].map(side=>{
    const shoulder=points[side+'Arm'],elbow=points[side+'ForeArm'],wrist=points[side+'Hand'];
    const upperAxis=direction(shoulder,elbow),lowerAxis=direction(elbow,wrist);
    const elbowAxis=upperAxis.map((v,i)=>v+lowerAxis[i]),elbowLength=Math.hypot(...elbowAxis);
    const digits=[];
    for(let digit=1;digit<=5;digit++){
      const names=Array.from({length:4},(_,i)=>`${side}Finger${digit}${i+1}`);
      if(names.some(n=>!points[n]))continue;
      const ps=names.map(n=>points[n]),segments=ps.slice(0,3).map((p,i)=>segment(p,ps[i+1]));
      const axes=ps.slice(0,3).map((p,i)=>direction(p,ps[i+1]));
      digits.push({names,points:ps,segments,axes});
    }
    return [side,{shoulder,elbow,wrist,upperAxis,lowerAxis,elbowAxis:elbowAxis.map(v=>v/elbowLength),
      segments:[segment(shoulder,elbow),segment(elbow,wrist)],digits}];
  }));

  function hand(p,side){
    const result=new Map();add(result,side+'Hand',.008);
    for(const digit of sides[side].digits){
      const d=Math.min(...digit.segments.map(s=>distance(p,s)));
      const affinity=Math.exp(-.5*(d/.016)**2);
      if(affinity<1e-10)continue;
      const base=dot(subtract(p,digit.points[0]),digit.axes[0]);
      const active=smooth(base,-.018,.024);
      const second=smooth(dot(subtract(p,digit.points[1]),digit.axes[1]),-.012,.012);
      const third=smooth(dot(subtract(p,digit.points[2]),digit.axes[2]),-.010,.010);
      add(result,side+'Hand',affinity*(1-active));
      add(result,digit.names[0],affinity*active*(1-second));
      add(result,digit.names[1],affinity*active*second*(1-third));
      add(result,digit.names[2],affinity*active*second*third);
    }
    return result;
  }

  function arm(p,side){
    const data=sides[side],result=new Map();
    const elbow=smooth(dot(subtract(p,data.elbow),data.elbowAxis),-.065,.065);
    // Cloth ends at the forearm-driven cuff. Wrist/hand rotation must not fold
    // the terminal sleeve ring away from that shared garment boundary.
    add(result,side+'Arm',1-elbow);add(result,side+'ForeArm',elbow);
    return result;
  }

  function exposedHand(p,side){
    const data=sides[side],fingerField=hand(p,side),result=new Map();
    const sum=[...fingerField.values()].reduce((a,b)=>a+b,0);
    const handAmount=smooth(dot(subtract(p,data.wrist),data.lowerAxis),-.040,.016);
    // The skin sample includes a short forearm stalk. Blend that stalk across
    // the wrist instead of rotating its entire proximal cut with the hand.
    add(result,side+'ForeArm',1-handAmount);
    mix(result,fingerField,handAmount/sum);
    return result;
  }

  function legs(p){
    const result=new Map(),y=p[1];
    // The pelvis carries the continuous crotch bridge. A broad cross-body field
    // fades into separate legs below it, avoiding an x=0 ownership discontinuity.
    const heightPelvis=smooth(y,hipY-.26,hipY-.035);
    const bridge=(1-smooth(Math.abs(p[0]),.015,.120))*smooth(y,hipY-.35,hipY-.12);
    const pelvis=1-(1-heightPelvis)*(1-bridge);
    add(result,'Hips',pelvis);
    const width=.008+.042*smooth(y,hipY-.34,hipY-.10),left=smooth(p[0],-width,width);
    for(const side of ['Left','Right']){
      const sideAmount=(side==='Left'?left:1-left)*(1-pelvis),knee=points[side+'Leg'],ankle=points[side+'Foot'];
      const lower=smooth(knee[1]-y,-.065,.065),foot=smooth(ankle[1]-y,-.050,.025);
      add(result,side+'UpLeg',sideAmount*(1-lower));
      add(result,side+'Leg',sideAmount*lower*(1-foot));
      add(result,side+'Foot',sideAmount*lower*foot);
    }
    return result;
  }

  return function studentWeights(point,force){
    const p=xyz(point);
    if(!p.every(Number.isFinite))throw Error('Nonfinite position in skin weight assignment');
    if(force&&force!=='torso'&&force!=='trousers'&&force!=='jacket'){
      if(!known.has(force))throw Error(`Unknown forced skin joint ${force}`);
      return [[indices[force],1]];
    }
    if(force==='trousers')return compact(legs(p));
    const side=p[0]>=0?'Left':'Right';
    // Exposed hand meshes are disjoint from the neck mesh. The proximal wrist
    // may use only the same-side forearm; palm/finger distances remain unchanged.
    if(!force&&Math.abs(p[0])>.32)return compact(exposedHand(p,side));
    const body=torso(p);
    if(force==='torso'||force==='jacket'){
      const centre=force==='torso'?1:1-smooth(Math.abs(p[0]),.22,.30);
      const torsoAmount=1-(1-smooth(p[1],hipY+.10,hipY+.23))*centre,hips=new Map();
      add(hips,'Hips',1-torsoAmount);mix(hips,body,torsoAmount);
      if(force==='torso')return compact(hips);
      body.clear();mix(body,hips,1);
    }
    const data=sides[side],armDistance=Math.min(...data.segments.map(s=>distance(p,s)));
    const torsoDistance=Math.hypot(p[0],p[2]-.025);
    const lateral=smooth(Math.abs(p[0])-Math.abs(data.shoulder[0]),-.055,.105);
    const proximity=smooth(torsoDistance*.9-armDistance,-.065,.085);
    const hem=force==='jacket'?1-(1-smooth(p[1],hipY+.10,hipY+.23))*(1-smooth(Math.abs(p[0]),.22,.30)):1;
    const armAmount=lateral*proximity*hem*(1-smooth(p[1],neckY-.035,neckY+.025));
    const result=new Map();mix(result,body,1-armAmount);mix(result,arm(p,side),armAmount);
    return compact(result);
  };
}
