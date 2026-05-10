<script>
  import Modal from './Modal.svelte';
  import Button from './Button.svelte';
  import StatusChip from './StatusChip.svelte';
  import { fmtDate, fmtDuration } from '../lib/format.js';

  let { open = $bindable(false), version = null } = $props();

  function buildDurationMs(b) {
    if (!b?.pipelineStart) return null;
    const end = b.pipelineFinish || b.pipelineFailed;
    if (!end) return null;
    return new Date(end).getTime() - new Date(b.pipelineStart).getTime();
  }

  // The platform stores zerops.yaml inside the userDataList. The key
  // varies — pick whichever record looks like the YAML.
  function findYamlRecord(list) {
    if (!Array.isArray(list)) return null;
    return list.find((r) => /(^|[._-])zerops[._-]?ya?ml($|[._-])/i.test(r.key))
      || list.find((r) => /^[\s-]*zerops:\s*$/m.test(r.content || ''))
      || null;
  }

  const yamlRecord = $derived(findYamlRecord(version?.userDataList));
  const otherUserData = $derived(
    (version?.userDataList || []).filter((r) => r !== yamlRecord && r.type !== 'INTERNAL'),
  );

  const buildRows = $derived.by(() => {
    if (!version?.build) return [];
    const b = version.build;
    return [
      ['pipeline start', fmtDate(b.pipelineStart)],
      ['pipeline finish', fmtDate(b.pipelineFinish)],
      ['pipeline failed', fmtDate(b.pipelineFailed)],
      ['container start', fmtDate(b.containerCreationStart)],
      ['end date', fmtDate(b.endDate)],
      ['duration', fmtDuration(buildDurationMs(b))],
      ['cache snapshot', b.cacheSnapshotId || '—'],
    ];
  });
</script>

<Modal bind:open title={version ? `App version #${version.sequence}` : 'App version'}>
  {#if version}
    <div class="space-y-3 text-sm">
      <div class="flex flex-wrap items-center gap-3">
        <StatusChip status={version.status || (version.activationDate ? 'ACTIVE' : 'UNKNOWN')} />
        {#if version.source}
          <span class="rounded border border-slate-700 px-2 py-0.5 text-[10px] uppercase tracking-wide text-slate-300">{version.source}</span>
        {/if}
        {#if version.activationDate}
          <span class="text-xs text-slate-500">Activated {fmtDate(version.activationDate)}</span>
        {/if}
      </div>

      <dl class="grid grid-cols-1 gap-x-4 gap-y-1.5 sm:grid-cols-2">
        <div class="flex justify-between gap-2"><dt class="text-slate-500">created</dt><dd class="text-slate-200">{fmtDate(version.created)}</dd></div>
        <div class="flex justify-between gap-2"><dt class="text-slate-500">by</dt><dd class="text-slate-200">{version.createdByUser?.fullName || version.createdByUser?.email || '—'}</dd></div>
        {#if version.name}
          <div class="flex justify-between gap-2 sm:col-span-2"><dt class="text-slate-500">name</dt><dd class="text-slate-200">{version.name}</dd></div>
        {/if}
      </dl>

      {#if buildRows.length}
        <div class="rounded border border-slate-800 bg-slate-950 p-3">
          <div class="mb-2 text-xs uppercase tracking-widest text-slate-500">Build</div>
          <dl class="grid grid-cols-2 gap-1 text-xs">
            {#each buildRows as [k, v]}
              <dt class="text-slate-500">{k}</dt><dd class="text-slate-300">{v}</dd>
            {/each}
          </dl>
        </div>
      {/if}

      {#if yamlRecord}
        <div class="rounded border border-emerald-900/60 bg-emerald-950/20 p-3">
          <div class="mb-2 flex items-center justify-between text-xs uppercase tracking-widest">
            <span class="text-emerald-300">zerops.yaml used at deploy</span>
            <span class="text-slate-500">{yamlRecord.key}</span>
          </div>
          <pre class="max-h-72 overflow-auto rounded bg-slate-950 p-3 font-mono text-[11px] leading-snug text-slate-200">{yamlRecord.content}</pre>
        </div>
      {/if}

      {#if otherUserData.length}
        <details class="rounded border border-slate-800 bg-slate-950 p-3 text-xs">
          <summary class="cursor-pointer text-slate-400">User-data records ({otherUserData.length})</summary>
          <ul class="mt-2 space-y-1">
            {#each otherUserData as r}
              <li class="border-t border-slate-900 py-1 first:border-t-0">
                <div class="flex items-center justify-between gap-2">
                  <span class="font-mono text-emerald-400">{r.key}</span>
                  <span class="text-[10px] uppercase text-slate-500">{r.type || '—'}</span>
                </div>
                <pre class="mt-1 break-all whitespace-pre-wrap font-mono text-[11px] text-slate-300">{r.content}</pre>
              </li>
            {/each}
          </ul>
        </details>
      {/if}

      {#if version.githubIntegration || version.gitlabIntegration || version.publicGitSource}
        <details class="rounded border border-slate-800 bg-slate-950 p-3 text-xs">
          <summary class="cursor-pointer text-slate-400">Source</summary>
          <pre class="mt-2 max-h-64 overflow-auto text-slate-300">{JSON.stringify(version.githubIntegration || version.gitlabIntegration || version.publicGitSource, null, 2)}</pre>
        </details>
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
