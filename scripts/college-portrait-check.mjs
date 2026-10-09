import assert from 'node:assert/strict';
import {mkdir,writeFile,stat} from 'node:fs/promises';
import path from 'node:path';
import {collegePortraitOrder,collegeStories,missingCollegePortraits} from '../src/world/college-stories.ts';
import {preloadCollegePortraitImages,getPreloadedCollegePortraitImage,paintCollegePortraitPanel,createCollegePortraitMaterial} from '../src/world/college-portrait-panel.ts';

// Native Canvas exercises the production painter without opening a browser.
// Point COLLEGE_CANVAS_MODULE to @napi-rs/canvas/index.js when it is supplied
// by the desktop runtime rather than installed in the project.
const {createCanvas,loadImage,GlobalFonts}=await import(process.env.COLLEGE_CANVAS_MODULE||'@napi-rs/canvas');
if(process.env.COLLEGE_QA_FONT)GlobalFonts.registerFromPath(process.env.COLLEGE_QA_FONT,'PingFang SC');
const oldDocument=globalThis.document;
globalThis.document={createElement(tag){assert.equal(tag,'canvas');return createCanvas(1,1);}};
const expected=[['秉文书院','郭秉文'],['行知书院','陶行知'],['有训书院','吴有训'],['安邦书院','戴安邦'],['毓琇书院','顾毓琇'],['开甲书院','程开甲'],['健雄书院','吴健雄']];
assert.deepEqual(collegePortraitOrder.map(id=>[collegeStories[id].college,collegeStories[id].person]),expected);
assert.equal(new Set(collegePortraitOrder).size,7);
assert.deepEqual(missingCollegePortraits,['anbang']);
const readyIds=collegePortraitOrder.filter(id=>collegeStories[id].portrait);
for(const id of collegePortraitOrder){
 assert.match(collegeStories[id].source,/^https:\/\/xsxy\.nju\.edu\.cn\/xygk\/syjs\//);
 const material=createCollegePortraitMaterial(id);
 assert.equal(material.userData.portraitStatus,'missing','unloaded portraits retain the accurate biography panel');
 assert.equal(material.userData.person,collegeStories[id].person);
 material.map.dispose();material.dispose();
}
let requested=[];
await assert.rejects(preloadCollegePortraitImages('/gulou/',async url=>{
 requested.push(url);
 if(url.endsWith('yuxiu.webp'))throw new Error('fixture portrait failure');
 return loadImage(path.resolve('public',url.slice('/gulou/'.length)));
}),/fixture portrait failure/);
assert.equal(requested.length,6);
for(const id of readyIds)assert.equal(getPreloadedCollegePortraitImage(id),undefined,'failed batch must not leave a partial cache');
requested=[];
await preloadCollegePortraitImages('/gulou',async url=>{
 requested.push(url);return loadImage(path.resolve('public',url.slice('/gulou/'.length)));
});
assert.deepEqual(requested,readyIds.map(id=>`/gulou/${collegeStories[id].portrait.asset}`));
const missingMaterial=createCollegePortraitMaterial('anbang',{image:getPreloadedCollegePortraitImage('bingwen')});
assert.equal(missingMaterial.userData.portraitStatus,'missing','missing portrait cannot borrow someone else’s face');
assert.equal(missingMaterial.userData.person,'戴安邦');
missingMaterial.map.dispose();missingMaterial.dispose();
const out=process.env.COLLEGE_QA_OUT||'docs/validation/signs-stories/colleges';
await mkdir(out,{recursive:true});
const reports=[];
try{
 for(const aspect of [2.5,3.2,3.6,4])for(const id of collegePortraitOrder){
  const canvas=createCanvas(1,1),ctx=canvas.getContext('2d'),drawn=[];
  const fillText=ctx.fillText.bind(ctx);
  ctx.fillText=(text,x,y,...rest)=>{
   const metrics=ctx.measureText(text);
   drawn.push({text,x,y,width:metrics.width,top:y-metrics.actualBoundingBoxAscent,bottom:y+metrics.actualBoundingBoxDescent});
   return fillText(text,x,y,...rest);
  };
  const layout=paintCollegePortraitPanel(canvas,id,getPreloadedCollegePortraitImage(id),aspect);
  assert.deepEqual(layout.text.lines.map(lines=>lines.join('')),collegeStories[id].paragraphs,'reflow must preserve the complete verified biography');
  assert.ok(layout.text.lines.flat().every(line=>line&&!/^[，。；：！？、”’）》】]/.test(line)),'closing punctuation stays with preceding text');
  assert.ok(layout.portrait.x+layout.portrait.width<layout.text.x,'portrait stays left of this person’s biography');
  for(const run of drawn){
   assert.ok(run.x>=0&&run.x+run.width<=canvas.width,`${id}@${aspect}: horizontal overflow: ${run.text}`);
   assert.ok(run.top>=0&&run.bottom<canvas.height,`${id}@${aspect}: vertical overflow: ${run.text}`);
  }
  const title=drawn.find(run=>run.text===collegeStories[id].person&&run.x===layout.text.x);
  assert.ok(title&&title.x===layout.text.x);
  const footer=drawn.at(-1);
  const bodyLines=layout.text.lines.flat();
  const bodyRuns=drawn.filter(run=>bodyLines.includes(run.text));
  assert.equal(bodyRuns.length,bodyLines.length);
  assert.ok(Math.max(...bodyRuns.map(run=>run.bottom))<footer.top,'biography clears attribution footer');
  if(aspect===3.2||aspect===3.6)await writeFile(`${out}/panel-${id}-${aspect}.png`,canvas.toBuffer('image/png'));
  reports.push({id,aspect,bodyLines:bodyLines.length,fontSize:layout.text.fontSize,bodyBottom:Math.max(...bodyRuns.map(run=>run.bottom)),footerTop:footer.top});
 }
 for(const id of readyIds){
  const material=createCollegePortraitMaterial(id,{aspect:3.4});
  assert.ok(material?.map&&typeof material.then==='undefined');
  assert.equal(material.userData.person,collegeStories[id].person);
  assert.equal(material.userData.face,'+Z');
  assert.ok((await stat(`public/${collegeStories[id].portrait.asset}`)).size>0);
  material.map.dispose();material.dispose();
 }
 for(const aspect of [NaN,0,2.4,4.1])assert.throws(()=>paintCollegePortraitPanel(createCanvas(1,1),'bingwen',getPreloadedCollegePortraitImage('bingwen'),aspect));
 const neutral=createCanvas(1,1);let imageCount=0;
 neutral.getContext('2d').drawImage=()=>{imageCount++;};
 assert.equal(paintCollegePortraitPanel(neutral,'anbang',getPreloadedCollegePortraitImage('bingwen')).hasPortrait,false);
 assert.equal(imageCount,0,'unlicensed subject must never borrow another person’s supplied image');
}finally{
 if(oldDocument===undefined)delete globalThis.document;else globalThis.document=oldDocument;
}
await writeFile(`${out}/panel-check.json`,JSON.stringify({status:'passed',collegeCount:7,licensedPortraits:6,missing:missingCollegePortraits,layouts:reports},null,2)+'\n');
console.log('PASS: 7 official mappings; 6 licensed assets; transactional preload and synchronous material contracts; 28 native Canvas layouts with no text overflow.');
