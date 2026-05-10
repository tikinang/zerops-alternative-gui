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
  refresh,
  setClient,
});

let pollHandle = null;

function setClient(id) {
  if (activity.clientId === id) return;
  activity.clientId = id;
  activity.list = [];
  activity.totalCount = 0;
  activity.error = null;
  refresh().catch(() => {});
  startPolling();
}

async function refresh({ limit = 50 } = {}) {
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

export async function acknowledgeAll() {
  if (!activity.clientId) return;
  await api.notificationAckAll(activity.clientId);
  activity.list = activity.list.map((n) => ({ ...n, acknowledged: true }));
}
