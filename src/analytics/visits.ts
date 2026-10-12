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
  let historicalEstimate = 0;
  const delay = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));
  try {
    const loadConfig = async () => {
      for (let attempt = 0; ; attempt++) {
        try {
          const response = await fetch(`${import.meta.env.BASE_URL}data/visits.json`, { cache: 'no-cache', signal: AbortSignal.timeout(10000) });
          if (!response.ok) throw new Error('Visit configuration unavailable');
          return response;
        } catch (error) {
          if (attempt >= 2) throw error;
          await delay((attempt + 1) * 2000);
        }
      }
    };
    const response = await loadConfig();
    const config = await response.json() as { endpoint?: unknown; historicalEstimate?: unknown };
    if (!response.ok || typeof config.endpoint !== 'string' || !config.endpoint) return;
    const url = new URL(config.endpoint);
    if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) return;
    endpoint = url.href;
    if (typeof config.historicalEstimate === 'number' && Number.isSafeInteger(config.historicalEstimate) && config.historicalEstimate > 0) {
      historicalEstimate = config.historicalEstimate;
    }
  } catch { return; }
  let inFlight = false;
  let memory: string | null = null;
  let failures = 0;
  let retry: ReturnType<typeof setTimeout> | undefined;
  const update = async () => {
    if (inFlight || document.visibilityState !== 'visible') return;
    clearTimeout(retry);
    inFlight = true;
    let succeeded = false;
    try {
      let stored = memory;
      try { stored = localStorage.getItem(VISIT_SESSION_KEY) ?? memory; } catch { /* Memory fallback. */ }
      const session = visitSession(stored, Date.now(), () => crypto.randomUUID().replaceAll('-', ''));
      memory = JSON.stringify(session);
      try { localStorage.setItem(VISIT_SESSION_KEY, memory); } catch { /* Private browsing. */ }
      const response = await fetch(endpoint, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session: session.id }), credentials: 'omit', referrerPolicy: 'no-referrer',
        cache: 'no-store', signal: AbortSignal.timeout(10000),
      });
      if (!response.ok) return;
      const counts: unknown = await response.json();
      if (!validCounts(counts)) return;
      succeeded = true;
      const counter = document.getElementById('visit-counter');
      if (counter) {
        const estimate = Number.isSafeInteger(counts.total + historicalEstimate) ? historicalEstimate : 0;
        counter.textContent = `累计访问${estimate ? '约' : ''} ${(counts.total + estimate).toLocaleString('zh-CN')} 人次`;
        counter.title = `今日实测 ${counts.today.toLocaleString('zh-CN')} 人次。同一天30分钟内刷新合并；第二天再来重新计次。不是独立玩家人数。${estimate ? `包含作者估算的历史基数 ${estimate.toLocaleString('zh-CN')}，启用后实测 ${counts.total.toLocaleString('zh-CN')}。` : ''}`;
        counter.hidden = false;
      }
    } catch { /* A counter outage must not interrupt the game. */ }
    finally {
      inFlight = false;
      if (succeeded) failures = 0;
      else if (failures < 3) retry = setTimeout(() => { void update(); }, [2000, 5000, 15000][failures++]);
    }
  };
  await update();
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') void update(); });
}
