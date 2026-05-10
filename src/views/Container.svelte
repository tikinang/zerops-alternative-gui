<script>
  import { api } from '../lib/api.js';
  import { nav } from '../lib/nav.svelte.js';
  import { findClientById, loadUser } from '../lib/userStore.svelte.js';

  let detail = $state(null);
  let loading = $state(true);
  let error = $state('');

  $effect(() => {
    if (!nav.container?.id) return;
    loading = true; error = '';
    const stackId = nav.stack?.id;
    if (!stackId) {
      error = 'Stack context missing — open via the Stack → Containers tab.';
      loading = false;
      return;
    }
    api.stackContainers(stackId, { limit: 100 })
      .then((data) => {
        const list = data?.list || [];
        const c = list.find((x) => x.id === nav.container.id);
        detail = c || null;
        if (c) {
          nav.container = { id: c.id, number: c.number, hostname: c.hostname };
        } else {
          error = 'Container not found in this stack — it may have been replaced.';
        }
      })
      .catch((e) => { error = e?.message || 'Failed to load container'; })
      .finally(() => { loading = false; });
  });

  $effect(() => {
    if (!nav.stack?.id) return;
    if (nav.stack.name && nav.project?.name && nav.org?.accountName) return;
    api.serviceStack(nav.stack.id).then((d) => {
      if (!nav.stack.name || !nav.stack.type) {
        nav.stack = {
          id: d.id,
          name: d.name,
          type: d.serviceStackTypeInfo?.serviceStackTypeName || d.serviceStackTypeId || null,
        };
      }
      if (d.project && (!nav.project?.name)) {
        nav.project = { id: d.projectId, name: d.project.name };
      }
      const clientId = d.project?.clientId;
      if (clientId && !nav.org?.accountName) {
        loadUser().then(() => {
          const c = findClientById(clientId);
          nav.org = { id: clientId, accountName: c?.accountName || null };
        }).catch(() => {});
      }
    }).catch(() => {});
  });

  function fmt(dt) { return dt ? new Date(dt).toLocaleString() : '—'; }
</script>

{#if loading && !detail}
  <p class="text-sm text-slate-500">Loading container…</p>
{:else if error}
  <p class="text-sm text-rose-400">{error}</p>
{:else if detail}
  <div class="mb-4">
    <h1 class="text-lg font-semibold text-slate-100">
      Container <span class="font-mono text-emerald-400">#{detail.number}</span>
      {#if detail.hostname}<span class="text-slate-500"> · {detail.hostname}</span>{/if}
    </h1>
    <p class="mt-1 text-xs text-slate-500">in stack <span class="text-slate-300">{nav.stack?.name}</span></p>
  </div>

  <div class="grid gap-4 sm:grid-cols-2">
    <div class="rounded-md border border-slate-800 bg-slate-900 p-4 text-sm">
      <div class="mb-3 text-xs uppercase tracking-widest text-slate-500">Hardware</div>
      <dl class="space-y-1.5">
        <div class="flex justify-between"><dt class="text-slate-500">CPU cores</dt><dd class="text-slate-200">{detail.currentHardwareResource?.cpuCoreCount ?? '—'}</dd></div>
        <div class="flex justify-between"><dt class="text-slate-500">Memory</dt><dd class="text-slate-200">{detail.currentHardwareResource?.memoryMBytes ?? '—'} MB</dd></div>
        <div class="flex justify-between"><dt class="text-slate-500">Disk</dt><dd class="text-slate-200">{detail.currentHardwareResource?.diskGBytes ?? '—'} GB</dd></div>
      </dl>
    </div>
    <div class="rounded-md border border-slate-800 bg-slate-900 p-4 text-sm">
      <div class="mb-3 text-xs uppercase tracking-widest text-slate-500">Identity</div>
      <dl class="space-y-1.5">
        <div class="flex justify-between gap-3"><dt class="text-slate-500">id</dt><dd class="break-all font-mono text-xs text-slate-300">{detail.id}</dd></div>
        <div class="flex justify-between"><dt class="text-slate-500">number</dt><dd class="text-slate-200">{detail.number}</dd></div>
        <div class="flex justify-between gap-3"><dt class="text-slate-500">hostname</dt><dd class="text-slate-200">{detail.hostname || '—'}</dd></div>
        <div class="flex justify-between gap-3"><dt class="text-slate-500">serviceStackId</dt><dd class="break-all font-mono text-xs text-slate-300">{detail.serviceStackId}</dd></div>
        <div class="flex justify-between gap-3"><dt class="text-slate-500">projectId</dt><dd class="break-all font-mono text-xs text-slate-300">{detail.projectId}</dd></div>
      </dl>
    </div>
    <div class="rounded-md border border-slate-800 bg-slate-900 p-4 text-sm sm:col-span-2">
      <div class="mb-3 text-xs uppercase tracking-widest text-slate-500">Lifecycle</div>
      <dl class="space-y-1.5">
        <div class="flex justify-between"><dt class="text-slate-500">created</dt><dd class="text-slate-200">{fmt(detail.created)}</dd></div>
        <div class="flex justify-between"><dt class="text-slate-500">last update</dt><dd class="text-slate-200">{fmt(detail.lastUpdate)}</dd></div>
      </dl>
    </div>
  </div>
{:else}
  <p class="text-sm text-slate-500">No container.</p>
{/if}
