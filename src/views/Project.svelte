<script>
  import Tabs from '../components/Tabs.svelte';
  import Table from '../components/Table.svelte';
  import Button from '../components/Button.svelte';
  import StatusChip from '../components/StatusChip.svelte';
  import Duration from '../components/Duration.svelte';
  import EntityDetail from '../components/EntityDetail.svelte';
  import ProjectActions from '../components/ProjectActions.svelte';
  import CreateStackModal from '../components/CreateStackModal.svelte';
  import HttpRoutingForm from '../components/HttpRoutingForm.svelte';
  import Confirm from '../components/Confirm.svelte';
  import { api } from '../lib/api.js';
  import { toast } from '../lib/toasts.svelte.js';
  import { nav, goStack, setTab } from '../lib/nav.svelte.js';
  import { findClientById, loadUser } from '../lib/userStore.svelte.js';
  import { fmtShort } from '../lib/format.js';

  const tabs = [
    { id: 'stacks', label: 'Stacks' },
    { id: 'processes', label: 'Processes' },
    { id: 'routing', label: 'HTTP routing' },
    { id: 'env', label: 'Environment' },
    { id: 'logs', label: 'Logs' },
    { id: 'vpn', label: 'VPN' },
    { id: 'detail', label: 'Detail' },
  ];

  let active = $state(nav.tab && tabs.some((t) => t.id === nav.tab) ? nav.tab : 'stacks');
  let query = $state('');

  let detail = $state(null);
  let stacks = $state([]); let stacksLoading = $state(false); let stacksError = $state('');
  let processes = $state([]); let processesLoading = $state(false); let processesError = $state('');
  let routing = $state([]); let routingLoading = $state(false); let routingError = $state('');
  let envFile = $state(null); let envFileText = $state(''); let envLoading = $state(false); let envError = $state('');
  let envSaving = $state(false);
  let logInfo = $state(null); let logLoading = $state(false); let logError = $state('');
  let vpn = $state(null); let vpnLoading = $state(false); let vpnError = $state('');

  let createStackOpen = $state(false);
  let routingFormOpen = $state(false);
  let routingFormMode = $state('create');
  let routingFormRecord = $state(null);
  let confirmState = $state({ open: false, title: '', body: '', blastRadius: '', danger: false, action: null, label: 'Confirm' });
  let processDetailOpen = $state(false);
  let processDetailEntity = $state(null);

  let loadedFor = { stacks: null, routing: null, env: null, logs: null, processes: null, vpn: null };

  $effect(() => {
    if (!nav.project?.id) return;
    api.project(nav.project.id).then((p) => {
      if (!p) return;
      detail = p;
      if (!nav.project.name) nav.project = { id: p.id, name: p.name };
      if (p.clientId && (!nav.org || nav.org.id !== p.clientId || !nav.org.accountName)) {
        loadUser().then(() => {
          const c = findClientById(p.clientId);
          nav.org = { id: p.clientId, accountName: c?.accountName || null };
        }).catch(() => {
          nav.org = { id: p.clientId, accountName: null };
        });
      }
    }).catch((e) => { stacksError = e?.message || 'Failed to load project'; });
  });

  $effect(() => {
    const id = nav.project?.id;
    if (!id) return;
    if (active === 'stacks' && loadedFor.stacks !== id) { loadedFor.stacks = id; loadStacks(id); }
    else if (active === 'processes' && loadedFor.processes !== id) { loadedFor.processes = id; loadProcesses(id); }
    else if (active === 'routing' && loadedFor.routing !== id) { loadedFor.routing = id; loadRouting(id); loadStacksLight(id); }
    else if (active === 'env' && loadedFor.env !== id) { loadedFor.env = id; loadEnv(id); }
    else if (active === 'logs' && loadedFor.logs !== id) { loadedFor.logs = id; loadLog(id); }
    else if (active === 'vpn' && loadedFor.vpn !== id) { loadedFor.vpn = id; loadVpn(id); }
  });

  async function loadStacks(id) {
    stacksLoading = true; stacksError = '';
    try { const d = await api.projectStacks(id, { limit: 200 }); stacks = d?.list || []; }
    catch (e) { stacksError = e?.message || 'Failed to load stacks'; stacks = []; }
    finally { stacksLoading = false; }
  }
  async function loadStacksLight(id) {
    if (stacks.length) return;
    try { const d = await api.projectStacks(id, { limit: 200 }); stacks = d?.list || []; } catch {}
  }
  async function loadProcesses(id) {
    processesLoading = true; processesError = '';
    try { const d = await api.projectProcesses(id, { limit: 50 }); processes = d?.list || d?.items || []; }
    catch (e) { processesError = e?.message || 'Failed to load processes'; processes = []; }
    finally { processesLoading = false; }
  }
  async function loadRouting(id) {
    routingLoading = true; routingError = '';
    try { const d = await api.projectHttpRouting(id); routing = d?.list || []; }
    catch (e) { routingError = e?.message || 'Failed to load routing'; routing = []; }
    finally { routingLoading = false; }
  }
  async function loadEnv(id) {
    envLoading = true; envError = '';
    try {
      envFile = await api.projectEnvFile(id);
      envFileText = envFile?.content || '';
    }
    catch (e) { envError = e?.message || 'Failed to load env file'; envFile = null; }
    finally { envLoading = false; }
  }
  async function saveEnv() {
    if (!nav.project?.id) return;
    envSaving = true;
    try {
      await api.projectEnvFileReplace(nav.project.id, envFileText);
      toast.success('Project env saved', 'Service stacks restart on next deploy.');
      loadedFor.env = null;
      loadEnv(nav.project.id);
    } catch (e) {
      toast.apiError('Save env file failed', e);
    } finally { envSaving = false; }
  }
  async function loadLog(id) {
    logLoading = true; logError = '';
    try { logInfo = await api.projectLog(id); }
    catch (e) { logError = e?.message || 'Failed to load log endpoint'; logInfo = null; }
    finally { logLoading = false; }
  }
  async function loadVpn(id) {
    vpnLoading = true; vpnError = '';
    try { vpn = await api.projectVpnList(id); }
    catch (e) {
      if (e?.status === 404 || e?.status === 400) { vpn = null; vpnError = ''; }
      else { vpnError = e?.message || 'Failed to load VPN'; vpn = null; }
    } finally { vpnLoading = false; }
  }

  function refreshActive() {
    const id = nav.project?.id; if (!id) return;
    loadedFor = { ...loadedFor, [active]: null };
    if (active === 'stacks') loadStacks(id);
    else if (active === 'processes') loadProcesses(id);
    else if (active === 'routing') loadRouting(id);
    else if (active === 'env') loadEnv(id);
    else if (active === 'logs') loadLog(id);
    else if (active === 'vpn') loadVpn(id);
  }

  function openRoutingCreate() {
    routingFormMode = 'create';
    routingFormRecord = null;
    routingFormOpen = true;
  }
  function openRoutingEdit(r) {
    routingFormMode = 'edit';
    routingFormRecord = r;
    routingFormOpen = true;
  }
  function deleteRouting(r) {
    confirmState = {
      open: true, title: 'Delete HTTP routing',
      body: `Delete routing for "${(r.domains || []).map((d) => d.domainName).join(', ')}"?`,
      blastRadius: 'The domains stop resolving to this project. Existing connections drop.',
      danger: true, label: 'Delete',
      action: async () => {
        try {
          await api.httpRoutingDelete(r.id);
          toast.success('Routing deleted');
          loadedFor.routing = null;
          loadRouting(nav.project.id);
        } catch (e) { toast.apiError('Delete routing failed', e); }
      },
    };
  }

  const filteredStacks = $derived(
    !query.trim() ? stacks
      : stacks.filter((s) => (s.name || '').toLowerCase().includes(query.trim().toLowerCase())),
  );

  const stackColumns = [
    { key: 'name', label: 'Stack' },
    { key: 'type', label: 'Type' },
    { key: 'status', label: 'Status' },
    { key: 'mode', label: 'Mode' },
    { key: 'subdomain', label: 'Subdomain' },
  ];
</script>

<div class="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
  <div>
    {#if detail}
      <div class="text-xs uppercase tracking-widest text-slate-500">Project</div>
      <h1 class="text-lg font-semibold text-slate-100">{detail.name}</h1>
      <p class="mt-0.5 text-xs text-slate-500">
        Status: <span class="text-slate-300">{detail.status || '—'}</span>
        · Mode: <span class="text-slate-300">{detail.mode || '—'}</span>
        · Region: <span class="text-slate-300">{detail.primaryInstanceLocation?.name || detail.primaryInstanceLocation?.id || '—'}</span>
      </p>
    {/if}
  </div>
  {#if detail}
    <ProjectActions project={detail} onChanged={refreshActive} />
  {/if}
</div>

<div class="mb-3 flex items-center justify-between">
  <Tabs {tabs} bind:active onChange={(id) => setTab(id)} />
  <Button size="sm" variant="ghost" onclick={refreshActive}>Refresh</Button>
</div>

<div class="mt-2">
  {#if active === 'stacks'}
    <div class="mb-4 flex items-center gap-3">
      <input
        type="text"
        placeholder="Filter by name…"
        class="flex-1 rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:border-emerald-600 focus:outline-none"
        bind:value={query}
      />
      <span class="text-xs text-slate-500">{filteredStacks.length} / {stacks.length}</span>
      <Button size="sm" variant="primary" onclick={() => (createStackOpen = true)}>+ New stack</Button>
    </div>

    {#if stacksError}<p class="mb-3 text-sm text-rose-400">{stacksError}</p>{/if}
    {#if stacksLoading && !stacks.length}
      <p class="text-sm text-slate-500">Loading stacks…</p>
    {:else}
      <Table
        columns={stackColumns}
        rows={filteredStacks.map(s => ({
          id: s.id, name: s.name,
          type: s.serviceStackTypeInfo?.serviceStackTypeName || s.serviceStackTypeId || '',
          status: s.status, mode: s.mode,
          subdomain: s.subdomainAccess ? 'on' : 'off',
        }))}
        onRowClick={(row) => goStack({ id: row.id, name: row.name, type: row.type }, nav.project, nav.org)}
        empty="No stacks in this project."
      />
    {/if}

  {:else if active === 'processes'}
    {#if processesError}<p class="mb-3 text-sm text-rose-400">{processesError}</p>{/if}
    {#if processesLoading && !processes.length}
      <p class="text-sm text-slate-500">Loading processes…</p>
    {:else if !processes.length}
      <p class="text-sm text-slate-500">No processes recorded.</p>
    {:else}
      <div class="overflow-hidden rounded-md border border-slate-800 bg-slate-900">
        <table class="w-full text-left text-sm">
          <thead class="bg-slate-950 text-xs uppercase tracking-widest text-slate-500">
            <tr>
              <th class="px-4 py-2">Seq</th>
              <th class="px-4 py-2">Action</th>
              <th class="px-4 py-2">Status</th>
              <th class="px-4 py-2">Duration</th>
              <th class="px-4 py-2">Targets</th>
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
                <td class="px-4 py-2 text-xs text-slate-300">{(p.serviceStacks || []).map((s) => s.name).filter(Boolean).join(', ') || '—'}</td>
                <td class="px-4 py-2 text-xs text-slate-400">{p.createdByUser?.fullName || p.createdByUser?.email || (p.createdBySystem ? 'system' : '—')}</td>
                <td class="px-4 py-2 text-xs text-slate-400">{fmtShort(p.created)}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}

  {:else if active === 'routing'}
    <div class="mb-3 flex justify-end">
      <Button size="sm" variant="primary" onclick={openRoutingCreate}>+ New routing</Button>
    </div>
    {#if routingError}<p class="mb-3 text-sm text-rose-400">{routingError}</p>{/if}
    {#if routingLoading && !routing.length}
      <p class="text-sm text-slate-500">Loading routing…</p>
    {:else if !routing.length}
      <p class="text-sm text-slate-500">No public HTTP routing configured.</p>
    {:else}
      <div class="overflow-hidden rounded-md border border-slate-800 bg-slate-900">
        <table class="w-full text-left text-sm">
          <thead class="bg-slate-950 text-xs uppercase tracking-widest text-slate-500">
            <tr>
              <th class="px-4 py-2">Domain(s)</th>
              <th class="px-4 py-2">SSL</th>
              <th class="px-4 py-2">CDN</th>
              <th class="px-4 py-2">Locations</th>
              <th class="px-4 py-2">Synced</th>
              <th class="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {#each routing as r (r.id)}
              <tr class="border-t border-slate-800 hover:bg-slate-800/40">
                <td class="px-4 py-2 text-xs text-slate-200">{(r.domains || []).map((d) => d.domainName).join(', ') || '—'}</td>
                <td class="px-4 py-2 text-xs text-slate-300">{r.sslEnabled ? 'on' : 'off'}</td>
                <td class="px-4 py-2 text-xs text-slate-300">{r.cdnEnabled ? 'on' : 'off'}</td>
                <td class="px-4 py-2 text-xs text-slate-300">{(r.locations || []).length}</td>
                <td class="px-4 py-2 text-xs text-slate-300">{r.isSynced ? 'yes' : 'no'}</td>
                <td class="px-4 py-2 text-right text-xs">
                  <button class="mr-2 text-emerald-400 hover:underline" onclick={() => openRoutingEdit(r)} disabled={!r.isEditable}>Edit</button>
                  <button class="text-rose-400 hover:underline" onclick={() => deleteRouting(r)} disabled={!r.isEditable}>Delete</button>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}

  {:else if active === 'env'}
    {#if envError}<p class="mb-3 text-sm text-rose-400">{envError}</p>{/if}
    {#if envLoading}
      <p class="text-sm text-slate-500">Loading env file…</p>
    {:else}
      <p class="mb-2 text-xs text-slate-500">
        Edits the entire project env-file in one shot via <code>PUT /project/&#123;id&#125;/env/file</code>. Use <code>KEY=value</code> on each line; <code>SECRET_KEY=&lt;@generateRandomString(32)&gt;</code> to generate at apply time.
      </p>
      <textarea
        rows="14"
        spellcheck="false"
        class="w-full rounded-md border border-slate-800 bg-slate-950 px-3 py-2 font-mono text-xs text-slate-100 focus:border-emerald-600 focus:outline-none"
        bind:value={envFileText}
      ></textarea>
      <div class="mt-2 flex justify-end gap-2">
        <Button size="sm" variant="ghost" onclick={() => { envFileText = envFile?.content || ''; }}>Reset</Button>
        <Button size="sm" variant="primary" onclick={saveEnv} disabled={envSaving}>
          {envSaving ? 'Saving…' : 'Save env file'}
        </Button>
      </div>
    {/if}

  {:else if active === 'logs'}
    {#if logError}<p class="mb-3 text-sm text-rose-400">{logError}</p>{/if}
    {#if logLoading}
      <p class="text-sm text-slate-500">Loading log endpoint…</p>
    {:else if logInfo}
      <div class="rounded-md border border-slate-800 bg-slate-900 p-4 text-sm">
        <p class="mb-3 text-slate-400">
          The public REST endpoint returns a tokenized log URL rather than log lines directly. Open it in a new tab:
        </p>
        <ul class="space-y-1 text-xs">
          {#if logInfo.urlUi}<li><a class="text-emerald-400 hover:underline" href={logInfo.urlUi} target="_blank" rel="noreferrer">UI viewer ↗</a></li>{/if}
          {#if logInfo.urlPlain}<li><a class="text-emerald-400 hover:underline" href={logInfo.urlPlain} target="_blank" rel="noreferrer">Plain stream ↗</a></li>{/if}
          {#if logInfo.url}<li><a class="text-emerald-400 hover:underline" href={logInfo.url} target="_blank" rel="noreferrer">Default ↗</a></li>{/if}
          {#if logInfo.urlInfo}<li><a class="text-emerald-400 hover:underline" href={logInfo.urlInfo} target="_blank" rel="noreferrer">Info ↗</a></li>{/if}
        </ul>
        <p class="mt-3 text-xs text-slate-500">
          Token expires {logInfo.expiration ? new Date(logInfo.expiration).toLocaleString() : '—'}.
        </p>
      </div>
    {/if}

  {:else if active === 'vpn'}
    {#if vpnError}<p class="mb-3 text-sm text-rose-400">{vpnError}</p>{/if}
    {#if vpnLoading}
      <p class="text-sm text-slate-500">Loading VPN…</p>
    {:else if !vpn}
      <div class="rounded-md border border-slate-800 bg-slate-900 p-6 text-sm text-slate-400">
        VPN not configured for this project (or no permission).
      </div>
    {:else}
      <div class="mb-4 grid gap-3 sm:grid-cols-3">
        <div class="rounded-md border border-slate-800 bg-slate-900 p-3 text-xs">
          <div class="text-slate-500">Server endpoint</div>
          <div class="mt-1 font-mono text-slate-200">{vpn.project?.endpoint || '—'}</div>
        </div>
        <div class="rounded-md border border-slate-800 bg-slate-900 p-3 text-xs">
          <div class="text-slate-500">Network</div>
          <div class="mt-1 font-mono text-slate-200">{vpn.project?.network || '—'}</div>
        </div>
        <div class="rounded-md border border-slate-800 bg-slate-900 p-3 text-xs">
          <div class="text-slate-500">DNS</div>
          <div class="mt-1 font-mono text-slate-200">{vpn.project?.dns || '—'}</div>
        </div>
      </div>
      {#if !(vpn.peers || []).length}
        <p class="text-sm text-slate-500">No VPN peers configured.</p>
      {:else}
        <div class="overflow-hidden rounded-md border border-slate-800 bg-slate-900">
          <table class="w-full text-left text-sm">
            <thead class="bg-slate-950 text-xs uppercase tracking-widest text-slate-500">
              <tr>
                <th class="px-4 py-2">Peer</th>
                <th class="px-4 py-2">Public key</th>
                <th class="px-4 py-2">Allowed IP</th>
                <th class="px-4 py-2">Last handshake</th>
              </tr>
            </thead>
            <tbody>
              {#each vpn.peers as p}
                <tr class="border-t border-slate-800">
                  <td class="px-4 py-2 text-xs text-slate-200">{p.name || '—'}</td>
                  <td class="px-4 py-2 font-mono text-[10px] text-slate-400">{(p.publicKey || '').slice(0, 24)}…</td>
                  <td class="px-4 py-2 font-mono text-xs text-slate-300">{p.allowedIp || '—'}</td>
                  <td class="px-4 py-2 text-xs text-slate-400">{p.lastHandshake ? new Date(p.lastHandshake).toLocaleString() : '—'}</td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      {/if}
    {/if}

  {:else if active === 'detail'}
    {#if !detail}
      <p class="text-sm text-slate-500">Loading…</p>
    {:else}
      <div class="rounded-md border border-slate-800 bg-slate-900 p-4 text-sm">
        <dl class="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {#each Object.entries(detail) as [k, v]}
            {#if v !== null && v !== undefined && v !== '' && typeof v !== 'object'}
              <div class="flex justify-between gap-3"><dt class="text-slate-500">{k}</dt><dd class="break-all text-slate-200">{String(v)}</dd></div>
            {/if}
          {/each}
        </dl>
        <details class="mt-3 text-xs">
          <summary class="cursor-pointer text-slate-400">Raw JSON</summary>
          <pre class="mt-2 max-h-72 overflow-auto rounded bg-slate-950 p-3 text-slate-300">{JSON.stringify(detail, null, 2)}</pre>
        </details>
      </div>
    {/if}
  {/if}
</div>

<CreateStackModal bind:open={createStackOpen} projectId={nav.project?.id} onCreated={() => { loadedFor.stacks = null; loadStacks(nav.project.id); }} />
<HttpRoutingForm bind:open={routingFormOpen} mode={routingFormMode} projectId={nav.project?.id} record={routingFormRecord} stacks={stacks} onChanged={() => { loadedFor.routing = null; loadRouting(nav.project.id); }} />
<Confirm
  bind:open={confirmState.open}
  title={confirmState.title}
  body={confirmState.body}
  blastRadius={confirmState.blastRadius}
  confirmLabel={confirmState.label}
  danger={confirmState.danger}
  onConfirm={confirmState.action}
/>
<EntityDetail bind:open={processDetailOpen} entity={processDetailEntity} />
