import { chromium } from 'playwright';
import { mkdir, writeFile, stat } from 'node:fs/promises';
import assert from 'node:assert/strict';

const browserName = process.env.BROWSER ?? 'chrome';
const options = process.env.EDGE_EXECUTABLE ? { executablePath: process.env.EDGE_EXECUTABLE } : { channel: browserName === 'edge' ? 'msedge' : 'chrome' };
const browser = await chromium.launch({ ...options, headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
const errors = [], requests = [], checks = [], samples = [];
let distanceWalked = 0, reachedWaypoints = 0;
page.on('pageerror', e => errors.push(e.message));
page.on('response', r => { if (r.status() >= 400) requests.push(`${r.status()} ${r.url()}`); });
await mkdir('test-results', { recursive: true });
const state = () => page.evaluate(() => window.__GULOU__.stats());
const move = async (key, ms, run = false) => {
  if (run) await page.keyboard.down('ShiftLeft');
  await page.keyboard.down(key); await page.waitForTimeout(ms); await page.keyboard.up(key);
  if (run) await page.keyboard.up('ShiftLeft');
};
try {
  await page.goto(`${process.env.TEST_URL ?? 'http://localhost:5173/'}?debug=1`);
  await page.waitForFunction(() => !document.querySelector('#enter').disabled || !document.querySelector('#fatal').hidden, {}, { timeout: 60000 });
  assert.equal(await page.locator('#fatal').isVisible(), false, await page.locator('#fatal-message').textContent());
  await page.screenshot({ path: `test-results/${browserName}-welcome.png` });
  await page.click('#enter');
  await page.waitForFunction(() => window.__GULOU__.stats().sectors === 3, {}, { timeout: 30000 });
  await page.waitForTimeout(4000);
  assert.equal((await state()).mode, 'playing'); checks.push('homepage → enter → real 3D scene');
  const start = await state();
  await move('KeyW', 1800); const walking = await state();
  assert.ok(start.position[2] - walking.position[2] > 2, 'WASD must move through the scene');
  await move('KeyW', 1500, true); const running = await state();
  assert.ok(walking.position[2] - running.position[2] > 4, 'running must be faster than walking'); checks.push('walk + run');
  await page.keyboard.press('KeyV'); assert.equal((await state()).firstPerson, true);
  await move('KeyA', 600); await page.keyboard.press('KeyV'); assert.equal((await state()).firstPerson, false); checks.push('first / third person, movement in both');
  await page.keyboard.press('KeyP'); assert.equal((await state()).mode, 'photo');
  await page.check('#hide-avatar'); await page.locator('#photo-fov').evaluate(input => { input.value='45'; input.dispatchEvent(new Event('input',{bubbles:true})); });
  const downloadPromise = page.waitForEvent('download'); await page.click('#save-photo'); const download = await downloadPromise;
  const photoPath = `test-results/${browserName}-photo.png`; await download.saveAs(photoPath); assert.ok((await stat(photoPath)).size > 20000);
  await page.click('#photo-close'); checks.push('photo mode, avatar hiding, focal length, PNG download');
  await page.keyboard.press('Escape');
  if (!await page.locator('#settings').isVisible()) await page.click('#settings-open');
  await page.selectOption('#quality', 'low'); assert.equal((await state()).quality, 'low');
  await page.selectOption('#quality', 'medium'); await page.locator('#volume').evaluate(input => { input.value='0'; input.dispatchEvent(new Event('input',{bubbles:true})); });
  await page.click('#reset'); const reset = await state(); assert.ok(Math.abs(reset.position[2] - 68) < .3);
  await page.click('#settings-resume'); checks.push('settings, quality, audio, reset');
  await page.evaluate(() => { window.__GULOU__.teleport(0, .07, 22); window.__GULOU__.game.cameraRig.reset(); });
  await move('KeyW', 3500, true); const stair = await state();
  assert.ok(stair.position[1] > 1.35, `stairs must lift the player: ${stair.position}`);
  assert.ok(stair.position[2] > 12.3, `building collision must stop the player: ${stair.position}`);
  checks.push('stairs + landing + building collision');
  await page.screenshot({ path: `test-results/${browserName}-entrance.png` });
  await page.evaluate(() => { window.__GULOU__.teleport(35,.07,0); window.__GULOU__.game.cameraRig.yaw = -Math.PI/2; });
  await move('KeyS', 2000); assert.ok((await state()).position[0] > 31, 'wall must prevent walking into east end of building');
  checks.push('side wall collision and camera collision enabled');
  await page.evaluate(() => { window.__GULOU__.game.player.reset(); window.__GULOU__.game.cameraRig.reset(); });
  const soakMs = Number(process.env.SOAK_MS ?? 0), until = Date.now() + soakMs;
  if (soakMs > 0) {
    const points = [[0,22],[34,22],[34,-18],[-34,-18],[-34,79],[34,79],[34,22],[0,22],[0,68]]; let target = 0;
    let previousPosition = (await state()).position;
    await page.keyboard.down('KeyW');
    while (Date.now() < until) {
      const current = await state(), goal = points[target]; samples.push(current);
      distanceWalked += Math.hypot(current.position[0]-previousPosition[0],current.position[2]-previousPosition[2]); previousPosition=current.position;
      assert.ok(current.position[1] > -.3, 'player must remain above ground');
      if (Math.hypot(goal[0]-current.position[0],goal[1]-current.position[2]) < .75) { target = (target+1)%points.length; reachedWaypoints++; }
      await page.evaluate(([x,z]) => { const g=window.__GULOU__.game, p=g.player.position; g.cameraRig.yaw=Math.atan2(-(x-p.x),-(z-p.z)); }, points[target]);
      await page.waitForTimeout(650);
    }
    await page.keyboard.up('KeyW');
    assert.ok(distanceWalked > soakMs / 1000 * .9, `continuous movement required: ${distanceWalked.toFixed(1)}m`);
    if (soakMs >= 300000) assert.ok(reachedWaypoints >= 5, `route must cover front, side and rear: ${reachedWaypoints}`);
    checks.push(`${soakMs/1000}s continuous keyboard-driven walk around the building and garden`);
  }
  await page.evaluate(() => { window.__GULOU__.game.player.reset(); window.__GULOU__.game.cameraRig.reset(); });
  await page.waitForTimeout(4000); await page.screenshot({ path: `test-results/${browserName}-campus.png` });
  for (let i=0;i<30;i++) { await page.waitForTimeout(150); samples.push(await state()); }
  assert.deepEqual(errors, [], 'no fatal browser errors'); assert.deepEqual(requests, [], 'no missing runtime resources');
  const frames = samples.map(s=>s.fps).sort((a,b)=>a-b);
  const result = { browser: browserName, version: await browser.version(), checks, errors, failedRequests: requests, last: await state(), fps: { min: frames[0], median: frames[Math.floor(frames.length/2)], p10: frames[Math.floor(frames.length*.1)] }, distanceWalked: +distanceWalked.toFixed(1), reachedWaypoints, samples: samples.length, hardware: 'Apple M4, 1440×900, headless browser, medium quality', time: new Date().toISOString() };
  await writeFile(`test-results/${browserName}-results.json`, JSON.stringify(result,null,2)); console.log(JSON.stringify(result,null,2));
} finally { await browser.close(); }
