import { chromium } from 'playwright';
import { writeFile, mkdir } from 'node:fs/promises';
import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'chrome'}),page=await browser.newPage({viewport:{width:1440,height:900}}),cdp=await page.context().newCDPSession(page),errors=[];
page.on('pageerror',e=>errors.push(e.message));
try{
 await cdp.send('Network.enable');await cdp.send('Network.setCacheDisabled',{cacheDisabled:true});
 await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:50,downloadThroughput:30_000_000/8,uploadThroughput:10_000_000/8});
 await page.goto((process.env.TEST_URL??'http://localhost:4173/')+'?debug=1');
 await page.waitForFunction(()=>!document.querySelector('#enter').disabled&&window.__GULOU__,{}, {timeout:90000});
 const result=await page.evaluate(()=>({readyMs:window.__GULOU__.stats().readyMs,transferBytes:performance.getEntriesByType('resource').reduce((s,e)=>s+e.transferSize,0),resources:performance.getEntriesByType('resource').length}));
 Object.assign(result,{network:'30 Mbps down / 10 Mbps up / 50 ms latency; browser cache disabled',hardware:'Apple M4; 1440×900; medium',browser:await browser.version(),errors,time:new Date().toISOString()});
 assert.deepEqual(errors,[]);await mkdir('docs/validation/phase3',{recursive:true});await writeFile('docs/validation/phase3/loading.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
}finally{await browser.close();}
