<script>
  import Modal from './Modal.svelte';
  import Button from './Button.svelte';
  import StatusChip from './StatusChip.svelte';
  import Duration from './Duration.svelte';
  import { api } from '../lib/api.js';
  import { toast } from '../lib/toasts.svelte.js';
  import { fmtDate, processQueuedMs, fmtDuration, statusFromProcess, isInflight } from '../lib/format.js';

  // Pass either { entity } (already-loaded process/notification) or { entityId, kind }
  // (will fetch). kind = 'process' | 'notification' | 'auto'.
  let {
    open = $bindable(false),
    entity = null,
    entityId = null,
    kind = 'auto',
    onChanged,
  } = $props();

  let loaded = $state(entity);
  let loading = $state(false);
  let error = $state('');

  $effect(() => {
    loaded = entity;
    error = '';
    if (open && entityId && !loaded) loadById();
  });

  // Live-refresh while in flight.
  $effect(() => {
    if (!open || !loaded) return;
    if (!isInflight(loaded)) return;
    const tick = () => {
      const id = loaded?.id;
      if (!id) return;
      api.process(id).then((p) => { loaded = p; }).catch(() => {});
    };
    const h = setInterval(tick, 2000);
    return () => clearInterval(h);
  });

  async function loadById() {
    loading = true; error = '';
    try {
      if (kind === 'notification') loaded = await api.notification(entityId);
      else loaded = await api.process(entityId);
    } catch (e) {
      error = e?.message || 'Failed to load';
    } finally { loading = false; }
  }

  async function cancel() {
    if (!loaded?.id) return;
    try {
      const fresh = await api.processCancel(loaded.id);
      loaded = fresh;
      toast.success('Cancel requested', loaded.actionName || '');
      onChanged?.(fresh);
    } catch (e) { toast.apiError('Cancel failed', e); }
  }

  const queuedMs = $derived(processQueuedMs(loaded));
  const targetStacks = $derived(loaded?.serviceStacks || []);
  const showCancel = $derived(loaded && isInflight(loaded));
</script>

<Modal bind:open title={loaded ? `${loaded.actionName || 'Action'}${loaded.sequence != null ? ` #${loaded.sequence}` : ''}` : 'Detail'}>
  {#if loading}
    <p class="text-sm text-slate-500">Loading…</p>
  {:else if error}
    <p class="text-sm text-rose-400">{error}</p>
  {:else if loaded}
    <div class="space-y-3 text-sm">
      <div class="flex items-center gap-3">
        <StatusChip entity={loaded} />
        <Duration entity={loaded} prefix="Took " />
        {#if queuedMs != null && queuedMs > 0}
          <span class="text-xs text-slate-500">· queued {fmtDuration(queuedMs)}</span>
        {/if}
      </div>

      <dl class="grid grid-cols-1 gap-x-4 gap-y-1.5 sm:grid-cols-2">
        {#if loaded.actionName}
          <div class="flex justify-between gap-2"><dt class="text-slate-500">action</dt><dd class="text-slate-200">{loaded.actionName}</dd></div>
        {/if}
        {#if loaded.sequence != null}
          <div class="flex justify-between gap-2"><dt class="text-slate-500">sequence</dt><dd class="text-slate-200">{loaded.sequence}</dd></div>
        {/if}
        {#if loaded.created || loaded.actionCreated}
          <div class="flex justify-between gap-2"><dt class="text-slate-500">created</dt><dd class="text-slate-200">{fmtDate(loaded.created || loaded.actionCreated)}</dd></div>
        {/if}
        {#if loaded.actionStarted}
          <div class="flex justify-between gap-2"><dt class="text-slate-500">started</dt><dd class="text-slate-200">{fmtDate(loaded.actionStarted)}</dd></div>
        {/if}
        {#if loaded.actionFinished}
          <div class="flex justify-between gap-2"><dt class="text-slate-500">finished</dt><dd class="text-slate-200">{fmtDate(loaded.actionFinished)}</dd></div>
        {/if}
        {#if loaded.createdByUser}
          <div class="flex justify-between gap-2"><dt class="text-slate-500">by user</dt><dd class="text-slate-200">{loaded.createdByUser.fullName || loaded.createdByUser.email || loaded.createdByUser.id}</dd></div>
        {:else if loaded.createdBySystem}
          <div class="flex justify-between gap-2"><dt class="text-slate-500">by</dt><dd class="text-slate-200">system</dd></div>
        {/if}
        {#if loaded.canceledByUser}
          <div class="flex justify-between gap-2"><dt class="text-slate-500">canceled by</dt><dd class="text-slate-200">{loaded.canceledByUser.fullName || loaded.canceledByUser.email}</dd></div>
        {/if}
        {#if loaded.appVersion}
          <div class="flex justify-between gap-2"><dt class="text-slate-500">app version</dt><dd class="text-slate-200">#{loaded.appVersion.sequence ?? '—'}</dd></div>
        {/if}
        {#if loaded.acknowledged != null}
          <div class="flex justify-between gap-2"><dt class="text-slate-500">acknowledged</dt><dd class="text-slate-200">{loaded.acknowledged ? 'yes' : 'no'}</dd></div>
        {/if}
      </dl>

      {#if targetStacks.length}
        <div class="rounded border border-slate-800 bg-slate-950 p-3 text-xs">
          <div class="mb-2 text-xs uppercase tracking-widest text-slate-500">Target stacks</div>
          <ul class="space-y-1">
            {#each targetStacks as s}
              <li class="font-mono text-slate-300">
                {s.name || s.hostname || s.id}
                {#if s.serviceStackTypeName}<span class="text-slate-500"> · {s.serviceStackTypeName}</span>{/if}
              </li>
            {/each}
          </ul>
        </div>
      {/if}

      {#if loaded.errorMessage || loaded.errorCode}
        <div class="rounded border border-rose-800 bg-rose-950/30 p-3 text-xs text-rose-200">
          <div class="mb-1 font-semibold uppercase tracking-widest">Error</div>
          {#if loaded.errorCode}<div class="opacity-80">{loaded.errorCode}</div>{/if}
          {#if loaded.errorMessage}<div class="mt-1 break-words">{loaded.errorMessage}</div>{/if}
        </div>
      {/if}

      <details class="rounded border border-slate-800 bg-slate-950 p-3 text-xs">
        <summary class="cursor-pointer text-slate-400">Raw JSON</summary>
        <pre class="mt-2 max-h-72 overflow-auto text-slate-300">{JSON.stringify(loaded, null, 2)}</pre>
      </details>
    </div>
  {/if}

  {#snippet footer()}
    {#if showCancel}
      <Button size="sm" variant="danger" onclick={cancel}>Cancel process</Button>
    {/if}
    <Button size="sm" variant="ghost" onclick={() => (open = false)}>Close</Button>
  {/snippet}
</Modal>
