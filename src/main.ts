import './style.css';
import type { Game, Quality } from './game/game.ts';
import type { OutfitStyle } from './player/avatar.ts';
import { CampusMapView } from './ui/campus-map.ts';
import { TouchControls, touchDevice } from './ui/touch-controls.ts';
import type { WeatherMode } from './game/environment-state.ts';

const el = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
let game: Game;
let uiHidden = false, toastTimer = 0, entered = false, dragging = false, tick = 0;
const mapDialog = el<HTMLDialogElement>('campus-map');
let mapView: CampusMapView;
let touchControls: TouchControls;
let selectedMapPoint: { x: number; z: number; name: string } | null = null;
const settings = el<HTMLDialogElement>('settings'), info = el<HTMLDialogElement>('info'),worldSettings=el<HTMLDialogElement>('world-settings');
const toast = (message: string) => { el('toast').textContent = message; el('toast').hidden = false; clearTimeout(toastTimer); toastTimer = window.setTimeout(() => { el('toast').hidden = true; }, 3500); };
const fatal = (e: unknown) => { console.error(e); el('fatal').hidden = false; el('fatal-message').textContent = e instanceof Error ? e.message : '请检查网络或换用支持 WebGL2 的浏览器。'; };
const saveSettings = () => { try { const a=game.atmosphere?.state;localStorage.setItem('gulou-settings-v1', JSON.stringify({ quality: game.quality, character: game.character, outfit: game.outfit, volume: game.audio.volume, musicVolume: game.music.volume, musicEnabled: game.music.enabled, sensitivity: game.cameraRig.sensitivity,world:a?{hour:a.hour,autoTime:a.autoTime,cycleMinutes:a.cycleMinutes,weatherMode:a.weatherMode}:undefined })); } catch { /* Optional preferences. */ } };
function lockPointer() { if (touchDevice || !game.renderer.domElement.requestPointerLock) return; const r = game.renderer.domElement.requestPointerLock(); if (r) void r.catch(() => toast('也可以按住鼠标拖动视角，WASD 行走。')); }
function resume() { settings.close(); info.close();worldSettings.close(); mapDialog.close(); game.mode = 'playing'; el('resume').hidden = true; lockPointer(); }
function openSettings() { if (!entered) return; game.mode = 'paused'; game.player.clearInput(); document.exitPointerLock?.(); el('photo-panel').hidden = true; el('hud').hidden = uiHidden; settings.showModal(); el('view-toggle').textContent = game.cameraRig.firstPerson ? '第一人称 ⇄' : '第三人称 ⇄'; }
function togglePhoto() {
  if (!entered || settings.open || info.open||worldSettings.open||mapDialog.open) return;
  if (game.mode === 'photo') { el('photo-panel').hidden = true; el('hud').hidden = uiHidden; resume(); }
  else { game.mode = 'photo'; game.player.clearInput(); document.exitPointerLock?.(); el('photo-panel').hidden = false; el('hud').hidden = true; }
}

async function boot() {
  const { Game } = await import('./game/game.ts');
  game = new Game(el('viewport')); game.onNotice = toast; game.music.onError = toast;
  el<HTMLSelectElement>('quality').value = game.quality;
  try {
    const s = JSON.parse(localStorage.getItem('gulou-settings-v1') ?? '{}');
    if (s.character === 'male' || s.character === 'female') { game.character = s.character; el<HTMLSelectElement>('character-style').value = s.character; }
    if (['campus', 'forest', 'warm'].includes(s.outfit)) { game.outfit = s.outfit; el<HTMLSelectElement>('outfit-style').value = s.outfit; }
    if (['high', 'medium', 'low'].includes(s.quality)) { game.setQuality(s.quality); el<HTMLSelectElement>('quality').value = s.quality; }
    if (typeof s.musicVolume === 'number') game.music.setVolume(s.musicVolume);
    if (typeof s.musicEnabled === 'boolean') game.music.enabled = s.musicEnabled;
    if (typeof s.volume === 'number' && s.volume >= 0 && s.volume <= 1) { game.audio.setVolume(s.volume); el<HTMLInputElement>('volume').value = String(s.volume * 100); }
    if (typeof s.sensitivity === 'number' && s.sensitivity >= .0004 && s.sensitivity <= .004) { game.cameraRig.sensitivity = s.sensitivity; el<HTMLInputElement>('sensitivity').value = String(s.sensitivity / .00042); }
  } catch { /* Use defaults for unavailable or invalid storage. */ }
  await game.init((p, label) => { el('loading-bar').style.width = `${p * 100}%`; el('loading-percent').textContent = `${Math.round(p * 100)}%`; el('loading-text').textContent = label; });
  try{const saved=JSON.parse(localStorage.getItem('gulou-settings-v1')??'{}').world;if(saved){const a=game.atmosphere.state;if(typeof saved.autoTime==='boolean')a.autoTime=saved.autoTime;if([6,12,24].includes(saved.cycleMinutes))a.cycleMinutes=saved.cycleMinutes;if(!a.autoTime&&Number.isFinite(saved.hour))a.setHour(saved.hour);if(['clear','rain','random'].includes(saved.weatherMode))a.setWeather(saved.weatherMode);}}catch{/* Use defaults. */}
  el<HTMLButtonElement>('enter').disabled = false; el('enter-label').textContent = '进入校园';
  el('enter').onclick = () => {
    entered = true; game.music.start(); el('welcome').hidden = true; el('hud').hidden = false; game.mode = 'playing'; lockPointer(); void game.audio.start().catch(() => toast('环境声暂不可用，可继续漫步。'));
    toast(touchDevice ? '左手摇杆移动，右手拖动画面。地图里可以传送。' : '欢迎回来。F 起飞 · V 切换视角 · M 地图与传送');
  };
  const canvas = game.renderer.domElement;
  touchControls = new TouchControls(game.player, game.cameraRig, canvas);
  el('touch-view').onclick = () => game.cameraRig.toggle();
  el('touch-fly').onclick = () => { if (game.mode === 'playing') game.toggleFlight(); };
  canvas.addEventListener('click', () => { if (entered && game.mode !== 'photo' && !settings.open && !info.open&&!worldSettings.open&&!mapDialog.open) resume(); });
  canvas.addEventListener('pointerdown', e => { if (e.button === 0 && e.pointerType === 'mouse') dragging = true; });
  window.addEventListener('pointerup', () => { dragging = false; });
  window.addEventListener('mousemove', e => { if (entered && !settings.open && !info.open&&!worldSettings.open&&!mapDialog.open && (document.pointerLockElement === canvas || dragging)) game.cameraRig.look(e.movementX, e.movementY); });
  canvas.addEventListener('wheel', e => { if (!game.cameraRig.firstPerson) game.cameraRig.distance = Math.max(1.2, Math.min(8, game.cameraRig.distance + e.deltaY * .003)); }, { passive: true });
  document.addEventListener('pointerlockchange', () => { if (!document.pointerLockElement && game.mode === 'playing') { game.mode = 'paused'; game.player.clearInput(); el('resume').hidden = false; } });
  window.addEventListener('blur', () => { game.player.clearInput(); if (game.mode === 'playing') { game.mode = 'paused'; el('resume').hidden = false; } });
  window.addEventListener('keydown', e => {
    if (!entered || (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement)) return;
    if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
    if (e.code === 'Escape') { if (game.mode === 'photo') togglePhoto(); else if (!settings.open && !info.open&&!worldSettings.open&&!mapDialog.open) openSettings(); return; }
    if (settings.open || info.open||worldSettings.open||mapDialog.open) return;
    if (e.repeat) return;
    game.player.keys.add(e.code);
    if (e.code === 'KeyM') el('map-open').click();
    if (e.code === 'KeyT') el('world-open').click();
    if (e.code === 'KeyV') { game.cameraRig.toggle(); toast(game.cameraRig.firstPerson ? '第一人称' : '第三人称'); }
    if (e.code === 'KeyP') togglePhoto();
    if(e.code==='KeyF'&&game.mode==='playing')game.toggleFlight();
    if (e.code === 'KeyH') { uiHidden = !uiHidden; if (game.mode !== 'photo') el('hud').hidden = uiHidden; if (uiHidden) toast('界面已隐藏，按 H 恢复。'); }
    if (e.code === 'KeyE') interact();
    if (e.code === 'KeyR' && game.mode === 'playing' && game.football.nearby) game.football.resetBall();
    if (e.code === 'Backquote' && import.meta.env.DEV) el('debug').hidden = !el('debug').hidden;
  });
  window.addEventListener('keyup', e => game.player.keys.delete(e.code));
  el('resume').onclick = resume; el('settings-open').onclick = openSettings; el('photo-open').onclick = togglePhoto; el('photo-close').onclick = togglePhoto;
  el('settings-resume').onclick = resume;
  el('flight-toggle').onclick=()=>{if(game.mode==='paused')resume();if(game.mode==='playing')game.toggleFlight();};
  const syncWorld=()=>{
    const a=game.atmosphere.state;el('time-value').textContent=a.clock;el<HTMLInputElement>('time-slider').value=String(a.hour);el<HTMLInputElement>('auto-time').checked=a.autoTime;el<HTMLSelectElement>('cycle-speed').value=String(a.cycleMinutes);el('weather-value').textContent=a.weatherLabel;
    worldSettings.querySelectorAll<HTMLButtonElement>('[data-weather]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.weather===a.weatherMode)));
  };
  el('world-open').onclick=()=>{game.mode='paused';game.player.clearInput();document.exitPointerLock?.();syncWorld();worldSettings.showModal();};
  el('world-resume').onclick=resume;worldSettings.addEventListener('close',()=>{if(game.mode==='paused')el('resume').hidden=false;});
  el<HTMLInputElement>('time-slider').oninput=e=>{game.setTime(Number((e.target as HTMLInputElement).value));syncWorld();saveSettings();};
  worldSettings.querySelectorAll<HTMLButtonElement>('[data-hour]').forEach(button=>button.onclick=()=>{game.setTime(Number(button.dataset.hour));syncWorld();saveSettings();});
  el<HTMLInputElement>('auto-time').onchange=e=>{game.atmosphere.state.autoTime=(e.target as HTMLInputElement).checked;saveSettings();};
  el<HTMLSelectElement>('cycle-speed').onchange=e=>{game.atmosphere.state.cycleMinutes=Number((e.target as HTMLSelectElement).value);saveSettings();};
  worldSettings.querySelectorAll<HTMLButtonElement>('[data-weather]').forEach(button=>button.onclick=()=>{game.atmosphere.state.setWeather(button.dataset.weather as WeatherMode);syncWorld();saveSettings();});
  el('world-reset').onclick=()=>{const a=game.atmosphere.state;a.setHour(15,false);a.autoTime=true;a.cycleMinutes=12;a.setWeather('random');a.targetRain=0;syncWorld();saveSettings();};
  settings.addEventListener('close', () => { if (game.mode === 'paused') { el('resume').hidden = false; } });
  info.addEventListener('close', () => { el('resume').hidden = false; });
  el('reset').onclick = () => { game.player.reset(); game.cameraRig.reset(); toast('已回到北大楼前。'); };
  el('view-toggle').onclick = () => { game.cameraRig.toggle(); el('view-toggle').textContent = game.cameraRig.firstPerson ? '第一人称 ⇄' : '第三人称 ⇄'; };
  el<HTMLSelectElement>('character-style').onchange = async e => {
    const select = e.target as HTMLSelectElement, kind = select.value === 'female' ? 'female' : 'male'; select.disabled = true;
    try { await game.setCharacter(kind); saveSettings(); } catch { select.value = game.character; toast('角色暂时没有加载成功，请稍后重试。'); } finally { select.disabled = false; }
  };
  el<HTMLSelectElement>('quality').onchange = e => { game.setQuality((e.target as HTMLSelectElement).value as Quality); saveSettings(); };
  el<HTMLSelectElement>('outfit-style').onchange = e => { game.setOutfit((e.target as HTMLSelectElement).value as OutfitStyle); saveSettings(); };
  el<HTMLInputElement>('volume').oninput = e => { game.audio.setVolume(Number((e.target as HTMLInputElement).value) / 100); saveSettings(); };
  el<HTMLInputElement>('sensitivity').oninput = e => { game.cameraRig.sensitivity = Number((e.target as HTMLInputElement).value) * .00042; saveSettings(); };
  el<HTMLInputElement>('hide-avatar').onchange = e => { game.photoHideAvatar = (e.target as HTMLInputElement).checked; };
  el<HTMLInputElement>('photo-fov').oninput = e => { game.photoFov = Number((e.target as HTMLInputElement).value); };
  el('save-photo').onclick = async () => { const button = el<HTMLButtonElement>('save-photo'); button.disabled = true; button.textContent = '正在生成照片…'; try { await game.savePhoto(); toast('高清照片已保存。'); } catch (e) { toast(e instanceof Error ? e.message : String(e)); } finally { button.disabled = false; button.textContent = '保存照片 ↓'; } };
  mapView = new CampusMapView(el<HTMLCanvasElement>('map-canvas'), game.world.map, el('map-selection'));
  el('map-open').onclick = () => { game.mode = 'paused'; game.player.clearInput(); document.exitPointerLock?.(); mapDialog.showModal(); };
  el('map-resume').onclick = resume; mapDialog.addEventListener('close', () => { if (game.mode === 'paused') el('resume').hidden = false; });
  mapDialog.querySelectorAll<HTMLButtonElement>('[data-map-region]').forEach(button => button.onclick = () => { mapView.setRegion(button.dataset.mapRegion!); mapDialog.querySelectorAll('[data-map-region]').forEach(b => b.setAttribute('aria-pressed', String(b === button))); });
  const syncMusic = () => {
    const select = el<HTMLSelectElement>('music-track'); select.replaceChildren();
    game.music.tracks.forEach((track, i) => select.add(new Option(`${track.title}${track.artist ? ' · ' + track.artist : ''}`, String(i))));
    if (!game.music.tracks.length) select.add(new Option('导入你喜欢的音乐', ''));
    select.value = String(game.music.index); select.disabled = !game.music.tracks.length;
    el('music-toggle').textContent = game.music.enabled && !game.music.audio.paused ? '暂停' : '播放';
    el<HTMLInputElement>('music-volume').value = String(game.music.volume * 100);
  };
  game.music.onChange = syncMusic; syncMusic();
  el('music-toggle').onclick = () => { if (game.music.enabled && game.music.audio.paused) game.music.start(); else game.music.toggle(); saveSettings(); };
  el('music-next').onclick = () => game.music.next();
  el<HTMLSelectElement>('music-track').onchange = e => game.music.select(Number((e.target as HTMLSelectElement).value));
  el<HTMLInputElement>('music-volume').oninput = e => { game.music.setVolume(Number((e.target as HTMLInputElement).value) / 100); saveSettings(); };
  el<HTMLInputElement>('music-files').onchange = e => game.music.import(Array.from((e.target as HTMLInputElement).files ?? []));
  const { benchLocations,campusPlaces,bounds,travelPlaces } = await import('./world/world.ts');
  travelPlaces.forEach((place, i) => el<HTMLSelectElement>('travel-place').add(new Option(place.name, String(i))));
  const travel = (x: number, z: number, name: string, yaw = game.cameraRig.yaw, pitch?: number, firstPerson?: boolean, photoFov?: number) => {
    if (game.world.sectors < 3) { el('map-selection').textContent = '校园区域正在加载，请稍候再传送。'; return; }
    const target = game.player.travelTo(x, z);
    if (!target) { el('map-selection').textContent = '这个位置暂时无法站立，请换一个位置。'; return; }
    game.cameraRig.reset(); game.cameraRig.yaw = yaw; if (pitch !== undefined) game.cameraRig.pitch = pitch; if (firstPerson !== undefined) game.cameraRig.firstPerson = firstPerson; if (photoFov !== undefined) { game.photoFov = photoFov; el<HTMLInputElement>('photo-fov').value = String(photoFov); } resume();
    toast(`已抵达${name}${target.y > 3 ? ' · 屋顶' : ''}${target.adjusted ? '附近的安全落点' : ''}`);
  };
  mapView.onSelect = (x, z, name) => { selectedMapPoint = { x, z, name }; el<HTMLButtonElement>('map-teleport').disabled = false; };
  el('map-teleport').onclick = () => { if (selectedMapPoint) travel(selectedMapPoint.x, selectedMapPoint.z, selectedMapPoint.name); };
  el('travel-place-go').onclick = () => { const value = el<HTMLSelectElement>('travel-place').value; if (value === '') return; const p = travelPlaces[Number(value)]; if (p) travel(p.x, p.z, p.name, p.yaw, p.pitch, p.firstPerson, p.photoFov); };
  el('football-reset').onclick = () => game.football.resetBall();
  el('football-help').textContent = touchDevice ? '靠近球点踢球 · 快走时可加力' : '靠近球按 E 踢球 · Shift 加力 · R 回球';
  if (!touchDevice) el('football-reset').setAttribute('aria-keyshortcuts', 'R');
  function interact() {
    if(game.mode !== 'playing' || game.player.flying)return;
    if (game.football.inReach) { game.football.kick(game.cameraRig.yaw, game.player.keys.has('ShiftLeft') || game.player.keys.has('ShiftRight')); return; }
    if (game.player.seated) { game.player.seated = false; game.player.teleport(game.player.position.x, .03, game.player.position.z - 1); return; }
    const bench = benchLocations.find(p => p.distanceTo(game.player.position) < 2.4);
    if (bench && game.world.sectors >= 3) { game.player.teleport(bench.x, .03, bench.z); game.player.seated = true; game.player.avatar.root.rotation.y = 0; toast('坐一会儿。按 E 起身。'); }
    else {
      const place=campusPlaces.find(p=>Math.hypot(game.player.position.x-p.x,game.player.position.z-p.z)<5.5);
      if(place){el('info-title').textContent=place.name;const paragraphs=info.querySelectorAll('p');paragraphs[0].textContent=place.description;paragraphs[1].textContent='沿着树荫和道路继续走，还会遇见更多熟悉的地方。';const link=info.querySelector('a')!;link.href=place.name==='北大楼'?'https://zh.wikipedia.org/wiki/北大楼':'https://vr.nju.edu.cn/';game.mode='paused';game.player.clearInput();document.exitPointerLock?.();info.showModal();}
    }
  }
  el('interact').onclick = interact;
  game.onTick = () => {
    touchControls?.update(game.mode === 'playing' && !uiHidden, game.player.flying);
    if (++tick % 15) return;
    const pos = game.player.position, onBench = game.player.seated || (game.world.sectors >= 3 && benchLocations.some(p => p.distanceTo(pos) < 2.4));
    const nearBuilding = campusPlaces.find(p=>Math.hypot(pos.x-p.x,pos.z-p.z)<5.5);
    el('interact').hidden = game.player.flying||game.mode !== 'playing' || (!onBench && !nearBuilding && !game.football.canKick);
    el('interact').querySelector('span')!.textContent = game.football.canKick ? '踢球' : game.player.seated ? '起身' : onBench ? '坐一会儿' : `认识${nearBuilding?.name??'校园'}`;
    el('location-name').textContent = game.player.flying ? (pos.z > 365 ? '南园上空' : '北园上空') : nearBuilding?.name ?? (pos.z > 365 ? '南园 · 宿舍与生活区' : pos.z > 328 ? '汉口路校门' : pos.z > 152 && Math.abs(pos.x + 88) < 18 ? '中大路' : pos.z > 116 && pos.x < -18 ? '教学楼 · 两江路' : pos.x < -145 ? '北园 · 西侧校园' : pos.z > 86 && pos.x < -15 ? '大礼堂' : pos.x > 34 && pos.z > 18 && pos.z < 81 ? '东大楼' : pos.x < -34 && pos.z > 18 && pos.z < 81 ? '西大楼' : pos.z < -12 ? '北园 · 北大楼后' : '北大楼');
    el('football-hud').hidden = !game.football.nearby || game.mode !== 'playing'; el('football-score').textContent = String(game.football.goals);
    if (mapDialog.open) mapView.update(pos.x, pos.z, game.cameraRig.yaw);
    const a=game.atmosphere.state;el('clock-chip').textContent=`${a.clock} · ${a.weatherLabel}`;el('welcome-atmosphere').textContent=`北大楼 · ${a.clock} · ${a.weatherLabel}`;
    if(worldSettings.open)el('weather-value').textContent=a.weatherLabel;
    el('flight-label').textContent=game.player.flying?'降落 F':'起飞 F';el('flight-hud').hidden=!game.player.flying;el('flight-state').textContent=game.player.flightState==='launching'?'正在起飞':game.player.flightState==='landing'?'正在降落':'滑翔中';el('flight-altitude').textContent=`${Math.round(pos.y)} m`;
    el('boundary-hint').hidden=!(pos.x<bounds.minX+12||pos.x>bounds.maxX-12||pos.z<bounds.minZ+12||pos.z>bounds.maxZ-12);
    el('compass-arrow').style.transform = `rotate(${-game.cameraRig.yaw * 180 / Math.PI - 8.2}deg)`;
    if (!el('debug').hidden) { const s = game.stats(); el('debug-stats').textContent = `FPS             ${s.fps}\nFrame           ${s.frameMs} ms\nCPU submission  ${s.cpuMs} ms\nGPU             ${s.gpuMs ?? 'unavailable'} ms\nTriangles       ${s.triangles.toLocaleString()}\nDraw calls      ${s.drawCalls}\nTextures        ${s.textures}\nPosition        ${s.position.map(n => n.toFixed(1)).join(', ')}\nLoaded sectors  ${s.sectors}/3\nQuality         ${s.quality}\nReady           ${s.readyMs} ms`; }
  };
  el('debug-reset').onclick = () => { game.player.reset(); game.cameraRig.reset(); };
  el('debug-noclip').onclick = () => { game.player.noclip = !game.player.noclip; el('debug-noclip').textContent = `Noclip: ${game.player.noclip ? 'on' : 'off'}`; };
  el('debug-front').onclick = () => game.player.teleport(0, .03, 24);
  el<HTMLInputElement>('debug-time').oninput = e => game.setTime(Number((e.target as HTMLInputElement).value));
  if (import.meta.env.DEV || new URLSearchParams(location.search).get('debug') === '1') {
    Object.assign(window, { __GULOU__: { stats: () => game.stats(), teleport: (x: number, y: number, z: number) => game.player.teleport(x, y, z), game } });
  }
}
void boot().catch(fatal);
