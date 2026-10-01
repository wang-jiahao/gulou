import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import sharp from 'sharp';
const browser=await chromium.launch({channel:'chrome'}),page=await browser.newPage({viewport:{width:960,height:1280}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));await mkdir('docs/validation/phase5',{recursive:true});await mkdir('docs/images',{recursive:true});
try{
 await page.goto((process.env.TEST_URL??'http://localhost:4173/')+'?debug=1');await page.waitForFunction(()=>window.__GULOU__&&!document.querySelector('#enter').disabled,{}, {timeout:60000});await page.click('#enter');await page.waitForFunction(()=>window.__GULOU__.stats().sectors===3);
 const destinations=await page.evaluate(()=>{const g=window.__GULOU__.game,points=[[-614,-274],[154,744],[-500,-150],[-250,70],[0,7],[52,48],[-53,99],[-85,130],[-24,46],[-91,365],[-30,-95],[-70,452],[0,650]];return points.map(([x,z])=>{const result=g.player.travelTo(x,z);return {request:[x,z],result,flight:g.player.flightState};});});
 for(const item of destinations){assert.ok(item.result,`safe landing near ${item.request}`);assert.ok(Number.isFinite(item.result.y)&&item.result.y>=0);assert.equal(item.flight,'walking');}
 await page.keyboard.press('KeyM');await page.selectOption('#travel-place','12');await page.click('#travel-place-go');await page.waitForTimeout(500);
 const camera=await page.evaluate(()=>{const g=window.__GULOU__.game;g.setTime(10);return {position:g.player.position.toArray(),yaw:g.cameraRig.yaw,pitch:g.cameraRig.pitch,firstPerson:g.cameraRig.firstPerson};});
 assert.ok(Math.hypot(camera.position[0]+29.5,camera.position[2]-55)<1);assert.equal(camera.firstPerson,true);
 await page.keyboard.press('KeyP');const download=page.waitForEvent('download');await page.click('#save-photo');await (await download).saveAs('docs/images/north-building-photo.png');
 const {data,info}=await sharp('docs/images/north-building-photo.png').removeAlpha().raw().toBuffer({resolveWithObject:true});let red=0,sumY=0;
 for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++){const i=(y*info.width+x)*info.channels;if(data[i]>80&&data[i]>data[i+1]*2&&data[i+1]<90&&data[i]>data[i+2]*1.7){red++;sumY+=y;}}
 assert.ok(red>info.width*info.height*.006,'red installation is visible, rather than just the tiny roof star');assert.ok(sumY/red>info.height*.6,'heart sign is in the photo foreground');
 assert.deepEqual(errors,[]);const report={checks:['safe map travel on campus edges, roofs, garden, sign and surrounding tower','named photo spot is reachable through map UI','downloaded photo contains the foreground red heart','north building and Zifeng composition visually reviewed separately'],destinations,camera,redPixels:red,redMeanY:sumY/red,image:{width:info.width,height:info.height},errors};await writeFile('docs/validation/phase5/scenic.json',JSON.stringify(report,null,2));console.log(JSON.stringify({camera,redPixels:red,errors}));
}finally{await browser.close();}
