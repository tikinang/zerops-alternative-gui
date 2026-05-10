import { api } from './api.js';
import { token } from './auth.svelte.js';

export const userStore = $state({
  data: null,
  loading: false,
  error: null,
});

let inflight = null;

export function loadUser({ force = false } = {}) {
  if (!token.loggedIn) return Promise.resolve(null);
  if (!force && userStore.data) return Promise.resolve(userStore.data);
  if (inflight) return inflight;

  userStore.loading = true;
  userStore.error = null;
  inflight = api.userInfo()
    .then((d) => { userStore.data = d; return d; })
    .catch((e) => { userStore.error = e?.message || 'Failed to load user info'; throw e; })
    .finally(() => { userStore.loading = false; inflight = null; });
  return inflight;
}

export function clearUser() {
  userStore.data = null;
  userStore.error = null;
}

export function findClientById(id) {
  return userStore.data?.clientUserList?.find((cu) => cu.client?.id === id)?.client || null;
}
