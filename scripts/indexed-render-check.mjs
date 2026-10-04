import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import sharp from 'sharp';

const out = 'docs/validation/phase52', channel = process.env.BROWSER_PATH ? 'edge' : 'chrome';
await mkdir(out, { recursive: true });
const browser = await chromium.launch(process.env.BROWSER_PATH ? { executablePath: process.env.BROWSER_PATH } : { channel });
const report = { channel, errors: [], views: [] };
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  page.on('pageerror', e => report.errors.push(e.message));
  await page.goto('http://localhost:4173/?debug=1');
  await page.waitForFunction(() => window.__GULOU__?.game.world.sectors === 3, {}, { timeout: 90000 });
  await page.click('#enter');
  report.setup = await page.evaluate(() => {
    const g = window.__GULOU__.game;
    g.renderer.setAnimationLoop(null); g.player.avatar.root.visible = false;
    g.setTime(14); g.atmosphere.state.autoTime = false; g.atmosphere.state.setWeather('clear');
    const variants = new Map(), meshes = [];
    g.world.root.traverse(o => {
      if (!o.isMesh || o.isInstancedMesh || o.userData.spatialCell === undefined || !o.geometry.index) return;
      if (!variants.has(o.geometry)) variants.set(o.geometry, o.geometry.toNonIndexed());
      meshes.push({ mesh: o, indexed: o.geometry, expanded: variants.get(o.geometry) });
    });
    window.indexVariants = meshes;
    return { meshes: meshes.length, geometries: variants.size, width: g.renderer.domElement.width, height: g.renderer.domElement.height, shadows: g.renderer.shadowMap.enabled, quality: g.quality };
  });
  await page.addStyleTag({ content: 'body > :not(canvas){visibility:hidden!important} canvas{visibility:visible!important}' });
  for (const [name, eye, look, fov] of [
    ['entry', [0, 2.8, 82], [0, 8, 0], 64],
    ['ivy-close', [8, 3.3, 18], [0, 9, 10], 64],
    ['west', [-40, 7, 8], [0, 8, 0], 64],
    ['rear', [20, 4, -25], [0, 8, 0], 64],
    ['flight', [-25, 75, 100], [0, 10, 0], 64],
    ['rabe', [141, 11, 710], [123, 4.6, 690], 65],
  ]) {
    const view = await page.evaluate(async ({ name, eye, look, fov }) => {
      const g = window.__GULOU__.game, renderer = g.renderer, gl = renderer.getContext();
      const ext = gl.getExtension('EXT_disjoint_timer_query_webgl2');
      const swap = kind => { for (const v of window.indexVariants) v.mesh.geometry = v[kind]; renderer.shadowMap.needsUpdate = true; };
      g.camera.position.set(...eye); g.camera.lookAt(...look); g.camera.fov = fov; g.camera.updateProjectionMatrix(); g.camera.updateMatrixWorld();
      g.atmosphere.update(0, false, g.camera.position);
      if (g.foliageLight) g.foliageLight.value = g.atmosphere.daylight;
      g.world.updateVegetation(g.camera.position, g.quality, true, g.camera.position);
      g.csm.lightDirection.copy(g.atmosphere.sunDirection).negate();
      g.csm.lights.forEach(l => { l.intensity = g.atmosphere.sunIntensity; l.color.copy(g.atmosphere.lightColor); });
      renderer.toneMappingExposure = 1.05 + g.atmosphere.night * .12; g.csm.updateFrustums(); g.csm.update();
      const times = { indexed: [], expanded: [] }, draws = {}, pixels = {};
      for (let round = 0; round < 15; round++) for (const kind of round % 2 ? ['indexed', 'expanded'] : ['expanded', 'indexed']) {
        swap(kind);
        const q = ext ? gl.createQuery() : null;
        if (q) gl.beginQuery(ext.TIME_ELAPSED_EXT, q);
        const start = performance.now(); renderer.render(g.scene, g.camera); const cpu = performance.now() - start;
        if (q) gl.endQuery(ext.TIME_ELAPSED_EXT);
        draws[kind] = { triangles: renderer.info.render.triangles, calls: renderer.info.render.calls };
        if (round === 14) {
          const a = new Uint8Array(gl.drawingBufferWidth * gl.drawingBufferHeight * 4);
          gl.readPixels(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight, gl.RGBA, gl.UNSIGNED_BYTE, a); pixels[kind] = a;
        }
        let gpu = null;
        if (q) {
          const deadline = performance.now() + 10000;
          while (!gl.getQueryParameter(q, gl.QUERY_RESULT_AVAILABLE)) {
            if (performance.now() > deadline) throw Error('GPU timer query timed out');
            await new Promise(resolve => setTimeout(resolve, 5));
          }
          if (!gl.getParameter(ext.GPU_DISJOINT_EXT)) gpu = gl.getQueryParameter(q, gl.QUERY_RESULT) / 1e6;
          gl.deleteQuery(q);
        }
        if (round >= 3) times[kind].push({ gpu, cpu });
      }
      let differentPixels = 0, maxChannelDelta = 0, nonemptyPixels = 0;
      for (let i = 0; i < pixels.indexed.length; i += 4) {
        let different = false;
        for (let j = 0; j < 4; j++) { const d = Math.abs(pixels.indexed[i + j] - pixels.expanded[i + j]); if (d) different = true; maxChannelDelta = Math.max(maxChannelDelta, d); }
        if (different) differentPixels++;
        if (pixels.indexed[i] || pixels.indexed[i + 1] || pixels.indexed[i + 2]) nonemptyPixels++;
      }
      const median = values => { const a = values.filter(x => x !== null).sort((a, b) => a - b); return a.length ? (a[Math.floor((a.length - 1) / 2)] + a[Math.floor(a.length / 2)]) / 2 : null; };
      swap('indexed'); renderer.render(g.scene, g.camera);
      return { name, gpuTimer: !!ext, times, draws, differentPixels, maxChannelDelta, nonemptyPixels, medians: Object.fromEntries(Object.entries(times).map(([kind, values]) => [kind, { gpu: median(values.map(v => v.gpu)), cpu: median(values.map(v => v.cpu)) }])) };
    }, { name, eye, look, fov });
    report.views.push(view);
    await sharp(await page.screenshot()).resize({ width: 800 }).png().toFile(`${out}/indexed-${channel}-${name}.png`);
    assert.deepEqual(view.draws.indexed, view.draws.expanded, `${name}: identical triangles and draw calls`);
    assert.ok(view.nonemptyPixels > 100000, `${name}: actual frame captured`);
    assert.equal(view.differentPixels, 0, `${name}: every framebuffer pixel remains exact, including shadows`);
  }
  assert.deepEqual(report.errors, []); report.status = 'passed';
} catch (error) { report.status = 'failed'; report.failure = String(error); process.exitCode = 1; }
finally { await writeFile(`${out}/indexed-render-${channel}.json`, JSON.stringify(report, null, 2)); await browser.close(); }
console.log(JSON.stringify({ channel, status: report.status, setup: report.setup, views: report.views.map(({ name, medians, differentPixels }) => ({ name, medians, differentPixels })), failure: report.failure }));
