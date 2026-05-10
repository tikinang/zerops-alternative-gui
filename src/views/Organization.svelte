<script>
  import Tabs from '../components/Tabs.svelte';
  import Table from '../components/Table.svelte';
  import { api } from '../lib/api.js';
  import { nav, goProject, setTab } from '../lib/nav.svelte.js';
  import { findClientById, loadUser } from '../lib/userStore.svelte.js';

  const tabs = [
    { id: 'projects', label: 'Projects' },
    { id: 'settings', label: 'Organization settings' },
    { id: 'team', label: 'Team' },
    { id: 'billing', label: 'Billing' },
  ];

  let active = $state(nav.tab && tabs.some(t => t.id === nav.tab) ? nav.tab : 'projects');
  let query = $state('');

  let projects = $state([]);
  let projectsLoading = $state(false);
  let projectsError = $state('');

  let team = $state([]);
  let teamLoading = $state(false);
  let teamError = $state('');

  let billing = $state(null);
  let billingStatus = $state(null);
  let billingLoading = $state(false);
  let billingError = $state('');

  let loadedFor = { projects: null, team: null, billing: null };

  $effect(() => {
    if (!nav.org?.id) return;
    if (nav.org.accountName) return;
    loadUser().then(() => {
      const c = findClientById(nav.org.id);
      if (c && !nav.org.accountName) nav.org = { id: c.id, accountName: c.accountName };
    }).catch(() => {});
  });

  $effect(() => {
    const id = nav.org?.id;
    if (!id) return;
    if (active === 'projects' && loadedFor.projects !== id) {
      loadedFor.projects = id;
      loadProjects(id);
    } else if (active === 'team' && loadedFor.team !== id) {
      loadedFor.team = id;
      loadTeam(id);
    } else if (active === 'billing' && loadedFor.billing !== id) {
      loadedFor.billing = id;
      loadBilling(id);
    }
  });

  async function loadProjects(id) {
    projectsLoading = true;
    projectsError = '';
    try {
      const data = await api.clientProjects(id, { limit: 200 });
      projects = data?.list || [];
    } catch (e) {
      projectsError = e?.message || 'Failed to load projects';
      projects = [];
    } finally {
      projectsLoading = false;
    }
  }

  async function loadTeam(id) {
    teamLoading = true;
    teamError = '';
    try {
      const data = await api.clientUsers(id);
      team = data?.clientUserList || [];
    } catch (e) {
      teamError = e?.message || 'Failed to load team';
      team = [];
    } finally {
      teamLoading = false;
    }
  }

  async function loadBilling(id) {
    billingLoading = true;
    billingError = '';
    try {
      const [info, status] = await Promise.all([
        api.clientBilling(id).catch(() => null),
        api.clientBillingStatus(id).catch(() => null),
      ]);
      billing = info;
      billingStatus = status;
    } catch (e) {
      billingError = e?.message || 'Failed to load billing';
    } finally {
      billingLoading = false;
    }
  }

  const filteredProjects = $derived(
    !query.trim()
      ? projects
      : projects.filter((p) => (p.name || '').toLowerCase().includes(query.trim().toLowerCase()))
  );

  const projectColumns = [
    { key: 'name', label: 'Project' },
    { key: 'status', label: 'Status' },
    { key: 'mode', label: 'Mode' },
    { key: 'tags', label: 'Tags' },
    { key: 'created', label: 'Created' },
  ];

  const teamColumns = [
    { key: 'name', label: 'Member' },
    { key: 'email', label: 'Email' },
    { key: 'role', label: 'Role' },
    { key: 'status', label: 'Status' },
  ];

  const teamRows = $derived(
    team.map((cu) => ({
      id: cu.id,
      name: cu.user?.fullName || '(unnamed)',
      email: cu.user?.email || '',
      role: cu.roleCode || '',
      status: cu.status || '',
    }))
  );
</script>

<Tabs {tabs} bind:active onChange={(id) => setTab(id)} />

<div class="mt-6">
  {#if active === 'projects'}
    <div class="mb-4 flex items-center gap-3">
      <input
        type="text"
        placeholder="Filter by name…"
        class="flex-1 rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:border-emerald-600 focus:outline-none"
        bind:value={query}
      />
      <span class="text-xs text-slate-500">
        {filteredProjects.length} / {projects.length}
      </span>
    </div>

    {#if projectsError}
      <p class="mb-3 text-sm text-rose-400">{projectsError}</p>
    {/if}
    {#if projectsLoading && !projects.length}
      <p class="text-sm text-slate-500">Loading projects…</p>
    {:else}
      <Table
        columns={projectColumns}
        rows={filteredProjects.map(p => ({
          id: p.id,
          name: p.name,
          status: p.status,
          mode: p.mode,
          tags: (p.tagList || []).join(', '),
          created: (p.created || '').slice(0, 10),
        }))}
        onRowClick={(row) => goProject({ id: row.id, name: row.name }, nav.org)}
        empty={query ? 'No matching projects.' : 'No projects in this organization.'}
      />
    {/if}
  {:else if active === 'settings'}
    <div class="rounded-md border border-slate-800 bg-slate-900 p-6 text-sm text-slate-400">
      Organization settings — not yet implemented.
    </div>
  {:else if active === 'team'}
    {#if teamError}
      <p class="mb-3 text-sm text-rose-400">{teamError}</p>
    {/if}
    {#if teamLoading && !team.length}
      <p class="text-sm text-slate-500">Loading team…</p>
    {:else}
      <Table columns={teamColumns} rows={teamRows} empty="No team members." />
    {/if}
  {:else if active === 'billing'}
    {#if billingError}
      <p class="mb-3 text-sm text-rose-400">{billingError}</p>
    {/if}
    {#if billingLoading}
      <p class="text-sm text-slate-500">Loading billing…</p>
    {:else if !billing && !billingStatus}
      <div class="rounded-md border border-slate-800 bg-slate-900 p-6 text-sm text-slate-400">
        Billing information unavailable for this organization (insufficient permissions or no billing data).
      </div>
    {:else}
      <div class="grid gap-4 sm:grid-cols-2">
        {#if billingStatus}
          <div class="rounded-md border border-slate-800 bg-slate-900 p-4">
            <div class="mb-3 text-xs uppercase tracking-widest text-slate-500">Status</div>
            <dl class="space-y-2 text-sm">
              {#each Object.entries(billingStatus) as [k, v]}
                <div class="grid grid-cols-2 gap-2">
                  <dt class="text-slate-500">{k}</dt>
                  <dd class="break-all text-slate-200">
                    {typeof v === 'object' ? JSON.stringify(v) : String(v ?? '—')}
                  </dd>
                </div>
              {/each}
            </dl>
          </div>
        {/if}
        {#if billing}
          <div class="rounded-md border border-slate-800 bg-slate-900 p-4">
            <div class="mb-3 text-xs uppercase tracking-widest text-slate-500">Billing details</div>
            <dl class="space-y-2 text-sm">
              {#each Object.entries(billing) as [k, v]}
                {#if v !== null && v !== undefined && v !== ''}
                  <div class="grid grid-cols-2 gap-2">
                    <dt class="text-slate-500">{k}</dt>
                    <dd class="break-all text-slate-200">
                      {typeof v === 'object' ? JSON.stringify(v) : String(v)}
                    </dd>
                  </div>
                {/if}
              {/each}
            </dl>
          </div>
        {/if}
      </div>
    {/if}
  {/if}
</div>
