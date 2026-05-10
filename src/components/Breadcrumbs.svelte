<script>
  import { nav, goUser, goOrg, goProject, goStack, goContainer } from '../lib/nav.svelte.js';

  const crumbs = $derived.by(() => {
    const list = [{ label: 'User', onclick: goUser }];
    if (nav.org) list.push({ label: nav.org.accountName || 'Organization', onclick: () => goOrg(nav.org) });
    if (nav.view === 'notifications') {
      list.push({ label: 'Notifications', onclick: null });
      return list;
    }
    if (nav.project) list.push({ label: nav.project.name || 'Project', onclick: () => goProject(nav.project, nav.org) });
    if (nav.stack) list.push({ label: nav.stack.name || 'Stack', onclick: () => goStack(nav.stack, nav.project, nav.org) });
    if (nav.container) {
      const label = nav.container.hostname || (nav.container.number != null ? `#${nav.container.number}` : 'Container');
      list.push({ label, onclick: () => goContainer(nav.container, nav.stack, nav.project, nav.org) });
    }
    return list;
  });
</script>

<nav class="flex items-center gap-1.5 text-sm text-slate-400">
  {#each crumbs as crumb, i}
    {#if i > 0}<span class="text-slate-600">/</span>{/if}
    {#if crumb.onclick && i < crumbs.length - 1}
      <button class="rounded px-1.5 py-0.5 hover:bg-slate-800 hover:text-slate-200" onclick={crumb.onclick}>
        {crumb.label}
      </button>
    {:else}
      <span class="px-1.5 py-0.5 font-medium text-slate-200">{crumb.label}</span>
    {/if}
  {/each}
</nav>
