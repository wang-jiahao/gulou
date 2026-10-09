import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';

// Production Player + real Rapier. Only full-campus construction and avatar
// rendering are omitted; movement, flight, snap/autostep and landing are real.
const players = [], results = [];
const context = new Proxy({}, {get: (object, key) => object[key] ?? (() => {})});
globalThis.document = {createElement: () => ({getContext: () => context})};
try {
  const {build} = createRequire(import.meta.resolve('vite'))('esbuild');
  const bundle = await build({stdin: {contents: `
import * as T from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
export {T, RAPIER};
export {Player, FATAL_FALL_HEIGHT} from './player/controller.ts';
export {spawn} from './world/world.ts';
`, resolveDir: resolve('src'), loader: 'ts'}, bundle: true, write: false, platform: 'node', format: 'esm', plugins: [{
    name: 'isolated-world', setup(builder) {
      builder.onResolve({filter: /(?:^|\/)world\/world\.ts$/}, () => ({path: 'world', namespace: 'fixture'}));
      builder.onLoad({filter: /.*/, namespace: 'fixture'}, () => ({contents: `import {Vector3} from 'three';
export const bounds={minX:-1000,maxX:1000,minZ:-1000,maxZ:1000};
export const spawn=new Vector3(0,1.32,68);export const maxFlightAltitude=180;`, resolveDir: resolve('src')}));
    },
  }]});
  const {T, RAPIER, Player, FATAL_FALL_HEIGHT, spawn} = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);
  await RAPIER.init();
  assert.equal(FATAL_FALL_HEIGHT, 10);
  const box = (x, z, w, d, top, h = .2) => ({x, y: top-h/2, z, w, h, d});
  const platform = (height, x = 100) => box(x, 100, 8, 8, height, height);
  function player(extra = []) {
    const p = new Player(new T.Scene(), [box(0, 0, 1000, 1000, 0), box(0, 68, 10, 10, 1.26, 1.26), ...extra], {root: new T.Group(), setGroundSampler() {}, update() {}});
    players.push(p); return p;
  }
  function step(p, frames, dt = 1/60, active = true, yaw = 0) { for (let i = 0; i < frames; i++) p.update(dt, yaw, active); }
  function until(p, predicate, {frames = 1500, dt = 1/60, yaw = 0} = {}) {
    for (let i = 0; i < frames; i++) { p.update(dt, yaw, true); if (predicate()) return i + 1; }
    throw new Error(`Timed out at ${p.position.toArray()} flight=${p.flightState} grounded=${p.grounded}`);
  }
  function roof(p, x = 100) {
    assert.ok(p.travelTo(x, 100)); step(p, 15); assert.equal(p.grounded, true);
  }
  function walkOff(p, dt = 1/60) {
    const before = p.respawnCount;
    p.keys.add('KeyD'); p.keys.add('ShiftLeft');
    return until(p, () => p.respawnCount > before || (p.position.y < .1 && p.grounded), {dt});
  }
  function check(name, run) { const detail = run() ?? {}; results.push({name, ...detail}); console.log(`PASS ${name}`); }
  function assertRespawn(p, count = 1) {
    assert.equal(p.respawnCount, count); assert.equal(p.lastRespawn.count, count); assert.equal(p.lastRespawn.reason, 'fall');
    assert.ok(p.position.distanceTo(spawn) < 1e-4, `respawn at start: ${p.position.toArray()}`);
    assert.equal(p.riding, null); assert.equal(p.flying, false); assert.equal(p.seated, false);
    assert.equal(p.keys.size, 0); assert.equal(p.moveInput.length(), 0); assert.equal(p.speed, 0); assert.equal(p.velocityY, 0);
    assert.equal(p.glider.visible, false); assert.equal(p.avatar.root.position.distanceTo(p.position), 0);
  }

  check('9.5m ledge is nonfatal; 10.2m and 12m ledges respawn on contact exactly once', () => {
    const heights = [];
    for (const height of [9.5, 10.2, 12]) {
      const p = player([platform(height)]); roof(p); const standingHeight=p.position.y;
      let events = 0;
      p.onRespawn = event => { events++; assertRespawn(p); assert.ok(event.impact.y < .1); };
      walkOff(p);
      if (height < 10) { assert.equal(p.respawnCount, 0); assert.equal(events, 0); }
      else {
        assert.equal(p.respawnCount, 1, `${height}m ledge: standing=${standingHeight} landing=${p.position.y}`);
        assertRespawn(p); assert.equal(events, 1);
        // The capsule rolls down the lip while still supported, so its actual
        // unsupported drop starts within one capsule radius of the roof top.
        assert.ok(Math.abs(p.lastRespawn.fallHeight-height) < .3, `roof=${height} actual=${p.lastRespawn.fallHeight}`);
        heights.push(p.lastRespawn.fallHeight); step(p, 120);
        assert.equal(p.respawnCount, 1); assert.equal(events, 1);
      }
    }
    return {fatalHeights: heights};
  });

  check('an actual unsupported 10m drop reaches the lethal threshold', () => {
    const p = player(); p.teleport(100, 10, 100); p.physics.step();
    until(p, () => { if(p.grounded&&!p.respawnCount) throw new Error(`10m initial air drop grounded at ${p.position.y}`); return p.respawnCount === 1; }); assertRespawn(p);
    assert.ok(Math.abs(p.lastRespawn.fallHeight-10) < .001);
    return {fallHeight: p.lastRespawn.fallHeight};
  });

  check('separate fatal falls increment the counter once each; manual reset does not', () => {
    const p = player([platform(12)]), events = [];
    p.onRespawn = event => { events.push(event.count); assertRespawn(p, events.length); };
    for(let count=1;count<=2;count++) { roof(p); p.moveInput.x=.2; walkOff(p); assertRespawn(p, count); step(p, 15); }
    p.reset(); assert.deepEqual(events, [1, 2]); assert.equal(p.respawnCount, 2);
  });

  check('controlled flight descends onto a roof safely; walking off that roof is fatal', () => {
    const p = player([platform(12)]); p.teleport(100, 40, 100); p.physics.step();
    assert.equal(p.startFlight(), true); p.land();
    until(p, () => !p.flying && p.grounded);
    assert.ok(Math.abs(p.position.y-12) < .04); assert.equal(p.respawnCount, 0);
    const roofHeight = p.position.y; walkOff(p); assertRespawn(p);
    assert.ok(Math.abs(p.lastRespawn.fallHeight-roofHeight) < .3);
    return {roofHeight, fallHeight: p.lastRespawn.fallHeight};
  });

  check('starting flight during a fall clears the earlier unprotected drop', () => {
    const p = player([platform(18)]); roof(p); p.keys.add('KeyD'); p.keys.add('ShiftLeft');
    until(p, () => p.position.y < 13 && p.position.x > 105);
    p.clearInput(); assert.equal(p.startFlight(), true); p.land();
    until(p, () => !p.flying && p.grounded);
    assert.ok(p.position.y < .04); assert.equal(p.respawnCount, 0);
  });

  check('pause preserves a fall; map travel clears it before a later short drop', () => {
    const p = player([platform(18)]); roof(p); p.keys.add('KeyD'); p.keys.add('ShiftLeft');
    until(p, () => p.position.y < 8);
    const paused = p.position.clone(); step(p, 120, 1/60, false);
    assert.ok(p.position.distanceTo(paused) < 1e-5);
    until(p, () => p.respawnCount === 1); assertRespawn(p);
    assert.ok(p.lastRespawn.fallHeight > 17.7);
    const traveler = player([platform(18), platform(9.5, 150)]); roof(traveler);
    traveler.keys.add('KeyD'); traveler.keys.add('ShiftLeft'); until(traveler, () => traveler.position.y < 8);
    assert.ok(traveler.travelTo(150, 100)); step(traveler, 15); walkOff(traveler);
    assert.equal(traveler.respawnCount, 0);
  });

  check('fixed substeps catch a fast landing within two coarse frames and stop residual movement', () => {
    const p = player([platform(12)]); roof(p); p.keys.add('KeyD'); p.keys.add('ShiftLeft');
    until(p, () => p.position.y < 2.5 && !p.grounded, {dt: .1});
    const before = p.position.y;
    let frames = 0; while (p.respawnCount === 0 && frames < 2) { p.update(.1, 0, true); frames++; }
    assert.equal(p.respawnCount, 1, `fast landing: before=${before} after=${p.position.y}`);
    assertRespawn(p); assert.ok(p.lastRespawn.fallHeight > 11.7);
    step(p, 6, .1); assert.equal(p.respawnCount, 1); assert.ok(Math.abs(p.position.x-spawn.x) < 1e-5);
    return {heightBeforeFinalFrames: before, finalFrames: frames};
  });

  check('a jump off a 9.2m ledge uses the actual airborne apex', () => {
    const p = player([platform(9.2)]); roof(p, 103.3);
    p.keys.add('KeyD'); p.keys.add('ShiftLeft'); p.requestJump();
    let apex = p.position.y;
    until(p, () => { if (!p.respawnCount) apex = Math.max(apex, p.position.y); return p.respawnCount > 0; });
    assertRespawn(p); assert.ok(apex > 10.2); assert.ok(p.lastRespawn.fallHeight > 10.2);
    return {apex, fallHeight: p.lastRespawn.fallHeight};
  });

  check('ordinary jumps and horizontal motion never accumulate fatal height', () => {
    const p = player(); assert.ok(p.travelTo(100, 100, 'ground')); step(p, 15);
    p.keys.add('KeyD'); let apex = 0;
    for (let i = 0; i < 900; i++) { if (i % 90 === 0) p.requestJump(); p.update(1/60, 0, true); apex = Math.max(apex, p.position.y); }
    assert.equal(p.respawnCount, 0); assert.ok(apex > 1 && apex < 1.3); assert.ok(p.position.x > 120);
    return {apex, horizontalTravel: p.position.x-100};
  });

  check('63 ordinary 20cm stairs climb and descend over 12m without death', () => {
    const stairs = Array.from({length: 63}, (_, i) => box(100+i*.8, 100, .81, 4, (63-i)*.2, (63-i)*.2));
    const p = player(stairs); assert.ok(p.travelTo(153, 100, 'ground')); step(p, 15);
    p.keys.add('KeyA'); until(p, () => p.position.x < 100.15, {frames: 3000}); p.clearInput(); step(p, 15);
    const top = p.position.y; assert.ok(top > 12.5); assert.equal(p.respawnCount, 0);
    p.keys.add('KeyD'); until(p, () => p.position.x > 152 && p.grounded, {frames: 3000});
    assert.equal(p.respawnCount, 0); assert.ok(p.position.y < .04);
    return {stairTop: top};
  });

  check('riding fall parks the real collider and dispatches a clean, single respawn callback', () => {
    const parked = box(100, 100, .5, 1.85, 13.09, 1.04), group = new T.Group(); group.position.set(100, 12.05, 100);
    let isParked = true;
    const bike = {id: 'fall-fixture', group, solid: parked, home: group.position.clone(), angle: 0, update() {}, setParked(value) { isParked = value; }};
    const p = player([platform(12), parked]); assert.ok(p.travelTo(102, 100)); step(p, 15); assert.equal(p.mount(bike), true);
    assert.equal(isParked, false); let events = 0;
    p.onRespawn = event => {
      events++; assertRespawn(p); assert.equal(isParked, true);
      assert.ok(p.collider.shape instanceof RAPIER.Capsule);
      assert.ok(group.position.distanceTo(new T.Vector3(event.impact.x, event.impact.y, event.impact.z)) < 1e-5);
    };
    p.keys.add('KeyW'); p.keys.add('ShiftLeft'); until(p, () => p.respawnCount === 1, {yaw: Math.PI/2});
    assertRespawn(p); assert.equal(events, 1); step(p, 120); assert.equal(events, 1);
  });
  console.log(JSON.stringify({passed: true, checks: results.length, thresholdMetres: FATAL_FALL_HEIGHT, results}));
} catch (error) {
  // Bundled data URLs can make native stack traces enormous; retain the useful assertion.
  console.error(JSON.stringify({passed: false, checks: results.length, error: error.message})); process.exitCode = 1;
} finally {
  for (const p of players) p.physics.free();
}
