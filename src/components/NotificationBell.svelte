<script>
  import { activity, unreadNotifications, acknowledge, acknowledgeAll } from '../lib/activity.svelte.js';
  import { nav, goNotifications } from '../lib/nav.svelte.js';

  let open = $state(false);

  const unread = $derived(unreadNotifications());
  const recent = $derived(activity.list.slice(0, 8));

  function statusKind(n) {
    if (n.errorCode || /failed/i.test(n.actionStatus || '')) return 'error';
    if (/canc/i.test(n.actionStatus || '')) return 'warning';
    if (n.actionFinished) return 'success';
    return 'info';
  }

  function dotColor(kind) {
    if (kind === 'success') return 'bg-emerald-500';
    if (kind === 'error') return 'bg-rose-500';
    if (kind === 'warning') return 'bg-amber-500';
    return 'bg-slate-500';
  }

  function handleAck(id, e) {
    e.stopPropagation();
    acknowledge(id).catch(() => {});
  }

  function handleAckAll() {
    acknowledgeAll().catch(() => {});
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
    {#if unread.length > 0}
      <span class="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-emerald-500 px-1 text-[10px] font-bold text-slate-950">
        {unread.length > 99 ? '99+' : unread.length}
      </span>
    {/if}
  </button>

  {#if open}
    <div class="absolute right-0 top-full z-40 mt-2 w-[420px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-md border border-slate-800 bg-slate-900 shadow-2xl">
      <div class="flex items-center justify-between border-b border-slate-800 px-3 py-2">
        <span class="text-xs font-semibold uppercase tracking-widest text-slate-400">Activity</span>
        <div class="flex items-center gap-2 text-xs">
          {#if unread.length > 0}
            <button class="text-slate-400 hover:text-slate-200" onclick={handleAckAll}>Mark all read</button>
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
            {@const kind = statusKind(n)}
            <li class="flex items-start gap-3 px-3 py-2 text-xs hover:bg-slate-800/50 {n.acknowledged ? 'opacity-60' : ''}">
              <span class="mt-1 h-2 w-2 flex-none rounded-full {dotColor(kind)}"></span>
              <div class="min-w-0 flex-1">
                <div class="font-medium text-slate-200">{n.actionName || 'action'}</div>
                <div class="mt-0.5 text-[11px] text-slate-500">
                  {#if n.serviceStacks && n.serviceStacks.length}
                    {n.serviceStacks.map((s) => s.name).filter(Boolean).join(', ') || ''}
                  {/if}
                  {#if n.actionFinished}
                    {' · '}{new Date(n.actionFinished).toLocaleTimeString()}
                  {:else if n.actionCreated}
                    {' · '}{new Date(n.actionCreated).toLocaleTimeString()}
                  {/if}
                </div>
              </div>
              {#if !n.acknowledged}
                <button class="text-slate-500 hover:text-emerald-400" onclick={(e) => handleAck(n.id, e)} title="Acknowledge">✓</button>
              {/if}
            </li>
          {/each}
        </ul>
      {/if}
    </div>
  {/if}
</div>
