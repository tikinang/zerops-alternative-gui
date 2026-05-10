const KEY = 'zag.auth.v1';

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function save(data) {
  if (data) localStorage.setItem(KEY, JSON.stringify(data));
  else localStorage.removeItem(KEY);
}

const initial = load();

export const auth = $state({
  accessToken: initial?.accessToken || null,
  refreshToken: initial?.refreshToken || null,
  expiresAt: initial?.expiresAt || null,
  tokenType: initial?.tokenType || null,
  twoFAMethods: initial?.twoFAMethods || null,
  twoFAVerified: initial?.twoFAVerified ?? null,
});

function persist() {
  save({
    accessToken: auth.accessToken,
    refreshToken: auth.refreshToken,
    expiresAt: auth.expiresAt,
    tokenType: auth.tokenType,
    twoFAMethods: auth.twoFAMethods,
    twoFAVerified: auth.twoFAVerified,
  });
}

function pending2FA(a) {
  return (a.twoFAMethods || []).length > 0 && a.twoFAVerified !== true;
}

export const token = {
  get value() { return auth.accessToken; },
  get loggedIn() {
    if (!auth.accessToken) return false;
    if (pending2FA(auth)) return false;
    return true;
  },
  get pending2FA() { return !!auth.accessToken && pending2FA(auth); },
};

export function setAuth(payload) {
  auth.accessToken = payload.accessToken;
  auth.refreshToken = payload.refreshToken || null;
  auth.expiresAt = payload.expiresAt;
  auth.tokenType = payload.tokenType;
  auth.twoFAMethods = payload.twoFAMethods || null;
  auth.twoFAVerified = payload.twoFAVerified ?? null;
  persist();
}

export function clearAuth() {
  auth.accessToken = null;
  auth.refreshToken = null;
  auth.expiresAt = null;
  auth.tokenType = null;
  auth.twoFAMethods = null;
  auth.twoFAVerified = null;
  save(null);
}
