import { visitSession, VISIT_SESSION_KEY } from './visit-session.ts';

type VisitCounts = { total: number; today: number; day: string };
const validCounts = (value: unknown): value is VisitCounts => {
  if (!value || typeof value !== 'object') return false;
  const v = value as Partial<VisitCounts>;
  return Number.isSafeInteger(v.total) && Number(v.total) >= 0
    && Number.isSafeInteger(v.today) && Number(v.today) >= 0 && Number(v.today) <= Number(v.total)
    && typeof v.day === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v.day);
};

/** Optional anonymous visit counter. All failures stay outside the game's boot path. */
export async function initVisits() {
  if (import.meta.env.DEV || ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname)
    || location.protocol === 'file:' || new URLSearchParams(location.search).has('validation')
    || new URLSearchParams(location.search).has('debug')) return;
  let endpoint: string;
  try {
    const response = await fetch(`${import.meta.env.BASE_URL}data/visits.json`, { cache: 'no-cache', signal: AbortSignal.timeout(3000) });
    const config = await response.json() as { endpoint?: unknown };
    if (!response.ok || typeof config.endpoint !== 'string' || !config.endpoint) return;
    const url = new URL(config.endpoint);
    if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) return;
    endpoint = url.href;
  } catch { return; }
  let inFlight = false;
  let memory: string | null = null;
  const update = async () => {
    if (inFlight || document.visibilityState !== 'visible') return;
    inFlight = true;
    try {
      let stored = memory;
      try { stored = localStorage.getItem(VISIT_SESSION_KEY) ?? memory; } catch { /* Memory fallback. */ }
      const session = visitSession(stored, Date.now(), () => crypto.randomUUID().replaceAll('-', ''));
      memory = JSON.stringify(session);
      try { localStorage.setItem(VISIT_SESSION_KEY, memory); } catch { /* Private browsing. */ }
      const response = await fetch(endpoint, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session: session.id }), credentials: 'omit', referrerPolicy: 'no-referrer',
        cache: 'no-store', signal: AbortSignal.timeout(4000),
      });
      if (!response.ok) return;
      const counts: unknown = await response.json();
      if (!validCounts(counts)) return;
      const counter = document.getElementById('visit-counter');
      if (counter) {
        counter.textContent = `累计访问 ${counts.total.toLocaleString('zh-CN')} 人次`;
        counter.title = `今日 ${counts.today.toLocaleString('zh-CN')} 人次。同一天30分钟内刷新合并；第二天再来重新计次。不是独立玩家人数。`;
        counter.hidden = false;
      }
    } catch { /* A counter outage must not interrupt the game. */ }
    finally { inFlight = false; }
  };
  await update();
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') void update(); });
}
