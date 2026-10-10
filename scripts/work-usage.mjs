// Counts only logs explicitly supplied by the maintainer or matched to this project.
// Raw conversation text and local paths are never included in the generated README.
import { createReadStream } from 'node:fs';
import { open } from 'node:fs/promises';
import { createInterface } from 'node:readline';
import { createHash } from 'node:crypto';
import path from 'node:path';

export const astraPricing = {
  model: 'gpt-6-astra', mode: 'Standard', currency: 'USD', perTokens: 1_000_000,
  verifiedOn: '2026-10-10', source: 'https://developers.openai.com/api/docs/pricing',
  shortInputLimit: 272_000,
  short: { uncachedInput: 10, cachedInput: 1, cacheWriteInput: 12.5, output: 50 },
  long: { uncachedInput: 20, cachedInput: 2, cacheWriteInput: 25, output: 75 },
};
const fields = ['input_tokens', 'cached_input_tokens', 'cache_write_input_tokens', 'output_tokens', 'reasoning_output_tokens', 'total_tokens'];
const hash = value => createHash('sha256').update(value).digest('hex');
const blank = () => ({ input: 0, uncachedInput: 0, cachedInput: 0, cacheWriteInput: 0, output: 0, reasoningOutput: 0, total: 0, requests: 0 });

export async function sessionMetadata(file) {
  const handle = await open(file);
  try {
    const buf = Buffer.alloc(262144);
    const { bytesRead } = await handle.read(buf, 0, buf.length, 0);
    const text = buf.subarray(0, bytesRead).toString('utf8');
    const newline = text.indexOf('\n');
    if (newline < 0) return null;
    const row = JSON.parse(text.slice(0, newline));
    return row.type === 'session_meta' ? row.payload : null;
  } catch { return null; } finally { await handle.close(); }
}

export async function discoverProjectLogs(files, cwd) {
  const matches = [];
  for (const file of files.filter(f => f.endsWith('.jsonl'))) {
    const meta = await sessionMetadata(file);
    if (meta?.cwd && path.resolve(meta.cwd) === path.resolve(cwd)) matches.push(file);
  }
  return matches;
}

export function priceTier(tier, rates) {
  const costs = Object.fromEntries(Object.entries(rates).map(([key, rate]) => [key, tier[key] * rate / astraPricing.perTokens]));
  return { ...costs, total: Object.values(costs).reduce((sum, cost) => sum + cost, 0) };
}

export async function collectUsage(logs) {
  const sessions = new Map(), seen = new Set(), messages = new Set(), models = new Set();
  const tiers = { short: blank(), long: blank() };
  let from, measuredAt, duplicateEvents = 0, inheritedInputEvents = 0, maxRequestInput = 0;
  for (const file of new Set(logs)) {
    const meta = await sessionMetadata(file);
    if (!meta?.id) continue;
    const agent = typeof meta.source === 'object' && Boolean(meta.source?.subagent);
    let previous;
    for await (const line of createInterface({ input: createReadStream(file), crlfDelay: Infinity })) {
      let row; try { row = JSON.parse(line); } catch { continue; }
      const p = row.payload;
      if (row.type === 'turn_context' && p?.model) models.add(p.model);
      if (!agent && row.type === 'response_item' && p?.type === 'message' && p.role === 'user') {
        const text = (p.content ?? []).map(c => c.text ?? '').join('\n').trim();
        if (text && !/^(?:# AGENTS\.md|<environment_context>|<heartbeat>|<turn_aborted>|<subagent_notification>|Another language model started)/.test(text)) {
          messages.add(hash(`${meta.id}\0${row.timestamp}\0${text}`));
        }
      }
      if (row.type !== 'event_msg' || p?.type !== 'token_count' || !p.info?.total_token_usage) continue;
      const total = p.info.total_token_usage, last = p.info.last_token_usage;
      const key = meta.id + ':' + fields.map(k => total[k] ?? 0).join(',');
      const prior = previous; previous = total;
      if (seen.has(key)) { duplicateEvents++; continue; }
      seen.add(key);
      if (!last) throw new Error('Missing per-request usage; cannot assign context price tier safely.');
      const delta = Object.fromEntries(fields.map(k => [k, (total[k] ?? 0) - (prior?.[k] ?? 0)]));
      if (prior && fields.some(k => delta[k] !== (last[k] ?? 0))) {
        throw new Error('Cumulative usage does not match the request; inspect the local log before billing.');
      }
      if (!prior && fields.some(k => delta[k] !== (last[k] ?? 0))) inheritedInputEvents++;
      // First events in a fork can inherit a parent's total: count only this request.
      for (const k of fields) if (!Number.isSafeInteger(last[k] ?? 0) || (last[k] ?? 0) < 0) throw new Error('Invalid token count.');
      const input = last.input_tokens ?? 0, cachedInput = last.cached_input_tokens ?? 0;
      const cacheWriteInput = last.cache_write_input_tokens ?? 0, output = last.output_tokens ?? 0;
      const uncachedInput = input - cachedInput - cacheWriteInput;
      if (uncachedInput < 0 || input + output !== last.total_tokens) throw new Error('Invalid usage partition.');
      const tier = tiers[input > astraPricing.shortInputLimit ? 'long' : 'short'];
      const values = { input, uncachedInput, cachedInput, cacheWriteInput, output, reasoningOutput: last.reasoning_output_tokens ?? 0, total: last.total_tokens, requests: 1 };
      for (const [k, value] of Object.entries(values)) tier[k] += value;
      maxRequestInput = Math.max(maxRequestInput, input);
      sessions.set(meta.id, { agent });
      if (!from || row.timestamp < from) from = row.timestamp;
      if (!measuredAt || row.timestamp > measuredAt) measuredAt = row.timestamp;
    }
  }
  const totals = blank();
  for (const tier of Object.values(tiers)) for (const k of Object.keys(totals)) totals[k] += tier[k];
  const costs = { short: priceTier(tiers.short, astraPricing.short), long: priceTier(tiers.long, astraPricing.long) };
  return { schema: 2, from, measuredAt, sessions: sessions.size, agentSessions: [...sessions.values()].filter(s => s.agent).length,
    logFiles: new Set(logs).size, userMessages: messages.size, models: [...models].sort(), duplicateEvents, inheritedInputEvents,
    maxRequestInput, ...totals, tiers, pricing: astraPricing, costs, estimatedUsd: costs.short.total + costs.long.total };
}
