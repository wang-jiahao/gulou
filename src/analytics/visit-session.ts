export const VISIT_SESSION_KEY = 'gulou-visit-session-v1';
export const VISIT_WINDOW_MS = 30 * 60 * 1000;
export type VisitSession = { id: string; day: string; lastSeen: number };

export function visitDay(now: number) {
  return new Date(now + 8 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

/** One visit per short session; a new Beijing calendar day always starts a visit. */
export function visitSession(saved: string | null, now: number, newId: () => string): VisitSession {
  const day = visitDay(now);
  try {
    const previous = JSON.parse(saved ?? 'null') as Partial<VisitSession> | null;
    if (previous && typeof previous.id === 'string' && /^[a-f0-9]{32}$/.test(previous.id)
      && previous.day === day && typeof previous.lastSeen === 'number'
      && now >= previous.lastSeen && now - previous.lastSeen < VISIT_WINDOW_MS) {
      return { id: previous.id, day, lastSeen: now };
    }
  } catch { /* Corrupt or unavailable storage must not block entry. */ }
  return { id: newId(), day, lastSeen: now };
}
