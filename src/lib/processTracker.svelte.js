// Tracks in-flight platform actions. Most stack/project mutation endpoints
// return an OutDtoProcess. Hand it to track(); we poll /process/{id} until
// the status flips to a terminal one, then pop a toast + refresh the
// activity log (which is where finished processes turn into notifications).

import { api } from './api.js';
import { toast, dismiss } from './toasts.svelte.js';
import { activity } from './activity.svelte.js';

const TERMINAL = new Set(['FINISHED', 'FAILED', 'CANCELED', 'CANCELLED']);
const POLL_MS = 2000;
const TIMEOUT_MS = 5 * 60 * 1000;

const tracked = new Map();

export const tracker = $state({ inflight: [] });

function syncInflight() {
  tracker.inflight = Array.from(tracked.values()).map((t) => ({
    id: t.id,
    actionName: t.process.actionName,
    status: t.process.status,
    started: t.startedAt,
  }));
}

export function track(process, { onFinished, label } = {}) {
  if (!process || !process.id) return null;
  if (tracked.has(process.id)) return process.id;

  const startedAt = Date.now();
  const toastId = toast.pinned(`p-${process.id}`, {
    kind: 'info',
    title: label || process.actionName || 'Working…',
    body: `Status: ${process.status || 'PENDING'}`,
  });

  const entry = { id: process.id, process, startedAt, toastId, onFinished };
  tracked.set(process.id, entry);
  syncInflight();
  poll(process.id);
  return process.id;
}

async function poll(id) {
  const entry = tracked.get(id);
  if (!entry) return;

  try {
    const fresh = await api.process(id);
    entry.process = fresh;
    syncInflight();

    if (TERMINAL.has(fresh.status)) {
      tracked.delete(id);
      syncInflight();
      dismiss(entry.toastId);
      const ok = fresh.status === 'FINISHED';
      const fail = fresh.status === 'FAILED';
      (ok ? toast.success : fail ? toast.error : toast.info)(
        fresh.actionName || 'Process',
        `${fresh.status}${fresh.errorMessage ? ` — ${fresh.errorMessage}` : ''}`,
      );
      activity.refresh().catch(() => {});
      try { entry.onFinished?.(fresh); } catch {}
      return;
    }

    // Still in flight — bump the pinned toast with the latest status.
    toast.pinned(`p-${entry.process.id}`, {
      kind: 'info',
      title: entry.process.actionName || 'Working…',
      body: `Status: ${entry.process.status || 'RUNNING'}`,
    });

    if (Date.now() - entry.startedAt > TIMEOUT_MS) {
      tracked.delete(id);
      syncInflight();
      dismiss(entry.toastId);
      toast.error(entry.process.actionName || 'Process', 'Polling timed out.');
      return;
    }

    setTimeout(() => poll(id), POLL_MS);
  } catch (err) {
    tracked.delete(id);
    syncInflight();
    dismiss(entry.toastId);
    toast.error(entry.process.actionName || 'Process', err?.message || 'Polling failed');
  }
}
