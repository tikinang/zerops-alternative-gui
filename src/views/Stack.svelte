<script>
  import Tabs from '../components/Tabs.svelte';
  import Table from '../components/Table.svelte';
  import Button from '../components/Button.svelte';
  import StatusChip from '../components/StatusChip.svelte';
  import Duration from '../components/Duration.svelte';
  import StackActions from '../components/StackActions.svelte';
  import AppVersionDetail from '../components/AppVersionDetail.svelte';
  import EnvVarForm from '../components/EnvVarForm.svelte';
  import PortRoutingForm from '../components/PortRoutingForm.svelte';
  import EntityDetail from '../components/EntityDetail.svelte';
  import Confirm from '../components/Confirm.svelte';
  import { api } from '../lib/api.js';
  import { toast } from '../lib/toasts.svelte.js';
  import { track } from '../lib/processTracker.svelte.js';
  import { nav, setTab, goContainer } from '../lib/nav.svelte.js';
  import { findClientById, loadUser } from '../lib/userStore.svelte.js';
  import { fmtShort } from '../lib/format.js';

  const tabs = [
    { id: 'containers', label: 'Containers' },
    { id: 'processes', label: 'Processes' },
    { id: 'pipelines', label: 'Pipelines & CI/CD' },
    { id: 'env', label: 'Environment variables' },
    { id: 'service', label: 'Service info' },
    { id: 'routing', label: 'Port routing' },
    { id: 'backups', label: 'Backups' },
    { id: 'scaling', label: 'Scaling' },
    { id: 'logs', label: 'Logs' },
  ];

  let active = $state(nav.tab && tabs.some((t) => t.id === nav.tab) ? nav.tab : 'containers');
  // Mirror nav.tab → active so browser back / popstate keeps the rendered
  // tab in sync with the URL. The forward direction (tab click → nav.tab)
  // happens via the Tabs onChange callback.
  $effect(() => {
    if (nav.tab && nav.tab !== active && tabs.some((t) => t.id === nav.tab)) {
      active = nav.tab;
    }
  });
  let detail = $state(null);
  let detailLoading = $state(true);
  let detailError = $state('');

  let containers = $state([]); let containersLoading = $state(false); let containersError = $state('');
  let processes = $state([]); let processesLoading = $state(false); let processesError = $state('');
  let portRouting = $state([]); let portLoading = $state(false); let portError = $state('');
  let appVersions = $state([]); let avLoading = $state(false); let avError = $state('');
  let backups = $state(null); let backupsLoading = $state(false); let backupsError = $state('');
  let envVars = $state([]); let envLoading = $state(false); let envError = $state('');
  let revealedKeys = $state(new Set());
  let envFilter = $state('user'); // user | all
  let logInfo = $state(null); let logLoading = $state(false); let logError = $state('');
  let serviceInfo = $state(null); let serviceLoading = $state(false); let serviceError = $state('');

  let selectedAppVersion = $state(null);
  let appVersionOpen = $state(false);

  let envFormOpen = $state(false);
  let envFormMode = $state('create');
  let envFormRecord = $state(null);

  let portFormOpen = $state(false);
  let portFormMode = $state('create');
  let portFormRecord = $state(null);

  let confirmState = $state({ open: false, title: '', body: '', blastRadius: '', danger: false, action: null, label: 'Confirm' });
  let processDetailOpen = $state(false);
  let processDetailEntity = $state(null);

  let loadedFor = { containers: null, processes: null, routing: null, pipelines: null, backups: null, env: null, logs: null, service: null };

  function loadDetail() {
    if (!nav.stack?.id) return;
    detailLoading = true; detailError = '';
    api.serviceStack(nav.stack.id)
      .then((d) => {
        detail = d;
        const stackType = d?.serviceStackTypeInfo?.serviceStackTypeName || d?.serviceStackTypeId || nav.stack.type || null;
        if (!nav.stack.name || !nav.stack.type) {
          nav.stack = { id: d.id, name: d.name, type: stackType };
        }
        if (d.project && (!nav.project || nav.project.id !== d.projectId || !nav.project.name)) {
          nav.project = { id: d.projectId, name: d.project.name };
        }
        const clientId = d.project?.clientId;
        if (clientId && (!nav.org || nav.org.id !== clientId || !nav.org.accountName)) {
          loadUser().then(() => {
            const c = findClientById(clientId);
            nav.org = { id: clientId, accountName: c?.accountName || null };
          }).catch(() => {
            nav.org = { id: clientId, accountName: null };
          });
        }
      })
      .catch((e) => { detailError = e?.message || 'Failed to load stack'; })
      .finally(() => { detailLoading = false; });
  }

  $effect(() => { loadDetail(); });

  $effect(() => {
    const id = nav.stack?.id;
    if (!id) return;
    if (active === 'containers' && loadedFor.containers !== id) { loadedFor.containers = id; loadContainers(id); }
    else if (active === 'processes' && loadedFor.processes !== id) { loadedFor.processes = id; loadProcesses(id); }
    else if (active === 'routing' && loadedFor.routing !== id) { loadedFor.routing = id; loadPortRouting(id); }
    else if (active === 'pipelines' && loadedFor.pipelines !== id) { loadedFor.pipelines = id; loadAppVersions(id); }
    else if (active === 'backups' && loadedFor.backups !== id) { loadedFor.backups = id; loadBackups(id); }
    else if (active === 'env' && loadedFor.env !== id) { loadedFor.env = id; loadEnv(id); }
    else if (active === 'service' && loadedFor.service !== id) { loadedFor.service = id; loadService(id); }
    else if (active === 'logs' && loadedFor.logs !== id && nav.project?.id) { loadedFor.logs = id; loadLog(nav.project.id); }
  });

  function refreshActive() {
    const id = nav.stack?.id; if (!id) return;
    loadedFor = { ...loadedFor, [active]: null };
    if (active === 'containers') loadContainers(id);
    else if (active === 'processes') loadProcesses(id);
    else if (active === 'routing') loadPortRouting(id);
    else if (active === 'pipelines') loadAppVersions(id);
    else if (active === 'backups') loadBackups(id);
    else if (active === 'env') loadEnv(id);
    else if (active === 'service') loadService(id);
    else if (active === 'logs' && nav.project?.id) loadLog(nav.project.id);
  }

  async function loadContainers(id) {
    containersLoading = true; containersError = '';
    try { const d = await api.stackContainers(id, { limit: 50 }); containers = d?.list || []; }
    catch (e) { containersError = e?.message || 'Failed to load containers'; containers = []; }
    finally { containersLoading = false; }
  }
  async function loadProcesses(id) {
    processesLoading = true; processesError = '';
    try { const d = await api.stackProcesses(id, { limit: 50 }); processes = d?.list || d?.items || []; }
    catch (e) { processesError = e?.message || 'Failed to load processes'; processes = []; }
    finally { processesLoading = false; }
  }
  async function loadPortRouting(id) {
    portLoading = true; portError = '';
    try { const d = await api.stackPortRouting(id); portRouting = d?.list || []; }
    catch (e) { portError = e?.message || 'Failed to load port routing'; portRouting = []; }
    finally { portLoading = false; }
  }
  async function loadAppVersions(id) {
    avLoading = true; avError = '';
    try { const d = await api.stackAppVersions(id, { limit: 25 }); appVersions = d?.list || []; }
    catch (e) { avError = e?.message || 'Failed to load app versions'; appVersions = []; }
    finally { avLoading = false; }
  }
  async function loadBackups(id) {
    backupsLoading = true; backupsError = '';
    try { backups = await api.stackBackups(id); }
    catch (e) {
      if (e?.status === 404 || e?.status === 400) { backups = null; backupsError = ''; }
      else { backupsError = e?.message || 'Failed to load backups'; backups = null; }
    } finally { backupsLoading = false; }
  }
  async function loadEnv(id) {
    envLoading = true; envError = '';
    try {
      const d = await api.stackUserData(id, { limit: 200 });
      envVars = d?.list || d?.items || [];
    }
    catch (e) { envError = e?.message || 'Failed to load env'; envVars = []; }
    finally { envLoading = false; }
  }
  async function loadService(id) {
    serviceLoading = true; serviceError = '';
    try { serviceInfo = await api.stackService(id); }
    catch (e) {
      if (e?.status === 404) { serviceInfo = null; }
      else { serviceError = e?.message || 'Failed to load service info'; serviceInfo = null; }
    } finally { serviceLoading = false; }
  }
  async function loadLog(projectId) {
    logLoading = true; logError = '';
    try { logInfo = await api.projectLog(projectId); }
    catch (e) { logError = e?.message || 'Failed to load log endpoint'; logInfo = null; }
    finally { logLoading = false; }
  }

  // ---- Env CRUD helpers ----
  function openEnvCreate() { envFormMode = 'create'; envFormRecord = null; envFormOpen = true; }
  function openEnvEdit(rec) { envFormMode = 'edit'; envFormRecord = rec; envFormOpen = true; }
  function deleteEnv(rec) {
    confirmState = {
      open: true, title: 'Delete env variable',
      body: `Delete env variable "${rec.key}"?`,
      blastRadius: 'The variable disappears from the next container start. Existing containers keep the value until restart.',
      danger: true, label: 'Delete',
      action: async () => {
        try {
          const proc = await api.userDataDelete(rec.id);
          if (proc?.id) track(proc, { label: `Delete env ${rec.key}`, onFinished: () => { loadedFor.env = null; loadEnv(nav.stack.id); } });
          else { loadedFor.env = null; loadEnv(nav.stack.id); }
          toast.success('Delete requested', rec.key);
        } catch (e) { toast.apiError('Delete env failed', e); }
      },
    };
  }

  // ---- Port routing CRUD ----
  function openPortCreate() { portFormMode = 'create'; portFormRecord = null; portFormOpen = true; }
  function openPortEdit(rec) { portFormMode = 'edit'; portFormRecord = rec; portFormOpen = true; }
  function deletePort(rec) {
    confirmState = {
      open: true, title: 'Delete public port routing',
      body: `Stop accepting public traffic on port ${rec.publicPort}?`,
      blastRadius: 'External clients on this public port lose access immediately.',
      danger: true, label: 'Delete',
      action: async () => {
        try {
          await api.portRoutingDelete(rec.id);
          toast.success('Port routing deleted');
          loadedFor.routing = null;
          loadPortRouting(nav.stack.id);
        } catch (e) { toast.apiError('Delete port routing failed', e); }
      },
    };
  }

  function toggleReveal(id) {
    const next = new Set(revealedKeys);
    if (next.has(id)) next.delete(id); else next.add(id);
    revealedKeys = next;
  }
  function isEditableType(t) {
    if (!t) return true;
    return t === 'EDITABLE' || t === 'SECRET';
  }
  function fmtBytes(n) {
    if (!n && n !== 0) return '—';
    const u = ['B','KB','MB','GB','TB'];
    let i = 0; let v = Number(n);
    while (v >= 1024 && i < u.length - 1) { v /= 1024; i++; }
    return `${v.toFixed(v >= 10 || i === 0 ? 0 : 1)} ${u[i]}`;
  }

  // ---- Tables ----
  const containerColumns = [
    { key: 'number', label: '#' },
    { key: 'hostname', label: 'Hostname' },
    { key: 'cpu', label: 'CPU' },
    { key: 'mem', label: 'Memory' },
    { key: 'disk', label: 'Disk' },
    { key: 'created', label: 'Created' },
  ];
  const containerRows = $derived(containers.map((c) => ({
    id: c.id,
    number: c.number,
    hostname: c.hostname || '—',
    cpu: `${c.currentHardwareResource?.cpuCoreCount ?? '?'} core`,
    mem: `${c.currentHardwareResource?.memoryMBytes ?? '?'} MB`,
    disk: `${c.currentHardwareResource?.diskGBytes ?? '?'} GB`,
    created: fmtShort(c.created),
  })));

  const visibleEnv = $derived(
    envFilter === 'user'
      ? envVars.filter((v) => v.type !== 'INTERNAL' && (v.type === 'EDITABLE' || v.type === 'SECRET' || !v.type))
      : envVars.filter((v) => v.type !== 'INTERNAL'),
  );

  function openContainer(row) {
    const c = containers.find((x) => x.id === row.id);
    if (!c) return;
    goContainer({ id: c.id, number: c.number, hostname: c.hostname }, nav.stack, nav.project, nav.org);
  }
</script>

{#if detailLoading && !detail}
  <p class="text-sm text-slate-500">Loading stack…</p>
{:else if detailError}
  <p class="text-sm text-rose-400">{detailError}</p>
{:else if detail}
  <div class="mb-4 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
    <div class="grid flex-1 grid-cols-2 gap-3 rounded-md border border-slate-800 bg-slate-900 p-4 text-sm sm:grid-cols-4">
      <div><div class="text-xs uppercase text-slate-500">Status</div><div class="text-slate-200">{detail.status}</div></div>
      <div><div class="text-xs uppercase text-slate-500">Mode</div><div class="text-slate-200">{detail.mode}</div></div>
      <div><div class="text-xs uppercase text-slate-500">Subdomain</div><div class="text-slate-200">{detail.subdomainAccess ? 'enabled' : 'disabled'}</div></div>
      <div><div class="text-xs uppercase text-slate-500">Version</div><div class="text-slate-200">{detail.versionNumber || '—'}</div></div>
    </div>
    <StackActions stack={detail} onChanged={() => loadDetail()} />
  </div>
{/if}

<div class="mb-3 flex items-center justify-between">
  <Tabs {tabs} bind:active onChange={(id) => setTab(id)} />
  <Button size="sm" variant="ghost" onclick={refreshActive}>Refresh</Button>
</div>

<div class="mt-2">
  {#if active === 'containers'}
    {#if containersError}<p class="mb-3 text-sm text-rose-400">{containersError}</p>{/if}
    {#if containersLoading && !containers.length}
      <p class="text-sm text-slate-500">Loading containers…</p>
    {:else}
      <Table columns={containerColumns} rows={containerRows} onRowClick={openContainer} empty="No containers running for this stack." />
      <p class="mt-2 text-xs text-slate-500">Click a row for live container detail.</p>
    {/if}

  {:else if active === 'processes'}
    {#if processesError}<p class="mb-3 text-sm text-rose-400">{processesError}</p>{/if}
    {#if processesLoading && !processes.length}
      <p class="text-sm text-slate-500">Loading processes…</p>
    {:else if !processes.length}
      <p class="text-sm text-slate-500">No processes recorded for this stack.</p>
    {:else}
      <div class="overflow-hidden rounded-md border border-slate-800 bg-slate-900">
        <table class="w-full text-left text-sm">
          <thead class="bg-slate-950 text-xs uppercase tracking-widest text-slate-500">
            <tr>
              <th class="px-4 py-2">Seq</th>
              <th class="px-4 py-2">Action</th>
              <th class="px-4 py-2">Status</th>
              <th class="px-4 py-2">Duration</th>
              <th class="px-4 py-2">By</th>
              <th class="px-4 py-2">Created</th>
            </tr>
          </thead>
          <tbody>
            {#each processes as p (p.id)}
              <tr class="cursor-pointer border-t border-slate-800 hover:bg-slate-800/60" onclick={() => { processDetailEntity = p; processDetailOpen = true; }}>
                <td class="px-4 py-2 font-mono text-xs text-slate-300">{p.sequence}</td>
                <td class="px-4 py-2 font-mono text-xs text-slate-200">{p.actionName}</td>
                <td class="px-4 py-2"><StatusChip entity={p} /></td>
                <td class="px-4 py-2 text-xs"><Duration entity={p} /></td>
                <td class="px-4 py-2 text-xs text-slate-400">{p.createdByUser?.fullName || p.createdByUser?.email || (p.createdBySystem ? 'system' : '—')}</td>
                <td class="px-4 py-2 text-xs text-slate-400">{fmtShort(p.created)}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}

  {:else if active === 'pipelines'}
    {#if avError}<p class="mb-3 text-sm text-rose-400">{avError}</p>{/if}
    {#if avLoading && !appVersions.length}
      <p class="text-sm text-slate-500">Loading app versions…</p>
    {:else}
      <div class="overflow-hidden rounded-md border border-slate-800 bg-slate-900">
        <table class="w-full text-left text-sm">
          <thead class="bg-slate-950 text-xs uppercase tracking-widest text-slate-500">
            <tr>
              <th class="px-4 py-2">Seq</th>
              <th class="px-4 py-2">Status</th>
              <th class="px-4 py-2">Source</th>
              <th class="px-4 py-2">By</th>
              <th class="px-4 py-2">Created</th>
            </tr>
          </thead>
          <tbody>
            {#each appVersions as v (v.id)}
              <tr class="cursor-pointer border-t border-slate-800 hover:bg-slate-800/60" onclick={() => { selectedAppVersion = v; appVersionOpen = true; }}>
                <td class="px-4 py-2 font-mono text-xs text-slate-300">{v.sequence}</td>
                <td class="px-4 py-2"><StatusChip status={v.status || (v.activationDate ? 'ACTIVE' : 'UNKNOWN')} /></td>
                <td class="px-4 py-2 text-xs text-slate-300">{v.source || '—'}</td>
                <td class="px-4 py-2 text-xs text-slate-400">{v.createdByUser?.fullName || v.createdByUser?.email || '—'}</td>
                <td class="px-4 py-2 text-xs text-slate-400">{fmtShort(v.created)}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
      <p class="mt-2 text-xs text-slate-500">Click a row to view the zerops.yaml used at deploy + build details.</p>
    {/if}

  {:else if active === 'env'}
    <div class="mb-3 flex items-center justify-between">
      <div class="flex overflow-hidden rounded-md border border-slate-800 text-xs">
        <button class="px-3 py-1.5 {envFilter === 'user' ? 'bg-slate-800 text-slate-100' : 'text-slate-400 hover:bg-slate-900'}" onclick={() => (envFilter = 'user')}>User-set</button>
        <button class="px-3 py-1.5 {envFilter === 'all' ? 'bg-slate-800 text-slate-100' : 'text-slate-400 hover:bg-slate-900'}" onclick={() => (envFilter = 'all')}>All ({envVars.length})</button>
      </div>
      <Button size="sm" variant="primary" onclick={openEnvCreate}>+ New variable</Button>
    </div>
    {#if envError}<p class="mb-3 text-sm text-rose-400">{envError}</p>{/if}
    {#if envLoading && !envVars.length}
      <p class="text-sm text-slate-500">Loading env…</p>
    {:else if !visibleEnv.length}
      <p class="text-sm text-slate-500">No environment variables in this view.</p>
    {:else}
      <div class="overflow-hidden rounded-md border border-slate-800 bg-slate-900">
        <table class="w-full text-left text-sm">
          <thead class="bg-slate-950 text-xs uppercase tracking-widest text-slate-500">
            <tr>
              <th class="px-4 py-2">Key</th>
              <th class="px-4 py-2">Value</th>
              <th class="px-4 py-2">Type</th>
              <th class="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {#each visibleEnv as e (e.id)}
              <tr class="border-t border-slate-800">
                <td class="px-4 py-2 font-mono text-xs text-slate-200">{e.key}</td>
                <td class="px-4 py-2 font-mono text-xs">
                  {#if (e.sensitive || e.type === 'SECRET') && !revealedKeys.has(e.id)}
                    <button class="text-slate-500 hover:text-emerald-400" onclick={() => toggleReveal(e.id)}>•••••• reveal</button>
                  {:else}
                    <span class="break-all text-slate-200">{e.content}</span>
                    {#if e.sensitive || e.type === 'SECRET'}
                      <button class="ml-2 text-xs text-slate-500 hover:text-rose-400" onclick={() => toggleReveal(e.id)}>hide</button>
                    {/if}
                  {/if}
                </td>
                <td class="px-4 py-2 text-xs text-slate-400">{e.type || '—'}</td>
                <td class="px-4 py-2 text-right text-xs">
                  {#if isEditableType(e.type)}
                    <button class="mr-2 text-emerald-400 hover:underline" onclick={() => openEnvEdit(e)}>Edit</button>
                    <button class="text-rose-400 hover:underline" onclick={() => deleteEnv(e)}>Delete</button>
                  {:else}
                    <span class="text-slate-600">platform-managed</span>
                  {/if}
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
      <p class="mt-2 text-xs text-slate-500">
        Records with type READ_ONLY / ENV / INTERNAL are platform- or zerops.yaml-managed and can't be edited here. Switch to "All" to see them.
      </p>
    {/if}

  {:else if active === 'service'}
    {#if serviceError}<p class="mb-3 text-sm text-rose-400">{serviceError}</p>{/if}
    {#if serviceLoading}
      <p class="text-sm text-slate-500">Loading service info…</p>
    {:else if !serviceInfo}
      <div class="rounded-md border border-slate-800 bg-slate-900 p-6 text-sm text-slate-400">
        Service info unavailable for this stack.
      </div>
    {:else}
      <div class="rounded-md border border-slate-800 bg-slate-900 p-4 text-sm">
        <dl class="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {#each Object.entries(serviceInfo) as [k, v]}
            {#if v !== null && v !== undefined && v !== '' && typeof v !== 'object'}
              <div class="flex justify-between gap-3"><dt class="text-slate-500">{k}</dt><dd class="break-all text-slate-200">{String(v)}</dd></div>
            {/if}
          {/each}
        </dl>
        <details class="mt-3 text-xs">
          <summary class="cursor-pointer text-slate-400">Raw JSON</summary>
          <pre class="mt-2 max-h-64 overflow-auto rounded bg-slate-950 p-3 text-slate-300">{JSON.stringify(serviceInfo, null, 2)}</pre>
        </details>
      </div>
    {/if}

  {:else if active === 'routing'}
    <div class="mb-3 flex justify-end">
      <Button size="sm" variant="primary" onclick={openPortCreate}>+ New port routing</Button>
    </div>
    {#if portError}<p class="mb-3 text-sm text-rose-400">{portError}</p>{/if}
    {#if portLoading && !portRouting.length}
      <p class="text-sm text-slate-500">Loading port routing…</p>
    {:else if !portRouting.length}
      <p class="text-sm text-slate-500">No public port routing configured.</p>
    {:else}
      <div class="overflow-hidden rounded-md border border-slate-800 bg-slate-900">
        <table class="w-full text-left text-sm">
          <thead class="bg-slate-950 text-xs uppercase tracking-widest text-slate-500">
            <tr>
              <th class="px-4 py-2">Public port</th>
              <th class="px-4 py-2">Internal port</th>
              <th class="px-4 py-2">Proto</th>
              <th class="px-4 py-2">Firewall</th>
              <th class="px-4 py-2">Synced</th>
              <th class="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {#each portRouting as r (r.id)}
              <tr class="border-t border-slate-800">
                <td class="px-4 py-2 font-mono text-sm text-slate-200">{r.publicPort}</td>
                <td class="px-4 py-2 font-mono text-sm text-slate-200">{r.internalPort}</td>
                <td class="px-4 py-2 text-xs text-slate-300">{r.internalProtocol}</td>
                <td class="px-4 py-2 text-xs text-slate-300">
                  {(r.firewallIpRanges || []).join(', ') || (r.firewallAllowMyIp ? 'my-ip' : 'open')}
                </td>
                <td class="px-4 py-2 text-xs text-slate-300">{r.isSynced ? 'yes' : 'no'}</td>
                <td class="px-4 py-2 text-right text-xs">
                  <button class="mr-2 text-emerald-400 hover:underline" onclick={() => openPortEdit(r)}>Edit</button>
                  <button class="text-rose-400 hover:underline" onclick={() => deletePort(r)}>Delete</button>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
    <p class="mt-3 text-xs text-slate-500">
      HTTP routing (domains, SSL, locations) is project-scoped — see the project's HTTP routing tab.
    </p>

  {:else if active === 'backups'}
    {#if backupsError}<p class="mb-3 text-sm text-rose-400">{backupsError}</p>{/if}
    {#if backupsLoading}
      <p class="text-sm text-slate-500">Loading backups…</p>
    {:else if !backups}
      <div class="rounded-md border border-slate-800 bg-slate-900 p-6 text-sm text-slate-400">
        Backups not configured (or unavailable for this stack type).
      </div>
    {:else}
      <div class="mb-3 text-xs text-slate-500">
        Period: <span class="text-slate-300">{backups.backupPeriod || '—'}</span>
      </div>
      <Table
        columns={[{key:'name',label:'When'},{key:'size',label:'Size'},{key:'tags',label:'Tags'},{key:'mode',label:'Mode'}]}
        rows={(backups.files || []).map((f, i) => ({
          id: f.path || i, name: f.name, size: fmtBytes(f.size),
          tags: (f.metadata?.tags || []).join(', ') || '—',
          mode: f.metadata?.mode || '—',
        }))}
        empty="No backup files."
      />
    {/if}

  {:else if active === 'scaling'}
    {#if !detail}
      <p class="text-sm text-slate-500">Loading…</p>
    {:else}
      <div class="grid gap-4 sm:grid-cols-2">
        <div class="rounded-md border border-slate-800 bg-slate-900 p-4 text-sm">
          <div class="mb-3 text-xs uppercase tracking-widest text-slate-500">Horizontal autoscaling</div>
          {#if detail.horizontalAutoscaling}
            <dl class="space-y-1 text-sm">
              <div class="flex justify-between"><dt class="text-slate-500">min</dt><dd class="text-slate-200">{detail.horizontalAutoscaling.minContainerCount}</dd></div>
              <div class="flex justify-between"><dt class="text-slate-500">max</dt><dd class="text-slate-200">{detail.horizontalAutoscaling.maxContainerCount}</dd></div>
            </dl>
          {:else}<p class="text-slate-500">Not configured.</p>{/if}
        </div>
        <div class="rounded-md border border-slate-800 bg-slate-900 p-4 text-sm">
          <div class="mb-3 text-xs uppercase tracking-widest text-slate-500">Vertical autoscaling</div>
          {#if detail.verticalAutoscaling}
            <dl class="space-y-1 text-sm">
              {#each Object.entries(detail.verticalAutoscaling) as [k, v]}
                <div class="flex justify-between"><dt class="text-slate-500">{k}</dt><dd class="text-slate-200">{typeof v === 'object' ? JSON.stringify(v) : String(v)}</dd></div>
              {/each}
            </dl>
          {:else}<p class="text-slate-500">Not configured.</p>{/if}
        </div>
      </div>
    {/if}

  {:else if active === 'logs'}
    {#if logError}<p class="mb-3 text-sm text-rose-400">{logError}</p>{/if}
    {#if logLoading}
      <p class="text-sm text-slate-500">Loading log endpoint…</p>
    {:else if logInfo}
      <div class="rounded-md border border-slate-800 bg-slate-900 p-4 text-sm">
        <p class="mb-3 text-slate-400">
          Logs are project-scoped — the API returns a tokenized URL for the whole project. Open and filter by service stack <span class="font-mono text-emerald-400">{nav.stack?.name}</span>:
        </p>
        <ul class="space-y-1 text-xs">
          {#if logInfo.urlUi}<li><a class="text-emerald-400 hover:underline" href={logInfo.urlUi} target="_blank" rel="noreferrer">UI viewer ↗</a></li>{/if}
          {#if logInfo.urlPlain}<li><a class="text-emerald-400 hover:underline" href={logInfo.urlPlain} target="_blank" rel="noreferrer">Plain stream ↗</a></li>{/if}
          {#if logInfo.url}<li><a class="text-emerald-400 hover:underline" href={logInfo.url} target="_blank" rel="noreferrer">Default ↗</a></li>{/if}
        </ul>
      </div>
    {:else}
      <p class="text-sm text-slate-500">No log endpoint info.</p>
    {/if}
  {/if}
</div>

<AppVersionDetail bind:open={appVersionOpen} version={selectedAppVersion} />
<EnvVarForm
  bind:open={envFormOpen}
  scope="stack"
  mode={envFormMode}
  parentId={nav.stack?.id}
  record={envFormRecord}
  onChanged={() => { loadedFor.env = null; loadEnv(nav.stack.id); }}
/>
<PortRoutingForm
  bind:open={portFormOpen}
  mode={portFormMode}
  stackId={nav.stack?.id}
  record={portFormRecord}
  onChanged={() => { loadedFor.routing = null; loadPortRouting(nav.stack.id); }}
/>
<EntityDetail bind:open={processDetailOpen} entity={processDetailEntity} />
<Confirm
  bind:open={confirmState.open}
  title={confirmState.title}
  body={confirmState.body}
  blastRadius={confirmState.blastRadius}
  confirmLabel={confirmState.label}
  danger={confirmState.danger}
  onConfirm={confirmState.action}
/>
