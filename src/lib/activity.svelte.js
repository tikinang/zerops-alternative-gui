// Notification / activity store. Every finished platform process surfaces
// here as a notification — this is the activity log surface for the GUI.
// The tracker calls activity.refresh() once a process terminates; the
// header bell + Notifications page subscribe to the same state.

import { api } from './api.js';
import { token } from './auth.svelte.js';

const POLL_MS = 30_000;

export const activity = $state({
  clientId: null,
  list: [],
  totalCount: 0,
  loading: false,
  error: null,
  lastLoaded: 0,
});

let pollHandle = null;

export function setClient(id) {
  if (activity.clientId === id) return;
  activity.clientId = id;
  activity.list = [];
  activity.totalCount = 0;
  activity.error = null;
  refresh().catch(() => {});
  startPolling();
}

export async function refresh({ limit = 50 } = {}) {
  if (!activity.clientId || !token.loggedIn) return;
  activity.loading = true;
  activity.error = null;
  try {
    const data = await api.clientNotifications(activity.clientId, { limit });
    activity.list = data?.list || [];
    activity.totalCount = data?.totalCount ?? activity.list.length;
    activity.lastLoaded = Date.now();
  } catch (e) {
    activity.error = e?.message || 'Failed to load notifications';
  } finally {
    activity.loading = false;
  }
}

export function clearActivity() {
  activity.clientId = null;
  activity.list = [];
  activity.totalCount = 0;
  activity.error = null;
  activity.lastLoaded = 0;
  if (pollHandle) {
    clearInterval(pollHandle);
    pollHandle = null;
  }
}

function startPolling() {
  if (pollHandle) clearInterval(pollHandle);
  pollHandle = setInterval(() => {
    if (token.loggedIn && activity.clientId) refresh().catch(() => {});
  }, POLL_MS);
}

export function unreadNotifications() {
  return activity.list.filter((n) => !n.acknowledged);
}

export async function acknowledge(id) {
  await api.notificationAck(id);
  const idx = activity.list.findIndex((n) => n.id === id);
  if (idx >= 0) {
    activity.list[idx] = { ...activity.list[idx], acknowledged: true };
    activity.list = [...activity.list];
  }
}

// Acknowledge all notifications, optionally narrowed by project / stack.
// Call signature: acknowledgeAll() acks everything in the org;
// acknowledgeAll({ projectId, serviceStackId }) narrows the scope.
export async function acknowledgeAll(scope = {}) {
  if (!activity.clientId) return;
  const body = { clientId: activity.clientId };
  if (scope.projectId) body.projectId = scope.projectId;
  if (scope.serviceStackId) body.serviceStackId = scope.serviceStackId;
  await api.notificationAckAll(body);
  // Optimistically mark — the server will eventually push the same state on
  // the next poll, but the user sees the change immediately.
  activity.list = activity.list.map((n) => {
    if (scope.projectId && n.projectId !== scope.projectId) return n;
    if (scope.serviceStackId && !(n.serviceStacks || []).some((s) => s.id === scope.serviceStackId)) return n;
    return { ...n, acknowledged: true };
  });
}
