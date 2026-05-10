<script>
  import Modal from './Modal.svelte';
  import Button from './Button.svelte';

  let { open = $bindable(false), version = null } = $props();

  function fmt(dt) { return dt ? new Date(dt).toLocaleString() : '—'; }

  const buildRows = $derived.by(() => {
    if (!version?.build) return [];
    const b = version.build;
    return [
      ['pipeline start', fmt(b.pipelineStart)],
      ['pipeline finish', fmt(b.pipelineFinish)],
      ['pipeline failed', fmt(b.pipelineFailed)],
      ['container creation start', fmt(b.containerCreationStart)],
      ['end date', fmt(b.endDate)],
      ['cache snapshot', b.cacheSnapshotId || '—'],
    ];
  });
</script>

<Modal bind:open title={version ? `App version #${version.sequence}` : 'App version'}>
  {#if version}
    <div class="grid gap-3 text-sm">
      <div class="grid grid-cols-2 gap-2">
        <div><div class="text-xs uppercase text-slate-500">Status</div><div class="text-slate-200">{version.status || (version.activationDate ? 'ACTIVE' : '—')}</div></div>
        <div><div class="text-xs uppercase text-slate-500">Activated</div><div class="text-slate-200">{fmt(version.activationDate)}</div></div>
        <div><div class="text-xs uppercase text-slate-500">Created</div><div class="text-slate-200">{fmt(version.created)}</div></div>
        <div><div class="text-xs uppercase text-slate-500">By</div><div class="text-slate-200">{version.createdByUser?.fullName || version.createdByUser?.email || '—'}</div></div>
      </div>

      {#if buildRows.length}
        <div class="rounded border border-slate-800 bg-slate-950 p-3">
          <div class="mb-2 text-xs uppercase tracking-widest text-slate-500">Build</div>
          <dl class="space-y-1 text-xs">
            {#each buildRows as [k, v]}
              <div class="flex justify-between gap-3"><dt class="text-slate-500">{k}</dt><dd class="text-slate-300">{v}</dd></div>
            {/each}
          </dl>
        </div>
      {/if}

      {#if version.githubIntegration || version.gitlabIntegration}
        <div class="rounded border border-slate-800 bg-slate-950 p-3 text-xs">
          <div class="mb-2 text-xs uppercase tracking-widest text-slate-500">Source</div>
          <pre class="overflow-auto text-slate-300">{JSON.stringify(version.githubIntegration || version.gitlabIntegration, null, 2)}</pre>
        </div>
      {/if}

      <details class="rounded border border-slate-800 bg-slate-950 p-3 text-xs">
        <summary class="cursor-pointer text-slate-400">Raw JSON</summary>
        <pre class="mt-2 max-h-72 overflow-auto text-slate-300">{JSON.stringify(version, null, 2)}</pre>
      </details>
    </div>
  {/if}

  {#snippet footer()}
    <Button size="sm" variant="ghost" onclick={() => (open = false)}>Close</Button>
  {/snippet}
</Modal>
