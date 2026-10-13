// Independent entry: visit reporting does not wait for map or game modules.
(() => {
const scriptUrl = document.currentScript.src;
const validCounts = value => value && typeof value === 'object'
  && Number.isSafeInteger(value.total) && value.total >= 0
  && Number.isSafeInteger(value.today) && value.today >= 0 && value.today <= value.total
  && (value.displayTotal === undefined || (Number.isSafeInteger(value.displayTotal) && value.displayTotal >= value.total))
  && typeof value.day === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value.day);

/** Optional anonymous visit counter. All failures stay outside the game's boot path. */
async function initVisits() {
  if (['localhost', '127.0.0.1', '[::1]'].includes(location.hostname)
    || location.protocol === 'file:' || new URLSearchParams(location.search).has('validation')
    || new URLSearchParams(location.search).has('debug')) return;
  const counter = document.getElementById('visit-counter');
  const value = counter?.querySelector('.visit-value');
  if (counter) {
    counter.setAttribute('aria-label', '累计访问加载中…');
    counter.setAttribute('aria-busy', 'true');
    counter.hidden = false;
  }
  let endpoint;
  const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
  try {
    const loadConfig = async () => {
      for (let attempt = 0; ; attempt++) {
        try {
          const response = await fetch(new URL('data/visits.json', scriptUrl), { cache: 'no-cache', signal: AbortSignal.timeout(10000) });
          if (!response.ok) throw new Error('Visit configuration unavailable');
          return response;
        } catch (error) {
          if (attempt >= 2) throw error;
          await delay((attempt + 1) * 2000);
        }
      }
    };
    const response = await loadConfig();
    const config = await response.json();
    if (!response.ok || typeof config.endpoint !== 'string' || !config.endpoint) { if (counter) counter.hidden = true; return; }
    const url = new URL(config.endpoint);
    if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) { if (counter) counter.hidden = true; return; }
    endpoint = url.href;
  } catch { if (counter) counter.hidden = true; return; }
  let inFlight = false;
  const session = crypto.randomUUID().replaceAll('-', ''); // One token per page load; retries reuse it.
  let failures = 0;
  let retry;
  const update = async () => {
    if (inFlight || document.visibilityState !== 'visible') return;
    clearTimeout(retry);
    inFlight = true;
    let succeeded = false;
    try {
      const response = await fetch(endpoint, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session }), credentials: 'omit', referrerPolicy: 'no-referrer',
        cache: 'no-store', signal: AbortSignal.timeout(10000),
      });
      if (!response.ok) return;
      const counts = await response.json();
      if (!validCounts(counts)) return;
      succeeded = true;
      const counter = document.getElementById('visit-counter');
      if (counter) {
        const formatted = (counts.displayTotal ?? counts.total).toLocaleString('zh-CN');
        if (value) value.textContent = formatted;
        counter.setAttribute('aria-label', `累计访问 ${formatted} 人次`);
        counter.setAttribute('aria-busy', 'false');
        counter.title = `今日实测 ${counts.today.toLocaleString('zh-CN')} 人次。每次打开或刷新页面计一次；网络重试不重复计次。不是独立玩家人数。${counts.includesHistoricalEstimate ? '合计包含作者估算的历史访问基数。' : ''}`;
        counter.hidden = false;
      }
    } catch { /* A counter outage must not interrupt the game. */ }
    finally {
      inFlight = false;
      if (succeeded) failures = 0;
      else if (failures < 3) retry = setTimeout(() => { void update(); }, [2000, 5000, 15000][failures++]);
      else if (counter?.getAttribute('aria-busy') === 'true') counter.hidden = true;
    }
  };
  await update();
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') void update(); });
}

void initVisits();
})();
