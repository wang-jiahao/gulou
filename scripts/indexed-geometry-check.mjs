import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';

const baseline = process.argv.includes('--baseline');
const directory = 'docs/validation/phase52';
const browserName = process.env.BROWSER_PATH ? 'edge' : 'chrome';
await mkdir(directory, { recursive: true });
const browser = await chromium.launch(process.env.BROWSER_PATH ? { executablePath: process.env.BROWSER_PATH } : { channel: 'chrome' });
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('http://localhost:4173/?debug=1');
  await page.waitForFunction(() => window.__GULOU__?.game.world.sectors === 3, {}, { timeout: 60000 });
  await page.click('#enter');
  const inventory = await page.evaluate(async () => {
    const g = window.__GULOU__.game;
    g.renderer.setAnimationLoop(null);
    const hash = async bytes => [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].map(b => b.toString(16).padStart(2, '0')).join('');
    const objects = [];
    g.world.root.traverse(o => { if (o.isMesh && o.userData.spatialCell !== undefined) objects.push(o); });
    const meshes = [];
    const unique = new Set();
    let bytes = 0, vertices = 0, indices = 0;
    for (const o of objects) {
      const geometry = o.geometry;
      if (!unique.has(geometry)) {
        unique.add(geometry);
        for (const a of Object.values(geometry.attributes)) bytes += a.array.byteLength;
        bytes += geometry.index?.array.byteLength ?? 0;
        vertices += geometry.attributes.position.count;
        indices += geometry.index?.count ?? 0;
      }
      const expanded = geometry.index ? geometry.toNonIndexed() : geometry;
      const attributes = {};
      for (const [name, a] of Object.entries(expanded.attributes)) attributes[name] = { count: a.count, itemSize: a.itemSize, normalized: a.normalized, hash: await hash(a.array) };
      meshes.push({ name: o.name, parent: o.parent.name, cell: o.userData.spatialCell, attributes });
      if (expanded !== geometry) expanded.dispose();
    }
    const encoder = new TextEncoder();
    return { meshes, unique: unique.size, bytes, vertices, indices, solids: await hash(encoder.encode(JSON.stringify(g.world.solids))) };
  });
  const basePath = `${directory}/indexed-before-${browserName}.json`;
  if (baseline) {
    await writeFile(basePath, JSON.stringify(inventory, null, 2), { flag: 'wx' });
    console.log(JSON.stringify({ baseline: browserName, meshes: inventory.meshes.length, bytes: inventory.bytes, vertices: inventory.vertices, errors }));
  } else {
    const before = JSON.parse(await readFile(basePath, 'utf8'));
    assert.deepEqual(inventory.meshes, before.meshes, 'expanded triangles and every vertex attribute must exactly match original build');
    assert.equal(inventory.solids, before.solids, 'world cuboids unchanged');
    assert.ok(inventory.bytes < before.bytes, 'stored geometry bytes decrease');
    await writeFile(`${directory}/indexed-after-${browserName}.json`, JSON.stringify(inventory, null, 2));
    console.log(JSON.stringify({ browser: browserName, meshes: inventory.meshes.length, before: { bytes: before.bytes, vertices: before.vertices }, after: { bytes: inventory.bytes, vertices: inventory.vertices }, errors }));
  }
  assert.deepEqual(errors, []);
} finally {
  await browser.close();
}
