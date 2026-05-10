import { token, clearAuth } from './auth.svelte.js';

const BASE = (import.meta.env.VITE_API_URL || 'https://api.app-ranpu.zerops.dev').replace(/\/$/, '');

let on401 = null;
export function setOn401(cb) { on401 = cb; }

async function call(method, path, body, { auth = true } = {}) {
  const headers = {};
  const hasBody = body !== undefined && body !== null;
  if (hasBody) headers['Content-Type'] = 'application/json';
  if (auth) {
    const t = token.value;
    if (t) headers['Authorization'] = `Bearer ${t}`;
  }
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: hasBody ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!res.ok) {
    if (res.status === 401 && auth) {
      clearAuth();
      try { on401?.(); } catch {}
    }
    const err = new Error(extractError(data, res.status));
    err.status = res.status;
    err.payload = data;
    throw err;
  }
  return data;
}

// Real Zerops error envelope:
//   { "error": { "code": "...", "message": "...", "meta": [{ "error", "code", "metadata" }] } }
// (verified against the live ranpu API, 2026-05-10).
//
// Some endpoints flatten into { error: "string", meta: [...] }; we handle both.
function extractError(data, status) {
  if (!data) return `HTTP ${status}`;
  if (typeof data === 'string') return data;

  const errNode = data.error;
  let message;
  let meta;
  if (errNode && typeof errNode === 'object') {
    message = errNode.message || errNode.code;
    meta = Array.isArray(errNode.meta) ? errNode.meta : null;
  } else if (typeof errNode === 'string') {
    message = errNode;
    meta = Array.isArray(data.meta) ? data.meta : null;
  } else {
    return `HTTP ${status}`;
  }

  const metadata = meta?.[0]?.metadata;
  if (metadata && typeof metadata === 'object') {
    const fields = Object.entries(metadata)
      .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
      .join('; ');
    if (fields) return `${message || `HTTP ${status}`} (${fields})`;
  }

  return message || `HTTP ${status}`;
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
  authLogout: () => call('POST', '/api/rest/public/auth/logout', undefined, { auth: false }),
  // TODO: not yet wired into the SPA. Sessions just expire to 401 → re-login.
  // Add an interceptor in call() before the 401 handler runs once we want
  // background refresh.
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
    call('PUT', `/api/rest/public/user-notification/${id}/acknowledge`),
  // Body is RequestUserNotification: { clientId, projectId?, serviceStackId? }.
  // Pass an object so callers can narrow by project/stack.
  notificationAckAll: (body) =>
    call('PUT', '/api/rest/public/user-notification/acknowledge-all',
      typeof body === 'string' ? { clientId: body } : body),

  // ---------------- Project listing & detail ----------------
  clientProjects: (clientId, params) =>
    call('GET', `/api/rest/public/client/${clientId}/project${qs(params)}`),
  projectsByName: (clientId, name) =>
    call('GET', `/api/rest/public/client/${clientId}/projects-by-name/${encodeURIComponent(name)}`),
  projectCreate: (clientId, body) =>
    call('POST', `/api/rest/public/client/${clientId}/project`, body),
  project: (id) => call('GET', `/api/rest/public/project/${id}`),
  projectDelete: (id) => call('DELETE', `/api/rest/public/project/${id}`),
  projectLog: (id, params) =>
    call('GET', `/api/rest/public/project/${id}/log${qs(params)}`),
  projectProcesses: (id, params) =>
    call('GET', `/api/rest/public/project/${id}/process${qs(params)}`),
  projectHttpRouting: (id) =>
    call('GET', `/api/rest/public/project/${id}/public-http-routing`),
  projectHttpRoutingCreate: (id, body) =>
    call('POST', `/api/rest/public/project/${id}/public-http-routing`, body),
  projectEnvFile: (id) => call('GET', `/api/rest/public/project/${id}/env-file`),
  projectEnvFileDownload: (id) => call('GET', `/api/rest/public/project/${id}/env-file-download`),
  projectEnvFileReplace: (id, envFile) =>
    call('PUT', `/api/rest/public/project/${id}/env/file`, { envFile }),
  projectEnvCreate: (id, body) =>
    call('POST', `/api/rest/public/project/${id}/env`, body),
  projectStacks: (projectId, params) =>
    call('GET', `/api/rest/public/project/${projectId}/service-stack${qs(params)}`),
  projectStackImport: (projectId, body) =>
    call('POST', `/api/rest/public/project/${projectId}/service-stack/import`, body),
  projectVpnList: (id) => call('GET', `/api/rest/public/project/${id}/vpn/list`),
  projectExport: (id) => call('GET', `/api/rest/public/project/${id}/export`),
  projectStart: (id) => call('PUT', `/api/rest/public/project/${id}/start`),
  projectStop: (id) => call('PUT', `/api/rest/public/project/${id}/stop`),

  // ---------------- Project env (single record) ----------------
  projectEnv: (id) => call('GET', `/api/rest/public/project-env/${id}`),
  projectEnvUpdate: (id, body) => call('PUT', `/api/rest/public/project-env/${id}`, body),
  projectEnvDelete: (id) => call('DELETE', `/api/rest/public/project-env/${id}`),

  // ---------------- HTTP routing (single record) ----------------
  httpRouting: (id) => call('GET', `/api/rest/public/public-http-routing/${id}`),
  httpRoutingUpdate: (id, body) =>
    call('PUT', `/api/rest/public/public-http-routing/${id}`, body),
  httpRoutingDelete: (id) =>
    call('DELETE', `/api/rest/public/public-http-routing/${id}`),

  // ---------------- Service stack ----------------
  stacksByName: (projectId, name) =>
    call('GET', `/api/rest/public/service-stack-by-name/${projectId}/${encodeURIComponent(name)}`),
  serviceStack: (id) => call('GET', `/api/rest/public/service-stack/${id}`),
  stackDelete: (id) => call('DELETE', `/api/rest/public/service-stack/${id}`),
  stackContainers: (id, params) =>
    call('GET', `/api/rest/public/service-stack/${id}/container${qs(params)}`),
  // Note: /service-stack/{id}/env returns the resolved effective env. The
  // SPA reads env vars from /service-stack/{id}/user-data instead because
  // those records are CRUD-able (id, type=READ_ONLY|EDITABLE|SECRET|ENV).
  stackProcesses: (id, params) =>
    call('GET', `/api/rest/public/service-stack/${id}/process${qs(params)}`),
  stackAppVersions: (id, params) =>
    call('GET', `/api/rest/public/service-stack/${id}/app-version${qs(params)}`),
  stackBackups: (id) => call('GET', `/api/rest/public/service-stack/${id}/backup`),
  stackPortRouting: (id) =>
    call('GET', `/api/rest/public/service-stack/${id}/public-port-routing`),
  stackPortRoutingCreate: (id, body) =>
    call('POST', `/api/rest/public/service-stack/${id}/public-port-routing`, body),
  stackUserData: (id, params) =>
    call('GET', `/api/rest/public/service-stack/${id}/user-data${qs(params)}`),
  stackUserDataCreate: (id, body) =>
    call('POST', `/api/rest/public/service-stack/${id}/user-data`, body),
  stackService: (id) => call('GET', `/api/rest/public/service-stack/${id}/service`),
  stackNginxConf: (id) => call('GET', `/api/rest/public/service-stack/${id}/nginx-conf`),
  stackExternalRepoStatus: (id) =>
    call('GET', `/api/rest/public/service-stack/${id}/external-repository-integration-status`),

  // Stack lifecycle / config mutations (return Process)
  stackStart: (id) => call('PUT', `/api/rest/public/service-stack/${id}/start`),
  stackStop: (id) => call('PUT', `/api/rest/public/service-stack/${id}/stop`),
  stackRestart: (id) => call('PUT', `/api/rest/public/service-stack/${id}/restart`),
  stackReload: (id) => call('PUT', `/api/rest/public/service-stack/${id}/reload`),
  stackEnableSubdomain: (id) =>
    call('PUT', `/api/rest/public/service-stack/${id}/enable-subdomain-access`),
  stackDisableSubdomain: (id) =>
    call('PUT', `/api/rest/public/service-stack/${id}/disable-subdomain-access`),
  stackBuildCacheClear: (id) =>
    call('DELETE', `/api/rest/public/service-stack/${id}/build-cache`),
  stackFileBrowsing: (id) =>
    call('POST', `/api/rest/public/service-stack/${id}/file-browsing-access`, {}),

  // ---------------- Single user-data record (stack env) ----------------
  userData: (id) => call('GET', `/api/rest/public/user-data/${id}`),
  userDataUpdate: (id, body) => call('PUT', `/api/rest/public/user-data/${id}`, body),
  userDataDelete: (id) => call('DELETE', `/api/rest/public/user-data/${id}`),

  // ---------------- Public port routing (single record) ----------------
  portRouting: (id) => call('GET', `/api/rest/public/public-port-routing/${id}`),
  portRoutingUpdate: (id, body) =>
    call('PUT', `/api/rest/public/public-port-routing/${id}`, body),
  portRoutingDelete: (id) =>
    call('DELETE', `/api/rest/public/public-port-routing/${id}`),

  // ---------------- App-version (single record) ----------------
  appVersion: (id) => call('GET', `/api/rest/public/app-version/${id}`),
  appVersionAppCode: (id) => call('GET', `/api/rest/public/app-version/${id}/app-code`),

  // ---------------- Process polling / cancel ----------------
  process: (id) => call('GET', `/api/rest/public/process/${id}`),
  processCancel: (id) => call('PUT', `/api/rest/public/process/${id}/cancel`),

  // ---------------- Misc ----------------
  regions: () => call('GET', '/api/rest/public/region'),
  settings: () => call('GET', '/api/rest/public/settings'),
};
