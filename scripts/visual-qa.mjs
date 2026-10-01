import { chromium } from 'playwright';
import { writeFile, mkdir, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';

await mkdir('docs/screenshots', { recursive: true });
await mkdir('docs/validation', { recursive: true });
const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
const cdp = await page.context().newCDPSession(page);
try {
  await cdp.send('Network.enable');
  await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
  await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 50, downloadThroughput: 30_000_000 / 8, uploadThroughput: 10_000_000 / 8 });
  await page.goto(`${process.env.TEST_URL ?? 'http://localhost:4173/'}?debug=1`);
  await page.waitForFunction(() => !document.querySelector('#enter').disabled, {}, { timeout: 60000 });
  const loading = await page.evaluate(() => ({ readyMs: window.__GULOU__.stats().readyMs, transferBytes: performance.getEntriesByType('resource').reduce((sum, e) => sum + e.transferSize, 0), resourceCount: performance.getEntriesByType('resource').length }));
  const sha256 = createHash('sha256').update(await readFile('public/assets/buildings/beidalou.glb')).digest('hex');
  Object.assign(loading, { network: '30 Mbps down, 10 Mbps up, 50 ms latency; browser cache disabled', browser: await browser.version(), hardware: 'Apple M4', production: true, heroSha256: sha256, time: new Date().toISOString() });
  console.log('Cold load', loading);
  await writeFile('docs/validation/loading.json', JSON.stringify(loading, null, 2));
  await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
  await page.click('#enter');
  await page.waitForFunction(() => window.__GULOU__.stats().sectors === 3);
  await page.waitForTimeout(4000);
  await page.screenshot({ path: 'docs/screenshots/campus-overview.png' });
  await page.evaluate(() => { const g = window.__GULOU__.game; g.player.teleport(-35, .07, 24); g.cameraRig.firstPerson = true; g.cameraRig.yaw = -.35; g.cameraRig.pitch = -.17; });
  await page.waitForTimeout(1000); await page.keyboard.press('KeyH'); await page.waitForTimeout(3600);
  await page.screenshot({ path: 'docs/screenshots/campus-walkway.png' });
  await page.keyboard.press('KeyH');
  await page.evaluate(() => { const g = window.__GULOU__.game; g.player.teleport(-30, .07, 37.6); g.cameraRig.firstPerson = false; g.cameraRig.reset(); });
  await page.waitForTimeout(500); await page.keyboard.press('KeyE'); await page.waitForTimeout(500);
  assert.ok(await page.evaluate(() => window.__GULOU__.game.player.seated), 'bench interaction');
  await page.keyboard.press('KeyE'); await page.waitForTimeout(300);
  await page.evaluate(() => window.__GULOU__.teleport(0, .07, 20)); await page.waitForTimeout(500); await page.keyboard.press('KeyE');
  assert.ok(await page.locator('#info').isVisible(), 'building information point');
  console.log('Bench and information-point checks passed.');
} finally { await browser.close(); }
