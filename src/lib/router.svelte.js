import { nav } from './nav.svelte.js';

// URL shape:
//   /                                                    -> User
//   /o/<orgId>                                           -> Organization
//   /o/<orgId>/notifications                             -> Notifications
//   /o/<orgId>/p/<projectId>                             -> Project
//   /o/<orgId>/p/<projectId>/s/<stackId>                 -> Stack
//   /o/<orgId>/p/<projectId>/s/<stackId>/c/<containerId> -> Container
// Tab is encoded as ?tab=<id>.

export function parseLocation() {
  const segs = window.location.pathname.split('/').filter(Boolean);
  const tab = new URLSearchParams(window.location.search).get('tab') || null;

  let view = 'user', orgId = null, projectId = null, stackId = null, containerId = null;
  if (segs[0] === 'o' && segs[1]) {
    view = 'org'; orgId = segs[1];
    if (segs[2] === 'notifications') {
      view = 'notifications';
    } else if (segs[2] === 'p' && segs[3]) {
      view = 'project'; projectId = segs[3];
      if (segs[4] === 's' && segs[5]) {
        view = 'stack'; stackId = segs[5];
        if (segs[6] === 'c' && segs[7]) {
          view = 'container'; containerId = segs[7];
        }
      }
    }
  }
  return { view, orgId, projectId, stackId, containerId, tab };
}

const DEFAULT_TAB = {
  user: 'clients',
  org: 'projects',
  project: 'stacks',
  stack: 'containers',
  container: 'overview',
  notifications: 'all',
};

export function buildPath(view, orgId, projectId, stackId, containerId, tab) {
  let p = '/';
  if (view !== 'user' && orgId) {
    p = `/o/${orgId}`;
    if (view === 'notifications') {
      p += '/notifications';
    } else if (view !== 'org' && projectId) {
      p += `/p/${projectId}`;
      if (view !== 'project' && stackId) {
        p += `/s/${stackId}`;
        if (view === 'container' && containerId) {
          p += `/c/${containerId}`;
        }
      }
    }
  }
  if (tab && tab !== DEFAULT_TAB[view]) p += `?tab=${encodeURIComponent(tab)}`;
  return p;
}

let suppress = false;

export function syncFromUrl() {
  const parsed = parseLocation();
  suppress = true;
  try {
    if (parsed.view === 'user') {
      nav.org = null; nav.project = null; nav.stack = null; nav.container = null;
    } else {
      if (parsed.orgId && (!nav.org || nav.org.id !== parsed.orgId)) {
        nav.org = { id: parsed.orgId, accountName: null };
      }
      if (parsed.projectId && (!nav.project || nav.project.id !== parsed.projectId)) {
        nav.project = { id: parsed.projectId, name: null };
      }
      if (parsed.stackId && (!nav.stack || nav.stack.id !== parsed.stackId)) {
        nav.stack = { id: parsed.stackId, name: null, type: null };
      }
      if (parsed.containerId && (!nav.container || nav.container.id !== parsed.containerId)) {
        nav.container = { id: parsed.containerId, number: null, hostname: null };
      }
      if (parsed.view === 'org' || parsed.view === 'notifications') { nav.project = null; nav.stack = null; nav.container = null; }
      else if (parsed.view === 'project') { nav.stack = null; nav.container = null; }
      else if (parsed.view === 'stack') { nav.container = null; }
    }
    nav.view = parsed.view;
    if (parsed.tab) nav.tab = parsed.tab;
  } finally {
    suppress = false;
  }
}

export function syncToUrl() {
  if (suppress) return;
  const next = buildPath(
    nav.view, nav.org?.id, nav.project?.id, nav.stack?.id, nav.container?.id, nav.tab,
  );
  const cur = window.location.pathname + window.location.search;
  if (next !== cur) history.pushState(null, '', next);
}

export function initRouter() {
  syncFromUrl();
  window.addEventListener('popstate', syncFromUrl);
}
