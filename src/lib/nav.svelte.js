// View routing — keeps the current selection (org/project/stack/container)
// plus the active tab inside each level. Plain $state, no router lib.

export const nav = $state({
  view: 'user', // user | org | project | stack | container | notifications
  org: null,    // { id, accountName }
  project: null, // { id, name }
  stack: null,  // { id, name, type }
  container: null, // { id, number, hostname }
  tab: 'list',  // active tab id within the current view
});

export function goUser() {
  nav.view = 'user';
  nav.org = null;
  nav.project = null;
  nav.stack = null;
  nav.container = null;
  nav.tab = 'clients';
}

export function goOrg(org) {
  nav.view = 'org';
  nav.org = org;
  nav.project = null;
  nav.stack = null;
  nav.container = null;
  nav.tab = 'projects';
}

export function goProject(project, org) {
  nav.view = 'project';
  if (org) nav.org = org;
  nav.project = project;
  nav.stack = null;
  nav.container = null;
  nav.tab = 'stacks';
}

export function goStack(stack, project, org) {
  nav.view = 'stack';
  if (org) nav.org = org;
  if (project) nav.project = project;
  nav.stack = stack;
  nav.container = null;
  nav.tab = 'containers';
}

export function goContainer(container, stack, project, org) {
  nav.view = 'container';
  if (org) nav.org = org;
  if (project) nav.project = project;
  if (stack) nav.stack = stack;
  nav.container = container;
  nav.tab = 'overview';
}

export function goNotifications(org) {
  nav.view = 'notifications';
  if (org) nav.org = org;
  nav.project = null;
  nav.stack = null;
  nav.container = null;
  nav.tab = 'all';
}

export function setTab(tabId) {
  nav.tab = tabId;
}
