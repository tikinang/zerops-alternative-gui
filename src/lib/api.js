import { token, clearAuth } from './auth.svelte.js';

const BASE = (import.meta.env.VITE_API_URL || 'https://api.app-ranpu.zerops.dev').replace(/\/$/, '');

let on401 = null;
export function setOn401(cb) { on401 = cb; }

async function call(method, path, body, { auth = true } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth) {
    const t = token.value;
    if (t) headers['Authorization'] = `Bearer ${t}`;
  }
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!res.ok) {
    if (res.status === 401 && auth) {
      clearAuth();
      try { on401?.(); } catch {}
    }
    const err = new Error((data && data.error) || `HTTP ${res.status}`);
    err.status = res.status;
    err.payload = data;
    throw err;
  }
  return data;
}

const qs = (params) => {
  const usp = new URLSearchParams();
  for (const [k, v] of Object.entries(params || {})) {
    if (v === undefined || v === null || v === '') continue;
    if (Array.isArray(v)) v.forEach((x) => usp.append(k, x));
    else usp.set(k, v);
  }
  const s = usp.toString();
  return s ? `?${s}` : '';
};

export const api = {
  base: BASE,

  // ---------------- Auth ----------------
  authLogin: (email, password) =>
    call('POST', '/api/rest/public/auth/login', { email, password }, { auth: false }),
  totpLogin: (totpToken) =>
    call('POST', '/api/rest/public/2fa/totp/login', { token: totpToken }),
  authLogout: () => call('POST', '/api/rest/public/auth/logout', null, { auth: false }),
  authRefresh: (refreshTokenId) =>
    call('POST', '/api/rest/public/auth/refresh', { refreshTokenId }, { auth: false }),
  authInfo: () => call('GET', '/api/rest/public/auth/info'),

  // ---------------- User / tokens ----------------
  userInfo: () => call('GET', '/api/rest/public/user/info'),
  userTokens: () => call('GET', '/api/rest/public/user-token/list'),

  // ---------------- Client (Organization) ----------------
  client: (id) => call('GET', `/api/rest/public/client/${id}`),
  clientBilling: (id) => call('GET', `/api/rest/public/client/${id}/billing-info`),
  clientBillingStatus: (id) => call('GET', `/api/rest/public/billing/client/${id}/status`),
  clientUsers: (id) => call('GET', `/api/rest/public/client/${id}/user/list`),
  clientNotifications: (id, params) =>
    call('GET', `/api/rest/public/client/${id}/user-notification${qs(params)}`),
  clientIntegrationTokens: (id) =>
    call('GET', `/api/rest/public/client/${id}/integration-token/list`),

  // ---------------- Notifications (per-record actions) ----------------
  notification: (id) => call('GET', `/api/rest/public/user-notification/${id}`),
  notificationAck: (id) =>
    call('PUT', `/api/rest/public/user-notification/${id}/acknowledge`, null),
  notificationAckAll: () =>
    call('PUT', '/api/rest/public/user-notification/acknowledge-all', null),

  // ---------------- Project listing & detail ----------------
  clientProjects: (clientId, params) =>
    call('GET', `/api/rest/public/client/${clientId}/project${qs(params)}`),
  projectsByName: (clientId, name) =>
    call('GET', `/api/rest/public/client/${clientId}/projects-by-name/${encodeURIComponent(name)}`),
  project: (id) => call('GET', `/api/rest/public/project/${id}`),
  projectLog: (id, params) =>
    call('GET', `/api/rest/public/project/${id}/log${qs(params)}`),
  projectProcesses: (id, params) =>
    call('GET', `/api/rest/public/project/${id}/process${qs(params)}`),
  projectHttpRouting: (id) =>
    call('GET', `/api/rest/public/project/${id}/public-http-routing`),
  projectEnvFile: (id) => call('GET', `/api/rest/public/project/${id}/env-file`),
  projectEnvFileDownload: (id) => call('GET', `/api/rest/public/project/${id}/env-file-download`),
  projectStacks: (projectId, params) =>
    call('GET', `/api/rest/public/project/${projectId}/service-stack${qs(params)}`),
  projectVpnList: (id) => call('GET', `/api/rest/public/project/${id}/vpn/list`),
  projectExport: (id) => call('GET', `/api/rest/public/project/${id}/export`),
  projectStart: (id) => call('PUT', `/api/rest/public/project/${id}/start`, null),
  projectStop: (id) => call('PUT', `/api/rest/public/project/${id}/stop`, null),

  // ---------------- Service stack ----------------
  stacksByName: (projectId, name) =>
    call('GET', `/api/rest/public/service-stack-by-name/${projectId}/${encodeURIComponent(name)}`),
  serviceStack: (id) => call('GET', `/api/rest/public/service-stack/${id}`),
  stackContainers: (id, params) =>
    call('GET', `/api/rest/public/service-stack/${id}/container${qs(params)}`),
  stackEnv: (id) => call('GET', `/api/rest/public/service-stack/${id}/env`),
  stackProcesses: (id, params) =>
    call('GET', `/api/rest/public/service-stack/${id}/process${qs(params)}`),
  stackAppVersions: (id, params) =>
    call('GET', `/api/rest/public/service-stack/${id}/app-version${qs(params)}`),
  stackBackups: (id) => call('GET', `/api/rest/public/service-stack/${id}/backup`),
  stackPortRouting: (id) =>
    call('GET', `/api/rest/public/service-stack/${id}/public-port-routing`),
  stackUserData: (id, params) =>
    call('GET', `/api/rest/public/service-stack/${id}/user-data${qs(params)}`),
  stackService: (id) => call('GET', `/api/rest/public/service-stack/${id}/service`),
  stackNginxConf: (id) => call('GET', `/api/rest/public/service-stack/${id}/nginx-conf`),
  stackExternalRepoStatus: (id) =>
    call('GET', `/api/rest/public/service-stack/${id}/external-repository-integration-status`),

  // Stack lifecycle / config mutations (return Process)
  stackStart: (id) => call('PUT', `/api/rest/public/service-stack/${id}/start`, null),
  stackStop: (id) => call('PUT', `/api/rest/public/service-stack/${id}/stop`, null),
  stackRestart: (id) => call('PUT', `/api/rest/public/service-stack/${id}/restart`, null),
  stackReload: (id) => call('PUT', `/api/rest/public/service-stack/${id}/reload`, null),
  stackEnableSubdomain: (id) =>
    call('PUT', `/api/rest/public/service-stack/${id}/enable-subdomain-access`, null),
  stackDisableSubdomain: (id) =>
    call('PUT', `/api/rest/public/service-stack/${id}/disable-subdomain-access`, null),
  stackBuildCacheClear: (id) =>
    call('DELETE', `/api/rest/public/service-stack/${id}/build-cache`),
  stackFileBrowsing: (id) =>
    call('POST', `/api/rest/public/service-stack/${id}/file-browsing-access`, {}),

  // ---------------- Process polling / cancel ----------------
  process: (id) => call('GET', `/api/rest/public/process/${id}`),
  processCancel: (id) => call('PUT', `/api/rest/public/process/${id}/cancel`, null),

  // ---------------- Misc ----------------
  regions: () => call('GET', '/api/rest/public/region'),
  settings: () => call('GET', '/api/rest/public/settings'),
};
