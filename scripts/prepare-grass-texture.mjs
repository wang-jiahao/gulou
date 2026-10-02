import sharp from 'sharp';
import assert from 'node:assert/strict';

// Keep visible artwork and alpha unchanged. Mipmaps otherwise average black
// transparent texels into thin blades, giving grass a dark outline at distance.
const path='public/assets/textures/grass-tuft.png';
const {data,info}=await sharp(path).ensureAlpha().raw().toBuffer({resolveWithObject:true});
let count=0;const average=[0,0,0];
for(let i=0;i<data.length;i+=4)if(data[i+3]===255){for(let c=0;c<3;c++)average[c]+=data[i+c];count++;}
assert.ok(count>0);for(let c=0;c<3;c++)average[c]=Math.round(average[c]/count);
let changed=0;
for(let i=0;i<data.length;i+=4)if(data[i+3]===0){for(let c=0;c<3;c++)data[i+c]=average[c];changed++;}
await sharp(data,{raw:{width:info.width,height:info.height,channels:4}}).png().toFile(path+'.tmp.png');
const {rename}=await import('node:fs/promises');await rename(path+'.tmp.png',path);
console.log(JSON.stringify({visiblePixelsUnchanged:count,transparentPixelsFilled:changed,transparentRGB:average}));
