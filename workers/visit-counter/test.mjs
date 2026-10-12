import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Miniflare } from 'miniflare';
import { dayAt } from './worker.js';
const a='a'.repeat(32), b='b'.repeat(32);

const directory = await mkdtemp(path.join(tmpdir(), 'gulou-counter-test-'));
const origin = 'https://wang-jiahao.github.io';
const options = {
  modules: true, scriptPath: fileURLToPath(new URL('./worker.js', import.meta.url)),
  compatibilityDate: '2025-09-01',
  durableObjects: { VISITS: { className: 'VisitCounter', useSQLite: true } },
  durableObjectsPersist: directory, bindings: { ALLOWED_ORIGINS: origin },
};
let mf = new Miniflare(options);
const url = 'https://counter.example/api/visits';
const post = session => mf.dispatchFetch(url, { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' }, body: JSON.stringify({ session }) });
try {
  assert.deepEqual(await (await mf.dispatchFetch(url)).json(), { total: 0, today: 0, day: dayAt(Date.now()) });
  const first = await post(a); assert.equal(first.status, 200); assert.equal(first.headers.get('Access-Control-Allow-Origin'), origin);
  assert.equal((await first.json()).total, 1);
  const retries = await Promise.all(Array.from({ length: 24 }, () => post(a).then(r => r.json())));
  assert(retries.every(r => r.total === 1), 'parallel retries must not double count');
  await post(b); assert.equal((await (await mf.dispatchFetch(url)).json()).total, 2, 'a new page token adds a visit');
  await Promise.all(Array.from({ length: 48 }, (_, i) => post(i.toString(16).padStart(32, '0'))));
  const totals = await (await mf.dispatchFetch(url)).json(); assert.equal(totals.total, 50); assert.equal(totals.today, 50);
  assert.equal((await mf.dispatchFetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ session: a }) })).status, 403);
  assert.equal((await mf.dispatchFetch(url, { method: 'POST', headers: { Origin: 'https://unrelated.example', 'Content-Type': 'application/json' }, body: JSON.stringify({ session: a }) })).status, 403);
  assert.equal((await post('invalid')).status, 400);
  assert.equal((await mf.dispatchFetch(url, { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' }, body: 'not-json' })).status, 400);
  assert.equal((await mf.dispatchFetch(url, { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' }, body: 'x'.repeat(300) })).status, 413);
  assert.equal((await mf.dispatchFetch(url, { method: 'OPTIONS', headers: { Origin: origin, 'Access-Control-Request-Method': 'POST' } })).status, 204);
  assert.equal((await mf.dispatchFetch('https://counter.example/other')).status, 404);
  assert.equal((await (await mf.dispatchFetch(url)).json()).total, 50, 'reads and invalid requests do not inflate count');
  await mf.dispose(); mf = new Miniflare(options);
  assert.equal((await (await mf.dispatchFetch(url)).json()).total, 50, 'counts survive worker restart');
  assert.equal((await (await post(a)).json()).total, 50, 'deduplication survives restart');
  console.log('PASS: page tokens and retry deduplication, 24 concurrent retries, 48 concurrent visitors, CORS, validation, read-only totals, SQLite persistence.');
} finally { await mf.dispose(); await rm(directory, { recursive: true, force: true }); }
