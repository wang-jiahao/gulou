import assert from 'node:assert/strict';
// Exercise playlist ordering without a browser or audio hardware.
globalThis.Audio = class extends EventTarget {
  src = ''; paused = true; volume = 1; currentTime = 0;
  play() { this.paused = false; return Promise.resolve(); }
  pause() { this.paused = true; }
};
const { Music } = await import('../src/audio/music.ts');
const music = new Music();
music.tracks = Array.from({length:5},(_,i)=>({title:String(i),url:`track-${i}`}));
const played=[];
for(let i=0;i<150;i++){music.next();played.push(music.index);}
for(let i=0;i<played.length;i+=5)assert.equal(new Set(played.slice(i,i+5)).size,5,'every shuffle round plays each track once');
for(let i=1;i<played.length;i++)assert.notEqual(played[i],played[i-1],'avoid immediate repeats, including across shuffle rounds');
const single = new Music(); single.tracks=[{title:'one',url:'one'}];single.next();single.next();assert.equal(single.index,0);
const empty = new Music(), preloaded = empty.audio.src;empty.tracks=[];empty.next();assert.equal(empty.audio.src,preloaded);
assert(preloaded.startsWith('https://resources.download.minecraft.net/'));
assert.equal(empty.audio.paused,true,'preloading must not autoplay before entry');
console.log('PASS: 30 shuffle rounds, no immediate repeats, one-track and empty playlists.');
