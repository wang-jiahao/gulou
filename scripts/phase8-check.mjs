import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import { mkdir, writeFile } from 'node:fs/promises';

const base = process.env.TEST_URL ?? 'http://localhost:4173/';
const browser = await chromium.launch({ channel: 'chrome' });
const errors = [], missing = [], checks = [];
await mkdir('docs/validation/phase8', { recursive: true });
await mkdir('docs/screenshots/phase8', { recursive: true });
const page = await browser.newPage({ viewport: { width: 1200, height: 800 } });
page.on('pageerror', e => errors.push(e.message));
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
page.on('response', r => { if (r.status() >= 400) missing.push(`${r.status()} ${r.url()}`); });
const ready = () => page.waitForFunction(() => window.__GULOU__ && !document.querySelector('#enter').disabled);
const state = () => page.evaluate(() => window.__GULOU__.stats());
try {
  await page.goto(`${base}?debug=1`); await ready(); await page.click('#enter');
  await page.waitForFunction(() => window.__GULOU__.stats().sectors === 3);
  await page.keyboard.press('Escape');
  if (!await page.locator('#settings').isVisible()) await page.click('#settings-open');
  const palettes = [];
  for (const style of ['forest', 'warm', 'campus']) {
    await page.selectOption('#outfit-style', style);
    assert.equal((await state()).outfit, style);
    palettes.push(await page.evaluate(() => [...window.__GULOU__.game.player.avatar.materials].find(m => m.name === 'student-cotton').color.getHex()));
  }
  assert.equal(new Set(palettes).size, 3);
  await page.selectOption('#outfit-style', 'warm');
  await page.selectOption('#character-style', 'female');
  await page.waitForFunction(() => window.__GULOU__.stats().character === 'female');
  assert.equal((await state()).outfit, 'warm');
  assert.equal(await page.evaluate(() => [...window.__GULOU__.game.player.avatar.materials].find(m => m.name === 'student-cotton').color.getHex()), 0xa5856b);
  await page.reload(); await ready();
  assert.equal((await state()).character, 'female'); assert.equal((await state()).outfit, 'warm');
  assert.equal(await page.locator('#outfit-style').inputValue(), 'warm');
  checks.push('three coordinated outfits alter materials; character change and reload preserve selection');
  await page.click('#enter'); await page.waitForFunction(() => window.__GULOU__.stats().sectors === 3);
  await page.keyboard.press('Escape');
  if (!await page.locator('#settings').isVisible()) await page.click('#settings-open');
  await page.selectOption('#outfit-style', 'campus');
  await page.click('#settings-resume');
  await page.evaluate(() => {
    const g = window.__GULOU__.game; g.player.travelTo(0, 60); g.cameraRig.yaw = Math.PI; g.cameraRig.pitch = -.01;
    g.cameraRig.distance = 4.8; g.setTime(14); g.atmosphere.state.autoTime = false; g.atmosphere.state.setWeather('clear');
  });
  await page.waitForTimeout(500);
  await page.keyboard.press('KeyP');
  await page.waitForFunction(() => document.querySelector('#toast').hidden);
  const photo = page.waitForEvent('download'); await page.click('#save-photo');
  await (await photo).saveAs('docs/images/character-campus.png');
  await page.click('#photo-close');

  // Replay the actual failure with the original near plane (.07 m). Nothing is
  // hidden from the scene; only the foundation's depth bias changes in the A/B check.
  await page.evaluate(() => {
    const g = window.__GULOU__.game; g.renderer.setAnimationLoop(null); g.mode = 'paused';
    g.player.avatar.root.visible = false; g.atmosphere.state.setHour(14); g.atmosphere.state.autoTime = false;
    g.atmosphere.state.setWeather('clear');
    document.querySelector('#hud').hidden = true; document.querySelector('#toast').hidden = true;
  });
  const render = async (height, pitch, corrected) => {
    await page.evaluate(({ height, pitch, corrected }) => {
      const g = window.__GULOU__.game;
      const foundation = g.world.root.getObjectByName('campus-foundation');
      foundation.material.polygonOffset = corrected;
      g.camera.near = .07; g.camera.fov = 72; g.camera.updateProjectionMatrix();
      g.camera.position.set(-200, height, 160);
      g.camera.lookAt(-200, height - Math.sin(pitch) * 100, 160 - Math.cos(pitch) * 100);
      g.camera.updateMatrixWorld(); g.atmosphere.update(0, false, g.camera.position);
      g.csm.updateFrustums(); g.csm.update(); g.renderer.render(g.scene, g.camera);
    }, { height, pitch, corrected });
    const png = await page.screenshot();
    const { data, info } = await sharp(png).removeAlpha().raw().toBuffer({ resolveWithObject: true });
    let green = 0;
    for (let i = 0; i < data.length; i += info.channels) if (data[i + 1] > data[i] * 1.12 && data[i + 1] > data[i + 2] * 1.3 && data[i + 1] > 35) green++;
    return { png, green };
  };
  const flight = [];
  for (const height of [30, 90, 130, 180]) for (const pitch of [.6, 1, 1.5]) {
    const before = await render(height, pitch, false), after = await render(height, pitch, true);
    assert.ok(after.green >= before.green * .98, `grass visibility at ${height}m/${pitch}`);
    flight.push({ height, pitch, beforeGreenPixels: before.green, afterGreenPixels: after.green });
    if (height === 180 && pitch === 1.5) {
      assert.ok(after.green - before.green > 35000, 'the reproduced pale bands must be replaced by visible grass');
      await writeFile('docs/screenshots/phase8/flight-before.png', before.png);
      await writeFile('docs/screenshots/phase8/flight-after.png', after.png);
      await sharp({ create: { width: 1800, height: 600, channels: 3, background: '#000' } }).composite([
        { input: await sharp(before.png).resize(900, 600).toBuffer(), left: 0, top: 0 },
        { input: await sharp(after.png).resize(900, 600).toBuffer(), left: 900, top: 0 },
      ]).jpeg({ quality: 90 }).toFile('docs/images/flight-depth-comparison.jpg');
    }
  }
  const stability = [];
  for (let i = 0; i < 7; i++) stability.push((await render(179.4 + i * .1, 1.5, true)).green);
  const variation = (Math.max(...stability) - Math.min(...stability)) / Math.min(...stability);
  assert.ok(variation < .03, `grass must not flash away during a small altitude change: ${variation}`);
  checks.push('12 aerial views from 30–180 m: pale foundation no longer replaces lawns');
  checks.push('reproduced 180 m failure recovers over 35000 grass pixels; altitude sweep remains stable');
  assert.deepEqual(errors, []); assert.deepEqual(missing, []);
  const result = { version: '0.7.0', time: new Date().toISOString(), browser: await browser.version(), hardware: 'Apple M4; 1200×800, medium quality', checks, palettes, flight, stability, variation, errors, missing };
  await writeFile('docs/validation/phase8/flight-wardrobe.json', JSON.stringify(result, null, 2));
  console.log(JSON.stringify({ checks, variation, errors, missing }));
} catch (e) { await page.screenshot({ path: 'docs/validation/phase8/failure.png' }); throw e; }
finally { await browser.close(); }
