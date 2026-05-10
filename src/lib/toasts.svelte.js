// Toast store. Push transient feedback bubbles from anywhere in the app —
// the layer in App.svelte renders them.

let nextId = 1;

export const toasts = $state({ items: [] });

export function pushToast({ kind = 'info', title, body = '', timeoutMs = 4000, id } = {}) {
  const tId = id ?? nextId++;
  const existingIdx = toasts.items.findIndex((t) => t.id === tId);
  const next = { id: tId, kind, title, body, createdAt: Date.now() };
  if (existingIdx >= 0) toasts.items[existingIdx] = next;
  else toasts.items = [...toasts.items, next];
  if (timeoutMs > 0) {
    setTimeout(() => dismiss(tId), timeoutMs);
  }
  return tId;
}

export function dismiss(id) {
  toasts.items = toasts.items.filter((t) => t.id !== id);
}

export const toast = {
  info: (title, body) => pushToast({ kind: 'info', title, body }),
  success: (title, body) => pushToast({ kind: 'success', title, body }),
  error: (title, body) => pushToast({ kind: 'error', title, body, timeoutMs: 8000 }),
  // Pinned toast (no auto-dismiss) — used by process tracker.
  pinned: (id, props) => pushToast({ ...props, id, timeoutMs: 0 }),
};
