/** Aggregate visits only. No IP, user agent, referrer, account or game state is stored. */
export const dayAt = now => new Date(now + 8 * 60 * 60 * 1000).toISOString().slice(0, 10);
const response = (data, status = 200, headers = {}) => new Response(JSON.stringify(data), {
  status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers },
});

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname !== '/api/visits') return response({ error: 'Not found' }, 404);
    const origin = request.headers.get('Origin');
    const allowed = (env.ALLOWED_ORIGINS ?? '').split(',').map(s => s.trim()).filter(Boolean);
    if ((origin && !allowed.includes(origin)) || (request.method === 'POST' && !origin)) {
      return response({ error: 'Origin not allowed' }, 403);
    }
    const cors = origin ? { 'Access-Control-Allow-Origin': origin, Vary: 'Origin' } : {};
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: {
      ...cors, 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    } });
    if (!['GET', 'POST'].includes(request.method)) return response({ error: 'Method not allowed' }, 405, cors);
    if (request.method === 'POST') {
      if (!request.headers.get('Content-Type')?.startsWith('application/json')) return response({ error: 'Expected JSON' }, 415, cors);
      if (Number(request.headers.get('Content-Length') ?? 0) > 256) return response({ error: 'Request too large' }, 413, cors);
    }
    const id = env.VISITS.idFromName('gulou-total');
    const result = await env.VISITS.get(id).fetch(request);
    const headers = new Headers(result.headers);
    for (const [key, value] of Object.entries(cors)) headers.set(key, value);
    return new Response(result.body, { status: result.status, headers });
  },
};

export class VisitCounter {
  constructor(state) { this.storage = state.storage; }
  async fetch(request) {
    const now = Date.now(), day = dayAt(now);
    if (request.method === 'GET') {
      return this.storage.transaction(async txn => response({
        total: (await txn.get('total')) ?? 0, today: (await txn.get(`day:${day}`)) ?? 0, day,
      }));
    }
    let session;
    try {
      const text = await request.text();
      if (text.length > 256) return response({ error: 'Request too large' }, 413);
      session = JSON.parse(text).session;
    } catch { return response({ error: 'Invalid JSON' }, 400); }
    if (typeof session !== 'string' || !/^[a-f0-9]{32}$/.test(session)) return response({ error: 'Invalid session' }, 400);
    const result = await this.storage.transaction(async txn => {
      const key = `session:${day}:${session}`;
      let total = (await txn.get('total')) ?? 0, today = (await txn.get(`day:${day}`)) ?? 0;
      if (!(await txn.get(key))) {
        total++; today++;
        await txn.put({ [key]: true, total, [`day:${day}`]: today });
      }
      return { total, today, day };
    });
    if (await this.storage.getAlarm() === null) await this.storage.setAlarm(now + 24 * 60 * 60 * 1000);
    return response(result);
  }
  async alarm() {
    // Keep daily aggregates, but discard anonymous retry/session tokens after a short window.
    const cutoff = dayAt(Date.now() - 2 * 24 * 60 * 60 * 1000);
    for (;;) {
      const old = await this.storage.list({ prefix: 'session:', end: `session:${cutoff}`, limit: 128 });
      if (!old.size) break;
      await this.storage.delete([...old.keys()]);
    }
    await this.storage.setAlarm(Date.now() + 24 * 60 * 60 * 1000);
  }
}
