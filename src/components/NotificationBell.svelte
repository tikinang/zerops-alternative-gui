<script>
  import EntityDetail from './EntityDetail.svelte';
  import StatusChip from './StatusChip.svelte';
  import Duration from './Duration.svelte';
  import { activity, unreadNotifications, acknowledge, acknowledgeAll } from '../lib/activity.svelte.js';
  import { nav, goNotifications } from '../lib/nav.svelte.js';
  import { isInflight } from '../lib/format.js';

  let open = $state(false);
  let detailOpen = $state(false);
  let detailEntity = $state(null);

  const unread = $derived(unreadNotifications());
  const recent = $derived(activity.list.slice(0, 8));

  function handleAck(id, e) {
    e.stopPropagation();
    acknowledge(id).catch(() => {});
  }

  function openDetail(n) {
    detailEntity = n;
    detailOpen = true;
    open = false;
  }

  function viewAll() {
    open = false;
    goNotifications(nav.org);
  }

  function close(e) {
    if (e.target.closest('.bell-popover')) return;
    open = false;
  }

  $effect(() => {
    if (open) {
      window.addEventListener('click', close, { capture: true });
      return () => window.removeEventListener('click', close, { capture: true });
    }
  });

  const inflightCount = $derived(activity.list.filter(isInflight).length);
</script>

<div class="relative bell-popover">
  <button
    class="relative rounded p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
    onclick={(e) => { e.stopPropagation(); open = !open; }}
    aria-label="Notifications"
    title="Notifications"
  >
    <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10 21a2 2 0 0 0 4 0" />
    </svg>
    {#if inflightCount > 0}
      <span class="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-sky-500 px-1 text-[10px] font-bold text-slate-950 animate-pulse" title="In-flight processes">
        {inflightCount}
      </span>
    {:else if unread.length > 0}
      <span class="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-emerald-500 px-1 text-[10px] font-bold text-slate-950">
        {unread.length > 99 ? '99+' : unread.length}
      </span>
    {/if}
  </button>

  {#if open}
    <div class="absolute right-0 top-full z-40 mt-2 w-[460px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-md border border-slate-800 bg-slate-900 shadow-2xl">
      <div class="flex items-center justify-between border-b border-slate-800 px-3 py-2">
        <span class="text-xs font-semibold uppercase tracking-widest text-slate-400">Activity</span>
        <div class="flex items-center gap-2 text-xs">
          {#if unread.length > 0}
            <button class="text-slate-400 hover:text-slate-200" onclick={() => acknowledgeAll().catch(() => {})}>Mark all read</button>
          {/if}
          <button class="text-emerald-400 hover:underline" onclick={viewAll}>View all →</button>
        </div>
      </div>

      {#if activity.loading && !activity.list.length}
        <div class="p-4 text-xs text-slate-500">Loading…</div>
      {:else if activity.error && !activity.list.length}
        <div class="p-4 text-xs text-rose-400">{activity.error}</div>
      {:else if !recent.length}
        <div class="p-6 text-center text-xs text-slate-500">No recent activity.</div>
      {:else}
        <ul class="max-h-[60vh] divide-y divide-slate-800 overflow-auto">
          {#each recent as n (n.id)}
            <li class="cursor-pointer px-3 py-2 text-xs hover:bg-slate-800/60 {n.acknowledged ? 'opacity-60' : ''}" onclick={() => openDetail(n)}>
              <div class="flex items-start gap-3">
                <div class="min-w-0 flex-1">
                  <div class="flex items-center gap-2">
                    <StatusChip entity={n} size="xs" />
                    <span class="truncate font-medium text-slate-200">{n.actionName || 'action'}</span>
                  </div>
                  <div class="mt-0.5 text-[11px] text-slate-500">
                    {#if n.serviceStacks?.length}
                      {n.serviceStacks.map((s) => s.name).filter(Boolean).join(', ')} ·
                    {/if}
                    <Duration entity={n} />
                  </div>
                </div>
                {#if !n.acknowledged}
                  <button class="text-slate-500 hover:text-emerald-400" onclick={(e) => handleAck(n.id, e)} title="Acknowledge">✓</button>
                {/if}
              </div>
            </li>
          {/each}
        </ul>
      {/if}
    </div>
  {/if}
</div>

<EntityDetail bind:open={detailOpen} entity={detailEntity} />
