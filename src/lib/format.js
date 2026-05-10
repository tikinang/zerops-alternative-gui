// Shared formatters for status / duration. Used by tracker, bell,
// notifications, process tables, entity detail.

export function fmtDate(dt) {
  if (!dt) return '—';
  return new Date(dt).toLocaleString();
}

export function fmtShort(dt) {
  if (!dt) return '—';
  return (dt + '').replace('T', ' ').slice(0, 16);
}

export function fmtDuration(ms) {
  if (ms == null || ms < 0 || Number.isNaN(ms)) return '—';
  if (ms < 1000) return `${ms} ms`;
  const totalSec = Math.floor(ms / 1000);
  if (totalSec < 60) return `${totalSec}s`;
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  if (m < 60) return s ? `${m}m ${s}s` : `${m}m`;
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return mm ? `${h}h ${mm}m` : `${h}h`;
}

export function processDurationMs(p, now = Date.now()) {
  if (!p) return null;
  const created = p.created || p.actionCreated;
  const started = p.actionStarted || p.startDate || created;
  const finished = p.actionFinished || p.endDate;
  const startTs = new Date(started || created).getTime();
  if (Number.isNaN(startTs)) return null;
  const endTs = finished ? new Date(finished).getTime() : now;
  return endTs - startTs;
}

export function processQueuedMs(p) {
  if (!p) return null;
  const created = p.created || p.actionCreated;
  const started = p.actionStarted || p.startDate;
  if (!created || !started) return null;
  return new Date(started).getTime() - new Date(created).getTime();
}

const TERMINAL = new Set(['FINISHED', 'FAILED', 'CANCELED', 'CANCELLED', 'DONE', 'SUCCESS']);
const PENDING = new Set(['PENDING', 'WAITING', 'CREATED', 'QUEUED']);

export function statusKind(s) {
  if (!s) return 'unknown';
  const v = String(s).toUpperCase();
  if (v === 'FAILED' || v.includes('FAIL')) return 'failed';
  if (v === 'CANCELED' || v === 'CANCELLED' || v.includes('CANCEL')) return 'canceled';
  if (TERMINAL.has(v) || v.includes('FINISH') || v === 'ACTIVE') return 'finished';
  if (v === 'RUNNING' || v.includes('DEPLOY') || v.includes('BUILD')) return 'running';
  if (PENDING.has(v) || v.includes('WAIT') || v.includes('QUEUE')) return 'waiting';
  return 'unknown';
}

export function statusFromProcess(p) {
  if (!p) return 'unknown';
  if (p.actionFinished || p.endDate) {
    if (p.errorMessage || /fail/i.test(p.status || p.actionStatus || '')) return 'failed';
    if (/canc/i.test(p.status || p.actionStatus || '')) return 'canceled';
    return 'finished';
  }
  if (p.actionStarted || p.startDate) return 'running';
  return statusKind(p.status || p.actionStatus);
}

export function statusLabel(p) {
  return p?.status || p?.actionStatus || (p?.actionFinished ? 'FINISHED' : (p?.actionStarted ? 'RUNNING' : 'WAITING'));
}

export function isInflight(p) {
  const k = statusFromProcess(p);
  return k === 'running' || k === 'waiting';
}
