import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';

const baseline = process.argv.includes('--baseline'), out = 'docs/validation/phase52';
const channel = process.env.BROWSER_PATH ? 'edge' : 'chrome';
await mkdir(out, { recursive: true });
const browser = await chromium.launch(process.env.BROWSER_PATH ? { executablePath: process.env.BROWSER_PATH } : { channel });
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } }), errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('http://localhost:4173/?debug=1');
  await page.waitForFunction(() => window.__GULOU__?.game.world.sectors === 3, {}, { timeout: 90000 });
  await page.click('#enter');
  const inventory = await page.evaluate(async () => {
    const g = window.__GULOU__.game;
    g.renderer.setAnimationLoop(null); g.player.reset(); g.scene.updateMatrixWorld(true);
    const hash = async a => [...new Uint8Array(await crypto.subtle.digest('SHA-256', a))].map(n => n.toString(16).padStart(2, '0')).join('');
    const textHash = a => hash(new TextEncoder().encode(JSON.stringify(a)));
    const triangles = (vertices, indices) => {
      const expanded = new Float32Array(indices.length * 3);
      for (let i = 0; i < indices.length; i++) expanded.set(vertices.subarray(indices[i] * 3, indices[i] * 3 + 3), i * 3);
      return expanded;
    };
    const fixed = [];
    for (const m of g.world.fixedMeshes) fixed.push(await hash(triangles(m.vertices, m.indices)));
    const cuboids = [], meshes = [];
    g.player.physics.forEachCollider(c => {
      if (c.parent()) return;
      const s = c.shape, pose = { position: c.translation(), rotation: c.rotation() };
      if (s.halfExtents) cuboids.push({ ...pose, halfExtents: s.halfExtents });
      else if (s.vertices && s.indices) meshes.push({ ...pose, triangles: triangles(s.vertices, s.indices) });
    });
    const registered = [];
    for (const { triangles: t, ...pose } of meshes) registered.push({ ...pose, hash: await hash(t) });
    const rig = g.cameraRig, objects = g.world.cameraSolids, camera = [];
    rig.prepareObstacles(objects);
    const vector = () => g.player.position.clone().set(0, 0, 0);
    for (let i = 0; i < objects.length; i += 3) {
      const o = objects[i]; if (!o.geometry?.boundingBox) continue;
      const box = o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld), center = box.getCenter(vector()), size = box.getSize(vector());
      for (const axis of ['x', 'z']) {
        const origin = center.clone(), direction = vector(); origin[axis] += size[axis] / 2 + 2; direction[axis] = -1;
        rig.ray.set(origin, direction); rig.ray.far = Math.min(11.6, size[axis] + 4);
        camera.push(rig.ray.intersectObjects(objects, false).map(h => ({ object: objects.indexOf(h.object), face: h.faceIndex, distance: h.distance, point: h.point.toArray() })));
      }
    }
    const ground = [];
    for (let x = -320; x <= 150; x += 14) for (let z = -200; z <= 740; z += 14) {
      const hit = g.player.physics.castRay({ origin: { x, y: 100, z }, dir: { x: 0, y: -1, z: 0 } }, 102, true, undefined, undefined, g.player.collider, g.player.body);
      ground.push(hit ? hit.timeOfImpact : null);
    }
    return { fixed, cuboids: await textHash(cuboids), registered, camera, ground };
  });
  // These are actual character-controller steps through the recently refined stairs and courtyard.
  const routes = [];
  for (const [name, start, end, frames] of [
    ['stairs-to-door', [0, 4, .12], [0, 0], 280],
    ['front-lane', [-3, 4, .12], [5.5, 4], 240],
    ['west-approach', [-6, 4, .12], [-6, -6], 240],
    ['fence-block', [0, 4, .12], [0, 10], 240],
  ]) {
    await page.evaluate(({ start, end }) => {
      const g = window.__GULOU__.game;
      const b = g.world.root.getObjectByName('plan-based campus buildings with VR facade profiles').userData.buildings.find(b => b.id === 'plan-128');
      const [x, z, nx, nz] = b.frontage, point = ([u, v]) => [x + u * nz + v * nx, z - u * nx + v * nz], p = point(start), q = point(end);
      g.player.clearInput(); g.player.teleport(p[0], start[2], p[1]); g.player.physics.step(); g.mode = 'playing';
      g.cameraRig.yaw = Math.atan2(p[0] - q[0], p[1] - q[1]);
      for (let i = 0; i < 10; i++) g.player.update(1 / 60, g.cameraRig.yaw, true);
    }, { start, end });
    await page.keyboard.down('KeyW');
    const result = await page.evaluate(frames => {
      const g = window.__GULOU__.game;
      for (let i = 0; i < frames; i++) g.player.update(1 / 60, g.cameraRig.yaw, true);
      return g.player.position.toArray();
    }, frames);
    await page.keyboard.up('KeyW'); routes.push({ name, result });
  }
  inventory.routes = routes;
  assert.ok(inventory.camera.filter(h => h.length).length > 30);
  assert.deepEqual(errors, []);
  const basePath = `${out}/behavior-before-${channel}.json`;
  if (baseline) await writeFile(basePath, JSON.stringify(inventory), { flag: 'wx' });
  else {
    const before = JSON.parse(await readFile(basePath, 'utf8'));
    assert.deepEqual(inventory, before, 'fixed/registered collision triangles, cuboids, camera rays, physics rays and character routes remain exact');
    await writeFile(`${out}/behavior-after-${channel}.json`, JSON.stringify(inventory));
  }
  console.log(JSON.stringify({ baseline, channel, status: 'passed', fixed: inventory.fixed.length, registered: inventory.registered.length, cameraRays: inventory.camera.length, physicsRays: inventory.ground.length, routes: routes.length }));
} finally { await browser.close(); }
