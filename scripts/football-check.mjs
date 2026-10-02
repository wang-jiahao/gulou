import { chromium, devices } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';

const url = `${process.env.TEST_URL ?? 'http://localhost:4173/'}?debug=1`;
const channel = process.env.BROWSER === 'edge' ? 'msedge' : 'chrome';
const browser = await chromium.launch({ channel });
const errors = [], missing = [], checks = [];
await mkdir('docs/validation/phase7', { recursive: true });
await mkdir('docs/images', { recursive: true });
const p = await browser.newPage({ viewport: { width: 1440, height: 900 } });
let activePage = p;
const state = () => p.evaluate(() => window.__GULOU__.stats());
const watch = page => {
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('response', r => { if (r.status() >= 400) missing.push(`${r.status()} ${r.url()}`); });
};
const enter = async page => {
  await page.goto(url);
  await page.waitForFunction(() => window.__GULOU__ && !document.querySelector('#enter').disabled);
  await page.locator('#enter').click();
  await page.waitForFunction(() => window.__GULOU__.stats().sectors === 3);
  await page.evaluate(() => {
    const g = window.__GULOU__.game;
    g.setTime(15); g.atmosphere.state.autoTime = false; g.atmosphere.state.setWeather('clear');
  });
};
const resetNearBall = () => p.evaluate(() => {
  const g = window.__GULOU__.game, f = g.football, c = f.pitch;
  g.player.travelTo(c.x, c.z + 5); f.resetBall();
  g.player.travelTo(c.x + 1.1 * Math.sin(c.angle), c.z + 1.1 * Math.cos(c.angle));
  g.cameraRig.yaw = c.angle; g.cameraRig.pitch = .05;
});
const shot = (end, x, y, distance = 1.6, speed = 8) => p.evaluate(({ end, x, y, distance, speed }) => {
  const g = window.__GULOU__.game, f = g.football, c = f.pitch, a = c.angle;
  const z = end * (c.length / 2 - distance);
  f.resetBall();
  f.body.setTranslation({ x: c.x + x * Math.cos(a) + z * Math.sin(a), y: c.groundY + y, z: c.z - x * Math.sin(a) + z * Math.cos(a) }, true);
  f.body.setLinvel({ x: end * Math.sin(a) * speed, y: 0, z: end * Math.cos(a) * speed }, true);
}, { end, x, y, distance, speed });
const waitForReset = () => p.waitForFunction(() => {
  const f = window.__GULOU__.game.football, p = f.position;
  return Math.hypot(p.x - f.pitch.x, p.z - f.pitch.z) < 6;
}, {}, { timeout: 4500 });
watch(p);
try {
  await enter(p);
  await p.keyboard.press('KeyM');
  await p.selectOption('#travel-place', { label: '苏浙运动场' });
  await p.click('#travel-place-go');
  await p.locator('#football-hud').waitFor({ state: 'visible' });
  await p.keyboard.down('KeyW');
  await p.waitForFunction(() => window.__GULOU__.stats().football.canKick, {}, { timeout: 7000 });
  await p.keyboard.up('KeyW');
  const before = (await state()).football.ball;
  await p.keyboard.press('KeyE');
  await p.keyboard.press('KeyE');
  await p.waitForTimeout(500);
  let s = await state();
  assert.equal(s.football.kicks, 1);
  assert.ok(Math.hypot(s.football.ball[0] - before[0], s.football.ball[2] - before[2]) > 1.5);
  checks.push('walk to ball, E moves rigid body, repeated kick respects cooldown');

  await p.keyboard.press('KeyT');
  await p.waitForFunction(() => window.__GULOU__.stats().football.paused);
  const paused = (await state()).football.ball;
  await p.waitForTimeout(700);
  assert.ok((await state()).football.ball.every((n, i) => Math.abs(n - paused[i]) < .001));
  assert.equal((await state()).football.canKick, false);
  await p.click('#world-resume');
  await p.waitForTimeout(300);
  s = await state();
  assert.ok(Math.hypot(s.football.ball[0] - paused[0], s.football.ball[2] - paused[2]) > .1);
  checks.push('menu freezes ball, disables kick, and restores velocity on resume');

  // Landing above a ball must not offer an interaction through a roof/floor.
  const reach = await p.evaluate(() => {
    const g = window.__GULOU__.game, f = g.football;
    f.resetBall(); g.player.teleport(f.position.x, 8, f.position.z);
    return { nearby: f.nearby, inReach: f.inReach, kicked: f.kick(0, false) };
  });
  assert.deepEqual(reach, { nearby: false, inReach: false, kicked: false });
  await resetNearBall();
  await p.waitForFunction(() => window.__GULOU__.stats().football.canKick);
  await p.keyboard.press('KeyP');
  await p.waitForFunction(() => window.__GULOU__.stats().football.paused);
  const kicks = (await state()).football.kicks;
  await p.keyboard.press('KeyE');
  assert.equal((await state()).mode, 'photo');
  assert.equal((await state()).football.kicks, kicks);
  assert.equal(await p.locator('#info').isVisible(), false);
  await p.click('#photo-close');
  checks.push('no kick from above the pitch or while taking a photo');

  // A ball touching the line is not yet a goal: all of it must cross.
  await shot(-1, 0, .23, -.085, 0);
  await p.waitForTimeout(250);
  assert.equal((await state()).football.goals, 0);
  await p.evaluate(() => {
    const f = window.__GULOU__.game.football, a = f.pitch.angle;
    f.body.setLinvel({ x: -Math.sin(a) * 3, y: 0, z: -Math.cos(a) * 3 }, true);
  });
  await p.waitForFunction(() => window.__GULOU__.stats().football.goals === 1);
  await waitForReset();
  assert.equal((await state()).football.goals, 1);
  await shot(1, 0, .23);
  await p.waitForFunction(() => window.__GULOU__.stats().football.goals === 2);
  await waitForReset();
  assert.equal((await state()).football.goals, 2);
  checks.push('whole ball must cross; both goals count once and reset to midfield');

  for (const end of [-1, 1]) {
    for (const [x, y] of [[5, .23], [0, 3.6], [3.66, .23]]) {
      await shot(end, x, y);
      await p.waitForTimeout(800);
      assert.equal((await state()).football.goals, 2, `miss/post must not score: ${end},${x},${y}`);
    }
  }
  checks.push('wide shots, high shots and post strikes do not score at either end');
  // Exit over a touchline; teleporting from midfield through a goal would
  // itself represent a goal-line crossing to the motion detector.
  await shot(1, 50, .23, 45, 0);
  await waitForReset();
  assert.equal((await state()).football.goals, 2);
  checks.push('out-of-bounds ball returns without a goal');

  await resetNearBall();
  await p.waitForFunction(() => window.__GULOU__.stats().football.canKick);
  await p.keyboard.down('ShiftLeft');
  await p.keyboard.press('KeyE');
  await p.keyboard.up('ShiftLeft');
  await p.waitForTimeout(100);
  assert.equal((await state()).football.kicks, 2);
  const strongSpeed = await p.evaluate(() => {
    const v = window.__GULOU__.game.football.body.linvel(); return Math.hypot(v.x, v.z);
  });
  assert.ok(strongSpeed > 10, 'Shift produces a stronger shot');
  await p.keyboard.press('KeyR');
  await waitForReset();
  assert.equal((await state()).football.goals, 2);
  checks.push('Shift powers the shot; R retrieves ball under pointer lock and preserves score');
  await resetNearBall();
  await p.waitForFunction(() => window.__GULOU__.stats().football.canKick);
  await p.waitForFunction(() => document.querySelector('#toast').hidden);
  await p.locator('#interact').filter({ hasText: '踢球' }).waitFor({ state: 'visible' });
  await p.screenshot({ path: 'docs/images/football.png' });
  const desktop = await state();
  await p.close();

  const context = await browser.newContext({ ...devices['Pixel 7'], viewport: { width: 412, height: 915 } });
  const m = await context.newPage(); activePage = m; watch(m);
  await enter(m);
  await m.tap('#map-open');
  await m.selectOption('#travel-place', { label: '苏浙运动场' });
  await m.tap('#travel-place-go');
  await m.locator('#touch-stick').waitFor({ state: 'visible' });
  const cdp = await context.newCDPSession(m), box = await m.locator('#touch-stick').boundingBox();
  const x = box.x + box.width / 2, y = box.y + box.height / 2;
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ id: 1, x, y }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ id: 1, x, y: y - 35 }] });
  await m.waitForFunction(() => window.__GULOU__.stats().football.canKick, {}, { timeout: 8000 });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await m.tap('#touch-run');
  await m.locator('#interact').filter({ hasText: '踢球' }).waitFor({ state: 'visible' });
  await m.tap('#interact');
  await m.waitForFunction(() => window.__GULOU__.stats().football.kicks === 1);
  assert.ok(await m.locator('#football-hud').isVisible());
  assert.ok(await m.evaluate(() => {
    const v = window.__GULOU__.game.football.body.linvel(); return Math.hypot(v.x, v.z) > 10;
  }));
  checks.push('touch joystick approach, fast-walk toggle, tap for a strong kick');
  await m.tap('#touch-run');
  await m.tap('#football-reset');
  await m.waitForFunction(() => {
    const f = window.__GULOU__.game.football, p = f.position;
    return Math.hypot(p.x - f.pitch.x, p.z - f.pitch.z) < 6;
  });
  await m.evaluate(() => {
    const g = window.__GULOU__.game, f = g.football, a = f.pitch.angle, p = f.position;
    g.player.travelTo(p.x + 1.1 * Math.sin(a), p.z + 1.1 * Math.cos(a));
    g.cameraRig.yaw = a; g.cameraRig.pitch = .05;
  });
  await m.waitForFunction(() => window.__GULOU__.stats().football.canKick);
  await m.locator('#interact').filter({ hasText: '踢球' }).waitFor({ state: 'visible' });
  await m.waitForFunction(() => document.querySelector('#toast').hidden);
  await m.screenshot({ path: 'docs/images/mobile-football.png' });
  const mobile = await m.evaluate(() => window.__GULOU__.stats());
  assert.deepEqual(errors, []); assert.deepEqual(missing, []);
  const report = { version: '0.6.0', time: new Date().toISOString(), browser: channel, browserVersion: await browser.version(), device: 'Apple M4; Pixel 7 is viewport/touch emulation, not physical-phone performance', checks, errors, missing, desktop, mobile };
  await writeFile('docs/validation/phase7/football.json', JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ checks, errors, missing, goals: desktop.football.goals }));
} catch (e) {
  if (!activePage.isClosed()) {
    console.log('STATE', await activePage.evaluate(() => window.__GULOU__?.stats()).catch(() => null), errors, missing);
    await activePage.screenshot({ path: 'docs/validation/phase7/failure.png' });
  }
  throw e;
} finally { await browser.close(); }
