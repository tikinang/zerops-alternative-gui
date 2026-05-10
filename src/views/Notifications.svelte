<script>
  import Button from '../components/Button.svelte';
  import StatusChip from '../components/StatusChip.svelte';
  import Duration from '../components/Duration.svelte';
  import EntityDetail from '../components/EntityDetail.svelte';
  import { activity, acknowledge, acknowledgeAll, refresh as refreshActivity, unreadNotifications } from '../lib/activity.svelte.js';
  import { nav, goStack, goProject } from '../lib/nav.svelte.js';
  import { fmtShort, isInflight } from '../lib/format.js';

  let filter = $state('all'); // all | unread | inflight
  let detailOpen = $state(false);
  let detailEntity = $state(null);

  const unread = $derived(unreadNotifications());
  const inflight = $derived(activity.list.filter(isInflight));
  const visible = $derived(
    filter === 'unread' ? unread :
    filter === 'inflight' ? inflight :
    activity.list,
  );

  function jumpToTarget(n, e) {
    e.stopPropagation();
    const stacks = n.serviceStacks || [];
    if (stacks.length === 1 && stacks[0].id && n.projectId) {
      goStack(
        { id: stacks[0].id, name: stacks[0].name, type: stacks[0].serviceStackTypeName || null },
        { id: n.projectId, name: n.project?.name || null },
        nav.org,
      );
    } else if (n.projectId) {
      goProject({ id: n.projectId, name: n.project?.name || null }, nav.org);
    }
  }

  function openDetail(n) {
    detailEntity = n;
    detailOpen = true;
  }
</script>

<div class="mb-4 flex items-center justify-between">
  <div>
    <h1 class="text-lg font-semibold text-slate-100">Activity</h1>
    <p class="mt-0.5 text-xs text-slate-500">
      Every platform action — start, stop, deploy, restart, build — is logged here.
      In-flight ones show a live duration; click any row for the full process record.
    </p>
  </div>
  <div class="flex items-center gap-2">
    <div class="flex overflow-hidden rounded-md border border-slate-800 text-xs">
      <button class="px-3 py-1.5 {filter === 'all' ? 'bg-slate-800 text-slate-100' : 'text-slate-400 hover:bg-slate-900'}" onclick={() => (filter = 'all')}>All ({activity.list.length})</button>
      <button class="px-3 py-1.5 {filter === 'inflight' ? 'bg-slate-800 text-slate-100' : 'text-slate-400 hover:bg-slate-900'}" onclick={() => (filter = 'inflight')}>In-flight ({inflight.length})</button>
      <button class="px-3 py-1.5 {filter === 'unread' ? 'bg-slate-800 text-slate-100' : 'text-slate-400 hover:bg-slate-900'}" onclick={() => (filter = 'unread')}>Unread ({unread.length})</button>
    </div>
    <Button variant="ghost" size="sm" onclick={() => refreshActivity()} disabled={activity.loading}>
      {activity.loading ? 'Refreshing…' : 'Refresh'}
    </Button>
    {#if unread.length > 0}
      <Button variant="secondary" size="sm" onclick={() => acknowledgeAll().catch(() => {})}>
        Acknowledge all
      </Button>
    {/if}
  </div>
</div>

{#if activity.error && !activity.list.length}
  <p class="mb-3 text-sm text-rose-400">{activity.error}</p>
{/if}

{#if !visible.length}
  <div class="rounded-md border border-slate-800 bg-slate-900 p-8 text-center text-sm text-slate-500">
    {filter === 'unread' ? 'No unread notifications.' : filter === 'inflight' ? 'Nothing currently running.' : 'No activity in this organization yet.'}
  </div>
{:else}
  <div class="overflow-hidden rounded-md border border-slate-800 bg-slate-900">
    <table class="w-full text-left text-sm">
      <thead class="bg-slate-950 text-xs uppercase tracking-widest text-slate-500">
        <tr>
          <th class="px-4 py-2">Action</th>
          <th class="px-4 py-2">Status</th>
          <th class="px-4 py-2">Duration</th>
          <th class="px-4 py-2">Target</th>
          <th class="px-4 py-2">By</th>
          <th class="px-4 py-2">Created</th>
          <th class="px-4 py-2">Finished</th>
          <th class="px-4 py-2"></th>
        </tr>
      </thead>
      <tbody>
        {#each visible as n (n.id)}
          <tr class="cursor-pointer border-t border-slate-800 hover:bg-slate-800/50 {n.acknowledged ? 'opacity-60' : ''}" onclick={() => openDetail(n)}>
            <td class="px-4 py-2 font-mono text-xs text-slate-200">{n.actionName}</td>
            <td class="px-4 py-2"><StatusChip entity={n} /></td>
            <td class="px-4 py-2 text-xs"><Duration entity={n} /></td>
            <td class="px-4 py-2 text-xs text-slate-300">
              {#if n.serviceStacks?.length}
                <button class="text-emerald-400 hover:underline" onclick={(e) => jumpToTarget(n, e)}>
                  {n.serviceStacks.map((s) => s.name).filter(Boolean).join(', ')}
                </button>
              {:else if n.project?.name}
                <button class="text-emerald-400 hover:underline" onclick={(e) => jumpToTarget(n, e)}>{n.project.name}</button>
              {:else}
                <span class="text-slate-500">—</span>
              {/if}
            </td>
            <td class="px-4 py-2 text-xs text-slate-400">{n.createdByUser?.fullName || n.createdByUser?.email || (n.createdBySystem ? 'system' : '—')}</td>
            <td class="px-4 py-2 text-xs text-slate-400">{fmtShort(n.actionCreated || n.created)}</td>
            <td class="px-4 py-2 text-xs text-slate-400">{fmtShort(n.actionFinished)}</td>
            <td class="px-4 py-2 text-right">
              {#if !n.acknowledged}
                <button class="text-xs text-slate-500 hover:text-emerald-400" onclick={(e) => { e.stopPropagation(); acknowledge(n.id).catch(() => {}); }}>
                  Mark read
                </button>
              {/if}
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
{/if}

<EntityDetail bind:open={detailOpen} entity={detailEntity} />
