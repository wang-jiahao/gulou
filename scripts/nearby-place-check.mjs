import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {findNearbyPlace} from '../src/world/nearby-place.ts';

// Pure selection tests: no DOM, rendering, physics, server or browser. The
// first fixture records actual plan-42/45 doors and plan-45's normal arrival.
const cases=[];
function check(name,run){run();cases.push(name);}
const modes=['interact','about'];
const pos={x:0,y:0,z:0};
const door=(name,x,y=0,z=0)=>({name,x,y,z});
const place=(name,x,z=0)=>({name,x,z,description:`${name}的介绍`});
const select=(doors,places=[],mode='interact',position=pos)=>findNearbyPlace(position,doors,places,mode);

check('engineering arrival beats earlier platform entry',()=>{
 const arrival={x:-321.8337285216848,y:.035,z:127.80245453215203};
 const doors=[door('平台化楼',-326.8196220252219,0,125.25426636008535),door('工程管理学院',-322.0670231956318,0,130.29154544955702)];
 const oldAbout=doors.find(d=>Math.hypot(d.x-arrival.x,d.z-arrival.z)<7&&Math.abs(d.y-arrival.y)<5);
 assert.equal(oldAbout.name,'平台化楼','fixture must reproduce the reported old failure');
 for(const mode of modes)for(const order of[doors,[...doors].reverse()])assert.equal(select(order,[],mode,arrival).name,'工程管理学院');
});
check('two interactive doors are independent of array order',()=>{
 const near=door('最近门',1),far=door('较远门',3);
 for(const mode of modes)for(const order of[[far,near],[near,far]])assert.equal(select(order,[],mode),near);
});
check('every permutation of overlapping doors chooses the closest',()=>{
 const a=door('一号',3.5),b=door('二号',2.5),c=door('三号',.5);
 for(const doors of[[a,b,c],[a,c,b],[b,a,c],[b,c,a],[c,a,b],[c,b,a]])for(const mode of modes)assert.equal(select(doors,[],mode),c);
});
check('closer door on inaccessible floor is excluded before ranking',()=>{
 const upper=door('楼上门',.2,4.5),ground=door('地面门',3);
 for(const mode of modes)assert.equal(select([upper,ground],[],mode),ground);
});
check('height is relative to the player and works below the player',()=>{
 const upstairs=door('同层门',2,7),ground=door('下方门',.1);
 for(const mode of modes)assert.equal(select([ground,upstairs],[],mode,{...pos,y:7}),upstairs);
});
check('shared four-metre floor boundary is strict',()=>{
 for(const mode of modes){assert.equal(select([door('高处门',1,4)],[],mode),undefined);assert.equal(select([door('低处门',1,-4)],[],mode),undefined);assert.ok(select([door('范围内',1,3.999)],[],mode));}
});
check('nearest horizontal reachable door is consistent between E and I',()=>{
 const near=door('近门',1,3.5),far=door('远门',3);
 for(const mode of modes)assert.equal(select([far,near],[],mode),near);
});
check('door still takes precedence over a closer map point',()=>{
 const entrance=door('建筑入口',3),marker=place('广场',.1);
 for(const mode of modes)assert.equal(select([entrance],[marker],mode),entrance);
});
check('no-door places use nearest point and preserve the description',()=>{
 const near=place('校门',2),far=place('道路',4);
 for(const mode of modes)for(const points of[[far,near],[near,far]])assert.equal(select([],points,mode),near);
});
check('ineligible doors allow no-door place fallback',()=>{
 const marker=place('无门地点',1);
 for(const mode of modes)assert.equal(select([door('楼上门',.1,10)],[marker],mode),marker);
});
check('map points without altitude retain their existing horizontal reach',()=>{
 const marker=place('台地点',1);
 assert.equal(select([],[marker],'interact',{...pos,y:3}),marker);
 // A point with explicit altitude can be filtered, unlike a point whose
 // ground/terrace elevation is unknown to this selector.
 assert.equal(select([],[{...marker,y:0}],'interact',{...pos,y:8}),undefined);
});
check('I retains discovery radius while E retains interaction radius',()=>{
 const entrance=door('远一些的门',6),marker=place('校园点',8);
 assert.equal(select([entrance]),undefined);assert.equal(select([entrance],[],'about'),entrance);
 assert.equal(select([],[marker]),undefined);assert.equal(select([],[marker],'about'),marker);
});
check('range boundaries and empty surroundings have no target',()=>{
 assert.equal(select([door('边界门',4)],[place('边界点',5.5)]),undefined);
 assert.equal(select([door('边界门',7)],[place('边界点',9)],'about'),undefined);
 assert.equal(select([],[]),undefined);
});
check('Dadaoping introduction keeps its special priority and E stays separate',()=>{
 const flag={x:-246,y:0,z:112},entrance=door('附近楼门',-246,0,112);
 assert.equal(select([entrance],[],'about',flag).name,'大纛坪');
 assert.equal(select([entrance],[],'interact',flag),entrance);
 assert.equal(select([],[],'about',{...flag,x:-234}),undefined);
 assert.equal(select([],[],'about',{...flag,y:5}),undefined);
 assert.equal(select([],[],'about',{...flag,y:4.99}).name,'大纛坪');
});
check('equal distances use floor closeness then name without mutating input',()=>{
 const a=Object.freeze(door('A',1)),b=Object.freeze(door('B',-1)),upper=Object.freeze(door('上层',1,2));
 for(const mode of modes){assert.equal(select(Object.freeze([b,upper,a]),[],mode),a);assert.equal(select(Object.freeze([a,upper,b]),[],mode),a);}
});

const source='src/world/nearby-place.ts',bytes=await readFile(source);
const report={passed:true,count:cases.length,cases,source,sha256:createHash('sha256').update(bytes).digest('hex'),scope:'Pure proximity selection only; no collision, line-of-sight, browser or GPU validation.'};
await mkdir('docs/validation/signs-stories',{recursive:true});
await writeFile(`docs/validation/signs-stories/nearby-place-${Date.now()}.json`,JSON.stringify(report,null,2));
console.log(JSON.stringify(report));
